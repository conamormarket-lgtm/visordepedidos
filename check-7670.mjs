import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    authDomain: "sistema-gestion-3b225.firebaseapp.com",
    projectId: "sistema-gestion-3b225",
    storageBucket: "sistema-gestion-3b225.firebasestorage.app",
    messagingSenderId: "572322137024",
    appId: "1:572322137024:web:66715f8ad61bf43fe43e25",
};

console.log(`✅ Conectando a Firebase: ${firebaseConfig.projectId}\n`);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function formatTS(ts) {
    if (!ts) return "(nulo)";
    if (ts?.toDate) return ts.toDate().toLocaleString("es-PE");
    if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString("es-PE");
    return String(ts);
}

async function buscarPedido7670() {
    console.log("🔍 Buscando pedido 7670...\n");

    const resultados = [];

    // 1. Buscar por doc ID directo (con y sin ceros)
    for (const id of ["7670", "07670", "007670"]) {
        const ref = doc(db, "pedidos", id);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            resultados.push({ docId: snap.id, data: snap.data() });
        }
    }

    // 2. Buscar por campo numeroPedido
    for (const id of ["7670", "07670", "007670"]) {
        const q = query(collection(db, "pedidos"), where("numeroPedido", "==", id));
        const snap = await getDocs(q);
        snap.forEach(d => {
            if (!resultados.find(r => r.docId === d.id))
                resultados.push({ docId: d.id, data: d.data() });
        });
    }

    if (resultados.length === 0) {
        console.log("⚠️  Pedido 7670 no encontrado. Puede que ya esté en otro estado (Reparto/Entregado).");
        console.log("    Prueba buscar el doc ID directamente en Firebase Console → pedidos.");
        process.exit(0);
    }

    for (const { docId, data } of resultados) {
        console.log("═══════════════════════════════════════════════════════════════");
        console.log(`📄 DOC ID: ${docId}`);
        console.log("═══════════════════════════════════════════════════════════════");

        console.log("\n🚦 ESTADO:");
        console.log(`   estadoGeneral:          ${data.estadoGeneral}`);
        console.log(`   inventarioDescontado:   ${data.inventarioDescontado ?? "⚠️  campo NO existe en el doc"}`);
        console.log(`   esPrioridad:            ${data.esPrioridad ?? false}`);
        console.log(`   cobranza.estado:        ${data.cobranza?.estado ?? "(sin cobranza)"}`);

        console.log("\n👗 PRENDAS:");
        if (Array.isArray(data.prendas) && data.prendas.length > 0) {
            data.prendas.forEach((p, i) => console.log(`   [${i}] ${JSON.stringify(p)}`));
        } else {
            console.log(`   prendas: ${JSON.stringify(data.prendas) ?? "(vacío o no existe)"}`);
        }
        if (data.talla) console.log(`   talla: ${JSON.stringify(data.talla)}`);

        console.log("\n🔄 ETAPAS:");
        for (const stage of ["preparacion", "estampado", "impresion", "diseno", "diseño", "empaquetado"]) {
            const s = data[stage];
            if (s && typeof s === "object" && Object.keys(s).length > 0) {
                console.log(`   [${stage}]`);
                console.log(`      estado:       ${s.estado ?? "(nulo)"}`);
                console.log(`      operador:     ${s.operador ?? s.operadorNombre ?? "(nulo)"}`);
                console.log(`      fechaEntrada: ${formatTS(s.fechaEntrada)}`);
                console.log(`      fechaSalida:  ${formatTS(s.fechaSalida)}`);
                console.log(`      fechaFin:     ${formatTS(s.fechaFin)}`);
            }
        }

        console.log("\n📜 HISTORIAL DE MODIFICACIONES (últimas 25, más recientes primero):");
        if (Array.isArray(data.historialModificaciones) && data.historialModificaciones.length > 0) {
            const sorted = [...data.historialModificaciones].sort((a, b) => {
                const ta = a.timestamp?.seconds ?? (a.timestamp ? new Date(a.timestamp).getTime() / 1000 : 0);
                const tb = b.timestamp?.seconds ?? (b.timestamp ? new Date(b.timestamp).getTime() / 1000 : 0);
                return tb - ta;
            });
            sorted.slice(0, 25).forEach(h => {
                const ts = formatTS(h.timestamp);
                const usuario = h.usuarioEmail ?? h.usuarioId ?? "?";
                console.log(`   [${ts}] ${usuario}`);
                console.log(`      Acción:  ${h.accion}`);
                console.log(`      Detalle: ${h.detalle}`);
            });
        } else {
            console.log("   (sin historial registrado)");
        }

        console.log("\n📋 OTROS CAMPOS DEL DOC:");
        const ignorar = new Set(["historialModificaciones", "prendas", "productos",
            "diseño", "diseno", "comentarios", "preparacion", "estampado",
            "impresion", "empaquetado", "reparto", "cobranza"]);
        for (const [k, v] of Object.entries(data).sort()) {
            if (!ignorar.has(k) && typeof v !== "object") {
                console.log(`   ${k}: ${v}`);
            }
        }
    }

    console.log("\n✅ Consulta finalizada.");
    process.exit(0);
}

buscarPedido7670().catch(err => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
