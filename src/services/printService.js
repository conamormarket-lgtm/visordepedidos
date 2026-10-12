/**
 * ╔═══════════════════════════════════════════════╗
 * ║         Servicio de Impresión ZPL             ║
 * ║         Zebra ZD230 — 3" × 2.02"             ║
 * ╚═══════════════════════════════════════════════╝
 *
 * Genera el ZPL a partir de los datos del pedido
 * y lo guarda en print_queue para servidor-impresion-nube.js.
 */

import { db, ensureFirebaseAuth } from '../firebase/config.js';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
        '^CF0,30,30',
        `^FO50,30^FDRecibe: ^FS`,
        `^FO50,70^FD${s(order.envioNombres)} ${s(order.envioApellidos)}^FS`,
        `^FO50,110^FDDNI: ${s(order.envioNumeroDocumento)}^FS`,
        `^FO50,150^FDTelefono: ${s(order.envioContacto)}^FS`,
        `^FO50,190^FDAgencia: ${s(order.agenciaEnvio)}^FS`,
        `^FO50,230^FDSede:^FS`,
        `^FO50,270^FD${s(order.envioDireccionLima)}^FS`,
        `^FO50,310^FDNro de Pedido: ${s(order.orderId)}^FS`,
        '^XZ',
    ].join('\n');

    return zpl;
};

// ── Envío a la cola de impresión en la nube ────────────────────────────────
/**
 * Guarda el ZPL en Firebase. La PC local que tiene la Zebra
 * está escuchando esta base de datos e imprimirá automáticamente.
 *
 * @param {object} order - Objeto normalizado del pedido
 * @returns {Promise<{ok: boolean, message: string}>}
 */
export const printTicket = async (order) => {
    const zpl = generateZpl(order);
    console.log('[Print Cloud] Enviando ticket a Firebase...');

    try {
        await ensureFirebaseAuth();
        await addDoc(collection(db, 'print_queue'), {
            zpl,
            orderId: order.id || order.Id || 'Desconocido',
            status: 'pending',
            createdAt: serverTimestamp(),
            printedAt: null
        });
        return { ok: true, message: 'Ticket en cola. Pendiente de impresión en la PC de la Zebra.' };
    } catch (err) {
        console.error('Error enviando a la nube:', err);
        const code = err?.code;
        const message = code === 'permission-denied'
            ? 'Firebase rechazó el acceso a la cola de impresión. Revisa los permisos de print_queue.'
            : code?.startsWith('auth/')
                ? 'No se pudo iniciar la sesión de Firebase para imprimir. Revisa la conexión y vuelve a intentarlo.'
                : 'No se pudo enviar el ticket. Verifica tu conexión a internet.';
        const error = new Error(message, { cause: err });
        error.code = code;
        throw error;
    }
};

/**
 * Verifica que el servidor de impresión esté activo.
 * En el modelo cloud, siempre asumimos true o verificamos la conexión a internet.
 * @returns {Promise<boolean>}
 */
export const pingPrintServer = async () => true;
