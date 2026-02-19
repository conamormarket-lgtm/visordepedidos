const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, limit, getDocs, where } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    authDomain: "sistema-gestion-3b225.firebaseapp.com",
    projectId: "sistema-gestion-3b225",
    storageBucket: "sistema-gestion-3b225.firebasestorage.app",
    messagingSenderId: "572322137024",
    appId: "1:572322137024:web:66715f8ad61bf43fe43e25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const q = query(collection(db, "pedidos"), limit(500));
    const s = await getDocs(q);
    const estados = new Set();
    const priorities = new Set();
    s.forEach(d => {
        const data = d.data();
        if (data.estadoGeneral) estados.add(data.estadoGeneral);
        if (data.EsPrioridad !== undefined) priorities.add(data.EsPrioridad);
    });
    console.log("Unique estadoGeneral values:", Array.from(estados));
    console.log("Unique EsPrioridad values:", Array.from(priorities));

    // Also check for "Listo para Preparar" specifically
    const q2 = query(collection(db, "pedidos"), where("estadoGeneral", "==", "Listo para Preparar"), limit(5));
    const s2 = await getDocs(q2);
    console.log("Found Listo para Preparar documents:", s2.size);
}
run();
