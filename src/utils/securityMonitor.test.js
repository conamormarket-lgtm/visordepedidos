import test from 'node:test';
import assert from 'node:assert/strict';
import { SecurityMonitor } from './securityMonitor.js';

function setup() {
    let time = 0;
    const monitor = new SecurityMonitor({ now: () => time, autoStart: false });
    const warnings = [];
    monitor._reportActivity = reason => warnings.push(reason);
    return { monitor, warnings, advance: ms => { time += ms; } };
}

test('operaciones repartidas mientras el intervalo está frenado no se suman en un solo segundo', () => {
    const { monitor, warnings, advance } = setup();
    advance(15000);
    // Tablet en reposo: 1 minuto con 6 ops/seg sin que corra el intervalo.
    for (let i = 0; i < 60; i++) {
        monitor.registerOperation(6);
        advance(1000);
    }
    assert.equal(warnings.length, 0);
});

test('300 ops en el mismo segundo avisan una sola vez sin bloquear', () => {
    const { monitor, warnings, advance } = setup();
    advance(15000);
    monitor.registerOperation(200);
    monitor.registerOperation(100);
    assert.equal(warnings.length, 1);
    assert.doesNotThrow(() => monitor.registerOperation(1));
    monitor.registerOperation(500);
    assert.equal(warnings.length, 1);
});

test('consumo sostenido 3 segundos seguidos avisa sin bloquear', () => {
    const { monitor, warnings, advance } = setup();
    advance(15000);
    for (let i = 0; i < 3; i++) {
        monitor.registerOperation(10);
        advance(1000);
    }
    monitor.registerOperation(1);
    assert.equal(warnings.length, 1);
    assert.doesNotThrow(() => monitor.registerOperation(1));
});

test('un segundo sin operaciones corta la racha', () => {
    const { monitor, warnings, advance } = setup();
    advance(15000);
    monitor.registerOperation(10);
    advance(1000);
    monitor.registerOperation(10);
    advance(2000);
    monitor.registerOperation(10);
    advance(1000);
    monitor.registerOperation(1);
    assert.equal(warnings.length, 0);
});

test('durante el periodo de gracia no se bloquea', () => {
    const { monitor, warnings } = setup();
    monitor.registerOperation(500);
    assert.equal(warnings.length, 0);
});
