const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc } = require("firebase/firestore");
const fs = require('fs');

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
    const d = await getDoc(doc(db, "pedidos", "0fSNT21so7Gy4tGZBYhJ"));
    fs.writeFileSync('doc_fixed.json', JSON.stringify(d.data(), null, 2), 'utf8');
}

run();
