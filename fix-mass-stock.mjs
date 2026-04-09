import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, query, where, runTransaction, serverTimestamp } from "firebase/firestore";

const app = initializeApp({
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    projectId: "sistema-gestion-3b225",
});
const db = getFirestore(app);

const normalizeStr = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

function parsearTallaPrendaColorTalla(texto) {
    if (!texto || typeof texto !== "string" || texto.trim() === "") return [];

    const normalizedOriginal = texto.trim();
    const separatorPattern = / \+ | y |,|\n/gi;
    const parts = normalizedOriginal.split(separatorPattern).map(p => p.trim()).filter(Boolean);
    const result = [];

    parts.forEach(part => {
        let text = part.replace(/\s+/g, " ");
        let cantidad = 1;
        text = text.replace(/(?:^|\s)(BOX|CUADRO|CON DISEÑO|SIN DISEÑO)(?:\s|$)/gi, " ").trim();

        const qtyPatterns = [
            /^\(?([0-9]+)\s*[xX]?\)?\s+(.*)$/,
            /^(.*?)\s*\(?([0-9]+)\s*[xX]\)?$/,
        ];

        for (const pt of qtyPatterns) {
            const match = text.match(pt);
            if (match) {
                if (!isNaN(parseInt(match[1]))) {
                    cantidad = parseInt(match[1]);
                    text = match[2];
                } else if (!isNaN(parseInt(match[2]))) {
                    cantidad = parseInt(match[2]);
                    text = match[1];
                }
                break;
            }
        }

        const finalParts = text.split(" ").filter(Boolean);
        if (finalParts.length < 3) {
            result.push({ tipoPrenda: text, color: "", talla: "", cantidad });
            return;
        }

        const tipoPrenda = finalParts[0];
        const talla = finalParts[finalParts.length - 1];
        const color = finalParts.slice(1, finalParts.length - 1).join(" ");
        result.push({ tipoPrenda, color, talla, cantidad });
    });

    return result;
}

function agruparPrendas(prendas) {
    const byPrenda = new Map();
    for (const p of prendas || []) {
        let cant = p.cantidad || 1;
        if (typeof cant === 'string') cant = parseInt(cant, 10);
        
        const key = `${(p.tipoPrenda || "").toLowerCase()}_${(p.color || "").toLowerCase()}_${(p.talla || "").toLowerCase()}`;
        const existing = byPrenda.get(key);
        if (!existing) byPrenda.set(key, { tipoPrenda: p.tipoPrenda || "", color: p.color || "", talla: p.talla || "", cantidad: cant });
        else existing.cantidad += cant;
    }
    return Array.from(byPrenda.values());
}

