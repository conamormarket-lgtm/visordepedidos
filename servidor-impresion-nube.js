import net from 'net';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";

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

const firebaseConfig = {
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    projectId: "sistema-gestion-3b225"
};

const timestamp = () => new Date().toLocaleTimeString('es-PE');

console.log('');
console.log('  ╔══════════════════════════════════════════════╗');
console.log('  ║   Servidor de Impresión CLOUD QUEUE Activo   ║');
console.log('  ╠══════════════════════════════════════════════╣');
console.log(`  ║  Impresora:      ${CONFIG.PRINTER_IP}:${CONFIG.PRINTER_PORT}       ║`);
console.log('  ║  Firebase:       Conectado al proyecto       ║');
console.log('  ╚══════════════════════════════════════════════╝');
console.log('');
console.log('  Escuchando tickets entrantes de todo el mundo en Firebase...');
console.log('');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const q = query(
    collection(db, "print_queue"), 
    where("status", "==", "pending")
);

onSnapshot(q, (snapshot) => {
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
});
