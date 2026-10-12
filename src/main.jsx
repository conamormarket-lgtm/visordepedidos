import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { authReady } from './firebase/config'

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(<p style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>Cargando...</p>)

// Montar la app recién con sesión de Firebase (o a los 8 s, como antes).
Promise.race([authReady, new Promise((r) => setTimeout(r, 8000))]).then(() => {
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    )
})
