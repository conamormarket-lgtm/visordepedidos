import test from 'node:test';
import assert from 'node:assert/strict';
import { convertDriveLink } from './drive.js';

const original = 'https://drive.google.com/file/d/archivoA/view?usp=sharing';

test('reutiliza la miniatura entre renders y componentes de la misma sesión', () => {
    const first = convertDriveLink(original);
    assert.equal(convertDriveLink(original), first);
    assert.ok(new URL(first).searchParams.get('v'));
});

test('cambiar el enlace renueva la versión incluso conservando el ID de Drive', () => {
    const first = new URL(convertDriveLink(original));
    const changed = new URL(convertDriveLink(original.replace('sharing', 'drive_link')));
    assert.equal(first.pathname, changed.pathname);
    assert.notEqual(first.searchParams.get('v'), changed.searchParams.get('v'));
    const other = new URL(convertDriveLink(original.replace('archivoA', 'archivoB')));
    assert.match(other.pathname, /^\/d\/archivoB=w\d+$/);
    assert.notEqual(first.searchParams.get('v'), other.searchParams.get('v'));
});

test('una nueva sesión no reutiliza la URL de la sesión anterior', async () => {
    const newSession = await import('./drive.js?new-session');
    assert.notEqual(newSession.convertDriveLink(original), convertDriveLink(original));
});

test('conserva enlaces externos y admite enlaces de Drive con id en query', () => {
    assert.equal(convertDriveLink(''), '');
    const external = 'https://example.com/image.png?token=abc';
    assert.equal(convertDriveLink(external), external);
    const thumbnail = new URL(convertDriveLink('https://drive.google.com/open?id=archivoC'));
    assert.match(thumbnail.pathname, /^\/d\/archivoC=w\d+$/);
});

test('versiona el recurso final sin la redirección de Drive que elimina la versión', () => {
    const thumbnail = new URL(convertDriveLink(original));
    assert.equal(thumbnail.origin, 'https://lh3.googleusercontent.com');
    assert.match(thumbnail.pathname, /^\/d\/archivoA=w\d+$/);
    assert.ok(thumbnail.searchParams.get('v'));
});
