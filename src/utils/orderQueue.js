import { ORDER_VIEWS, STAGES, ZONAS } from '../constants.js';
import { segundosPagoCero } from './cobranza.js';

export const zonaDe = (order) => (
    order?.zonaEnvio
    ?? (order?.deliveryType === 'AGENCIA' ? ZONAS.PROVINCIA : ZONAS.LIMA)
);

// Las mismas reglas de elegibilidad se aplican a la vista de un área y a Prioridad.
export const getOrdersForView = (allOrders, currentView, {
    zonaSplitEnabled = false,
    prepZona = ZONAS.LIMA,
    hasSearch = false,
} = {}) => {
    const priorityView = currentView === ORDER_VIEWS.PRIORIDAD;
    let stageOrders = allOrders.filter(order => (
        (priorityView
            ? order.prioridadCRM === true && Object.values(STAGES).includes(order.status)
            : order.status === currentView)
        && (order.status !== STAGES.PREPARACION || order.cobranza?.estado === 'Habilitado')
    ));

    // Prioridad reúne Lima y Provincia. Buscar dentro de Preparación también
    // encuentra ambas zonas, igual que antes.
    const filtrandoPorZona = zonaSplitEnabled
        && currentView === STAGES.PREPARACION
        && !hasSearch;
    if (filtrandoPorZona) {
        stageOrders = stageOrders.filter(order => zonaDe(order) === prepZona);
    }

    // Solo la cola de PROVINCIA se ordena por el momento en que el cliente
    // terminó de pagar. Lima mantiene el orden por número de cola.
    const ordenarPorPago = filtrandoPorZona && prepZona === ZONAS.PROVINCIA;

    // ── Orden de cola unificado para todas las etapas ───────────────────────────────
    // Grupo 0: pedidos marcados como prioridad desde el CRM (prioridadCRM),
    //          ordenados por el momento del marcado (el primero marcado, primero).
    // Grupo 1: pedidos prioritarios (esPrioridad=true y no en pausa por stock)
    //          ordenados ascendentemente por numeroCola.
    // Grupo 2: pedidos normales (no prioritarios, no en pausa por stock)
    //          ordenados ascendentemente por numeroCola.
    // Grupo 3: pedidos en pausa por stock (siempre al final).
    stageOrders = [...stageOrders].sort((a, b) => {
        const aStock = a.isStockPaused ? 1 : 0;
        const bStock = b.isStockPaused ? 1 : 0;

        // Pausa por stock siempre al final (sin stock no se puede preparar,
        // aunque el CRM lo haya marcado como prioridad)
        if (aStock !== bStock) return aStock - bStock;

        // Grupo 0: lo marcado desde el CRM va delante de todo lo activo.
        const aCRM = a.prioridadCRM ? 0 : 1;
        const bCRM = b.prioridadCRM ? 0 : 1;
        if (aCRM !== bCRM) return aCRM - bCRM;
        if (aCRM === 0) {
            // Entre varios marcados: el que se marco primero se prepara primero.
            // Sin fecha (dato viejo) va al final del grupo.
            const aTs = a.prioridadCRMDesde?.seconds ?? Infinity;
            const bTs = b.prioridadCRMDesde?.seconds ?? Infinity;
            if (aTs !== bTs) return aTs - bTs;
        }

        // Dentro de los activos: prioridad primero
        const aPriority = a.esPrioridad ? 0 : 1;
        const bPriority = b.esPrioridad ? 0 : 1;
        if (aPriority !== bPriority) return aPriority - bPriority;

        // En la cola de Provincia manda el orden en que terminaron de
        // pagar: el que canceló primero se prepara primero.
        if (ordenarPorPago) {
            const aPago = segundosPagoCero(a);
            const bPago = segundosPagoCero(b);
            if (aPago !== bPago) {
                if (aPago === null) return -1; // sin fecha = el más antiguo
                if (bPago === null) return 1;
                return aPago - bPago;
            }
        }

        // Dentro del mismo grupo: ordenar por numeroCola ascendente.
        // Si un pedido no tiene numeroCola va al final de su grupo.
        // (En Provincia esto ya solo desempata pagos simultáneos o los
        // pedidos que no tienen fechaPagoCero.)
        const aCol = a.numeroCola ?? Infinity;
        const bCol = b.numeroCola ?? Infinity;
        return aCol - bCol;
    });

    // ── Renumeración en tiempo real de las posiciones de cola ──────────────────
    // El numeroCola guardado en Firebase es el ticket de entrada (nunca baja),
    // pero lo que el usuario necesita ver es su POSICIÓN ACTUAL en la cola.
    // La calculamos aquí, en el cliente, a partir del orden ya sorted, sin
    // costo de red ni escrituras a Firebase.
    //
    //  Grupo prioridad activos → P-1, P-2, P-3 ...  (los marcados desde el
    //                             CRM entran primeros en esa misma serie)
    //  Grupo normal activos    → 1, 2, 3 ...
    //  Pausa por stock         → sin número de cola
    let posPrioridad = 0;
    let posNormal    = 0;
    stageOrders = stageOrders.map(order => {
        if (order.isStockPaused) {
            // En pausa por stock: sin número de cola asignado
            return { ...order, numeroColaDisplay: null, numeroCola: null };
        }
        if (order.prioridadCRM || order.esPrioridad) {
            posPrioridad++;
            return {
                ...order,
                numeroCola:        posPrioridad,
                numeroColaDisplay: `P-${posPrioridad}`,
            };
        }
        posNormal++;
        return {
            ...order,
            numeroCola:        posNormal,
            numeroColaDisplay: String(posNormal),
        };
    });

    return stageOrders;
};
