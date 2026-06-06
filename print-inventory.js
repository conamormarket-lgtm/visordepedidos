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
        const docRef = doc(db, "metadata", "inventory_stats");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const items = data.items || [];
            console.log(`Total items in inventory: ${items.length}`);
            
            // Search for "melange"
            const melangeItems = items.filter(i => {
                const name = `${i.type || i.tipoPrenda} ${i.color} ${i.size || i.talla}`.toLowerCase();
                return name.includes("melange");
            });
            console.log("\nMelange items in inventory:");
            console.log(JSON.stringify(melangeItems, null, 2));

            // Print 30 sample items from inventory to see structure
            console.log("\nFirst 30 items in inventory:");
            console.log(JSON.stringify(items.slice(0, 30), null, 2));
        } else {
            console.log("No inventory stats document!");
        }
    } catch (e) {
        console.error(e);
    }
}

run();
