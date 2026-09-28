import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./orders.js', import.meta.url), 'utf8');
const subscribe = source.slice(source.indexOf('export const subscribeToOrders ='), source.indexOf('// Helper to get real ID'))
    .replace('export const subscribeToOrders =', 'globalThis.subscribe =');

function setup() {
    let resolveCache, snapshot;
    const received = [];
    const context = vm.createContext({
        db: {}, COLLECTION_NAME: 'pedidos', console: { log() {} },
        readOrdersCache: () => new Promise(resolve => { resolveCache = resolve; }),
        deduplicateOrders: orders => orders, _pedidosIdMap: new Map(),
        collection() {}, query() {}, where() {}, saveCache() {},
        securityMonitor: { registerOperation() {} },
        normalizeOrder: doc => ({ id: doc.id, ...doc.data() }),
        onSnapshot: (_, __, callback) => { snapshot = callback; return () => {}; },
    });
    vm.runInContext(subscribe, context);
    const stop = context.subscribe(orders => received.push(orders));
    return {
        received, stop,
        loadCache: async () => { resolveCache([{ id: '1', value: 'old' }]); await Promise.resolve(); },
        receive: () => snapshot({
            metadata: { fromCache: true }, docChanges: () => [],
            docs: [{ id: '1', data: () => ({ value: 'fresh' }) }],
        }),
    };
}
test('una caché lenta no reemplaza datos más recientes de Firebase', async () => {
    const state = setup();
    state.receive();
    await state.loadCache();
    assert.equal(state.received.length, 1);
    assert.equal(state.received[0][0].value, 'fresh');
});
test('la caché rápida se muestra y después se reemplaza con Firebase', async () => {
    const state = setup();
    await state.loadCache();
    state.receive();
    assert.equal(state.received.length, 2);
    assert.equal(state.received[0][0].value, 'old');
    assert.equal(state.received[1][0].value, 'fresh');
});
test('cancelar la suscripción ignora una lectura pendiente de caché', async () => {
    const state = setup();
    state.stop();
    await state.loadCache();
    assert.equal(state.received.length, 0);
});
