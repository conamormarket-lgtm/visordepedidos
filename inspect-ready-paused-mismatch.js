import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getCountFromServer, getDocs, limit } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    authDomain: "sistema-gestion-3b225.firebaseapp.com",
    projectId: "sistema-gestion-3b225",
    storageBucket: "sistema-gestion-3b225.firebasestorage.app",
    messagingSenderId: "572322137024",
    appId: "1:572322137024:web:66715f8ad61bf43fe43e25",
    measurementId: "G-GDNQWQ85NJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Checking for 'Listo para Preparar' orders with preparacion.enPausa == true...");
    try {
        const coll = collection(db, "pedidos");
        
        const q = query(
            coll, 
            where("estadoGeneral", "==", "Listo para Preparar"), 
            where("preparacion.enPausa", "==", true)
        );
        
        const snap = await getDocs(q);
        console.log(`Found ${snap.size} orders with this mismatch.`);

        snap.forEach(doc => {
            const data = doc.data();
            console.log(`\nOrder ID: ${doc.id} | numeroPedido: ${data.numeroPedido}`);
            console.log(`estadoGeneral: ${data.estadoGeneral}`);
            console.log(`preparacion:`, JSON.stringify(data.preparacion));
            console.log(`History (last 2):`, JSON.stringify((data.historialModificaciones || []).slice(-2)));
        });

    } catch (e) {
        console.error("Error inspecting database:", e);
    }
}

run();
