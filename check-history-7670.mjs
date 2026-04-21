import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    authDomain: "sistema-gestion-3b225.firebaseapp.com",
    projectId: "sistema-gestion-3b225",
    storageBucket: "sistema-gestion-3b225.firebasestorage.app",
    messagingSenderId: "572322137024",
    appId: "1:572322137024:web:66715f8ad61bf43fe43e25",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

function formatTS(ts) {
    if (!ts) return "(nulo)";
    if (ts?.toDate) return ts.toDate().toLocaleString("es-PE");
    if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString("es-PE");
    return String(ts);
}

async function run() {
    console.log("🔍 Buscando en historial de inventario registros del pedido 7670...\n");

    // Buscar en colección 'history' por pedidoOrigenId
    const histQ = query(
        collection(db, "history"),
        where("metadata.pedidoOrigenId", "in", ["007670", "7670"])
    );
    const histSnap = await getDocs(histQ);

    if (histSnap.empty) {
        console.log("⚠️  No se encontraron registros en 'history' para pedidoOrigenId 007670 / 7670");
    } else {
        console.log(`✅ ${histSnap.size} registro(s) en history:\n`);
        histSnap.forEach(d => {
            const data = d.data();
            console.log(`  [${formatTS(data.timestamp)}] ${data.user}`);
            console.log(`     Acción:  ${data.action}`);
            console.log(`     Detalle: ${data.details}`);
            console.log(`     Meta:    ${JSON.stringify(data.metadata)}`);
            console.log();
        });
    }

    // También buscar por texto en details que mencione 7670
    console.log("\n🔍 Buscando en history por texto '7670' en details...");
    const allQ = query(collection(db, "history"), limit(1000));
    const allSnap = await getDocs(allQ);
    const matches = [];
    allSnap.forEach(d => {
        const data = d.data();
        if (
            (data.details && data.details.includes("7670")) ||
            (data.metadata?.pedidoOrigenId && String(data.metadata.pedidoOrigenId).includes("7670"))
        ) {
            matches.push({ id: d.id, data });
        }
    });

    if (matches.length === 0) {
        console.log("  ⚠️  Ningún registro con '7670' en los últimos 1000 entries de history.");
    } else {
        console.log(`  ✅ ${matches.length} registro(s) encontrados:\n`);
        matches.sort((a, b) => {
            const ta = a.data.timestamp?.seconds ?? 0;
            const tb = b.data.timestamp?.seconds ?? 0;
            return ta - tb;
        });
        matches.forEach(({ id, data }) => {
            console.log(`  [${formatTS(data.timestamp)}] ${data.user}`);
            console.log(`     Acción:  ${data.action}`);
            console.log(`     Detalle: ${data.details}`);
            console.log(`     Meta:    ${JSON.stringify(data.metadata)}`);
            console.log();
        });
    }

    process.exit(0);
}

run().catch(err => {
    console.error("❌ Error:", err.message);
    process.exit(1);
});
