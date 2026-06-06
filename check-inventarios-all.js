import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, limit, query } from "firebase/firestore";

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
        console.log("Checking collection 'inventarios' generally...");
        const colRef = collection(db, "inventarios");
        const snapCol = await getDocs(colRef);
        console.log(`Found ${snapCol.size} documents in 'inventarios':`);
        for (const d of snapCol.docs) {
            console.log(`- Document ID: ${d.id}`);
            console.log(`  Data:`, JSON.stringify(d.data()).slice(0, 300));
            
            // Check possible sub-collections for each doc
            const subColNames = ["items", "prendas", "productos", "variantes", "stock", "colores", "tallas"];
            for (const name of subColNames) {
                const subRef = collection(db, "inventarios", d.id, name);
                const subSnap = await getDocs(query(subRef, limit(3)));
                if (subSnap.size > 0) {
                    console.log(`  -> Sub-collection '${name}' has ${subSnap.size} (sample) documents.`);
                    subSnap.forEach(subDoc => {
                        console.log(`     - SubDoc ID: ${subDoc.id} | data:`, JSON.stringify(subDoc.data()).slice(0, 200));
                    });
                }
            }
        }

    } catch (e) {
        console.error(e);
    }
}

run();
