import { db } from "../firebase/config";
import { doc, collection, runTransaction, serverTimestamp } from "firebase/firestore";

const COLLECTION_INVENTARIO = "inventarioPrendas";
const COLLECTION_HISTORIAL = "historialInventarioPrendas";

// Genera un ID compatible con la nueva arquitectura (ej: "polo-cuello-v_negro_m")
function generateItemId(tipo, color, talla) {
    const clean = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return `${clean(tipo)}_${clean(color)}_${clean(talla)}`;
}

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
        const historialRef = collection(db, COLLECTION_HISTORIAL);

        let descontadasResult = 0;

        await runTransaction(db, async (transaction) => {
            // 1. LECTURAS (Deben realizarse todas antes de escribir)
            const pedidoSnap = await transaction.get(pedidoRef);
            if (!pedidoSnap.exists()) {
                throw new Error("Pedido no encontrado");
            }
            const data = pedidoSnap.data();

            if (data.inventarioDescontado) {
                throw new Error("ALREADY_DISCOUNTED");
            }

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

            // Preparar referencias a los documentos de inventario
            const inventoryRefs = prendasUnicas.map(prendaReq => {
                const id = generateItemId(prendaReq.tipoPrenda, prendaReq.color, prendaReq.talla);
                return {
                    id,
                    ref: doc(db, COLLECTION_INVENTARIO, id),
                    req: prendaReq
                };
            });

            // Leer todos los documentos de inventario en masa
            const inventorySnaps = {};
            for (const item of inventoryRefs) {
                inventorySnaps[item.id] = await transaction.get(item.ref);
            }

            // 2. VALIDACIÓN (Chequear existencias antes de mutar datos)
            let descontadas = 0;
            const updatesLog = [];

            for (const item of inventoryRefs) {
                const snap = inventorySnaps[item.id];
                const cantidadReq = item.req.cantidad || 1;

                if (!snap.exists()) {
                    throw new Error(`STOCK_INSUFICIENTE: ${item.req.tipoPrenda} ${item.req.color} ${item.req.talla} — no encontrado en inventario`);
                }

                const invData = snap.data();
                const available = invData.quantity || 0;

                if (available < cantidadReq) {
                    const cantidadFaltante = cantidadReq - available;
                    const itemType = invData.type || invData.tipoPrenda || item.req.tipoPrenda;
                    const itemColor = invData.color || item.req.color;
                    const itemSize = invData.size || invData.talla || item.req.talla;
                    
                    throw new Error(
                        `STOCK_INSUFICIENTE: ${itemType} ${itemColor} ${itemSize} — disponible: ${available}, requerido: ${cantidadReq} (faltan ${cantidadFaltante})`
                    );
                }

                // 3. PREPARAR ESCRITURAS
                descontadas++;
                const itemType = invData.type || invData.tipoPrenda || item.req.tipoPrenda;
                const itemColor = invData.color || item.req.color;
                const itemSize = invData.size || invData.talla || item.req.talla;
                
                const newQuantity = available - cantidadReq;
                const newSalidas = (invData.salidas || 0) + cantidadReq;

                updatesLog.push({
                    invRef: item.ref,
                    invData: {
                        quantity: newQuantity,
                        salidas: newSalidas,
                        updatedAt: serverTimestamp()
                    },
                    historyRef: doc(historialRef),
                    historyData: {
                        itemId: item.id,
                        type: "exit",
                        categoryMovement: "preparación_estampado",
                        details: {
                            type: itemType,
                            color: itemColor,
                            size: itemSize
                        },
                        quantity: cantidadReq,
                        prevStock: available,
                        newStock: newQuantity,
                        date: serverTimestamp(),
                        user: {
                            name: typeof userLog === 'string' ? userLog : "Sistema",
                            username: typeof userLog === 'string' ? userLog : "admin"
                        }
                    }
                });
            }

            // 4. EJECUTAR ESCRITURAS (No más lecturas a partir de aquí)
            for (const log of updatesLog) {
                transaction.update(log.invRef, log.invData);
                transaction.set(log.historyRef, log.historyData);
            }

            transaction.update(pedidoRef, { inventarioDescontado: true });

            descontadasResult = descontadas;
        });

        console.log(`Inventario descontado exitosamente. Coincidencias descontadas: ${descontadasResult}`);
        return { exito: true, mensaje: "Stock reducido correctamente" };

    } catch (error) {
        if (error.message === "ALREADY_DISCOUNTED") {
            return { exito: true, mensaje: "Ya descontado previamente" };
        }
        if (error.message === "NO_PRENDAS") {
            console.warn("[Inventario] El pedido no tiene prendas parseables — se bloquea el avance para evitar omitir descuento.");
            return { exito: false, sinPrendas: true, mensaje: "No se encontraron prendas en el pedido para descontar del inventario" };
        }
        if (error.message?.startsWith("STOCK_INSUFICIENTE:")) {
            const detalle = error.message.replace("STOCK_INSUFICIENTE: ", "");
            console.warn("[Inventario] Stock insuficiente al descontar:", detalle);
            return { exito: false, sinStock: true, mensaje: detalle };
        }
        console.error("Error al descontar inventario:", error);
        return { exito: false, mensaje: "Error del servidor: " + error.message };
    }
}
