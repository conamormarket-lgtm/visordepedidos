/**
 * Clasificación Lima / Provincia.
 *
 * PUERTO EXACTO del criterio del Sistema Gestión (lib/constants.ts →
 * LIMA_PROVINCIAS_NAMES + calcularTipoEnvio). Si allá cambia el criterio,
 * este archivo debe actualizarse igual: es la misma regla de negocio.
 *
 *   - Callao                                   → delivery (LIMA)
 *   - Lima + provincia "Lima Metropolitana"    → delivery (LIMA)
 *   - Lima + provincia "Lima" (dato antiguo)   → delivery (LIMA)
 *   - Lima + provincia "Provincia"             → agencia  (PROVINCIA)
 *   - Lima + provincia de LIMA_PROVINCIAS_NAMES→ agencia  (PROVINCIA)
 *   - Lima + provincia desconocida             → delivery (LIMA)  [default]
 *   - Cualquier otro departamento              → agencia  (PROVINCIA)
 */

// Provincias que pertenecen a Lima Provincias (excluyen Lima Metropolitana)
export const LIMA_PROVINCIAS_NAMES = [
    "Barranca", "Cajatambo", "Canta", "Cañete",
    "Huaral", "Huarochirí", "Huarochiri", "Huaura", "Oyón", "Oyon", "Yauyos",
];

/**
 * Determina el tipo de envío basado en departamento + provincia del pedido.
 * @returns {"delivery"|"agencia"}
 */
export const calcularTipoEnvio = ({
    envioDepartamento,
    envioProvincia,
    clienteDepartamento,
    clienteProvincia,
} = {}) => {
    const dept = (envioDepartamento || clienteDepartamento || "").trim().toUpperCase();
    const prov = (envioProvincia || clienteProvincia || "").trim();
    const provUpper = prov.toUpperCase();

    if (dept === "CALLAO") return "delivery";

    if (dept === "LIMA") {
        if (provUpper === "LIMA METROPOLITANA") return "delivery";
        if (provUpper === "PROVINCIA") return "agencia";
        // Compatibilidad con datos antiguos donde la provincia era simplemente "Lima"
        if (provUpper === "LIMA") return "delivery";
        // Si la provincia coincide con alguna de Lima Provincias
        const esLimaProvincia = LIMA_PROVINCIAS_NAMES.some(
            (lp) => lp.toUpperCase() === provUpper
        );
        if (esLimaProvincia) return "agencia";
        // Provincia de Lima no identificada → default delivery
        return "delivery";
    }

    // Cualquier otro departamento → agencia
    return "agencia";
};

/**
 * Zona de un pedido ya normalizado (o de un doc crudo de Firebase).
 * @returns {"lima"|"provincia"}
 */
export const calcularZonaEnvio = (pedido) => (
    calcularTipoEnvio({
        envioDepartamento: pedido?.envioDepartamento,
        envioProvincia: pedido?.envioProvincia,
        clienteDepartamento: pedido?.clienteDepartamento,
        clienteProvincia: pedido?.clienteProvincia,
    }) === "delivery" ? "lima" : "provincia"
);
