import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, limit, getDocs } from "firebase/firestore";

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
    console.log("Searching for 'desconocid' in the last 500 orders...");
    try {
        const coll = collection(db, "pedidos");
        const q = query(coll, limit(500));
        const snapshot = await getDocs(q);

        let matchCount = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            const dataStr = JSON.stringify(data).toLowerCase();
            if (dataStr.includes("desconocid")) {
                matchCount++;
                console.log(`\nMatch #${matchCount} | ID: ${doc.id} | numeroPedido: ${data.numeroPedido}`);
                console.log(`estadoGeneral: ${data.estadoGeneral}`);
                
                // Find where the match is
                if (JSON.stringify(data.prendas).toLowerCase().includes("desconocid")) {
                    console.log("-> Found in prendas:", JSON.stringify(data.prendas));
                }
                if (JSON.stringify(data.productos).toLowerCase().includes("desconocid")) {
                    console.log("-> Found in productos:", JSON.stringify(data.productos));
                }
                if (JSON.stringify(data.historialModificaciones).toLowerCase().includes("desconocid")) {
                    console.log("-> Found in history (sample):", JSON.stringify(data.historialModificaciones.slice(-2)));
                }
            }
        });

        console.log(`\nSearch finished. Total matches found: ${matchCount}`);

    } catch (e) {
        console.error("Error inspecting database:", e);
    }
}

run();
