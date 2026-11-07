import { installFirestoreTransportMeter } from './firestore-transport-meter.mjs';
import { createReadRecorder } from './firestore-read-recorder.mjs';
function storage(name) { try { return globalThis.window?.[name]; } catch { return undefined; } }
export const readRecorder = createReadRecorder({
  app: 'visor-pedidos', screen: () => '/visor',
  storage: storage('localStorage'), sessionStorage: storage('sessionStorage'),
  fetcher: typeof window === 'undefined' ? undefined : (...args) => window.fetch(...args),
});
export function configureReadTelemetry(options) {
  readRecorder.configure(options);
  if (typeof window !== 'undefined' && readRecorder.status().enabled) {
    try {
      const meter = installFirestoreTransportMeter({ observe: readRecorder.observe,
        enabled: () => readRecorder.status().enabled, screen: readRecorder.currentScreen }, window);
      window.__firestoreReads.transport = meter.snapshot;
    } catch { /* Diagnostics must never affect app startup. */ }
  }
}
if (typeof window !== 'undefined') {
  window.__firestoreReads = { status: readRecorder.status, snapshot: readRecorder.snapshot, flush: readRecorder.flush };
  const flush = () => { readRecorder.checkpoint(); void readRecorder.flush(); };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
}
