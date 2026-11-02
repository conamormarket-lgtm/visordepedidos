/**
 * Diagnóstico de actividad sin bloquear la aplicación.
 * Cuenta operaciones registradas, no lecturas facturadas de Firebase.
 * Usa el reloj de cada operación para evitar falsas ráfagas al volver del reposo.
 */

export class SecurityMonitor {
    constructor({ now = () => Date.now(), autoStart = true } = {}) {
        this.now = now;
        this.threshold = 10; // Elevado ligeramente para evitar falsos positivos en navegación rápida local
        this.hardLimit = 300; // Umbral de aviso de ráfaga
        this.durationThreshold = 3; // Segundos consecutivos
        this.gracePeriodMs = 10000; // Carga inicial sin avisos
        this.consecutiveOffenses = 0;
        this.currentSecond = this._second();
        this.currentOps = 0;
        this.startedAt = this.now();


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

        if (!this._isInGracePeriod()) {
            if (this.currentOps >= this.threshold) {
                this.consecutiveOffenses++;
            } else {
                this.consecutiveOffenses = 0;
            }

            if (this.consecutiveOffenses === this.durationThreshold) {
                this._reportActivity(`Consumo sostenido detectado (> ${this.threshold} ops/seg por ${this.durationThreshold}s).`);
            }

            // Un segundo sin operaciones en medio corta la racha.
            if (second - this.currentSecond > 1) this.consecutiveOffenses = 0;
        }

        this.currentSecond = second;
        this.currentOps = 0;
    }

    registerOperation(count = 1) {
        this._closeSecondsUntil(this._second());
        const previousOps = this.currentOps;
        this.currentOps += count;

        if (!this._isInGracePeriod() && previousOps < this.hardLimit && this.currentOps >= this.hardLimit) {
            this._reportActivity(`Limite crítico de ${this.hardLimit} ops/seg superado.`);
        }
    }

    _reportActivity(reason) {
        console.warn(`Monitor: ${reason} Solo diagnóstico; no son lecturas facturadas y no se bloquea la aplicación.`);
    }
}

export const securityMonitor = new SecurityMonitor();
