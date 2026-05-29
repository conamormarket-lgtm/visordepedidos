const LOCAL_STORAGE_KEY = 'visor_device_order_stats';

const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getStats = () => {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        const today = getLocalDateString();
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && parsed.date === today && parsed.counts) {
                // Ensure all expected fields are present
                const counts = {
                    preparacion: parsed.counts.preparacion || 0,
                    estampado: parsed.counts.estampado || 0,
                    empaquetado: parsed.counts.empaquetado || 0,
                };
                return { date: today, counts };
            }
        }
        // If not found or date mismatch, initialize/reset
        const initial = {
            date: today,
            counts: {
                preparacion: 0,
                estampado: 0,
                empaquetado: 0
            }
        };
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
        return initial;
    } catch (e) {
        console.error('Error reading stats from localStorage:', e);
        return {
            date: getLocalDateString(),
            counts: { preparacion: 0, estampado: 0, empaquetado: 0 }
        };
    }
};

export const incrementCount = (stage) => {
    try {
        const current = getStats();
        // Just in case the stage is not key matching
        if (current.counts[stage] !== undefined) {
            current.counts[stage] += 1;
        } else {
            console.warn(`[deviceStats] Intentando incrementar etapa desconocida: ${stage}`);
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
        return current;
    } catch (e) {
        console.error('Error incrementing stats:', e);
        return getStats();
    }
};

export const decrementCount = (stage) => {
    try {
        const current = getStats();
        if (current.counts[stage] !== undefined && current.counts[stage] > 0) {
            current.counts[stage] -= 1;
        }
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
        return current;
    } catch (e) {
        console.error('Error decrementing stats:', e);
        return getStats();
    }
};
