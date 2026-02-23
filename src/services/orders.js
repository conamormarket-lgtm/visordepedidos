import { db } from "../firebase/config";
import {
    collection,
    onSnapshot,
    query,
    where,
    doc,
    getDoc,
    updateDoc
} from "firebase/firestore";
import { securityMonitor } from "../utils/securityMonitor";
import { descontarInventarioPorPedido } from "./inventory";

const COLLECTION_NAME = "pedidos";

// Global map to link visual ID with document ID (Smart Mapping)
const _pedidosIdMap = new Map();

/**
 * Suscribe a la lista de operarios configurada en Firebase
 * Documento: configuracion/general
 * Campo: operarios (array)
 */
export const subscribeToOperators = (callback) => {
    const configRef = doc(db, "configuracion", "general");
    return onSnapshot(configRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            const list = Array.isArray(data.operarios) ? data.operarios : [];
            // Siempre aseguramos que 'Sin Asignar' esté presente si no viene de la DB
            if (list.length === 0) {
                callback(["Sin Asignar"]);
            } else {
                callback(list);
            }
        } else {
            callback(["Sin Asignar"]);
        }
    });
};

const resolveVisualId = (data, docId) => {
    // We want the numeric ID. 
    // Sometimes 'id' or 'numeroPedido' is auto-filled with the same random string as docId.
    const candidates = [data.numeroPedido, data.id];

    // 1. Try to find a purely numeric candidate first
    for (const cand of candidates) {
        if (cand && /^\d+$/.test(cand.toString())) {
            return parseInt(cand.toString(), 10).toString();
        }
    }

    // 2. If docId itself is numeric (happens in some imports), use it
    if (/^\d+$/.test(docId)) {
        return parseInt(docId, 10).toString();
    }

    // 3. If everything is alphanumeric, avoid returning a 20-char random string if possible
    // If data.numeroPedido or data.id is NOT the same as docId, it might be a manual ID
    for (const cand of candidates) {
        if (cand && cand !== docId && cand.toString().length < 15) {
            return cand.toString();
        }
    }

    // 4. Final fallback: if it's the 20-char random ID, at least we clean it or show it clearly
    // But we'll return the first 6 chars to make it "readable" as a reference if it's a system ID
    const finalId = data.numeroPedido || data.id || docId;
    if (finalId.length >= 20 && !/\d/.test(finalId.substring(0, 5))) {
        return finalId.substring(0, 7).toUpperCase(); // e.g. "0FSNT21"
    }

    return finalId;
};

// Normalize order data for UI consumption
// Helper to ensure dates are plain objects for JSON comparison
const normalizeDate = (date) => {
    if (!date) return null;
    if (typeof date.toDate === 'function') {
        const d = date.toDate();
        return { seconds: Math.floor(d.getTime() / 1000), nanoseconds: 0 };
    }
    if (date.seconds !== undefined) {
        return { seconds: date.seconds, nanoseconds: date.nanoseconds || 0 };
    }
    return date;
};

// Helper to normalize stage objects
const normalizeStage = (stage) => {
    if (!stage) return {};
    return {
        ...stage,
        fechaEntrada: normalizeDate(stage.fechaEntrada),
        fechaSalida: normalizeDate(stage.fechaSalida),
        fechaFin: normalizeDate(stage.fechaFin)
    };
};

/**
 * Ordena recursivamente las llaves de un objeto para que JSON.stringify 
 * produzca siempre el mismo resultado independientemente del orden original.
 */
const sortObjectKeys = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sortObjectKeys);
    return Object.keys(obj).sort().reduce((acc, key) => {
        acc[key] = sortObjectKeys(obj[key]);
        return acc;
    }, {});
};

