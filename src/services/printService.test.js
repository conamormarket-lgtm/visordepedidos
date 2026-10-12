import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./printService.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/export const (\w+) =/g, 'globalThis.$1 =');

function setup(ensureFirebaseAuth, addDoc) {
    const context = vm.createContext({
        db: {}, ensureFirebaseAuth, addDoc,
        collection: (_, name) => name, serverTimestamp: () => 'SERVER_TIMESTAMP',
        console: { log() {}, error() {} },
    });
    vm.runInContext(source, context);
    return context.printTicket;
}

test('el ticket espera la autenticación y la confirmación de escritura antes de indicar éxito', async () => {
    let login, commit, saved, finished = false;
    const printTicket = setup(() => new Promise(resolve => { login = resolve; }), (collection, data) => {
        saved = { collection, data };
        return new Promise(resolve => { commit = resolve; });
    });
    const pending = printTicket({ id: '000123', orderId: '123', envioNombres: 'Prueba' })
        .then(result => { finished = true; return result; });
    assert.equal(saved, undefined);
    login();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(saved.collection, 'print_queue');
    assert.equal(saved.data.orderId, '000123');
    assert.equal(saved.data.status, 'pending');
    assert.equal(saved.data.printedAt, null);
    assert.equal(saved.data.createdAt, 'SERVER_TIMESTAMP');
    assert.match(saved.data.zpl, /Nro de Pedido: 123/);
    assert.equal(finished, false);
    commit();
    const result = await pending;
    assert.equal(result.ok, true);
    assert.match(result.message, /en cola/);
});

test('si falla el login no crea tickets y conserva la causa', async () => {
    const cause = Object.assign(new Error('No auth'), { code: 'auth/operation-not-allowed' });
    const printTicket = setup(async () => { throw cause; }, () => assert.fail('No debe escribir'));
    await assert.rejects(printTicket({}), error => {
        assert.match(error.message, /sesión de Firebase/);
        assert.equal(error.code, cause.code);
        assert.equal(error.cause, cause);
        return true;
    });
});

test('una escritura rechazada se informa como error de permisos, no de internet', async () => {
    const printTicket = setup(async () => {}, async () => {
        throw Object.assign(new Error('Missing or insufficient permissions'), { code: 'permission-denied' });
    });
    await assert.rejects(printTicket({}), error => {
        assert.equal(error.code, 'permission-denied');
        assert.match(error.message, /permisos de print_queue/);
        assert.doesNotMatch(error.message, /internet/);
        return true;
    });
});
