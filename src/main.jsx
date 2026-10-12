import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ensureFirebaseAuth } from './firebase/config.js'

const root = ReactDOM.createRoot(document.getElementById('root'));

// No montar los listeners de pedidos antes del login: un permission-denied
// termina la suscripción y no se recupera solo cuando llega el token.
async function startApp() {
    root.render(<p className="p-8 text-center" role="status">Conectando con Firebase...</p>);
    try {
        await ensureFirebaseAuth();
        root.render(<React.StrictMode><App /></React.StrictMode>);
    } catch (error) {
        console.error('[Firebase] No se pudo iniciar la sesión:', error);
        root.render(
            <div className="p-8 text-center" role="alert">
                <p>No se pudo conectar con Firebase. Revisa la conexión y vuelve a intentarlo.</p>
                <button className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-white" onClick={startApp}>
                    Reintentar
                </button>
            </div>,
        );
    }
}

startApp();
