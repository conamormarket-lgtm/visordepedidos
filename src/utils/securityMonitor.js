/**
 * Monitor de seguridad para evitar consumo excesivo de Firebase.
 * Detecta si hay demasiadas operaciones por segundo durante un tiempo prolongado.
 */

class SecurityMonitor {
    constructor() {
        this.threshold = 10; // Elevado ligeramente para evitar falsos positivos en navegación rápida local
        this.hardLimit = 300; // Bloqueo inmediato si se supera esto en 1s
        this.durationThreshold = 3; // Segundos consecutivos
        this.consecutiveOffenses = 0;
        this.lastSecondOps = 0;
        this.lastSecondTimestamp = Math.floor(Date.now() / 1000);

        this.isEmergencyBrakeActive = false;
        this.isInitialLoad = true;
        this.listeners = [];

        // Iniciar el ciclo de monitoreo
        this._startMonitoring();

        // Desactivar "isInitialLoad" después de un periodo de gracia
        setTimeout(() => {
            console.log("Monitor: Fin del periodo de carga inicial. Protección activa.");
            this.isInitialLoad = false;
        }, 10000);
    }

    _startMonitoring() {
        setInterval(() => {
            const currentSecond = Math.floor(Date.now() / 1000);

            if (currentSecond > this.lastSecondTimestamp) {
                // Si estamos en un nuevo segundo, evaluar el anterior
                if (!this.isInitialLoad && !this.isEmergencyBrakeActive) {
                    // 1. Hard Limit Check (Inmediato)
                    if (this.lastSecondOps >= this.hardLimit) {
                        console.error(`Monitor: HARD LIMIT REACHED! ${this.lastSecondOps} ops in 1s.`);
                        this._triggerEmergencyBrake(`Limite crítico de ${this.hardLimit} ops/seg superado.`);
                        return;
                    }

                    // 2. Sustained Threshold Check
                    if (this.lastSecondOps >= this.threshold) {
                        this.consecutiveOffenses++;
                        console.warn(`Monitor: Alerta! ${this.lastSecondOps} ops en el último segundo. Ofensas: ${this.consecutiveOffenses}`);
                    } else {
                        this.consecutiveOffenses = 0;
                    }

                    if (this.consecutiveOffenses >= this.durationThreshold) {
                        this._triggerEmergencyBrake(`Consumo sostenido detectado (> ${this.threshold} ops/seg por ${this.durationThreshold}s).`);
                    }
                }

                // Reset para el nuevo segundo
                this.lastSecondOps = 0;
                this.lastSecondTimestamp = currentSecond;
            }
        }, 100); // Revisar frecuentemente
    }

    registerOperation(count = 1) {
        if (this.isEmergencyBrakeActive) {
            throw new Error("SISTEMA BLOQUEADO: Freno de emergencia activado por consumo excesivo.");
        }
        this.lastSecondOps += count;
    }

    _triggerEmergencyBrake(reason = "Consumo excesivo detectado.") {
        console.error("!!! FRENO DE EMERGENCIA ACTIVADO !!!", reason);
        this.isEmergencyBrakeActive = true;
        this.listeners.forEach(cb => cb(true, reason));
    }

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    getIsLocked() {
        return this.isEmergencyBrakeActive;
    }
}

export const securityMonitor = new SecurityMonitor();
