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

const resolveVisualId = (data, docId) => {
    const rawId = data.numeroPedido || docId;
    if (/^\d+$/.test(rawId)) {
        return parseInt(rawId, 10).toString();
    }
    return rawId;
};

async function test() {
    console.log("Testing new normalization logic...");
    const q = query(collection(db, "pedidos"), where("estadoGeneral", "in", [
        "Listo para Preparar",
        "En Pausa por Stock",
        "En Estampado",
        "En Empaquetado"
    ]), limit(10));

    const s = await getDocs(q);
    console.log(`Found ${s.size} relevant orders.`);

    s.forEach(doc => {
        const data = doc.data();
        const visualId = resolveVisualId(data, doc.id);
        console.log(`- Visual ID: ${visualId} (Raw Num: ${data.numeroPedido}) | Estado: ${data.estadoGeneral} | Prioridad: ${data.EsPrioridad}`);
    });
}

test();
