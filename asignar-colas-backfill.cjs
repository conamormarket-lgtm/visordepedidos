/**
 * asignar-colas-backfill.cjs
 *
 * Script de MIGRACIÓN (ejecutar UNA SOLA VEZ).
 * Asigna números de cola a todos los pedidos que ya están en producción
 * y aún no tienen numeroCola / numeroColaDisplay en su etapa actual.
 *
 * Réplica exacta de:
 *   SISTEMA GESTION/scripts/asignar-colas-existentes.js
 * … pero usando el Firebase CLIENT SDK (igual que el resto del visor).
 *
 * Uso:
 *   node asignar-colas-backfill.cjs
 *
 * Seguro de re-ejecutar: los pedidos que ya tienen cola se saltan.
 */

const { initializeApp }  = require('firebase/app');
const {
    getFirestore,
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    setDoc,
    writeBatch,
    serverTimestamp,
    runTransaction,
} = require('firebase/firestore');

// ── Firebase config ─────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey:            'AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc',
    authDomain:        'sistema-gestion-3b225.firebaseapp.com',
    projectId:         'sistema-gestion-3b225',
    storageBucket:     'sistema-gestion-3b225.firebasestorage.app',
    messagingSenderId: '572322137024',
    appId:             '1:572322137024:web:66715f8ad61bf43fe43e25',
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Etapas productivas que maneja el visor ──────────────────────────────────
const ETAPAS = [
    {
        nombre:        'Preparación',
        estadosGeneral: ['Listo para Preparar', 'En Pausa por Stock'],
        campoEtapa:    'preparacion',
        prefijoCola:   'preparacion',
    },
    {
        nombre:        'Estampado',
        estadosGeneral: ['En Estampado'],
        campoEtapa:    'estampado',
        prefijoCola:   'estampado',
    },
    {
        nombre:        'Empaquetado',
        estadosGeneral: ['En Empaquetado'],
        campoEtapa:    'empaquetado',
        prefijoCola:   'empaquetado',
    },
];

// ── Helper: fecha de entrada a la etapa (para ordenar de más antiguo a más nuevo) ──
function getFechaEntrada(pedido, campoEtapa) {
    const etapaObj = pedido[campoEtapa] || {};
    const raw = etapaObj.fechaEntrada;
    if (!raw) return pedido.createdAt?.toDate?.() || new Date(0);
    if (typeof raw.toDate === 'function') return raw.toDate();
    if (raw instanceof Date) return raw;
    if (raw.seconds)  return new Date(raw.seconds * 1000);
    return new Date(raw);
}

