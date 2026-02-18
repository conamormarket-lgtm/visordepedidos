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

async function debugPrepOrders() {
    console.log("Fetching ONLY 'preparacion' orders...");
    try {
        const q = query(collection(db, "pedidos"), where("status", "==", "preparacion"));
        const querySnapshot = await getDocs(q);

        const results = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const rawImages = data.diseño?.urlImagen;

            let parsed = [];
            if (Array.isArray(rawImages)) {
                parsed = rawImages;
            } else if (typeof rawImages === 'string') {
                parsed = rawImages.split(/\s+/).filter(Boolean);
            }

            results.push({
                id: doc.id,
                rawType: typeof rawImages,
                rawPreview: typeof rawImages === 'string' ? rawImages.substring(0, 50) + "..." : rawImages,
                parsedLength: parsed.length
            });
        });

        console.log(JSON.stringify(results, null, 2));

    } catch (e) {
        console.error("Error fetching orders:", e);
    }
}

debugPrepOrders();
