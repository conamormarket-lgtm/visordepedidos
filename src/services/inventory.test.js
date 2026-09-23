import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./inventory.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export async function', 'async function');
function setup({ discounted = false, rejectCommit = false, quantity = 5 } = {}) {
    const state = new Map([
        ['pedidos/1', { estadoGeneral: 'Listo para Preparar', inventarioDescontado: discounted,
            prendas: [{ tipoPrenda: 'Polo', color: 'Negro', talla: 'M', cantidad: 2 }] }],
        ['inventarioPrendas/polo_negro_m', { quantity, cantidad: quantity, salidas: 0 }],
    ]);
    let serial = 0;
    const context = vm.createContext({ db: {}, console: { log() {}, warn() {}, error() {} },
        collection: (_, path) => path,
        doc: (base, ...parts) => typeof base === 'string' ? `${base}/${++serial}` : parts.join('/'),
        serverTimestamp: () => 'timestamp',
        runTransaction: async (_, callback) => {
            const writes = [];
            await callback({
                get: async ref => {
                    assert.equal(writes.length, 0, 'No reads after writes');
                    return { exists: () => state.has(ref), data: () => state.get(ref) };
                },
                update: (ref, data) => writes.push([ref, data]),
                set: (ref, data) => writes.push([ref, data]),
            });
            if (rejectCommit) throw new Error('Commit rejected');
            for (const [ref, data] of writes) state.set(ref, { ...state.get(ref), ...data });
        },
    });
    vm.runInContext(source, context);
    return { state, run: prepare => context.descontarInventarioPorPedido('1', 'Operario', prepare) };
}
const advance = async tx => {
    await tx.get('pedidos/1');
    return () => tx.update('pedidos/1', { estadoGeneral: 'En Estampado' });
};
test('confirma stock, historial y avance juntos', async () => {
    const { state, run } = setup();
    assert.equal((await run(advance)).exito, true);
    assert.equal(state.get('pedidos/1').estadoGeneral, 'En Estampado');
    assert.equal(state.get('pedidos/1').inventarioDescontado, true);
    assert.equal(state.get('inventarioPrendas/polo_negro_m').quantity, 3);
    assert.equal(state.size, 3);
});
test('fallo de validación no descuenta', async () => {
    const { state, run } = setup();
    assert.equal((await run(async () => { throw new Error('Etapa inválida'); })).exito, false);
    assert.equal(state.get('inventarioPrendas/polo_negro_m').quantity, 5);
    assert.equal(state.size, 2);
});
test('fallo del commit no deja descuento ni avance parcial', async () => {
    const { state, run } = setup({ rejectCommit: true });
    assert.equal((await run(advance)).exito, false);
    assert.equal(state.get('inventarioPrendas/polo_negro_m').quantity, 5);
    assert.equal(state.get('pedidos/1').estadoGeneral, 'Listo para Preparar');
    assert.equal(state.size, 2);
});
test('pedido descontado previamente puede avanzar sin otro descuento', async () => {
    const { state, run } = setup({ discounted: true });
    assert.equal((await run(advance)).exito, true);
    assert.equal(state.get('pedidos/1').estadoGeneral, 'En Estampado');
    assert.equal(state.get('inventarioPrendas/polo_negro_m').quantity, 5);
    assert.equal(state.size, 2);
});
test('stock insuficiente no avanza ni escribe historial', async () => {
    const { state, run } = setup({ quantity: 1 });
    assert.equal((await run(advance)).sinStock, true);
    assert.equal(state.get('pedidos/1').estadoGeneral, 'Listo para Preparar');
    assert.equal(state.size, 2);
});
