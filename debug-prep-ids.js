import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";

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

async function debugPrepIDs() {
    console.log("Fetching 'preparacion' orders IDs...");
    try {
        const q = query(collection(db, "pedidos"), where("status", "==", "preparacion"));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log(`\nDoc Key: ${doc.id}`);
            console.log(`Field 'id': ${data.id}`);
            console.log(`Field 'numero': ${data.numero}`); // Just in case
            console.log(`Field 'codigo': ${data.codigo}`); // Just in case
        });

    } catch (e) {
        console.error("Error fetching orders:", e);
    }
}

debugPrepIDs();
