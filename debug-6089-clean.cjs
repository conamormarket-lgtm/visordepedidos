const { initializeApp } = require("firebase/app");
const { getFirestore, collection, query, where, getDocs } = require("firebase/firestore");
const fs = require("fs");

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
    const q = query(collection(db, "pedidos"), where("numeroPedido", "==", "6089"));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        fs.writeFileSync("debug-6089-result.txt", "No se encontró el pedido 6089");
        return;
    }

    let output = "";
    snapshot.forEach(d => {
        const data = d.data();
        const rawImages = data.diseño?.urlImagen;

        output += `Doc ID: ${d.id}\n`;
        output += `estadoGeneral: ${data.estadoGeneral}\n\n`;
        output += `Tipo de urlImagen: ${typeof rawImages}\n`;
        output += `Es Array: ${Array.isArray(rawImages)}\n\n`;

        if (Array.isArray(rawImages)) {
            output += `ARRAY con ${rawImages.length} elemento(s):\n`;
            rawImages.forEach((url, i) => {
                output += `  [${i}]: "${url}"\n`;
                output += `  Longitud: ${url.length}\n`;
                output += `  Tiene saltos de linea: ${url.includes('\n') || url.includes('\r')}\n`;
                output += `  Caracteres especiales: ${JSON.stringify(url.substring(0, 200))}\n\n`;
            });
        } else if (typeof rawImages === 'string') {
            output += `STRING de ${rawImages.length} chars:\n`;
            output += `Tiene saltos de linea: ${rawImages.includes('\n') || rawImages.includes('\r')}\n`;
            output += `Valor (JSON): ${JSON.stringify(rawImages.substring(0, 500))}\n`;
            const parts = rawImages.split(/\s+/).filter(Boolean);
            output += `\nPartes al splitear por whitespace: ${parts.length}\n`;
            parts.forEach((p, i) => { output += `  [${i}]: ${p}\n`; });
        } else {
            output += `El campo es: ${rawImages}\n`;
        }
    });

    fs.writeFileSync("debug-6089-result.txt", output);
    console.log("Resultado guardado en debug-6089-result.txt");
    console.log(output);
}

run().then(() => process.exit(0)).catch(e => {
    fs.writeFileSync("debug-6089-result.txt", "Error: " + e.message);
    console.error(e);
    process.exit(1);
});
