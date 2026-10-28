/**
 * Monitor de seguridad para evitar consumo excesivo de Firebase.
 * Detecta si hay demasiadas operaciones por segundo durante un tiempo prolongado.
 *
 * Cada operación se anota en el segundo real (reloj) en que ocurre. Antes el
 * conteo solo se reiniciaba cuando corría el setInterval, y con la tablet en
 * reposo o la pestaña en segundo plano el navegador lo frena a una vez por
 * minuto (o lo congela): todo lo leído en ese rato se sumaba como si fuera un
 * solo segundo y al volver saltaba el freno sin que hubiera ningún bucle.
 */

export class SecurityMonitor {
    constructor({ now = () => Date.now(), autoStart = true } = {}) {
        this.now = now;
        this.threshold = 10; // Elevado ligeramente para evitar falsos positivos en navegación rápida local
        this.hardLimit = 300; // Bloqueo inmediato si se supera esto en 1s
        this.durationThreshold = 3; // Segundos consecutivos
        this.gracePeriodMs = 10000; // Carga inicial sin protección
        this.consecutiveOffenses = 0;
        this.currentSecond = this._second();
        this.currentOps = 0;
        this.startedAt = this.now();

        this.isEmergencyBrakeActive = false;
        this.listeners = [];

        // El intervalo solo cierra segundos sin operaciones (para cortar rachas);
        // si se atrasa no importa, porque cada operación ya lleva su segundo.
        if (autoStart) {
            const timer = setInterval(() => this._closeSecondsUntil(this._second()), 1000);
            timer.unref?.(); // En Node (tests) no mantiene vivo el proceso
        }
    }

    _second() {
        return Math.floor(this.now() / 1000);
    }

    _isInGracePeriod() {
        return this.now() - this.startedAt < this.gracePeriodMs;
    }

    _closeSecondsUntil(second) {
        if (second <= this.currentSecond) return;

        if (!this.isEmergencyBrakeActive && !this._isInGracePeriod()) {
            if (this.currentOps >= this.threshold) {
                this.consecutiveOffenses++;
                console.warn(`Monitor: Alerta! ${this.currentOps} ops en el último segundo. Ofensas: ${this.consecutiveOffenses}`);
            } else {
                this.consecutiveOffenses = 0;
            }

            if (this.consecutiveOffenses >= this.durationThreshold) {
                this._triggerEmergencyBrake(`Consumo sostenido detectado (> ${this.threshold} ops/seg por ${this.durationThreshold}s).`);
            }

            // Un segundo sin operaciones en medio corta la racha.
            if (second - this.currentSecond > 1) this.consecutiveOffenses = 0;
        }

        this.currentSecond = second;
        this.currentOps = 0;
    }

    registerOperation(count = 1) {
        if (this.isEmergencyBrakeActive) {
            throw new Error("SISTEMA BLOQUEADO: Freno de emergencia activado por consumo excesivo.");
        }
        this._closeSecondsUntil(this._second());
        this.currentOps += count;

        if (!this._isInGracePeriod() && this.currentOps >= this.hardLimit) {
            console.error(`Monitor: HARD LIMIT REACHED! ${this.currentOps} ops in 1s.`);
            this._triggerEmergencyBrake(`Limite crítico de ${this.hardLimit} ops/seg superado.`);
        }
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
