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

/**
 * Resolves a visual ID to a clean format.
 * If numeric with leading zeros, removes them.
 * If numeroPedido exists, uses it. Falls back to document ID.
 */
const resolveVisualId = (data, docId) => {
    const rawId = data.numeroPedido || docId;

    // Check if it's purely numeric (e.g., "005513")
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
    const rawImages = data.diseño?.urlImagen;

    if (Array.isArray(rawImages)) {
        images = rawImages;
    } else if (typeof rawImages === 'string') {
        images = rawImages.split(/\s+/).filter(Boolean);
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
        id: doc.id, // Real Firebase ID
        orderId: visualId, // Normalized Visual ID
        date: data.fechaEnvio,
        destination: fullDestination,
        deliveryType,
        isPriority: !!data.EsPrioridad, // Read boolean priority
        phone: data.clienteContacto,
        products: data.producto,
        sizes: data.prendas,
        observations: data.observaciones,
        comments: "",
        status: internalStatus,
        estadoGeneral: estGen,
        // Stage specific data
        preparacion: data.preparacion || {},
        estampado: data.estampado || {},
        empaquetado: data.empaquetado || {},
        // Stock Pause logic based on estadoGeneral or internal field
        isStockPaused: estGen === "En Pausa por Stock" || data.preparacion?.enPausa || false,
    };
};

export const subscribeToOrders = (callback, onError) => {
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

        const orders = snapshot.docs.map(normalizeOrder);
        callback(orders);
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
