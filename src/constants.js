export const STAGES = {
    PREPARACION: 'preparacion',
    ESTAMPADO: 'estampado',
    EMPAQUETADO: 'empaquetado',
};

export const STAGE_LABELS = {
    [STAGES.PREPARACION]: 'PREPARACIÓN',
    [STAGES.ESTAMPADO]: 'ESTAMPADO',
    [STAGES.EMPAQUETADO]: 'EMPAQUETADO',
};

export const STAGE_COLORS = {
    [STAGES.PREPARACION]: 'bg-blue-500',
    [STAGES.ESTAMPADO]: 'bg-indigo-500', // Placeholder
    [STAGES.EMPAQUETADO]: 'bg-purple-500', // Placeholder
};

// ── Split Lima / Provincia en Preparación ────────────────────────────────
export const ZONAS = {
    LIMA: 'lima',
    PROVINCIA: 'provincia',
};

export const ZONA_LABELS = {
    [ZONAS.LIMA]: 'LIMA',
    [ZONAS.PROVINCIA]: 'PROVINCIA',
};

// Kill-switch del split. Para apagarlo en un dispositivo SIN redeploy:
//   localStorage.setItem('VISOR_ZONA_SPLIT', 'off'); location.reload();
// Para volver a encenderlo:
//   localStorage.removeItem('VISOR_ZONA_SPLIT'); location.reload();
export const ZONA_SPLIT_DEFAULT = true;

export const isZonaSplitEnabled = () => {
    try {
        const override = localStorage.getItem('VISOR_ZONA_SPLIT');
        if (override === 'off' || override === 'false') return false;
        if (override === 'on' || override === 'true') return true;
    } catch (e) {
        // localStorage no disponible (modo privado): usar el default
    }
    return ZONA_SPLIT_DEFAULT;
};

// ── Envío de imágenes al ERP (etapa Impresión) ───────────────────────────
// Kill-switch del botón "Enviar a ERP" del visor. Para apagarlo sin redeploy:
//   localStorage.setItem('VISOR_ENVIAR_ERP', 'off'); location.reload();
// Apagado, al tocar una imagen se abre directo en una pestaña nueva, como antes.
export const ENVIAR_ERP_DEFAULT = true;

export const isEnviarErpEnabled = () => {
    try {
        const override = localStorage.getItem('VISOR_ENVIAR_ERP');
        if (override === 'off' || override === 'false') return false;
        if (override === 'on' || override === 'true') return true;
    } catch (e) {
        // localStorage no disponible: usar el default
    }
    return ENVIAR_ERP_DEFAULT;
};
