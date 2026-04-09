import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    projectId: "sistema-gestion-3b225",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkLogic() {
    const pedidoId = '006331';
    const pedidoSnap = await getDoc(doc(db, 'pedidos', pedidoId));
    const data = pedidoSnap.data();
    
    let prendasFuente = data.prendas || data.talla;
    let prendasDetalladas = [];
    if (typeof prendasFuente === 'string') {
        try {
            if (prendasFuente.startsWith('"') && prendasFuente.endsWith('"')) prendasFuente = JSON.parse(prendasFuente);
            if (typeof prendasFuente === 'string' && prendasFuente.startsWith('[')) prendasFuente = JSON.parse(prendasFuente);
        } catch (e) { }
    }
    
    if (Array.isArray(prendasFuente) && prendasFuente.length > 0) {
        prendasFuente.forEach(p => {
             prendasDetalladas.push(p);
        });
    }
    
    const normalizeStr = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    function agruparPrendas(prendas) {
        const byPrenda = new Map();
        for (const p of prendas || []) {
            const key = `${(p.tipoPrenda || "").toLowerCase()}_${(p.color || "").toLowerCase()}_${(p.talla || "").toLowerCase()}`;
            const existing = byPrenda.get(key);
            if (!existing) byPrenda.set(key, { tipoPrenda: p.tipoPrenda || "", color: p.color || "", talla: p.talla || "", cantidad: Number(p.cantidad) || 1 });
            else existing.cantidad += Number(p.cantidad) || 1;
        }
        return Array.from(byPrenda.values());
    }
    const prendasUnicas = agruparPrendas(prendasDetalladas);
    console.log("Prendas unicas:", prendasUnicas);
    
    const statsDoc = await getDoc(doc(db, 'metadata', 'inventory_stats'));
    let items = statsDoc.data().items;
    
    let errores = [];
    for (const prendaReq of prendasUnicas) {
        const targetCombined = normalizeStr((prendaReq.tipoPrenda || "") + (prendaReq.color || ""));
        const targetTalla = normalizeStr(prendaReq.talla || "");
        const cantidadReq = prendaReq.cantidad || 1;
        const index = items.findIndex(i => {
            const combined = normalizeStr((i.type || i.tipoPrenda || "") + (i.color || ""));
            const talla = normalizeStr(i.size || i.talla || "");
            return combined === targetCombined && talla === targetTalla;
        });
        if (index === -1) {
            errores.push(`STOCK_INSUFICIENTE: ${prendaReq.tipoPrenda} ${prendaReq.color} ${prendaReq.talla} — no encontrado`);
        } else {
             if (items[index].quantity < cantidadReq) {
                 errores.push(`STOCK_INSUFICIENTE: available ${items[index].quantity}`);
             } else {
                 console.log("Found match!", items[index]);
             }
        }
    }
    console.log("Errores:", errores);
    process.exit(0);
}
checkLogic();
