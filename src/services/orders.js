import { db } from "../firebase/config";
import {
    collection,
    onSnapshot,
    query,
    where,
    doc,
    updateDoc
} from "firebase/firestore";

const COLLECTION_NAME = "pedidos";

// Normalize order data for UI consumption
const normalizeOrder = (doc) => {
    const data = doc.data();

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
        // Split by whitespace (spaces, newlines, etc.) using regex
        images = rawImages.split(/\s+/).filter(Boolean);
    }

    const imageList = images;

    return {
        id: doc.id,
        orderId: data.id || doc.id, // Display ID (fallback to DocKey if missing)
        date: data.fechaEnvio, // Timestamp or string?
        destination: fullDestination,
        deliveryType,
        isPriority: false, // Placeholder logic, maybe specific field?
        phone: data.clienteContacto,
        products: data.producto, // Map
        sizes: data.prendas,
        observations: data.observaciones,
        comments: "", // Placeholder
        status: data.status,
        // Stage specific data
        preparacion: data.preparacion || {},
        estampado: data.estampado || {},
        empaquetado: data.empaquetado || {},
        // Stock Pause logic (assuming field in preparacion map for now)
        isStockPaused: data.preparacion?.enPausa || false,
    };
};

export const subscribeToOrders = (callback, onError) => {
    const q = query(
        collection(db, COLLECTION_NAME),
        where("status", "in", ["preparacion", "estampado", "empaquetado"])
    );

    return onSnapshot(q, (snapshot) => {
        const orders = snapshot.docs.map(normalizeOrder);
        callback(orders);
    }, (error) => {
        if (onError) onError(error);
        else console.error("Firestore subscription error:", error);
    });
};

export const updateOrderStage = async (orderId, newStatus, currentStage, updates) => {
    const orderRef = doc(db, COLLECTION_NAME, orderId);

    // Construct update object
    // changing status (e.g. 'preparacion' -> 'estampado')
    // and updating the current stage map (e.g. preparacion.estado = 'Completado')
    const updateData = {
        status: newStatus,
        [`${currentStage}.estado`]: "Completado", // Or specific value
        [`${currentStage}.fechaFin`]: new Date(), // Good practice
        ...updates
    };

    await updateDoc(orderRef, updateData);
};

export const assignOperator = async (orderId, stage, operator) => {
    const orderRef = doc(db, COLLECTION_NAME, orderId);
    await updateDoc(orderRef, {
        [`${stage}.operador`]: operator
    });
};

export const toggleStockPause = async (orderId, isPaused) => {
    const orderRef = doc(db, COLLECTION_NAME, orderId);
    await updateDoc(orderRef, {
        "preparacion.enPausa": isPaused
    });
};
