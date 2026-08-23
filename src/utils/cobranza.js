/**
 * cobranza.fechaPagoCero — el momento en que la deudaTotal del pedido llegó a 0.
 *
 * Lo escribe el Sistema Gestión una sola vez, la primera vez que la deuda queda
 * saldada, y no lo vuelve a tocar en pagos posteriores (ver firestore-adapter).
 * Es el criterio que ordena la cola de Provincia: el que canceló primero se
 * prepara primero.
 */

/**
 * Devuelve el momento del pago completo en segundos, o null si el pedido no
 * tiene el dato.
 *
 * Un null NO significa "no pagó": en Preparación solo entran pedidos con
 * cobranza "Habilitado" (deuda 0). Significa que terminó de pagar antes de que
 * el ERP empezara a registrar la fecha, así que es de los más antiguos.
 */
export const segundosPagoCero = (order) => {
    const f = order?.cobranza?.fechaPagoCero;
    if (!f) return null;
    if (typeof f.seconds === 'number') return f.seconds;
    const ms = new Date(f).getTime();
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
};

/**
 * Texto corto para mostrar en la tarjeta: "22 ago, 21:48".
 * Devuelve null si el pedido no tiene la fecha.
 */
export const formatearPagoCero = (order) => {
    const seg = segundosPagoCero(order);
    if (seg === null) return null;
    const d = new Date(seg * 1000);
    if (Number.isNaN(d.getTime())) return null;
    // Se arma por partes: es-PE junta el dia y el mes como "20-ago." y en un
    // badge chico eso se lee peor que "20 ago".
    const dia = String(d.getDate()).padStart(2, '0');
    // toLowerCase: segun el entorno (version de ICU, navegador) el mes corto
    // sale "ago" o "Ago". Se fuerza para que se vea igual en toda tablet.
    const mes = d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '').toLowerCase();
    const hora = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dia} ${mes}, ${hora}`;
};
