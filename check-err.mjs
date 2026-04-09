import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, serverTimestamp, collection } from "firebase/firestore";

const app = initializeApp({
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    projectId: "sistema-gestion-3b225",
});
const db = getFirestore(app);

const normalizeStr = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

function agruparPrendas(prendas) {
    const byPrenda = new Map();
    for (const p of prendas || []) {
        const key = `${(p.tipoPrenda || "").toLowerCase()}_${(p.color || "").toLowerCase()}_${(p.talla || "").toLowerCase()}`;
        const existing = byPrenda.get(key);
        if (!existing) byPrenda.set(key, { tipoPrenda: p.tipoPrenda || "", color: p.color || "", talla: p.talla || "", cantidad: p.cantidad || 1 });
        else existing.cantidad += p.cantidad || 1;
    }
    return Array.from(byPrenda.values());
}

async function runTest() {
    try {
        const pedidoId = "006331";
        const pedidoSnap = await getDoc(doc(db, "pedidos", pedidoId));
        if(!pedidoSnap.exists()){
             console.log("No existe pedido"); return;
        }
        const data = pedidoSnap.data();

        let prendasFuente = data.prendas || data.talla;
        const prendasDetalladas = [];
        
        if (typeof prendasFuente === 'string') {
            try {
                if (prendasFuente.startsWith('"') && prendasFuente.endsWith('"')) prendasFuente = JSON.parse(prendasFuente);
                if (typeof prendasFuente === 'string' && prendasFuente.startsWith('[')) prendasFuente = JSON.parse(prendasFuente);
            } catch (e) { }
        }

        if (Array.isArray(prendasFuente) && prendasFuente.length > 0) {
            prendasFuente.forEach(p => {
                if (typeof p === 'string') {
                    console.log("Era un string:", p);
                } else {
                    prendasDetalladas.push(p);
                }
            });
        }

        const prendasUnicas = agruparPrendas(prendasDetalladas);
        if(prendasUnicas.length === 0) {
            throw new Error("NO_PRENDAS");
        }

        const statsDoc = await getDoc(doc(db, "metadata", "inventory_stats"));
        let items = statsDoc.data().items;

        const updatesLog = [];
        let descontadas = 0;

        for (const prendaReq of prendasUnicas) {
            const targetCombined = normalizeStr((prendaReq.tipoPrenda || "") + (prendaReq.color || ""));
            const targetTalla = normalizeStr(prendaReq.talla || "");
            const cantidadReq = prendaReq.cantidad || 1;

            const index = items.findIndex(i => {
                const combined = normalizeStr((i.type || i.tipoPrenda || "") + (i.color || ""));
                const talla = normalizeStr(i.size || i.talla || "");
                return combined === targetCombined && talla === targetTalla;
            });

            if (index !== -1) {
                const available = items[index].quantity;
                const cantidadFaltante = cantidadReq - available;
                if (available < cantidadReq) {
                    throw new Error(`STOCK_INSUFICIENTE: available less than required`);
                }
                
                // No update exactly
                
                const itemType = items[index].type || items[index].tipoPrenda || prendaReq.tipoPrenda;
                const itemColor = items[index].color || prendaReq.color;
                const itemSize = items[index].size || items[index].talla || prendaReq.talla;

                const logDocRef = doc(collection(db, "history"));
                const dataToWrite = {
                    timestamp: "MOCK_TIMESTAMP",
                    user: "TEST",
                    action: "Salida",
                    details: `Descuento automático por pedido #${data.numeroPedido || pedidoId} - ${itemType} - ${itemColor} - Talla ${itemSize} (Cant: ${cantidadReq})`,
                    quantity: cantidadReq,
                    metadata: {
                        type: itemType,
                        color: itemColor,
                        size: itemSize,
                        quantity: cantidadReq,
                        originalActionType: "exit",
                        pedidoOrigenId: pedidoId
                    }
                };
                
                // VALIDATE dataToWrite
                JSON.stringify(dataToWrite); // Should throw if there is a cycle or bad error
                for(const key of Object.keys(dataToWrite.metadata)) {
                    if(dataToWrite.metadata[key] === undefined) {
                        throw new Error(`Firebase Exception: Field ${key} is undefined.`);
                    }
                }

                console.log("All data formats correct for:", itemType, itemColor, itemSize);

            } else {
                throw new Error(
                    `STOCK_INSUFICIENTE: ${prendaReq.tipoPrenda} ${prendaReq.color} ${prendaReq.talla} — no encontrado`
                );
            }
        }
        console.log("SUCCESS TEST");
    } catch(err) {
        console.error("FAIL:", err.message);
    }
}

runTest();