const normalizeOrder = (doc) => {
    const data = doc.data();
    const visualId = resolveVisualId(data, doc.id);

    // Save mapping for future updates using visual ID if needed
    _pedidosIdMap.set(visualId, doc.id);

    // Destination Logic
    const dept = data.envioDepartamento || "";
    const prov = data.enviaProvincia || "";
    const dist = data.envioDistrito || "";

    const isDelivery = ["LIMA", "CALLAO"].includes(dept.toUpperCase());
    const deliveryType = isDelivery ? "DELIVERY" : "AGENCIA";
    const fullDestination = [dept, prov, dist].filter(Boolean).join(", ");

    // Images 
    let images = [];
    const rawImages = data.diseño?.urlImagen;
    if (Array.isArray(rawImages)) images = rawImages;
    else if (typeof rawImages === 'string') images = rawImages.split(/\s+/).filter(Boolean);

    // Products Logic: Ensure sorted keys for consistent JSON stringify
    const productList = {};
    const itemsAgregados = [];
    if (Array.isArray(data.productos)) {
        // Sort products by name to avoid order-based mismatches
        const sortedItems = [...data.productos].sort((a, b) => (a.producto || "").localeCompare(b.producto || ""));
        sortedItems.forEach(item => {
            if (item.producto && item.cantidad > 0) {
                productList[item.producto] = (productList[item.producto] || 0) + item.cantidad;
            }
            // Agregados logic
            const itemName = item.nombre || item.producto || item.productoId || '';
            const itemQty = item.cantidad || 0;
            if (itemName && itemQty > 0) {
                itemsAgregados.push({ name: itemName, qty: itemQty });
            }
        });
    }

    // Map estadoGeneral to internal status
    let internalStatus = "otro";
    const estGen = data.estadoGeneral || "";
    if (estGen === "Listo para Preparar" || estGen === "En Pausa por Stock") internalStatus = "preparacion";
    else if (estGen === "En Estampado") internalStatus = "estampado";
    else if (estGen === "En Empaquetado") internalStatus = "empaquetado";

    // Comments Logic
    let commentText = "";
    if (Array.isArray(data.comentarios)) {
        commentText = data.comentarios
            .map(c => c.texto)
            .filter(t => typeof t === 'string' && t.trim() !== "")
            .join(" | ");
    } else if (typeof data.comentarios === 'string') {
        commentText = data.comentarios;
    }

    const orderData = {
        id: doc.id,
        orderId: visualId,
        date: normalizeDate(data.fechaEnvio),
        destination: fullDestination,
        deliveryType,
        isPriority: data.esPrioridad === true || data.EsPrioridad === true,
        phone: data.clienteContacto,
        products: productList,
        itemsAgregados,
        sizes: data.prendas,
        observations: data.observacion,
        comments: commentText,
        status: internalStatus,
        estadoGeneral: estGen,
        preparacion: normalizeStage(data.preparacion),
        estampado: normalizeStage(data.estampado),
        empaquetado: normalizeStage(data.empaquetado),
        isStockPaused: estGen === "En Pausa por Stock" || data.preparacion?.enPausa || false,
        images: images,
    };

    // DEVOLVER OBJETO CON LLAVES ORDENADAS (Garantiza comparaciones consistentes)
    return sortObjectKeys(orderData);
};

// Local Cache logic to minimize UI re-renders and bridge sessions
const CACHE_KEY = 'pedidos_cache_v1';

const getCache = () => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    } catch (e) {
        return [];
    }
};

const saveCache = (data) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error("Error saving cache:", e);
    }
};

