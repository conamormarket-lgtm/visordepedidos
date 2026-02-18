import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query, where, orderBy } from "firebase/firestore";

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

async function debugOrders() {
    console.log("Fetching orders with limit 500...");
    try {
        const q = query(collection(db, "pedidos"), limit(500));
        const querySnapshot = await getDocs(q);

        console.log(`Fetched ${querySnapshot.size} orders.`);

        const statuses = new Set();
        const statusCounts = {};

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const s = data.status || 'UNDEFINED';
            statuses.add(s);
            statusCounts[s] = (statusCounts[s] || 0) + 1;
        });

        console.log("\n--- Summary ---");
        console.log("All Statuses Found:", Array.from(statuses));
        console.log("Counts per Status:", statusCounts);

    } catch (e) {
        console.error("Error fetching orders:", e);
    }
}

debugOrders();
