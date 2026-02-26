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

function extractImages(data) {
    let images = [];
    const rawImages = data.diseño?.urlImagen;
    if (Array.isArray(rawImages)) images = rawImages;
    else if (typeof rawImages === 'string') images = rawImages.split(/\s+/).filter(Boolean);
    return images;
}

function extractId(url) {
    if (!url || !url.includes('drive.google.com')) return null;
    const parts = url.split('/');
    const dIndex = parts.indexOf('d');
    if (dIndex !== -1 && parts.length > dIndex + 1) {
        return parts[dIndex + 1].split(/[?#]/)[0];
    }
    try {
        return new URL(url).searchParams.get('id');
    } catch (e) { return null; }
}

async function run() {
    const q = query(collection(db, "pedidos"), where("estadoGeneral", "in", [
        "Listo para Preparar", "En Pausa por Stock", "En Estampado", "En Empaquetado"
    ]));
    const snap = await getDocs(q);

    const problems = [];

    snap.forEach(d => {
        const data = d.data();
        const numPed = data.numeroPedido || data.id || d.id;
        const images = extractImages(data);

        images.forEach(rawUrl => {
            if (!rawUrl.includes('drive.google.com')) {
                // URL que no es de Drive - se pasaría tal cual al <img>
                // Si no es http url válida, es un problema
                if (!rawUrl.startsWith('http')) {
                    problems.push(`PEDIDO ${numPed} | NO_DRIVE_NO_HTTP | "${rawUrl.substring(0, 60)}"`);
                }
                return;
            }
            const id = extractId(rawUrl);
            if (!id) {
                problems.push(`PEDIDO ${numPed} | NO_ID | "${rawUrl.substring(0, 80)}"`);
            } else if (id.length < 25 || id.length > 50) {
                problems.push(`PEDIDO ${numPed} | ID_LEN_${id.length} | id="${id}" | raw="${rawUrl.substring(0, 80)}"`);
            }
        });
    });

    if (problems.length === 0) {
        console.log("OK - Todas las URLs de imagen parecen válidas.");
    } else {
        console.log(`PROBLEMAS ENCONTRADOS (${problems.length}):`);
        problems.forEach(p => console.log("  " + p));
    }

    console.log(`TOTAL_PEDIDOS=${snap.size}`);
    process.exit(0);
}

run().catch(e => { console.error("ERROR:", e.message); process.exit(1); });
