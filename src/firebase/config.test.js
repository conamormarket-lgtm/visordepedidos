import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./config.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export const ensureFirebaseAuth =', 'globalThis.ensureFirebaseAuth =')
    .replace('export { app, db };', '');

function setup(auth, signInAnonymously) {
    const context = vm.createContext({
        initializeApp: () => ({}), getFirestore: () => ({}),
        getAuth: () => auth, signInAnonymously,
    });
    vm.runInContext(source, context);
    return context.ensureFirebaseAuth;
}

test('espera la sesión persistida y la reutiliza sin crear otro usuario', async () => {
    let restore;
    const auth = { currentUser: null, authStateReady: () => new Promise(resolve => { restore = resolve; }) };
    const ensureAuth = setup(auth, () => assert.fail('No debe iniciar otra sesión'));
    let ready = false;
    const attempt = ensureAuth().then(user => { ready = true; return user; });
    await Promise.resolve();
    assert.equal(ready, false);
    auth.currentUser = { uid: 'sesion-persistida' };
    restore();
    assert.equal(await attempt, auth.currentUser);
});

test('las llamadas simultáneas comparten una sola autenticación', async () => {
    let finish, calls = 0;
    const auth = { currentUser: null, authStateReady: async () => {} };
    const ensureAuth = setup(auth, () => {
        calls++;
        return new Promise(resolve => { finish = resolve; });
    });
    const first = ensureAuth();
    const second = ensureAuth();
    assert.equal(first, second);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls, 1);
    auth.currentUser = { uid: 'anonimo' };
    finish({ user: auth.currentUser });
    assert.equal(await first, auth.currentUser);
    assert.equal(await ensureAuth(), auth.currentUser);
    assert.equal(calls, 1);
});

test('un fallo de autenticación permite reintentar y luego renovar una sesión cerrada', async () => {
    let calls = 0;
    const auth = { currentUser: null, authStateReady: async () => {} };
    const ensureAuth = setup(auth, async () => {
        if (++calls === 1) throw Object.assign(new Error('Sin red'), { code: 'auth/network-request-failed' });
        auth.currentUser = { uid: `sesion-${calls}` };
        return { user: auth.currentUser };
    });
    await assert.rejects(ensureAuth(), { code: 'auth/network-request-failed' });
    assert.equal((await ensureAuth()).uid, 'sesion-2');
    auth.currentUser = null;
    assert.equal((await ensureAuth()).uid, 'sesion-3');
});
