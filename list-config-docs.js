import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
        console.log("Listing documents in 'configuracion' collection...");
        const colRef = collection(db, "configuracion");
        const snap = await getDocs(colRef);
        console.log(`Found ${snap.size} documents in 'configuracion':`);
        snap.forEach(doc => {
            console.log(`- Document ID: ${doc.id} | keys:`, Object.keys(doc.data()));
        });
    } catch (e) {
        console.error(e);
    }
}

run();
