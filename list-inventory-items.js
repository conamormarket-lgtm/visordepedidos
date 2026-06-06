import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";

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
    try {
        console.log("Checking sub-collection 'inventarios/inventario-prendas/items'...");
        const itemsColl = collection(db, "inventarios", "inventario-prendas", "items");
        const snap = await getDocs(query(itemsColl, limit(30)));
        console.log(`Found ${snap.size} items in sub-collection:`);
        snap.forEach(doc => {
            console.log(`- Item ID: ${doc.id} | data:`, JSON.stringify(doc.data()));
        });
    } catch (e) {
        console.error(e);
    }
}

run();
