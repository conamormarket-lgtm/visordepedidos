// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    authDomain: "sistema-gestion-3b225.firebaseapp.com",
    projectId: "sistema-gestion-3b225",
    storageBucket: "sistema-gestion-3b225.firebasestorage.app",
    messagingSenderId: "572322137024",
    appId: "1:572322137024:web:66715f8ad61bf43fe43e25",
    measurementId: "G-GDNQWQ85NJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let authAttempt = null;

// Las reglas compartidas con el ERP requieren request.auth. Esperar también
// la restauración de la sesión evita crear otro usuario en cada recarga.
export const ensureFirebaseAuth = () => {
    if (!authAttempt) {
        authAttempt = (async () => {
            await auth.authStateReady();
            if (auth.currentUser) return auth.currentUser;
            const credential = await signInAnonymously(auth);
            return credential.user;
        })().finally(() => {
            // Un fallo de red no debe impedir un nuevo intento.
            authAttempt = null;
        });
    }
    return authAttempt;
};

export { app, db };
