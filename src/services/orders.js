import { db } from "../firebase/config";
import {
    collection,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc
} from "firebase/firestore";
import { securityMonitor } from "../utils/securityMonitor";

const COLLECTION_NAME = "pedidos";

// Global map to link visual ID with document ID (Smart Mapping)
const _pedidosIdMap = new Map();

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

    // Images from diseño map
    let images = [];
    const rawImages = data.diseño?.urlImagen;

    if (Array.isArray(rawImages)) {
        images = rawImages;
    } else if (typeof rawImages === 'string') {
        images = rawImages.split(/\s+/).filter(Boolean);
    }

    // Products Logic
    const productList = {};
    if (Array.isArray(data.productos)) {
        data.productos.forEach(item => {
            if (item.producto && item.cantidad > 0) {
                productList[item.producto] = (productList[item.producto] || 0) + item.cantidad;
            }
        });
    }

    // Map estadoGeneral to internal status
    let internalStatus = "otro";
    const estGen = data.estadoGeneral || "";

    if (estGen === "Listo para Preparar" || estGen === "En Pausa por Stock") {
        internalStatus = "preparacion";
    } else if (estGen === "En Estampado") {
        internalStatus = "estampado";
    } else if (estGen === "En Empaquetado") {
        internalStatus = "empaquetado";
    }

    return {
        id: doc.id,
        orderId: visualId,
        date: normalizeDate(data.fechaEnvio),
        destination: fullDestination,
        deliveryType,
        isPriority: data.esPrioridad === true || data.EsPrioridad === true,
        phone: data.clienteContacto,
        products: productList,
        sizes: data.prendas,
        observations: data.observacion,
        comments: (function () {
            if (Array.isArray(data.comentarios)) {
                return data.comentarios
                    .map(c => c.texto)
                    .filter(t => typeof t === 'string' && t.trim() !== "")
                    .join(" | ");
            }
            return typeof data.comentarios === 'string' ? data.comentarios : "";
        })(),
        status: internalStatus,
        estadoGeneral: estGen,
        preparacion: normalizeStage(data.preparacion),
        estampado: normalizeStage(data.estampado),
        empaquetado: normalizeStage(data.empaquetado),
        isStockPaused: estGen === "En Pausa por Stock" || data.preparacion?.enPausa || false,
        images: images,
    };
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
                    // COMPARE: Only update if content is different
                    // Using stringify for quick deep comparison of relevant parts
                    if (JSON.stringify(newOrders[orderIdx]) !== JSON.stringify(normalized)) {
                        newOrders[orderIdx] = normalized;
                        hasChanges = true;
                    }
                } else {
                    newOrders.push(normalized);
                    hasChanges = true;
                }
            }
        });

        if (hasChanges || localOrders.length === 0) {
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
    else if (newStatus === "despacho") newEstadoGeneral = "Finalizado"; // Or whatever corresponds

    const updateData = {
        ...(newEstadoGeneral && { estadoGeneral: newEstadoGeneral }),
        [`${currentStage}.estado`]: "Completado",
        [`${currentStage}.fechaFin`]: new Date(),
        ...updates
    };

    securityMonitor.registerOperation(1);
    await updateDoc(orderRef, updateData);
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
