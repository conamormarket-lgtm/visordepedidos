const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs } = require("firebase/firestore");

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
    console.log("Buscando pedido 6089...\n");

    // Buscar por numeroPedido
    const q = query(collection(db, "pedidos"), where("numeroPedido", "==", "6089"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        // Intentar buscar por id
        const q2 = query(collection(db, "pedidos"), where("id", "==", "6089"));
        const snapshot2 = await getDocs(q2);

        if (snapshot2.empty) {
            console.log("No se encontró el pedido 6089 por numeroPedido ni por id.");
            return;
        }
        snapshot2.forEach(d => procesarDoc(d));
    } else {
        snapshot.forEach(d => procesarDoc(d));
    }
}

function procesarDoc(d) {
    const data = d.data();
    console.log("=== PEDIDO ENCONTRADO ===");
    console.log("Doc ID:", d.id);
    console.log("numeroPedido:", data.numeroPedido);
    console.log("estadoGeneral:", data.estadoGeneral);

    console.log("\n--- CAMPO diseño ---");
    console.log(JSON.stringify(data.diseño, null, 2));

    console.log("\n--- ANÁLISIS urlImagen ---");
    const rawImages = data.diseño?.urlImagen;
    console.log("Tipo de urlImagen:", typeof rawImages);
    console.log("Valor:", rawImages);

    if (Array.isArray(rawImages)) {
        console.log("→ Es un ARRAY con", rawImages.length, "elemento(s)");
        rawImages.forEach((url, i) => {
            console.log(`  [${i}] ${url}`);
        });
    } else if (typeof rawImages === 'string') {
        const parts = rawImages.split(/\s+/).filter(Boolean);
        console.log("→ Es un STRING. Separando por espacios:", parts.length, "parte(s)");
        parts.forEach((url, i) => {
            console.log(`  [${i}] ${url}`);
        });
    } else {
        console.log("→ El campo urlImagen está VACÍO o es undefined/null");
    }

    // Buscar otros posibles campos de imagen en toda la data
    console.log("\n--- Buscando otros campos de imagen en el documento ---");
    function buscarImagenes(obj, path = "") {
        if (!obj || typeof obj !== 'object') return;
        Object.entries(obj).forEach(([key, val]) => {
            const currentPath = path ? `${path}.${key}` : key;
            if (typeof val === 'string' && (
                val.includes('drive.google.com') ||
                val.includes('http') ||
                key.toLowerCase().includes('imagen') ||
                key.toLowerCase().includes('image') ||
                key.toLowerCase().includes('foto') ||
                key.toLowerCase().includes('url')
            )) {
                console.log(`  [${currentPath}]: ${val}`);
            } else if (Array.isArray(val)) {
                val.forEach((item, i) => {
                    if (typeof item === 'string' && item.includes('http')) {
                        console.log(`  [${currentPath}[${i}]]: ${item}`);
                    } else if (typeof item === 'object') {
                        buscarImagenes(item, `${currentPath}[${i}]`);
                    }
                });
            } else if (typeof val === 'object' && val !== null) {
                buscarImagenes(val, currentPath);
            }
        });
    }
    buscarImagenes(data);
}

run().then(() => process.exit(0)).catch(e => {
    console.error("Error:", e);
    process.exit(1);
});
