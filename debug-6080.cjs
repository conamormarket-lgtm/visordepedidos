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
    console.log("Buscando pedido 6080...\n");

    // Buscar por numeroPedido = "6080"
    const q1 = query(collection(db, "pedidos"), where("numeroPedido", "==", "6080"));
    const q2 = query(collection(db, "pedidos"), where("id", "==", "6080"));
    const q3 = query(collection(db, "pedidos"), where("numeroPedido", "==", 6080));

    let found = false;

    for (const [label, q] of [["numeroPedido == '6080'", q1], ["id == '6080'", q2], ["numeroPedido == 6080", q3]]) {
        const snap = await getDocs(q);
        if (!snap.empty) {
            snap.forEach(d => {
                found = true;
                const data = d.data();
                console.log(`=== Encontrado via ${label} ===`);
                console.log(`Doc ID: ${d.id}`);
                console.log(`estadoGeneral: ${data.estadoGeneral}`);
                console.log(`\n--- Campo diseño completo ---`);
                console.log(JSON.stringify(data.diseño, null, 2));
                console.log(`\n--- Buscando campos de imagen en el documento ---`);

                // Buscar recursivamente campos que parezcan URLs de imagen
                function findImageFields(obj, path = '') {
                    if (!obj || typeof obj !== 'object') return;
                    Object.entries(obj).forEach(([key, val]) => {
                        const fullPath = path ? `${path}.${key}` : key;
                        if (typeof val === 'string' && (val.includes('drive.google') || val.includes('http') && val.match(/\.(jpg|jpeg|png|gif|webp)/i))) {
                            console.log(`[IMAGEN] ${fullPath}: ${val}`);
                        } else if (Array.isArray(val) && val.some(v => typeof v === 'string' && v.includes('http'))) {
                            console.log(`[ARRAY URLS] ${fullPath}: ${JSON.stringify(val)}`);
                        } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                            findImageFields(val, fullPath);
                        }
                    });
                }

                findImageFields(data);
                console.log(`\n--- Todos los campos de diseño ---`);
                if (data.diseño) {
                    Object.entries(data.diseño).forEach(([k, v]) => {
                        console.log(`  diseño.${k} = ${JSON.stringify(v)}`);
                    });
                } else {
                    console.log("  (el campo 'diseño' no existe o es undefined)");
                }
            });
        }
    }

    if (!found) {
        console.log("No se encontró el pedido 6080 con numeroPedido o id == '6080'.");
        console.log("Intentando búsqueda por doc ID '6080'...");
        // Try doc ID
        const { doc, getDoc } = require("firebase/firestore");
        const ref = doc(db, "pedidos", "6080");
        const snap = await getDoc(ref);
        if (snap.exists()) {
            found = true;
            const data = snap.data();
            console.log("=== Encontrado como doc ID '6080' ===");
            console.log(`estadoGeneral: ${data.estadoGeneral}`);
            console.log("\n--- Campo diseño completo ---");
            console.log(JSON.stringify(data.diseño, null, 2));
        } else {
            console.log("Tampoco existe como doc ID '6080'.");
            console.log("\nEl pedido podría tener un doc ID diferente. Busca manualmente en Firebase.");
        }
    }

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
