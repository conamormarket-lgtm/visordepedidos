import test from 'node:test';
import assert from 'node:assert/strict';
import { SecurityMonitor } from './securityMonitor.js';

function setup() {
    let time = 0;
    const monitor = new SecurityMonitor({ now: () => time, autoStart: false });
    return { monitor, advance: ms => { time += ms; } };
}

test('operaciones repartidas mientras el intervalo está frenado no se suman en un solo segundo', () => {
    const { monitor, advance } = setup();
    advance(15000);
    // Tablet en reposo: 1 minuto con 6 ops/seg sin que corra el intervalo.
    for (let i = 0; i < 60; i++) {
        monitor.registerOperation(6);
        advance(1000);
    }
    assert.equal(monitor.getIsLocked(), false);
});

test('más de 300 ops en el mismo segundo activa el freno', () => {
    const { monitor, advance } = setup();
    advance(15000);
    monitor.registerOperation(200);
    monitor.registerOperation(100);
    assert.equal(monitor.getIsLocked(), true);
    assert.throws(() => monitor.registerOperation(1), /SISTEMA BLOQUEADO/);
});

test('consumo sostenido 3 segundos seguidos activa el freno', () => {
    const { monitor, advance } = setup();
    advance(15000);
    for (let i = 0; i < 3; i++) {
        monitor.registerOperation(10);
        advance(1000);
    }
    monitor.registerOperation(1);
    assert.equal(monitor.getIsLocked(), true);
});

test('un segundo sin operaciones corta la racha', () => {
    const { monitor, advance } = setup();
    advance(15000);
    monitor.registerOperation(10);
    advance(1000);
    monitor.registerOperation(10);
    advance(2000);
    monitor.registerOperation(10);
    advance(1000);
    monitor.registerOperation(1);
    assert.equal(monitor.getIsLocked(), false);
});

test('durante el periodo de gracia no se bloquea', () => {
    const { monitor } = setup();
    monitor.registerOperation(500);
    assert.equal(monitor.getIsLocked(), false);
});
