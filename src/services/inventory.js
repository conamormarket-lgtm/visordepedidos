import { db } from "../firebase/config";
import { doc, collection, runTransaction, serverTimestamp } from "firebase/firestore";

const COLLECTION_METADATA = "metadata";
const COLLECTION_HISTORY = "history";

const normalizeStr = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

function parsearTallaPrendaColorTalla(texto) {
    if (!texto || typeof texto !== "string" || texto.trim() === "") return [];
    const resultados = [];
    const segmentos = texto.includes(" - ") ? texto.split(/\s+-\s+/) : texto.split(/\s*,\s*/);

    for (const seg of segmentos) {
        const parte = seg.trim();
        if (!parte) continue;

        const matchConParentesis = parte.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (matchConParentesis) {
            const sinTalla = matchConParentesis[1].trim();
            const talla = matchConParentesis[2].trim();
            const tokens = sinTalla.split(/\s+/).filter(Boolean);
            if (tokens.length >= 2) {
                resultados.push({ tipoPrenda: tokens[0], color: tokens.slice(1).join(" "), talla, cantidad: 1 });
                continue;
            }
        }

        const tokens = parte.split(/\s+/).filter(Boolean);
        if (tokens.length >= 3) {
            const posibleTalla = tokens[tokens.length - 1];
            if (posibleTalla.length <= 5 || /^[0-9]+$/.test(posibleTalla)) {
                resultados.push({
                    tipoPrenda: tokens[0],
                    color: tokens.slice(1, tokens.length - 1).join(" "),
                    talla: posibleTalla,
                    cantidad: 1
                });
            }
        }
    }
    return resultados;
}

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

export async function descontarInventarioPorPedido(pedidoId, userLog) {
    try {
        const pedidoRef = doc(db, "pedidos", pedidoId);
        const statsRef = doc(db, COLLECTION_METADATA, "inventory_stats");
        const historyRef = collection(db, COLLECTION_HISTORY);

        let descontadasResult = 0;

        await runTransaction(db, async (transaction) => {
            // READS FIRST
            const pedidoSnap = await transaction.get(pedidoRef);
            if (!pedidoSnap.exists()) {
                throw new Error("Pedido no encontrado");
            }
            const data = pedidoSnap.data();

            if (data.inventarioDescontado) {
                throw new Error("ALREADY_DISCOUNTED");
            }

            const statsDoc = await transaction.get(statsRef);
            let items = [];
            if (statsDoc.exists() && statsDoc.data().items) {
                items = statsDoc.data().items;
            }

            // PROCESSING
            const prendasDetalladas = [];
            let prendasFuente = data.prendas || data.talla;

            if (typeof prendasFuente === 'string') {
                try {
                    if (prendasFuente.startsWith('"') && prendasFuente.endsWith('"')) {
                        prendasFuente = JSON.parse(prendasFuente);
                    }
                    if (typeof prendasFuente === 'string' && prendasFuente.startsWith('[')) {
                        prendasFuente = JSON.parse(prendasFuente);
                    }
                } catch (e) {
                    console.log("Error parseando prendasFuente JSON", e);
                }
            }

            if (Array.isArray(prendasFuente) && prendasFuente.length > 0) {
                prendasFuente.forEach(p => {
                    if (typeof p === 'string') {
                        prendasDetalladas.push(...parsearTallaPrendaColorTalla(p));
                    } else {
                        prendasDetalladas.push(p);
                    }
                });
            } else if (typeof prendasFuente === "string" && prendasFuente.trim() !== "") {
                prendasDetalladas.push(...parsearTallaPrendaColorTalla(prendasFuente));
            }

            const prendasUnicas = agruparPrendas(prendasDetalladas);

            if (prendasUnicas.length === 0) {
                throw new Error("NO_PRENDAS");
            }

            let descontadas = 0;
            const updatesLog = [];

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
                    const canTake = Math.min(cantidadReq, available);

                    if (canTake > 0) {
                        items[index].quantity -= canTake;
                        descontadas++;

                        const itemType = items[index].type || items[index].tipoPrenda || prendaReq.tipoPrenda;
                        const itemColor = items[index].color || prendaReq.color;
                        const itemSize = items[index].size || items[index].talla || prendaReq.talla;

                        const logDocRef = doc(historyRef);
                        // Store the writes to be executed below
                        updatesLog.push({
                            ref: logDocRef,
                            data: {
                                timestamp: serverTimestamp(),
                                user: userLog || "Visor Pedidos (Sistema)",
                                action: "Salida",
                                details: `Descuento automático por pedido #${data.numeroPedido || pedidoId} - ${itemType} - ${itemColor} - Talla ${itemSize} (Cant: ${canTake})`,
                                quantity: canTake,
                                metadata: {
                                    type: itemType,
                                    color: itemColor,
                                    size: itemSize,
                                    quantity: canTake,
                                    originalActionType: "exit",
                                    pedidoOrigenId: pedidoId
                                }
                            }
                        });
                    }
                }
            }

            // WRITES (MUST ONLY BE DONE AFTER ALL READS)
            updatesLog.forEach(log => {
                transaction.set(log.ref, log.data);
            });

            transaction.set(statsRef, { items: items, lastUpdated: serverTimestamp() }, { merge: true });
            transaction.set(pedidoRef, { inventarioDescontado: true }, { merge: true });

            descontadasResult = descontadas;
        });

        console.log(`Inventario descontado exitosamente. Coincidencias descontadas: ${descontadasResult}`);
        return { exito: true, mensaje: "Stock reducido correctamente" };

    } catch (error) {
        if (error.message === "ALREADY_DISCOUNTED") {
            return { exito: true, mensaje: "Ya descontado previamente" };
        }
        if (error.message === "NO_PRENDAS") {
            return { exito: true, mensaje: "No hay prendas para descontar" };
        }
        console.error("Error al descontar inventario:", error);
        return { exito: false, mensaje: "Error del servidor: " + error.message };
    }
}
