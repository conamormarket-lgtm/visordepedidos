/**
 * Registro diagnóstico de ráfagas de actividad, sin bloquear la aplicación.
 * Cuenta operaciones notificadas por los servicios, no lecturas facturadas:
 * puede incluir cambios locales y escrituras además de lecturas.
 */
class SecurityMonitor {
    constructor() {
        this.threshold = 10;
        this.hardLimit = 300;
        this.durationThreshold = 3;
        this.consecutiveOffenses = 0;
        this.lastSecondOps = 0;
        this.lastSecondTimestamp = Math.floor(Date.now() / 1000);
        this.isInitialLoad = true;

        this._startMonitoring();
        setTimeout(() => {
            this.isInitialLoad = false;
        }, 10000);
    }

    _startMonitoring() {
        setInterval(() => {
            const currentSecond = Math.floor(Date.now() / 1000);
            if (currentSecond <= this.lastSecondTimestamp) return;

            if (!this.isInitialLoad) {
                if (this.lastSecondOps >= this.threshold) {
                    this.consecutiveOffenses++;
                } else {
                    this.consecutiveOffenses = 0;
                }

                if (this.lastSecondOps >= this.hardLimit ||
                    this.consecutiveOffenses === this.durationThreshold) {
                    console.warn(
                        `Monitor: ráfaga de actividad (${this.lastSecondOps} operaciones registradas en el intervalo). ` +
                        'Solo diagnóstico; no representa lecturas facturadas ni bloquea la aplicación.'
                    );
                }
            }

            this.lastSecondOps = 0;
            this.lastSecondTimestamp = currentSecond;
        }, 100);
    }

    registerOperation(count = 1) {
        this.lastSecondOps += count;
    }
}

export const securityMonitor = new SecurityMonitor();
