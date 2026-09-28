import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./orders.js', import.meta.url), 'utf8');
const start = source.slice(source.indexOf('export const startStage ='), source.indexOf('export const updateOrderStage ='))
    .replace('export const startStage =', 'globalThis.startStage =');

function setup({ existing, operator = 'Ana', status = 'Listo para Preparar', fail = false } = {}) {
    const writes = [];
    const data = { estadoGeneral: status, preparacion: { operador: operator, fechaInicio: existing, operadorInicio: 'Original' } };
    const context = vm.createContext({
        Date, db: {}, COLLECTION_NAME: 'pedidos',
        TIEMPO_CAMPO: { preparacion: 'tiempoPreparacion' },
        ESTADO_ETAPA: { preparacion: 'Listo para Preparar' },
        getAllRealIds: () => ['001', '1'], doc: (_, collection, id) => `${collection}/${id}`,
        serverTimestamp: () => 'server', arrayUnion: value => value,
        securityMonitor: { registerOperation() {} },
        runTransaction: async (_, callback) => {
            const result = await callback({
                get: async () => ({ exists: () => true, data: () => data }),
                update: (ref, value) => writes.push({ ref, value }),
            });
            if (fail) throw new Error('Commit rechazado');
            return result;
        },
    });
    vm.runInContext(start, context);
    return { run: () => context.startStage('1', 'preparacion'), writes };
}

test('devuelve el inicio confirmado y escribe ambos IDs con la misma hora y auditoría', async () => {
    const { run, writes } = setup();
    const result = await run();
    assert.equal(writes.length, 2);
    assert.equal(result.operadorInicio, 'Ana');
    for (const { value } of writes) {
        assert.equal(value['preparacion.fechaInicio'], result.fechaInicio);
        assert.equal(value.historialModificaciones.timestamp, result.fechaInicio);
    }
});
test('un inicio existente se devuelve sin reiniciarlo ni escribir', async () => {
    const existing = new Date(1000);
    const { run, writes } = setup({ existing });
    assert.equal((await run()).fechaInicio, existing);
    assert.equal(writes.length, 0);
});
test('rechaza etapa cambiada u operario ausente', async () => {
    for (const options of [{ status: 'En Estampado' }, { operator: 'Sin Asignar' }]) {
        const { run, writes } = setup(options);
        await assert.rejects(run);
        assert.equal(writes.length, 0);
    }
});
test('un commit fallido no devuelve un inicio confirmado', async () => {
    await assert.rejects(setup({ fail: true }).run, /Commit rechazado/);
});
