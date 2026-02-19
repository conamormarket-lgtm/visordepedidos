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
    console.log("Analyzing random IDs...");
    const q = query(collection(db, "pedidos"), where("estadoGeneral", "in", [
        "Listo para Preparar",
        "En Pausa por Stock",
        "En Estampado",
        "En Empaquetado"
    ]), limit(100));

    const s = await getDocs(q);

    s.forEach(d => {
        const data = d.data();
        const docId = d.id;

        // Use current logic
        const rawId = data.id || data.numeroPedido || docId;
        const isNumeric = /^\d+$/.test(rawId);

        if (!isNumeric) {
            console.log(`\nDocument: ${docId} (Final ID: ${rawId})`);
            console.log(`  data.id: ${data.id}`);
            console.log(`  data.numeroPedido: ${data.numeroPedido}`);

            // Search for other potential ID fields
            Object.entries(data).forEach(([key, val]) => {
                if (typeof val === 'number') {
                    console.log(`  Potential Number Field: ${key} = ${val}`);
                }
                if (typeof val === 'string' && /^\d{4,6}$/.test(val)) {
                    console.log(`  Potential Numeric String Field: ${key} = ${val}`);
                }
            });
        }
    });
}

run();
