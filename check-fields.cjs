const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, limit, getDocs } = require("firebase/firestore");

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
    const q = query(collection(db, "pedidos"), limit(50));
    const s = await getDocs(q);
    s.forEach(d => {
        const data = d.data();
        console.log(`ID: ${d.id} | Num: ${data.numeroPedido} | EstGen: ${data.estadoGeneral} | Prioridad: ${data.EsPrioridad}`);
    });
}
run();
