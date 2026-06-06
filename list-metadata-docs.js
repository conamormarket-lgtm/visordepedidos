import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit } from "firebase/firestore";

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
        console.log("Listing documents in 'metadata' collection...");
        const metaColl = collection(db, "metadata");
        const metaSnap = await getDocs(metaColl);
        console.log(`Found ${metaSnap.size} documents in 'metadata':`);
        metaSnap.forEach(doc => {
            console.log(`- Document ID: ${doc.id}`);
        });

        // Let's check other potential collections
        const possibleCollections = ["inventario-prendas", "inventario", "inventario_prendas", "productos-inventario"];
        for (const colName of possibleCollections) {
            console.log(`Checking collection '${colName}'...`);
            const colRef = collection(db, colName);
            const colSnap = await getDocs(query(colRef, limit(5)));
            console.log(`- '${colName}' size: ${colSnap.size}`);
            colSnap.forEach(d => {
                console.log(`  - Doc ID: ${d.id} | data: ${JSON.stringify(d.data()).slice(0, 100)}`);
            });
        }

    } catch (e) {
        // Since query is not imported, let's catch it if it fails or fix the script
        console.error("Error listing collections:", e);
    }
}

// Helper query function since we didn't import it, wait, let's just use getDocs(collection(db, colName)) with no query limit or let's import limit
import { query } from "firebase/firestore";

run();
