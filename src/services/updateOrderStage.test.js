import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { calcularTiempoEtapa } from '../utils/tiempoEstampado.js';

const ordersSource = readFileSync(new URL('./orders.js', import.meta.url), 'utf8');
const queueSource = ordersSource.slice(ordersSource.indexOf('const QUEUE_COUNTERS_DOC_REF'), ordersSource.indexOf('// Se captura al pulsar'));
const updateSource = ordersSource.slice(ordersSource.indexOf('export const updateOrderStage ='), ordersSource.indexOf('export const undoOrderStage ='))
    .replace('export const updateOrderStage =', 'globalThis.updateOrderStage =');
const inventorySource = readFileSync(new URL('./inventory.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export async function', 'async function');

const STATES = { preparacion: 'Listo para Preparar', estampado: 'En Estampado', empaquetado: 'En Empaquetado' };
const COUNTERS = 'configuracion/contadores_cola';
const INVENTORY = 'inventarioPrendas/polo_negro_m';

function setup({ stage = 'preparacion', quantity = 5, discounted = false, started = true, siblings = false, rejectCommit = false, onFailure } = {}) {
    const ids = siblings ? ['001', '1'] : ['1'];
    const order = {
        estadoGeneral: STATES[stage], inventarioDescontado: discounted,
        [stage]: { operador: 'Ana', fechaInicio: started ? new Date(1000) : null },
        prendas: [{ tipoPrenda: 'Polo', color: 'Negro', talla: 'M', cantidad: 2 }],
    };
    const state = new Map([
        ...ids.map(id => [`pedidos/${id}`, structuredClone(order)]),
        [INVENTORY, { quantity, cantidad: quantity, salidas: 0 }],
        [COUNTERS, { estampado_normal: 40, empaquetado_normal: 10 }],
    ]);
    let revision = 0, serial = 0, retries = 0;
    const context = vm.createContext({
        Date, db: {}, COLLECTION_NAME: 'pedidos', ESTADO_ETAPA: STATES,
        TIEMPO_CAMPO: { preparacion: 'tiempoPreparacion', estampado: 'tiempoEstampado', empaquetado: 'tiempoEmpaquetado' },
        calcularTiempoEtapa,
        console: { log() {}, warn() {}, error() {} },
        securityMonitor: { registerOperation() {} },
        getAllRealIds: () => ids,
        collection: (_, path) => path,
        doc: (base, ...parts) => typeof base === 'string' ? `${base}/${++serial}` : parts.join('/'),
        serverTimestamp: () => 'server', arrayUnion: value => ({ union: value }),
        runTransaction: async (_, callback) => {
            for (let attempt = 0; attempt < 5; attempt++) {
                const version = revision;
                const snapshot = structuredClone(state);
                const writes = [];
                let result;
                try {
                    result = await callback({
                        get: async ref => {
                            assert.equal(writes.length, 0, 'No se permiten lecturas después de escribir');
                            return { exists: () => snapshot.has(ref), data: () => snapshot.get(ref) };
                        },
                        update: (ref, data) => {
                            assert.ok(snapshot.has(ref), `No existe ${ref}`);
                            writes.push([ref, data]);
                        },
                        set: (ref, data) => writes.push([ref, data]),
                    });
                } catch (error) {
                    onFailure?.(error, state);
                    throw error;
                }
                if (version !== revision) { retries++; continue; }
                if (rejectCommit) throw new Error('Commit rechazado');
                for (const [ref, data] of writes) {
                    const next = structuredClone(state.get(ref) || {});
                    for (const [path, value] of Object.entries(data)) {
                        const keys = path.split('.');
                        const field = keys.pop();
                        let target = next;
                        for (const key of keys) target = target[key] ??= {};
                        target[field] = structuredClone(value?.union ? [...(target[field] || []), value.union] : value);
                    }
                    state.set(ref, next);
                }
                if (writes.length) revision++;
                return result;
            }
            throw new Error('Demasiados reintentos');
        },
    });
    vm.runInContext(inventorySource, context);
    vm.runInContext(queueSource + '\n' + updateSource, context);
    return {
        state, retries: () => retries,
        run: (destination = stage === 'preparacion' ? 'estampado' : stage === 'estampado' ? 'empaquetado' : 'despacho', options) =>
            context.updateOrderStage(ids[0], destination, stage, undefined, options),
    };
}

test('dos solicitudes simultáneas confirman un solo avance, descuento, historial y número de cola', async () => {
    const { state, run, retries } = setup();
    const results = await Promise.all([run(), run()]);
    assert.deepEqual(results.map(result => result.advanced).sort(), [false, true]);
    assert.ok(retries() >= 1, 'Se ejercita el reintento por conflicto de Firestore');
    assert.equal(state.get(INVENTORY).quantity, 3);
    assert.equal(state.get(INVENTORY).cantidad, 3);
    assert.equal(state.get(COUNTERS).estampado_normal, 41);
    const order = state.get('pedidos/1');
    assert.equal(order.estadoGeneral, 'En Estampado');
    assert.equal(order.inventarioDescontado, true);
    assert.equal(order.historialModificaciones.length, 1);
    const movements = [...state.values()].filter(value => value.source === 'visor_pedidos');
    assert.equal(movements.length, 1);
    assert.equal(movements[0].user, 'Ana');
});

test('repetir un avance confirmado no escribe ni vuelve a contar el pedido', async () => {
    for (const stage of Object.keys(STATES)) {
        const { state, run } = setup({ stage });
        assert.equal((await run()).advanced, true);
        const before = structuredClone(state);
        assert.equal((await run()).advanced, false);
        assert.deepEqual(state, before);
    }
});

test('una etapa distinta conserva su estado y el conflicto no se disfraza de inventario', async () => {
    for (const status of ['En Pausa por Stock', 'En Reparto', 'Anulado', 'En Estampado']) {
        const { state, run } = setup();
        state.get('pedidos/1').estadoGeneral = status;
        const before = structuredClone(state);
        await assert.rejects(run, error => error.code === 'ETAPA_CAMBIADA' && !error.message.includes('INVENTARIO'));
        assert.deepEqual(state, before);
    }
});

test('IDs hermanos se actualizan juntos y una divergencia bloquea toda escritura', async () => {
    const { state, run } = setup({ siblings: true });
    state.get('pedidos/1').estadoGeneral = 'En Empaquetado';
    await assert.rejects(run, { code: 'ETAPA_CAMBIADA' });
    assert.equal(state.get(INVENTORY).quantity, 5);
    state.get('pedidos/1').estadoGeneral = STATES.preparacion;
    assert.equal((await run()).advanced, true);
    assert.deepEqual(state.get('pedidos/001'), state.get('pedidos/1'));
    assert.equal((await run()).advanced, false);
});

test('un descuento previo no se repite al completar preparación', async () => {
    const { state, run } = setup({ discounted: true });
    assert.equal((await run()).advanced, true);
    assert.equal(state.get(INVENTORY).quantity, 5);
    assert.equal(state.get('pedidos/1').estadoGeneral, 'En Estampado');
});

test('un commit fallido no deja descuento, cola ni avance parcial', async () => {
    const { state, run } = setup({ rejectCommit: true });
    const before = structuredClone(state);
    await assert.rejects(run, /Commit rechazado/);
    assert.deepEqual(state, before);
});

test('stock insuficiente pausa el pedido sin descontar ni consumir número de cola', async () => {
    const { state, run } = setup({ quantity: 1 });
    await assert.rejects(run, /^Error: SIN_STOCK:/);
    assert.equal(state.get('pedidos/1').estadoGeneral, 'En Pausa por Stock');
    assert.equal(state.get(COUNTERS).estampado_normal, 40);
    assert.equal(state.get(INVENTORY).quantity, 1);
});

test('un fallo de stock tardío no devuelve a pausa un pedido avanzado por otro equipo', async () => {
    const { state, run } = setup({ quantity: 1, onFailure: (error, records) => {
        if (!error.message.startsWith('STOCK_INSUFICIENTE:')) return;
        const order = records.get('pedidos/1');
        order.estadoGeneral = 'En Estampado';
        order.inventarioDescontado = true;
        order.preparacion.estado = 'LISTO';
        order.preparacion.fechaFin = new Date();
    } });
    assert.equal((await run()).advanced, false);
    assert.equal(state.get('pedidos/1').estadoGeneral, 'En Estampado');
    assert.equal(state.get('pedidos/1').preparacion.enPausa, undefined);
});

test('sin inicio se bloquea el avance normal; BOX/CUADRO conserva su excepción', async () => {
    const normal = setup({ started: false });
    await assert.rejects(normal.run, { code: 'ETAPA_SIN_INICIO' });
    assert.equal(normal.state.get(INVENTORY).quantity, 5);
    const box = setup({ stage: 'estampado', started: false });
    assert.equal((await box.run('empaquetado', { esBoxCuadro: true })).advanced, true);
    assert.equal(box.state.get('pedidos/1').tiempoEstampado, null);
});

test('el contador puede crearse y conserva las otras colas al avanzar', async () => {
    const { state, run } = setup();
    state.delete(COUNTERS);
    state.get('pedidos/1').esPrioridad = true;
    await run();
    assert.equal(state.get(COUNTERS).estampado_prioridad, 1);
    assert.equal(state.get('pedidos/1').estampado.numeroColaDisplay, 'P-1');
});
