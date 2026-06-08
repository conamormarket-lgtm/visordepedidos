import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, limit, where, startAt, orderBy } from "firebase/firestore";

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
        const colRef = collection(db, "inventarioPrendas");

        // 1. Buscar documentos de tipo "Polera" (por campo type)
        console.log("=== Poleras (where type == 'Polera') ===");
        const snapPolera = await getDocs(query(colRef, where("type", "==", "Polera"), limit(30)));
        console.log(`Encontrados: ${snapPolera.size}`);
        snapPolera.forEach(doc => {
            const d = doc.data();
            console.log(`ID: ${doc.id} | color: "${d.color}" | size: "${d.size || d.talla}" | qty: ${d.quantity}`);
        });

        // 2. Buscar documentos cuyo ID empieza con "polera"
        console.log("\n=== IDs que empiezan con 'polera' (orderBy __name__) ===");
        const snapPoleraId = await getDocs(query(colRef, orderBy("__name__"), startAt("polera"), limit(30)));
        console.log(`Encontrados: ${snapPoleraId.size}`);
        snapPoleraId.forEach(doc => {
            if (!doc.id.startsWith("polera")) return;
            const d = doc.data();
            console.log(`ID: ${doc.id} | color: "${d.color}" | size: "${d.size || d.talla}" | qty: ${d.quantity}`);
        });

        // 3. Buscar por tipoPrenda (campo alternativo)
        console.log("\n=== Poleras (where tipoPrenda == 'Polera') ===");
        const snapPolera2 = await getDocs(query(colRef, where("tipoPrenda", "==", "Polera"), limit(30)));
        console.log(`Encontrados: ${snapPolera2.size}`);
        snapPolera2.forEach(doc => {
            const d = doc.data();
            console.log(`ID: ${doc.id} | color: "${d.color}" | talla: "${d.talla || d.size}" | qty: ${d.quantity}`);
        });

        // 4. IDs que contengan "melange" — filtro manual sobre todos los docs
        console.log("\n=== Todos los IDs que contienen 'melange' ===");
        const snapAll = await getDocs(query(colRef, orderBy("__name__"), startAt("m"), limit(100)));
        snapAll.forEach(doc => {
            if (doc.id.includes("melange") || JSON.stringify(doc.data()).toLowerCase().includes("melange")) {
                const d = doc.data();
                console.log(`ID: ${doc.id} | color: "${d.color}" | size/talla: "${d.size || d.talla}" | qty: ${d.quantity}`);
            }
        });

    } catch (e) {
        console.error("Error:", e.message);
        if (e.code === "failed-precondition") {
            console.error("→ Falta índice en Firestore para esta query. Intentá con otra.");
        }
    }
}

run();
