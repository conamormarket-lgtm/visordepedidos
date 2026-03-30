/**
 * ╔═══════════════════════════════════════════════╗
 * ║         Servicio de Impresión ZPL             ║
 * ║         Zebra ZD230 — 3" × 2.02"             ║
 * ╚═══════════════════════════════════════════════╝
 *
 * Genera el ZPL a partir de los datos del pedido
 * y lo envía al servidor local print-server.js.
 *
 * ⚙️ CONFIGURACIÓN:
 *   Cambia PRINT_SERVER_URL a la IP de la PC donde
 *   corre print-server.js en tu red LAN.
 *   Ejemplo: 'http://192.168.18.50:3001'
 *
 *   También puedes sobreescribir la URL desde la
 *   consola del navegador con:
 *     localStorage.setItem('visor_print_server', 'http://192.168.18.XX:3001')
 */

// ── IP del servidor de impresión (PC con print-server.cjs corriendo) ────────
// IP de la PC en la red LAN donde corre print-server.cjs
const DEFAULT_PRINT_SERVER = 'http://192.168.18.82:3001';

const getPrintServerUrl = () =>
    localStorage.getItem('visor_print_server') || DEFAULT_PRINT_SERVER;

// ── Generador de ZPL ─────────────────────────────────────────────────────────
/**
 * Genera el contenido ZPL para la etiqueta de envío.
 * Etiqueta: 3" × 2.02" — DPI: 203
 *
 * @param {object} order - Objeto normalizado del pedido
 */
export const generateZpl = (order) => {
    // Texto seguro: vacío si no hay valor
    const s = (val) => (val != null ? String(val).trim() : '');

    // Etiqueta: 3" × 1.97" — 203 DPI → 609 × 400 dots
    // Fuente: 50 dots. Última línea en Y=340 → termina en Y=390, margen de 10 dots
    const zpl = [
        '^XA',
        '^CF0,50,30',
        `^FO50,30^FDRecibe: ${s(order.envioNombres)}^FS`,
        `^FO50,90^FD${s(order.envioApellidos)}^FS`,
        `^FO50,160^FDDNI: ${s(order.envioNumeroDocumento)}^FS`,
        `^FO50,220^FDTelefono: ${s(order.envioContacto)}^FS`,
        `^FO50,280^FDAgencia: ${s(order.agenciaEnvio)}^FS`,
        `^FO50,340^FDSede: ${s(order.envioDireccionLima)}^FS`,
        '^XZ',
    ].join('\n');

    return zpl;
};

// ── Envío al servidor de impresión ───────────────────────────────────────────
/**
 * Genera el ZPL del pedido y lo envía al print-server.js local.
 *
 * @param {object} order - Objeto normalizado del pedido
 * @returns {Promise<{ok: boolean, message: string}>}
 * @throws {Error} si falla la conexión o la impresora no responde
 */
export const printTicket = async (order) => {
    const serverUrl = getPrintServerUrl();
    const zpl = generateZpl(order);

    console.log(`[Print] Enviando a ${serverUrl}/imprimir`);
    console.log('[Print] ZPL generado:\n', zpl);

    let response;
    try {
        response = await fetch(`${serverUrl}/imprimir`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zpl }),
        });
    } catch (networkErr) {
        throw new Error(
            `No se pudo conectar al servidor de impresión (${serverUrl}). ` +
            `¿Está corriendo print-server.js en esa PC?`
        );
    }

    const data = await response.json();

    if (!response.ok || !data.ok) {
        throw new Error(data.error || `Error del servidor: ${response.status}`);
    }

    return { ok: true, message: data.message || 'Ticket impreso correctamente' };
};

/**
 * Verifica que el servidor de impresión esté activo.
 * @returns {Promise<boolean>}
 */
export const pingPrintServer = async () => {
    try {
        const res = await fetch(`${getPrintServerUrl()}/ping`, { signal: AbortSignal.timeout(3000) });
        const data = await res.json();
        return data.ok === true;
    } catch {
        return false;
    }
};
