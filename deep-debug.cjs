const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    authDomain: "sistema-gestion-3b225.firebaseapp.com",
    projectId: "sistema-gestion-3b225",
    messagingSenderId: "572322137024",
    appId: "1:572322137024:web:66715f8ad61bf43fe43e25"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Deep analyzing doc 0fSNT21so7Gy4tGZBYhJ...");
    const d = await getDoc(doc(db, "pedidos", "0fSNT21so7Gy4tGZBYhJ"));
    const data = d.data();

    console.log("--- Basic Fields ---");
    console.log("id:", data.id);
    console.log("numeroPedido:", data.numeroPedido);

    console.log("\n--- Searching for numeric patterns in all fields ---");
    function search(obj, path = "") {
        if (!obj) return;
        Object.entries(obj).forEach(([key, val]) => {
            const currentPath = path ? `${path}.${key}` : key;
            if (typeof val === 'number') {
                console.log(`[NUM] ${currentPath}: ${val}`);
            } else if (typeof val === 'string') {
                if (/^\d{4,6}$/.test(val)) {
                    console.log(`[STR-NUM] ${currentPath}: ${val}`);
                }
            } else if (typeof val === 'object') {
                search(val, currentPath);
            }
        });
    }

    search(data);
}

run();
