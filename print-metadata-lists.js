import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

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
        const docRef = doc(db, "metadata", "lists");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const keys = Object.keys(docSnap.data());
            console.log(`Document 'metadata/lists' keys:`, keys);
            
            // If there are key lists like "inventario" or "prendas", let's inspect them
            for (const key of keys) {
                const data = docSnap.data()[key];
                const sample = Array.isArray(data) ? `Array size: ${data.length}` : typeof data;
                console.log(`- Key: ${key} | type/info: ${sample}`);
            }
            
            // Print the full data
            console.log("Full data:", JSON.stringify(docSnap.data(), null, 2).slice(0, 2000));
        } else {
            console.log("No such document!");
        }
    } catch (e) {
        console.error(e);
    }
}

run();
