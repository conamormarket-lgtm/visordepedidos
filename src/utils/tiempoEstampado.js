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
export const calcularTiempoEtapa = (inicio, salida) => {
    const desde = fechaMilisegundos(inicio);
    const hasta = fechaMilisegundos(salida);
    if (desde === null) return null;
    if (hasta === null || hasta < desde) {
        throw new Error('La hora de salida es anterior al inicio de la etapa. Revisa el reloj del dispositivo.');
    }
    return Math.round(hasta - desde) / 1000;
};

// Compatibilidad con el cálculo de estampado existente.
export const calcularTiempoEstampado = calcularTiempoEtapa;

// Impresión se mide por sus fechas registradas, sin inicio manual.
export const calcularTiempoImpresion = (impresion) => {
    const entrada = fechaMilisegundos(impresion?.fechaEntrada);
    const salida = fechaMilisegundos(impresion?.fechaSalida);
    if (!Number.isFinite(entrada) || !Number.isFinite(salida) || salida < entrada) return null;
    return Math.round(salida - entrada) / 1000;
};
