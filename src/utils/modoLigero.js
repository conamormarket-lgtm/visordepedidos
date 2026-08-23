/**
 * Modo ligero — para las tablets de gama baja del taller.
 *
 * Apaga los efectos que más cuestan en GPU débil (backdrop-filter, los blobs
 * desenfocados del fondo, las animaciones de entrada) y baja la resolución de
 * las imágenes de Drive. Ver las reglas `.modo-ligero` en index.css.
 *
 * Viene ENCENDIDO por defecto: las tablets de producción son básicas. Se puede
 * apagar desde el botón del Header o desde la consola:
 *   localStorage.setItem('VISOR_MODO_LIGERO', 'off'); location.reload();
 */

const STORAGE_KEY = 'VISOR_MODO_LIGERO';
const CLASS_NAME = 'modo-ligero';

const leerPreferencia = () => {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (v === 'off' || v === 'false') return false;
        if (v === 'on' || v === 'true') return true;
    } catch (e) {
        // localStorage no disponible: quedarse con el default
    }
    return true;
};

let activo = leerPreferencia();
const listeners = new Set();

const aplicarClase = () => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle(CLASS_NAME, activo);
};

export const isModoLigero = () => activo;

export const setModoLigero = (valor) => {
    const nuevo = !!valor;
    if (nuevo === activo) return;
    activo = nuevo;
    try {
        localStorage.setItem(STORAGE_KEY, activo ? 'on' : 'off');
    } catch (e) {
        console.warn('[modoLigero] No se pudo guardar la preferencia:', e);
    }
    aplicarClase();
    listeners.forEach(fn => fn(activo));
};

export const toggleModoLigero = () => setModoLigero(!activo);

export const subscribeModoLigero = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

// Se aplica al importar el módulo, antes del primer render, para que no haya
// un parpadeo con los efectos pesados encendidos.
aplicarClase();
