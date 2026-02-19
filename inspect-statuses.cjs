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

async function inspect() {
    console.log("Inspecting statuses...");
    const q = query(collection(db, "pedidos"), limit(20));
    const snapshot = await getDocs(q);

    const statusCounts = {};
    snapshot.forEach(doc => {
        const s = doc.data().status;
        statusCounts[s] = (statusCounts[s] || 0) + 1;
        console.log(`Doc: ${doc.id} | Status: [${s}]`);
    });

    console.log("\nSummary of first 20 docs:", statusCounts);
}

inspect();
