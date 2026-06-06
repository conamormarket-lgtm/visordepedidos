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
        console.log("Checking path 'inventarios/inventario-prendas'...");
        const docRef1 = doc(db, "inventarios", "inventario-prendas");
        const snap1 = await getDoc(docRef1);
        if (snap1.exists()) {
            console.log("Found 'inventarios/inventario-prendas'!");
            console.log("Keys:", Object.keys(snap1.data()));
            console.log("Data sample:", JSON.stringify(snap1.data()).slice(0, 500));
            return;
        } else {
            console.log("'inventarios/inventario-prendas' does NOT exist.");
        }

        console.log("Checking collection 'inventarios' generally...");
        const colRef = collection(db, "inventarios");
        const snapCol = await getDocs(query(colRef, limit(10)));
        console.log(`Found ${snapCol.size} documents in 'inventarios'`);
        snapCol.forEach(doc => {
            console.log(`- Document ID: ${doc.id} | keys:`, Object.keys(doc.data()));
        });

    } catch (e) {
        console.error(e);
    }
}

run();
