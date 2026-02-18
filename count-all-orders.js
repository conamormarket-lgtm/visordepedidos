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

async function countOrders() {
    console.log("Counting ALL orders in target stages (No Limit)...");
    try {
        const coll = collection(db, "pedidos");

        // Check specific statuses individually to be sure
        const stages = ['preparacion', 'estampado', 'empaquetado'];

        for (const stage of stages) {
            const q = query(coll, where("status", "==", stage));
            const snapshot = await getCountFromServer(q);
            console.log(`State "${stage}": ${snapshot.data().count} orders`);
        }

    } catch (e) {
        console.error("Error counting orders:", e);
    }
}

countOrders();
