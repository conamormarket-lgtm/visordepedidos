export const fechaMilisegundos = (value) => {
    if (value == null) return null;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') {
        return value.seconds * 1000 + (value.nanoseconds || 0) / 1e6;
    }
    const millis = new Date(value).getTime();
    return Number.isFinite(millis) ? millis : null;
};

// Duración en segundos, con tres decimales. Sin inicio no se inventa una duración.
export const calcularTiempoEstampado = (inicio, salida) => {
    const desde = fechaMilisegundos(inicio);
    const hasta = fechaMilisegundos(salida);
    if (desde === null) return null;
    if (hasta === null || hasta < desde) {
        throw new Error('La hora de salida es anterior al inicio de estampado. Revisa el reloj del dispositivo.');
    }
    return Math.round(hasta - desde) / 1000;
};
