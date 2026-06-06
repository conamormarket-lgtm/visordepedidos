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
        const rootCollections = ["items", "productos", "variantes", "prendas", "stock", "inventario-prendas", "inventario-productos"];
        for (const colName of rootCollections) {
            console.log(`Checking root collection '${colName}'...`);
            const colRef = collection(db, colName);
            const colSnap = await getDocs(query(colRef, limit(3)));
            console.log(`- '${colName}' size: ${colSnap.size}`);
            colSnap.forEach(d => {
                console.log(`  - Doc ID: ${d.id} | data:`, JSON.stringify(d.data()).slice(0, 300));
            });
        }
    } catch (e) {
        console.error(e);
    }
}

run();
