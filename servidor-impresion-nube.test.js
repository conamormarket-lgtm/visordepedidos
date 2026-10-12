import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import vm from 'node:vm';

const source = readFileSync(new URL('./servidor-impresion-nube.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '');
const flush = () => new Promise(resolve => setImmediate(resolve));

function setup(ensureFirebaseAuth) {
    const state = { logs: [], errors: [], sockets: [], updates: [], deleted: 0, process: {} };
    class Socket extends EventEmitter {
        constructor() { super(); state.sockets.push(this); }
        setTimeout() {}
        connect(port, ip, callback) { this.port = port; this.ip = ip; this.send = callback; }
        write(zpl, encoding, callback) { this.zpl = zpl; callback(); }
        destroy() { this.destroyed = true; }
    }
    const context = vm.createContext({
        app: {}, db: {}, ensureFirebaseAuth, net: { Socket }, process: state.process,
        console: { log: message => state.logs.push(message), error: message => state.errors.push(message) },
        collection: (_, name) => name, query: (...parts) => parts, where: (...parts) => parts,
        onSnapshot: (query, options, next, error) => { state.subscription = { query, options, next, error }; },
        doc: (_, collection, id) => `${collection}/${id}`,
        updateDoc: async (ref, data) => { state.updates.push({ ref, data }); },
        serverTimestamp: () => 'SERVER_TIMESTAMP',
        deleteApp: async () => { state.deleted++; },
    });
    vm.runInContext(source, context);
    state.receive = (changes = []) => state.subscription.next({ metadata: { fromCache: false }, docChanges: () => changes });
    return state;
}

test('el worker espera el login antes de escuchar y confirma conexión con el primer snapshot', async () => {
    let login;
    const state = setup(() => new Promise(resolve => { login = resolve; }));
    assert.equal(state.subscription, undefined);
    assert.ok(!state.logs.some(line => line.includes('Firebase conectado')));
    login();
    await flush();
    assert.equal(state.subscription.query[0], 'print_queue');
    assert.deepEqual(Array.from(state.subscription.query[1]), ['status', '==', 'pending']);
    assert.equal(state.subscription.options.includeMetadataChanges, true);
    state.subscription.next({ metadata: { fromCache: true }, docChanges: () => [] });
    assert.ok(!state.logs.some(line => line.includes('Firebase conectado')));
    state.receive();
    assert.ok(state.logs.some(line => line.includes('Firebase conectado')));
    state.receive();
    assert.equal(state.logs.filter(line => line.includes('Firebase conectado')).length, 1);
});

test('el worker no escucha ni imprime si falla el login y termina con error', async () => {
    const state = setup(async () => { throw new Error('Login fallido'); });
    await flush();
    assert.equal(state.subscription, undefined);
    assert.equal(state.sockets.length, 0);
    assert.equal(state.process.exitCode, 1);
    assert.equal(state.deleted, 1);
    assert.match(state.errors[0], /Login fallido/);
});

test('el worker informa permission-denied y cierra Firebase cuando termina el listener', async () => {
    const state = setup(async () => {});
    await flush();
    await state.subscription.error({ code: 'permission-denied' });
    assert.equal(state.process.exitCode, 1);
    assert.equal(state.deleted, 1);
    assert.match(state.errors[0], /permisos de la cola/);
});

test('con sesión el worker envía el ZPL y actualiza exactamente el ticket recibido', async () => {
    const state = setup(async () => {});
    await flush();
    state.receive([{ type: 'added', doc: { id: 'ticket-prueba', data: () => ({ zpl: '^XA^FDPRUEBA^FS^XZ' }) } }]);
    assert.equal(state.updates.length, 0);
    const socket = state.sockets[0];
    assert.equal(socket.ip, '192.168.18.71');
    assert.equal(socket.port, 9100);
    socket.send();
    await flush();
    assert.equal(socket.zpl, '^XA^FDPRUEBA^FS^XZ');
    assert.equal(state.updates.length, 1);
    assert.equal(state.updates[0].ref, 'print_queue/ticket-prueba');
    assert.equal(state.updates[0].data.status, 'printed');
    assert.equal(state.updates[0].data.printedAt, 'SERVER_TIMESTAMP');
    assert.equal(state.updates[0].data.errorDetails, null);
});