// ── Main ────────────────────────────────────────────────────────────────────
async function migrar() {
    console.log('\n🚀 Iniciando backfill de números de cola...\n');

    // 1. Leer pedidos activos (solo los que están en etapas productivas)
    const estadosActivos = ETAPAS.flatMap(e => e.estadosGeneral);
    console.log('📖 Leyendo pedidos en producción desde Firebase...');
    const q = query(
        collection(db, 'pedidos'),
        where('estadoGeneral', 'in', estadosActivos)
    );
    const snapshot = await getDocs(q);
    const pedidos = snapshot.docs.map(d => ({ _docId: d.id, ...d.data() }));
    console.log(`   → ${pedidos.length} pedidos encontrados.\n`);

    // 2. Leer contadores actuales
    const contadoresRef  = doc(db, 'configuracion', 'contadores_cola');
    const contadoresSnap = await getDoc(contadoresRef);
    const contadoresActuales = contadoresSnap.exists() ? contadoresSnap.data() : {};

    console.log('📊 Contadores actuales en configuracion/contadores_cola:');
    const resumenContadores = Object.entries(contadoresActuales)
        .filter(([k]) => k !== 'updatedAt')
        .map(([k, v]) => `   ${k}: ${v}`)
        .join('\n');
    console.log(resumenContadores || '   (documento vacío o no existe)');
    console.log();

    const nuevoContador = { ...contadoresActuales };
    const batchUpdates  = []; // { docId, updates }
    let totalAsignados  = 0;

    // 3. Procesar cada etapa
    for (const etapa of ETAPAS) {
        console.log(`\n━━━ Etapa: ${etapa.nombre} ${'━'.repeat(40 - etapa.nombre.length)}`);

        const pedidosEtapa = pedidos.filter(p =>
            etapa.estadosGeneral.includes(p.estadoGeneral)
        );
        console.log(`   Pedidos en etapa: ${pedidosEtapa.length}`);

        if (pedidosEtapa.length === 0) {
            console.log('   → Sin pedidos, se salta.\n');
            continue;
        }

        // Separar en normales y prioritarios
        const normales    = pedidosEtapa.filter(p => !p.esPrioridad);
        const prioritarios = pedidosEtapa.filter(p => p.esPrioridad === true);
        console.log(`   Normales: ${normales.length} | Prioritarios: ${prioritarios.length}`);

        // Ordenar por fecha de entrada (más antiguo → número de cola más bajo)
        const sortByFecha = (a, b) => {
            const fa = getFechaEntrada(a, etapa.campoEtapa);
            const fb = getFechaEntrada(b, etapa.campoEtapa);
            if (fa - fb !== 0) return fa - fb;
            // Desempate por número de pedido
            const na = parseInt(String(a.numeroPedido || a._docId || '0').replace(/\D/g, ''), 10) || 0;
            const nb = parseInt(String(b.numeroPedido || b._docId || '0').replace(/\D/g, ''), 10) || 0;
            return na - nb;
        };
        normales.sort(sortByFecha);
        prioritarios.sort(sortByFecha);

        // Obtener contador de arranque (respetar lo ya guardado en Firebase)
        const keyNormal    = `${etapa.prefijoCola}_normal`;
        const keyPrioridad = `${etapa.prefijoCola}_prioridad`;
        let contNormal    = typeof contadoresActuales[keyNormal]    === 'number' ? contadoresActuales[keyNormal]    : 0;
        let contPrioridad = typeof contadoresActuales[keyPrioridad] === 'number' ? contadoresActuales[keyPrioridad] : 0;

        // ── Pedidos NORMALES ────────────────────────────────────────────────
        for (const pedido of normales) {
            const etapaObj = pedido[etapa.campoEtapa] || {};
            if (etapaObj.numeroCola && etapaObj.numeroColaDisplay) {
                // Ya tiene cola — asegurar que el contador no quede por debajo
                if (etapaObj.numeroCola > contNormal) contNormal = etapaObj.numeroCola;
                console.log(`   ⏭  #${pedido.numeroPedido || pedido._docId}: ya tiene cola #${etapaObj.numeroColaDisplay}`);
                continue;
            }
            contNormal++;
            const display = String(contNormal);
            batchUpdates.push({
                docId: pedido._docId,
                updates: {
                    [`${etapa.campoEtapa}.numeroCola`]:        contNormal,
                    [`${etapa.campoEtapa}.numeroColaDisplay`]: display,
                },
            });
            console.log(`   ✅ #${pedido.numeroPedido || pedido._docId} → Cola #${display}`);
            totalAsignados++;
        }

        // ── Pedidos PRIORITARIOS ────────────────────────────────────────────
        for (const pedido of prioritarios) {
            const etapaObj = pedido[etapa.campoEtapa] || {};
            if (etapaObj.numeroCola && etapaObj.numeroColaDisplay) {
                if (etapaObj.numeroCola > contPrioridad) contPrioridad = etapaObj.numeroCola;
                console.log(`   ⏭  #${pedido.numeroPedido || pedido._docId}: ya tiene cola ${etapaObj.numeroColaDisplay}`);
                continue;
            }
            contPrioridad++;
            const display = `P-${contPrioridad}`;
            batchUpdates.push({
                docId: pedido._docId,
                updates: {
                    [`${etapa.campoEtapa}.numeroCola`]:        contPrioridad,
                    [`${etapa.campoEtapa}.numeroColaDisplay`]: display,
                },
            });
            console.log(`   ⭐ #${pedido.numeroPedido || pedido._docId} → Cola ${display} (PRIORIDAD)`);
            totalAsignados++;
        }

        // Guardar en el objeto de contadores a actualizar
        nuevoContador[keyNormal]    = contNormal;
        nuevoContador[keyPrioridad] = contPrioridad;
        console.log(`   📈 Contador: ${keyNormal}=${contNormal} | ${keyPrioridad}=${contPrioridad}`);
    }

    // 4. Resultado
    if (totalAsignados === 0) {
        console.log('\n✅ Todos los pedidos ya tienen número de cola. Nada que actualizar.\n');
        process.exit(0);
    }

    // 5. Escribir pedidos en lotes de 400 (límite Firestore: 500 ops/batch)
    console.log(`\n💾 Escribiendo ${batchUpdates.length} pedidos en Firebase (lotes de 400)...`);
    const BATCH_SIZE = 400;
    for (let i = 0; i < batchUpdates.length; i += BATCH_SIZE) {
        const chunk = batchUpdates.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        for (const { docId, updates } of chunk) {
            batch.update(doc(db, 'pedidos', docId), {
                ...updates,
                updatedAt: serverTimestamp(),
            });
        }
        await batch.commit();
        console.log(`   Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} docs ✓`);
    }

    // 6. Actualizar documento de contadores (setDoc para crear si no existe)
    nuevoContador.updatedAt = serverTimestamp();
    await setDoc(contadoresRef, nuevoContador);
    console.log('\n📊 Contadores actualizados en configuracion/contadores_cola:');
    Object.entries(nuevoContador)
        .filter(([k]) => k !== 'updatedAt')
        .forEach(([k, v]) => console.log(`   ${k}: ${v}`));

    console.log(`\n🎉 Backfill completado: ${totalAsignados} pedidos actualizados.\n`);
    process.exit(0);
}

migrar().catch(err => {
    console.error('\n❌ Error durante el backfill:', err);
    process.exit(1);
});
