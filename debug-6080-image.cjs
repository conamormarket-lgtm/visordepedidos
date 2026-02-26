const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyDnQ5TPYfUTJ7GcgDHB71PncDj0De5pc",
    authDomain: "sistema-gestion-3b225.firebaseapp.com",
    projectId: "sistema-gestion-3b225",
    storageBucket: "sistema-gestion-3b225.firebasestorage.app",
    messagingSenderId: "572322137024",
    appId: "1:572322137024:web:66715f8ad61bf43fe43e25"
};

// USAR CONFIG CORRECTA (copiada de debug-ids.cjs)
const firebaseConfig2 = {
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    authDomain: "sistema-gestion-3b225.firebaseapp.com",
    projectId: "sistema-gestion-3b225",
    storageBucket: "sistema-gestion-3b225.firebasestorage.app",
    messagingSenderId: "572322137024",
    appId: "1:572322137024:web:66715f8ad61bf43fe43e25"
};

const app = initializeApp(firebaseConfig2);
const db = getFirestore(app);

async function run() {
    // documentId = "6080"
    const ref = doc(db, "pedidos", "6080");
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        console.log("El documento con ID '6080' no existe directo.");
        process.exit(0);
    }

    const data = snap.data();

    // Inspeccionar exactamente cuáles keys tiene data
    console.log("=== KEYS del documento ===");
    Object.keys(data).forEach(k => {
        const encoded = [...k].map(c => c.charCodeAt(0).toString(16)).join(' ');
        console.log(`  "${k}" [hex: ${encoded}]`);
    });

    console.log("\n=== diseño keys ===");
    const disenoRaw = data['dise\u00f1o']; // ñ = U+00F1
    const disenoLiteral = data.diseño;

    console.log("Via literal diseño:", disenoLiteral ? "EXISTE" : "NO EXISTE");
    console.log("Via unicode dise\\u00f1o:", disenoRaw ? "EXISTE" : "NO EXISTE");

    const diseno = disenoRaw || disenoLiteral;
    if (diseno) {
        console.log("\n=== keys dentro de diseño ===");
        Object.keys(diseno).forEach(k => {
            const encoded = [...k].map(c => c.charCodeAt(0).toString(16)).join(' ');
            console.log(`  "${k}" [hex: ${encoded}] = ${JSON.stringify(diseno[k]).substring(0, 100)}`);
        });

        // Simular la lógica del código
        const rawImages = diseno?.urlImagen;
        console.log("\n=== Simulando normalizeOrder ===");
        console.log("rawImages:", rawImages);

        let images = [];
        if (Array.isArray(rawImages)) {
            images = rawImages;
            console.log("→ Es array, images =", images);
        } else if (typeof rawImages === 'string') {
            images = rawImages.split(/\s+/).filter(Boolean);
            console.log("→ Es string, images =", images);
        } else {
            console.log("→ rawImages es undefined/null, images = []");
        }

        console.log("\nResultado final images:", images);
    }

    process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