export const subscribeToOrders = (callback, onError) => {
    // 1. Inmediate load from Storage Cache
    let localOrders = getCache();
    if (localOrders.length > 0) {
        console.log("Monitor: Cargando desde caché local...", localOrders.length);
        // IMPORTANTE: Poblar el mapa de IDs desde la caché para que getRealId funcione de inmediato
        localOrders.forEach(o => {
            if (o.orderId && o.id) _pedidosIdMap.set(o.orderId, o.id);
        });
        callback(localOrders);
    }

    const q = query(
        collection(db, COLLECTION_NAME),
        where("estadoGeneral", "in", [
            "Listo para Preparar",
            "En Pausa por Stock",
            "En Estampado",
            "En Empaquetado"
        ])
    );

    return onSnapshot(q, (snapshot) => {
        // Registrar el número de documentos leídos/cambiados
        securityMonitor.registerOperation(snapshot.docChanges().length);

        let hasChanges = false;
        const newOrders = [...localOrders];

        snapshot.docChanges().forEach((change) => {
            const docId = change.doc.id;
            const orderIdx = newOrders.findIndex(o => o.id === docId);

            if (change.type === "removed") {
                if (orderIdx !== -1) {
                    newOrders.splice(orderIdx, 1);
                    hasChanges = true;
                }
            } else {
                // added or modified
                const normalized = normalizeOrder(change.doc);
                if (orderIdx !== -1) {
                    const oldStr = JSON.stringify(newOrders[orderIdx]);
                    const newStr = JSON.stringify(normalized);

                    if (oldStr !== newStr) {
                        newOrders[orderIdx] = normalized;
                        hasChanges = true;
                    }
                } else {
                    newOrders.push(normalized);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges || (snapshot.docs.length > 0 && localOrders.length === 0)) {
            console.log("Monitor: Detectados cambios en Firebase. Actualizando...");
            localOrders = newOrders;
            saveCache(newOrders);
            callback(newOrders);
        } else {
            console.log("Monitor: Datos de Firebase coinciden con caché. Sin cambios.");
        }
    }, (error) => {
        if (onError) onError(error);
        else console.error("Firestore subscription error:", error);
    });
};

// Helper to get real ID from visual ID
export const getRealId = (id) => _pedidosIdMap.get(id) || id;

export const updateOrderStage = async (orderId, newStatus, currentStage, updates) => {
    const realId = getRealId(orderId);
    const orderRef = doc(db, COLLECTION_NAME, realId);

    // Map internal status back to estadoGeneral
    let newEstadoGeneral = "";
    if (newStatus === "preparacion") newEstadoGeneral = "Listo para Preparar";
    else if (newStatus === "estampado") newEstadoGeneral = "En Estampado";
    else if (newStatus === "empaquetado") newEstadoGeneral = "En Empaquetado";
    else if (newStatus === "despacho") newEstadoGeneral = "En Reparto";

    // Al completar una etapa, registramos fecha de fin y entrada de la siguiente
    const updateData = {
        ...(newEstadoGeneral && { estadoGeneral: newEstadoGeneral }),
        [`${currentStage}.estado`]: "Completado",
        [`${currentStage}.fechaFin`]: new Date(),
        // Si hay una siguiente etapa mapeada internamente, registramos su entrada
        ...(newStatus !== 'despacho' && { [`${newStatus}.fechaEntrada`]: new Date() }),
        ...updates
    };

    securityMonitor.registerOperation(1);
    await updateDoc(orderRef, updateData);

    // NUEVO: DESCONTAR INVENTARIO 
    if (newStatus === "estampado" && currentStage === "preparacion") {
        try {
            const docSnap = await getDoc(orderRef);
            let userToLog = "Visor Pedidos (Sistema)";
            if (docSnap.exists()) {
                const currentData = docSnap.data();
                const operator = currentData.estampado?.operador || currentData.estampado?.operadorNombre;
                if (operator && operator !== "Sin Asignar") {
                    userToLog = operator;
                }
            }
            await descontarInventarioPorPedido(realId, userToLog);
        } catch (error) {
            console.error("Error intentando descontar inventario:", error);
        }
    }
};

export const assignOperator = async (orderId, stage, operator) => {
    const realId = getRealId(orderId);
    const orderRef = doc(db, COLLECTION_NAME, realId);
    securityMonitor.registerOperation(1);
    await updateDoc(orderRef, {
        [`${stage}.operador`]: operator
    });
};

export const toggleStockPause = async (orderId, isPaused) => {
    const realId = getRealId(orderId);
    const orderRef = doc(db, COLLECTION_NAME, realId);

    securityMonitor.registerOperation(1);
    await updateDoc(orderRef, {
        "estadoGeneral": isPaused ? "En Pausa por Stock" : "Listo para Preparar",
        "preparacion.enPausa": isPaused
    });
};
