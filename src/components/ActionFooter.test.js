import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./ActionFooter.jsx', import.meta.url), 'utf8');
const handler = source.slice(source.indexOf('    const handleAdvance ='), source.indexOf('    const stageKey ='))
    .replace('const handleAdvance =', 'globalThis.handleAdvance =');

function setup() {
    const pending = [];
    const context = vm.createContext({ advanceLock: { current: false }, setAdvancing: value => pending.push(value) });
    vm.runInContext(handler, context);
    return { run: context.handleAdvance, pending };
}

test('dos pulsaciones antes de renderizar solo envían un avance y mantienen el bloqueo hasta confirmar', async () => {
    const { run, pending } = setup();
    let finish, calls = 0;
    const first = run(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
    await run(() => { calls++; });
    assert.equal(calls, 1);
    assert.deepEqual(pending, [true]);
    finish();
    await first;
    assert.deepEqual(pending, [true, false]);
    await run(() => { calls++; });
    assert.equal(calls, 2);
});

test('un avance fallido libera el botón para volver a intentarlo', async () => {
    const { run, pending } = setup();
    await assert.rejects(run(() => { throw new Error('Sin conexión'); }), /Sin conexión/);
    let retried = false;
    await run(() => { retried = true; });
    assert.equal(retried, true);
    assert.deepEqual(pending, [true, false, true, false]);
});
