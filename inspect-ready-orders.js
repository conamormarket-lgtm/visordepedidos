import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, limit, getDocs } from "firebase/firestore";

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
    console.log("Fetching orders in 'Listo para Preparar'...");
    try {
        const coll = collection(db, "pedidos");
        const q = query(coll, where("estadoGeneral", "==", "Listo para Preparar"), limit(20));
        const snapshot = await getDocs(q);

        snapshot.forEach(doc => {
            const data = doc.data();
            console.log(`\n=========================================`);
            console.log(`ID: ${doc.id} | numeroPedido: ${data.numeroPedido}`);
            console.log(`estadoGeneral: ${data.estadoGeneral} | status: ${data.status}`);
            console.log(`cobranza:`, JSON.stringify(data.cobranza));
            console.log(`preparacion:`, JSON.stringify(data.preparacion));
            console.log(`prendas:`, JSON.stringify(data.prendas));
            console.log(`talla:`, JSON.stringify(data.talla));
        });

    } catch (e) {
        console.error("Error inspecting database:", e);
    }
}

run();
