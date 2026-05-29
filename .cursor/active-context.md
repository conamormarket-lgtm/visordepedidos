> **BrainSync Context Pumper** 🧠
> Dynamically loaded for active file: `iniciar-servidor-impresion.bat` (Domain: **Generic Logic**)

### 📐 Generic Logic Conventions & Fixes
- **[problem-fix] Fixed null crash in Conectando — prevents null/undefined runtime crashes**: - import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
+ import { getFirestore, collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
- // Leer config desde el .env del proyecto (copiado del vite.config / firebase/config)
+ const firebaseConfig = {
- const firebaseConfig = {
+     apiKey: "[REDACTED]",
-     apiKey: process.env.VITE_FIREBASE_API_KEY,
+     authDomain: "sistema-gestion-3b225.firebaseapp.com",
-     authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
+     projectId: "sistema-gestion-3b225",
-     projectId: process.env.VITE_FIREBASE_PROJECT_ID,
+     storageBucket: "sistema-gestion-3b225.firebasestorage.app",
-     storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
+     messagingSenderId: "572322137024",
-     messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
+     appId: "1:572322137024:web:66715f8ad61bf43fe43e25",
-     appId: process.env.VITE_FIREBASE_APP_ID,
+ };
- };
+ 
- 
+ console.log(`✅ Conectando a Firebase: ${firebaseConfig.projectId}\n`);
- // Si no hay vars de entorno, intentar leer del .env directamente
+ const app = initializeApp(firebaseConfig);
- import { readFileSync, existsSync } from "fs";
+ const db = getFirestore(app);
- import { resolve, dirname } from "path";
+ 
- import { fileURLToPath } from "url";
+ function formatTS(ts) {
- 
+     if (!ts) return "(nulo)";
- const __dirname = dirname(fileURLToPath(import.meta.url));
+     if (ts?.toDate) return ts.toDate().toLocaleString("es-PE");
- const envPath = resolve(__dirname, ".env");
+     if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString("es-PE");
- const envLocalPath = resolve(__dirname, ".env.local");
+     return String(ts);
- 
+ }
- function loadEnv(path) {
+ 
-     if (!existsSync(path)) return {};
+ async function buscarPedido7670() {
-     const content = readFileSync(path, "utf-8");
+     console.log("🔍 Buscando pedido 7670...\n");
-     const vars = 
… [diff truncated]

📌 IDE AST Context: Modified symbols likely include [firebaseConfig, app, db, formatTS, buscarPedido7670]
