import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('./regalos.js', import.meta.url), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const context = vm.createContext({});
vm.runInContext(source + '\nglobalThis.etiquetaRegalo = etiquetaRegalo;', context);
const { etiquetaRegalo } = context;

test('un regalo se nombra por producto y color', () => {
    assert.equal(etiquetaRegalo({ tipo: 'Gorro', attrs: { Color: 'Blanco' } }), 'Gorro Blanco');
});

test('un regalo empaquetado antes del cambio se muestra sin su marca', () => {
    assert.equal(etiquetaRegalo({ tipo: 'Placa', attrs: { 'Marca / Diseño': 'Alianza', Color: 'Negro' } }), 'Placa Negro');
    assert.equal(etiquetaRegalo({ tipo: 'Mousepad', attrs: { Color: 'Negro', 'Marca / Diseño': 'Sin marca' } }), 'Mousepad Negro');
});

test('el collar viejo se muestra con su nombre actual', () => {
    assert.equal(etiquetaRegalo({ tipo: 'Collar', attrs: { Color: 'Plateado', 'Marca / Diseño': 'Sol y luna' } }), 'Collar Sol y luna Plateado');
    assert.equal(etiquetaRegalo({ tipo: 'Collar Sol y luna', attrs: { Color: 'Plateado' } }), 'Collar Sol y luna Plateado');
});
