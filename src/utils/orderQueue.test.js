import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDER_VIEWS, STAGES, ZONAS } from '../constants.js';
import { getOrdersForView, isOrderInView } from './orderQueue.js';

const order = (id, overrides = {}) => ({
    id,
    status: STAGES.PREPARACION,
    cobranza: { estado: 'Habilitado' },
    zonaEnvio: ZONAS.LIMA,
    numeroCola: 1,
    ...overrides,
});
const ids = orders => orders.map(o => o.id);
const priorityOrders = (orders, options) => getOrdersForView(orders, ORDER_VIEWS.PRIORIDAD, options);

test('Prioridad reúne el marcado compartido de los buscadores en las tres áreas y ambas zonas', () => {
    const orders = [
        order('atc', { prioridadCRM: true }),
        order('gestion', { prioridadCRM: true, zonaEnvio: ZONAS.PROVINCIA }),
        order('estampado', { prioridadCRM: true, status: STAGES.ESTAMPADO }),
        order('empaquetado', { prioridadCRM: true, status: STAGES.EMPAQUETADO }),
        order('prioridad-registro', { esPrioridad: true }),
        order('normal'),
        order('reparto', { prioridadCRM: true, status: 'despacho' }),
    ];
    const result = priorityOrders(orders, { zonaSplitEnabled: true, prepZona: ZONAS.LIMA });
    assert.deepEqual(ids(result), ['atc', 'gestion', 'estampado', 'empaquetado']);
    assert.deepEqual(result.map(o => o.status), [STAGES.PREPARACION, STAGES.PREPARACION, STAGES.ESTAMPADO, STAGES.EMPAQUETADO]);
    assert.deepEqual(result.map(o => o.numeroColaDisplay), ['P-1', 'P-2', 'P-3', 'P-4']);
});

test('el pedido marcado solo aparece en Prioridad, incluso al buscar en su área', () => {
    for (const status of Object.values(STAGES)) {
        const orders = [order('marcado', { status, prioridadCRM: true }), order('normal', { status })];
        assert.deepEqual(ids(getOrdersForView(orders, status)), ['normal']);
        assert.deepEqual(ids(getOrdersForView(orders, status, { hasSearch: true })), ['normal']);
        assert.deepEqual(ids(priorityOrders(orders)), ['marcado']);
    }
});

test('los contadores usan la misma elegibilidad que las colas', () => {
    const orders = [
        order('lima', { prioridadCRM: true }),
        order('provincia', { prioridadCRM: true, zonaEnvio: ZONAS.PROVINCIA }),
        order('stock', { prioridadCRM: true, isStockPaused: true }),
        order('estampado', { prioridadCRM: true, status: STAGES.ESTAMPADO }),
        order('empaquetado', { prioridadCRM: true, status: STAGES.EMPAQUETADO }),
        order('cobranza', { prioridadCRM: true, cobranza: { estado: 'Pendiente' } }),
        order('reparto', { prioridadCRM: true, status: 'despacho' }),
        order('normal'),
        order('registro', { esPrioridad: true }),
    ];
    const count = orders.filter(o => isOrderInView(o, ORDER_VIEWS.PRIORIDAD)).length;
    assert.equal(count, 5);
    assert.equal(count, priorityOrders(orders).length);
    assert.deepEqual(ids(orders.filter(o => isOrderInView(o, STAGES.PREPARACION))), ['normal', 'registro']);
});

test('Prioridad respeta cobranza en Preparación y conserva pedidos posteriores', () => {
    const orders = [
        order('pendiente', { prioridadCRM: true, cobranza: { estado: 'Pendiente' } }),
        order('sin-cobranza', { prioridadCRM: true, cobranza: undefined }),
        order('listo', { prioridadCRM: true }),
        order('ya-estampado', { prioridadCRM: true, status: STAGES.ESTAMPADO, cobranza: undefined }),
    ];
    assert.deepEqual(ids(priorityOrders(orders)), ['listo', 'ya-estampado']);
});

test('ordena por fecha de marcado y deja la pausa por stock al final sin posición', () => {
    const orders = [
        order('reciente', { prioridadCRM: true, prioridadCRMDesde: { seconds: 20 } }),
        order('pausado', { prioridadCRM: true, prioridadCRMDesde: { seconds: 1 }, isStockPaused: true }),
        order('antiguo', { prioridadCRM: true, prioridadCRMDesde: { seconds: 10 }, numeroCola: 99 }),
        order('sin-fecha', { prioridadCRM: true }),
    ];
    const result = priorityOrders(orders);
    assert.deepEqual(ids(result), ['antiguo', 'reciente', 'sin-fecha', 'pausado']);
    assert.deepEqual(result.map(o => o.numeroColaDisplay), ['P-1', 'P-2', 'P-3', null]);
    assert.equal(orders[2].numeroCola, 99, 'no cambia el ticket original');
});

test('al desmarcar o salir a Reparto desaparece de Prioridad', () => {
    const marked = order('pedido', { prioridadCRM: true });
    assert.equal(priorityOrders([marked]).length, 1);
    assert.equal(priorityOrders([{ ...marked, prioridadCRM: false }]).length, 0);
    assert.deepEqual(ids(getOrdersForView([{ ...marked, prioridadCRM: false }], STAGES.PREPARACION)), ['pedido']);
    assert.equal(priorityOrders([{ ...marked, status: 'despacho' }]).length, 0);
    assert.equal(priorityOrders([{ ...marked, status: STAGES.EMPAQUETADO }])[0].status, STAGES.EMPAQUETADO);
});

test('Preparación conserva el split por zona y buscar permite encontrar ambas zonas', () => {
    const orders = [
        order('lima'),
        order('provincia', { zonaEnvio: ZONAS.PROVINCIA }),
        order('cache-agencia', { zonaEnvio: undefined, deliveryType: 'AGENCIA' }),
    ];
    const options = { zonaSplitEnabled: true, prepZona: ZONAS.PROVINCIA };
    assert.deepEqual(ids(getOrdersForView(orders, STAGES.PREPARACION, options)), ['provincia', 'cache-agencia']);
    assert.deepEqual(ids(getOrdersForView(orders, STAGES.PREPARACION, { ...options, hasSearch: true })), ['lima', 'provincia', 'cache-agencia']);
});

test('las áreas conservan prioridad de registro y orden de pago, excluyendo prioridad CRM', () => {
    const orders = [
        order('pago-reciente', { cobranza: { estado: 'Habilitado', fechaPagoCero: { seconds: 20 } } }),
        order('pago-antiguo', { cobranza: { estado: 'Habilitado', fechaPagoCero: { seconds: 10 } }, numeroCola: 50 }),
        order('registro', { esPrioridad: true }),
        order('crm', { prioridadCRM: true }),
        order('sin-fecha'),
        order('pausado', { isStockPaused: true }),
    ].map(o => ({ ...o, zonaEnvio: ZONAS.PROVINCIA }));
    const result = getOrdersForView(orders, STAGES.PREPARACION, { zonaSplitEnabled: true, prepZona: ZONAS.PROVINCIA });
    assert.deepEqual(ids(result), ['registro', 'sin-fecha', 'pago-antiguo', 'pago-reciente', 'pausado']);
    assert.deepEqual(result.map(o => o.numeroColaDisplay), ['P-1', '1', '2', '3', null]);
});
