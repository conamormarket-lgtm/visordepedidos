import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularTiempoEstampado, calcularTiempoImpresion } from './tiempoEstampado.js';

test('impresión usa entrada y salida, sin fechaInicio', () => {
    assert.equal(calcularTiempoImpresion({ fechaEntrada: new Date(1000), fechaSalida: new Date(62500) }), 61.5);
});

test('impresión no inventa tiempos con fechas ausentes o inválidas', () => {
    assert.equal(calcularTiempoImpresion({ fechaEntrada: new Date(1000) }), null);
    assert.equal(calcularTiempoImpresion({ fechaSalida: new Date(2000) }), null);
    assert.equal(calcularTiempoImpresion({ fechaEntrada: 'inválida', fechaSalida: new Date() }), null);
    assert.equal(calcularTiempoImpresion({ fechaEntrada: new Date(2000), fechaSalida: new Date(1000) }), null);
});

test('conserva milisegundos de los timestamps de Firestore', () => {
    assert.equal(calcularTiempoEstampado({ seconds: 100, nanoseconds: 125000000 }, new Date(160875)), 60.75);
});

test('no confunde falta de inicio con duración cero', () => {
    assert.equal(calcularTiempoEstampado(null, new Date()), null);
    assert.equal(calcularTiempoEstampado(new Date(1000), new Date(1000)), 0);
});

test('calcula correctamente cuando cambia el día', () => {
    assert.equal(calcularTiempoEstampado(new Date('2026-09-19T23:59:00Z'), new Date('2026-09-20T00:01:00Z')), 120);
});

test('rechaza salida anterior al inicio', () => {
    assert.throws(() => calcularTiempoEstampado(new Date(2000), new Date(1000)), /reloj/);
});
