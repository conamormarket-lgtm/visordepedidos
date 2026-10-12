import net from 'net';
import { deleteApp } from "firebase/app";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { app, db, ensureFirebaseAuth } from './src/firebase/config.js';

/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║         Servidor de Impresión en la Nube                 ║
 * ║         (Firebase Print Queue Worker)                    ║
 * ╚══════════════════════════════════════════════════════════╝
 */

const CONFIG = {
    PRINTER_IP: '192.168.18.71',
    PRINTER_PORT: 9100,
};

const timestamp = () => new Date().toLocaleTimeString('es-PE');

console.log('');
console.log('  ╔══════════════════════════════════════════════╗');
console.log('  ║   Servidor de Impresión CLOUD QUEUE          ║');
console.log('  ╠══════════════════════════════════════════════╣');
console.log(`  ║  Impresora:      ${CONFIG.PRINTER_IP}:${CONFIG.PRINTER_PORT}       ║`);
console.log('  ║  Firebase:       Iniciando sesión...         ║');
console.log('  ╚══════════════════════════════════════════════╝');
console.log('');
const handleSnapshot = (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            const data = change.doc.data();
            const zpl = data.zpl;
            const docRef = doc(db, "print_queue", change.doc.id);
            
            console.log(`\n[${timestamp()}] Nuevo ticket detectado (ID: ${change.doc.id})`);
            console.log(`  → Conectando a Impresora ${CONFIG.PRINTER_IP}:${CONFIG.PRINTER_PORT}...`);

            const socket = new net.Socket();
            let responded = false;

            const updateStatus = async (status, err = null) => {
                if (!responded) {
                    responded = true;
                    try {
                        await updateDoc(docRef, { 
                            status, 
                            printedAt: serverTimestamp(),
                            errorDetails: err 
                        });
                    } catch (e) {
                        console.error('  ✗ Error al actualizar Firebase:', e);
                    }
                }
            };

            socket.setTimeout(6000);

            socket.connect(CONFIG.PRINTER_PORT, CONFIG.PRINTER_IP, () => {
                socket.write(zpl, 'utf8', () => {
                    socket.destroy();
                    console.log(`  ✓ ZPL enviado correctamente a la Zebra`);
                    updateStatus('printed');
                });
            });

            socket.on('error', (err) => {
                console.error(`  ✗ Error de red local: ${err.message}`);
                updateStatus('error', err.message);
            });

            socket.on('timeout', () => {
                socket.destroy();
                console.error(`  ✗ Timeout — la impresora Zebra no respondió`);
                updateStatus('error', 'Timeout - Impresora no disponible');
            });
        }
    });
};

async function startPrintQueue() {
    await ensureFirebaseAuth();
    const q = query(collection(db, 'print_queue'), where('status', '==', 'pending'));
    let connected = false;
    onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
        if (!connected && !snapshot.metadata.fromCache) {
            connected = true;
            console.log('  ✓ Firebase conectado. Escuchando tickets pendientes.');
        }
        handleSnapshot(snapshot);
    }, stopWithError);
}

async function stopWithError(error) {
    const message = error?.code === 'permission-denied'
        ? 'Firebase denegó el acceso a print_queue. Revisa los permisos de la cola.'
        : `No se pudo conectar la cola de impresión: ${error?.message || error}`;
    console.error(`  ✗ ${message}`);
    // El listener ya terminó. Salir con error permite al lanzador mostrar el
    // fallo y evita que el proceso quede aparentando que sigue escuchando.
    process.exitCode = 1;
    try {
        await deleteApp(app);
    } catch (cleanupError) {
        console.error('  ✗ Error al cerrar Firebase:', cleanupError.message);
    }
}

startPrintQueue().catch(stopWithError);
