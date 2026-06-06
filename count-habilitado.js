import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getCountFromServer } from "firebase/firestore";

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
    console.log("Counting orders by status and cobranza.estado...");
    try {
        const coll = collection(db, "pedidos");
        
        // Listo para Preparar
        const q1 = query(coll, where("estadoGeneral", "==", "Listo para Preparar"));
        const snap1 = await getCountFromServer(q1);
        console.log(`Listo para Preparar (Total): ${snap1.data().count}`);

        const q2 = query(coll, where("estadoGeneral", "==", "Listo para Preparar"), where("cobranza.estado", "==", "Habilitado"));
        const snap2 = await getCountFromServer(q2);
        console.log(`Listo para Preparar (Habilitado): ${snap2.data().count}`);

        // En Pausa por Stock
        const q3 = query(coll, where("estadoGeneral", "==", "En Pausa por Stock"));
        const snap3 = await getCountFromServer(q3);
        console.log(`En Pausa por Stock (Total): ${snap3.data().count}`);

        const q4 = query(coll, where("estadoGeneral", "==", "En Pausa por Stock"), where("cobranza.estado", "==", "Habilitado"));
        const snap4 = await getCountFromServer(q4);
        console.log(`En Pausa por Stock (Habilitado): ${snap4.data().count}`);

    } catch (e) {
        console.error("Error counting orders:", e);
    }
}

run();
