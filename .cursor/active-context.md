> **BrainSync Context Pumper** 🧠
> Dynamically loaded for active file: `src\services\orders.js` (Domain: **Generic Logic**)

### 📐 Generic Logic Conventions & Fixes
- **[what-changed] what-changed in orders.js**: -         isStockPaused: estGen === "En Pausa por Stock" || data.preparacion?.enPausa || false,
+         isStockPaused: estGen === "En Pausa por Stock",

📌 IDE AST Context: Modified symbols likely include [COLLECTION_NAME, _pedidosIdMap, _pedidosSiblingIds, _pedidosNumericKey, subscribeToOperators]
- **[convention] what-changed in config.js — confirmed 3x**: File updated (external): src/firebase/config.js

Content summary (20 lines):
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "[REDACTED]",
    authDomain: "sistema-gestion-3b225.firebaseapp.com",
    projectId: "sistema-gestion-3b225",
    storageBucket: "sistema-gestion-3b225.firebasestorage.app",
    messagingSenderId: "572322137024",
    appId: "1:572322137024:web:66715f8ad61bf43fe43e25",
