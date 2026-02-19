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
    // Priority: data.id (Number), then data.numeroPedido, then Firestore docId
    const rawId = data.id || data.numeroPedido || docId;

    // Check if it's purely numeric (e.g., "005513" or 5513)
    if (/^\d+$/.test(rawId)) {
        return parseInt(rawId, 10).toString();
    }

    return rawId;
};

// Normalize order data for UI consumption
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
    // Try to get images from diseño.urlImagen (some records have it here)
    const rawImages = data.diseño?.urlImagen;

    if (Array.isArray(rawImages)) {
        images = rawImages;
    } else if (typeof rawImages === 'string') {
        images = rawImages.split(/\s+/).filter(Boolean);
    }

    // Products Logic: Real field is 'productos' (array of objects), but UI expects an object {name: qty}
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

    // Comments Logic: Real field 'comentarios' is often an array of {texto, autor, fecha}
    let commentText = "";
    if (Array.isArray(data.comentarios)) {
        commentText = data.comentarios
            .map(c => c.texto)
            .filter(t => typeof t === 'string' && t.trim() !== "")
            .join(" | ");
    } else if (typeof data.comentarios === 'string') {
        commentText = data.comentarios;
    }

    return {
        id: doc.id, // Real Firebase ID
        orderId: visualId, // Normalized Visual ID
        date: data.fechaEnvio,
        destination: fullDestination,
        deliveryType,
        isPriority: data.esPrioridad === true || data.EsPrioridad === true, // Check both cases
        phone: data.clienteContacto,
        products: productList,
        sizes: data.prendas,
        observations: data.observacion, // Real field is 'observacion'
        comments: commentText, // Processed string
        status: internalStatus,
        estadoGeneral: estGen,
        // Stage specific data
        preparacion: data.preparacion || {},
        estampado: data.estampado || {},
        empaquetado: data.empaquetado || {},
        // Stock Pause logic based on estadoGeneral or internal field
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