async function descontarInventarioPorPedido(pedidoId, userLog) {
    const pedidoRef = doc(db, "pedidos", pedidoId);
    const statsRef = doc(db, "metadata", "inventory_stats");
    const historyRef = collection(db, "history");

    try {
        await runTransaction(db, async (transaction) => {
            const pedidoSnap = await transaction.get(pedidoRef);
            if (!pedidoSnap.exists()) throw new Error("El pedido no existe");
            const data = pedidoSnap.data();

            if (data.inventarioDescontado) throw new Error("ALREADY_DISCOUNTED");

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
                    if (typeof p === 'string') prendasDetalladas.push(...parsearTallaPrendaColorTalla(p));
                    else prendasDetalladas.push(p);
                });
            } else if (typeof prendasFuente === "string" && prendasFuente.trim() !== "") {
                prendasDetalladas.push(...parsearTallaPrendaColorTalla(prendasFuente));
            }

            const prendasUnicas = agruparPrendas(prendasDetalladas);
            if (prendasUnicas.length === 0) throw new Error("NO_PRENDAS");

            const statsDoc = await transaction.get(statsRef);
            let items = [];
            if (statsDoc.exists() && statsDoc.data().items) items = statsDoc.data().items;

            const updatesLog = [];

            for (const prendaReq of prendasUnicas) {
                const targetCombined = normalizeStr((prendaReq.tipoPrenda || "") + (prendaReq.color || ""));
                const targetTalla = normalizeStr(prendaReq.talla || "");
                let cantidadReq = prendaReq.cantidad || 1;

                const index = items.findIndex(i => {
                    const combined = normalizeStr((i.type || i.tipoPrenda || "") + (i.color || ""));
                    const talla = normalizeStr(i.size || i.talla || "");
                    return combined === targetCombined && talla === targetTalla;
                });

                if (index !== -1) {
                    const available = items[index].quantity;
                    const cantidadFaltante = cantidadReq - available;

                    if (available < cantidadReq) {
                        const itemType = items[index].type || items[index].tipoPrenda || prendaReq.tipoPrenda;
                        const itemColor = items[index].color || prendaReq.color;
                        const itemSize = items[index].size || items[index].talla || prendaReq.talla;
                        // Si era un error del pasado, quizas haya que solo dar warning, pero lo respetamos
                        throw new Error(`STOCK_INSUFICIENTE: ${itemType} ${itemColor} ${itemSize} — disponible: ${available}, requerido: ${cantidadReq}`);
                    }

                    items[index].quantity -= cantidadReq;

                    const itemType = items[index].type || items[index].tipoPrenda || prendaReq.tipoPrenda;
                    const itemColor = items[index].color || prendaReq.color;
                    const itemSize = items[index].size || items[index].talla || prendaReq.talla;

                    const logDocRef = doc(historyRef);
                    updatesLog.push({
                        ref: logDocRef,
                        data: {
                            timestamp: serverTimestamp(),
                            user: userLog,
                            action: "Salida",
                            details: `Descuento automático por pedido #${data.numeroPedido || pedidoId} - ${itemType} - ${itemColor} - Talla ${itemSize} (Cant: ${cantidadReq})`,
                            quantity: cantidadReq,
                            metadata: {
                                type: itemType || "unknown",
                                color: itemColor || "unknown",
                                size: itemSize || "unknown",
                                quantity: cantidadReq,
                                originalActionType: "exit",
                                pedidoOrigenId: pedidoId
                            }
                        }
                    });
                } else {
                    throw new Error(`STOCK_INSUFICIENTE: ${prendaReq.tipoPrenda} ${prendaReq.color} ${prendaReq.talla} — no encontrado en inventario`);
                }
            }

            updatesLog.forEach(log => {
                transaction.set(log.ref, log.data);
            });

            transaction.set(statsRef, { items: items, lastUpdated: serverTimestamp() }, { merge: true });
            transaction.set(pedidoRef, { inventarioDescontado: true }, { merge: true });
        });

        console.log(`[${pedidoId}] ✔ Inventario descontado exitosamente.`);
        return true;

    } catch (error) {
        if (error.message === "ALREADY_DISCOUNTED") {
            console.log(`[${pedidoId}] ⏭ Ya descontado previamente.`);
            return true;
        }
        if (error.message === "NO_PRENDAS") {
            console.log(`[${pedidoId}] ⏭ No existen prendas a descontar.`);
            return true;
        }
        console.error(`[${pedidoId}] ✖ Fallo al descontar: ${error.message}`);
        return false;
    }
}

async function runTest() {
    console.log("Iniciando restauración de stock de días pasados...");
    let affectedOrders = [];
    const queries = ['En Estampado', 'En Empaquetado', 'despacho', 'Entregado', 'Pagado'];
    const desdeDate = new Date('2026-04-01T00:00:00Z');
    
    for(const est of queries){
        const snap = await getDocs(query(collection(db, 'pedidos'), where('estadoGeneral', '==', est)));
        snap.forEach(d => {
            const data = d.data();
            if(!data.estampado?.fechaEntrada) return;
            if(data.estampado.fechaEntrada.toDate() < desdeDate) return;
            if(data.inventarioDescontado) return;
            affectedOrders.push(d.id);
        });
    }

    console.log(`Se detectaron ${affectedOrders.length} pedidos sin descontar desde el 1 de Abril.`);
    
    for(let id of affectedOrders) {
        await descontarInventarioPorPedido(id, "SISTEMA - REPARACIÓN EN BATCH");
    }
    console.log("Acabado.");
    process.exit();
}
runTest();
