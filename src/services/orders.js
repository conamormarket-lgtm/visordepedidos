import { db } from "../firebase/config";
import {
    collection,
    onSnapshot,
    query,
    where,
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    serverTimestamp
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

/**
 * Suscribe en tiempo real al documento configuracion/contadores.
 * Este documento es mantenido por el Sistema Gestión con increment()
 * en cada cambio de estadoGeneral — es la misma fuente de verdad que usa.
 */
export const subscribeToCounters = (callback) => {
    const countersRef = doc(db, "configuracion", "contadores");
    return onSnapshot(countersRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.data();
            callback({
                preparacion: data.preparacion ?? null,
                estampado: data.estampado ?? null,
                empaquetado: data.empaquetado ?? null,
            });
        } else {
            callback(null);
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

    // Images — solo se aceptan URLs reales (que comiencen con "http")
    // Algunos pedidos tienen texto basura como "SIN", "DISEÑO", "-" en este campo
    let images = [];
    const rawImages = data.diseño?.urlImagen;
    if (Array.isArray(rawImages)) {
        images = rawImages.filter(u => typeof u === 'string' && u.startsWith('http'));
    } else if (typeof rawImages === 'string') {
        images = rawImages.split(/\s+/).filter(u => u.startsWith('http'));
    }

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
        // ── Campos de envío / impresión de etiqueta ──────────────────────────
        envioNombres: data.envioNombres || '',
        envioApellidos: data.envioApellidos || '',
        envioNumeroDocumento: data.envioNumeroDocumento || '',
        envioContacto: data.envioContacto || '',
        agenciaEnvio: data.agenciaEnvio || '',
        envioDireccionLima: data.envioDireccionLima || '',
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

/**
 * Elimina pedidos duplicados causados por el mismo numeroPedido con y sin ceros al inicio.
 * Ejemplo: "006295" y "6295" son el mismo pedido — se conserva el sin ceros (canónico).
 * Igual que hace el Sistema Gestión en su reconciliación progresiva.
 */
const deduplicateOrders = (orders) => {
    const seen = new Map(); // clave: número sin ceros → orden canónico
    const result = [];

    for (const order of orders) {
        const rawNum = String(order.orderId || order.id || '');
        const normalizedNum = rawNum.replace(/^0+/, '') || rawNum;
        const hasLeadingZeros = rawNum !== normalizedNum && rawNum.startsWith('0');

        if (!seen.has(normalizedNum)) {
            // Primera vez que vemos este número — guardarlo
            seen.set(normalizedNum, { order, hasLeadingZeros });
            result.push(order);
        } else {
            const existing = seen.get(normalizedNum);
            if (existing.hasLeadingZeros && !hasLeadingZeros) {
                // El existente tiene ceros y el nuevo no → reemplazar por el canónico
                const idx = result.findIndex(o => o === existing.order);
                if (idx !== -1) result[idx] = order;
                seen.set(normalizedNum, { order, hasLeadingZeros: false });
            }
            // Si el existente ya es canónico (sin ceros), solo ignorar el duplicado
        }
    }

    return result;
};

export const subscribeToOrders = (callback, onError) => {

    // 1. Inmediate load from Storage Cache
    let localOrders = getCache();
    if (localOrders.length > 0) {
        localOrders = deduplicateOrders(localOrders);
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

    let isFirstSnapshot = true;

    return onSnapshot(q, (snapshot) => {
        // Registrar el número de documentos leídos/cambiados
        securityMonitor.registerOperation(snapshot.docChanges().length);

        let hasChanges = false;

        // PRIMER SNAPSHOT: comparar TODOS los documentos contra el caché.
        // Esto garantiza que si un pedido fue modificado en Firestore mientras
        // la app estaba cerrada (ej: se agregó una imagen en diseño pero no
        // cambió estadoGeneral), el caché obsoleto se actualice correctamente.
        if (isFirstSnapshot) {
            isFirstSnapshot = false;
            const freshOrders = [];

            snapshot.docs.forEach((docSnap) => {
                const normalized = normalizeOrder(docSnap);
                freshOrders.push(normalized);

                const cachedIdx = localOrders.findIndex(o => o.id === docSnap.id);
                if (cachedIdx === -1) {
                    hasChanges = true; // Doc nuevo no estaba en caché
                } else {
                    const oldStr = JSON.stringify(localOrders[cachedIdx]);
                    const newStr = JSON.stringify(normalized);
                    if (oldStr !== newStr) {
                        hasChanges = true; // Doc cambió vs. caché
                        console.log(`Monitor: Pedido ${normalized.orderId} desactualizado en caché. Actualizando imágenes/datos.`);
                    }
                }
            });

            // Detectar docs que estaban en caché pero ya no están en Firebase
            localOrders.forEach(o => {
                if (!snapshot.docs.find(d => d.id === o.id)) {
                    hasChanges = true;
                }
            });

            // Deduplicar por numeroPedido (elimina duplicados con ceros al inicio)
            const dedupedOrders = deduplicateOrders(freshOrders);

            if (hasChanges || localOrders.length === 0) {
                console.log("Monitor: Primer snapshot - datos actualizados desde Firebase.");
                localOrders = dedupedOrders;
                saveCache(dedupedOrders);
                callback(dedupedOrders);
            } else {
                console.log("Monitor: Primer snapshot - caché local al día. Sin cambios.");
            }
            return;
        }

        // SNAPSHOTS POSTERIORES: solo procesar cambios incrementales
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

        if (hasChanges) {
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

    // Leer el doc ANTES de modificar para conocer el operador y datos actuales
    let operadorActual = "Visor Pedidos (Sistema)";
    try {
        const docSnap = await getDoc(orderRef);
        if (docSnap.exists()) {
            const d = docSnap.data();
            const op = d[currentStage]?.operador || d[currentStage]?.operadorNombre;
            if (op && op !== "Sin Asignar") operadorActual = op;
        }
    } catch (e) {
        console.warn("[updateOrderStage] No se pudo leer doc previo:", e);
    }

    // Construir entrada de historial compatible con el sistema principal
    const historialEntry = {
        fecha: serverTimestamp(),
        usuario: operadorActual,
        accion: "Avance de etapa",
        descripcion: `Etapa '${currentStage}' completada → nuevo estado: '${newEstadoGeneral}'`,
        etapa: currentStage,
        nuevoEstado: newEstadoGeneral,
    };

    // Al completar una etapa, registramos fecha de fin y entrada de la siguiente.
    // Usamos serverTimestamp() para consistencia con el sistema principal.
    const now = serverTimestamp();
    const updateData = {
        ...(newEstadoGeneral && { estadoGeneral: newEstadoGeneral }),
        updatedAt: now,
        [`${currentStage}.estado`]: "Completado",
        [`${currentStage}.fechaSalida`]: now,
        [`${currentStage}.fechaFin`]: now,
        [`${currentStage}.operador`]: operadorActual,
        // Si hay una siguiente etapa, registramos su entrada
        ...(newStatus !== 'despacho' && {
            [`${newStatus}.fechaEntrada`]: now,
            [`${newStatus}.estado`]: "En Progreso",
        }),
        historialModificaciones: arrayUnion(historialEntry),
        ...updates
    };

    securityMonitor.registerOperation(1);
    await updateDoc(orderRef, updateData);

    // DESCONTAR INVENTARIO al pasar de preparación → estampado
    if (newStatus === "estampado" && currentStage === "preparacion") {
        try {
            await descontarInventarioPorPedido(realId, operadorActual);
        } catch (error) {
            console.error("Error intentando descontar inventario:", error);
        }
    }
};

/**
 * Revierte un pedido a su etapa anterior.
 * @param {string} orderId - Document ID real del pedido
 * @param {string} prevStage - La etapa a la que se quiere volver (ej: 'preparacion')
 * @param {string} completedStage - La etapa que se marcó como completada (ej: 'estampado')
 * @param {object} prevSnapshot - Snapshot parcial de los campos a restaurar
 */
export const undoOrderStage = async (orderId, prevStage, completedStage, prevSnapshot) => {
    const realId = getRealId(orderId);
    const orderRef = doc(db, COLLECTION_NAME, realId);

    // Map prevStage back to estadoGeneral
    let prevEstadoGeneral = "";
    if (prevStage === "preparacion") prevEstadoGeneral = "Listo para Preparar";
    else if (prevStage === "estampado") prevEstadoGeneral = "En Estampado";
    else if (prevStage === "empaquetado") prevEstadoGeneral = "En Empaquetado";

    const now = serverTimestamp();

    // Entrada de historial para el deshacer
    const historialEntry = {
        fecha: now,
        usuario: "Visor Pedidos (Sistema)",
        accion: "Reversión de etapa",
        descripcion: `Revertido: '${completedStage}' → estado restaurado a '${prevEstadoGeneral}'`,
        etapa: completedStage,
        nuevoEstado: prevEstadoGeneral,
    };

    const restoreData = {
        estadoGeneral: prevEstadoGeneral,
        updatedAt: now,
        // Revertir el estado de la etapa que se "completó" erróneamente
        [`${completedStage}.estado`]: prevSnapshot[`${completedStage}.estado`] || null,
        [`${completedStage}.fechaEntrada`]: prevSnapshot[`${completedStage}.fechaEntrada`] || null,
        [`${completedStage}.fechaSalida`]: null,
        [`${completedStage}.fechaFin`]: null,
        // Revertir la etapa que antes estaba activa (quitar su fechaFin y fechaSalida)
        [`${prevStage}.estado`]: prevSnapshot[`${prevStage}.estado`] || "En Progreso",
        [`${prevStage}.fechaFin`]: null,
        [`${prevStage}.fechaSalida`]: null,
        historialModificaciones: arrayUnion(historialEntry),
    };

    securityMonitor.registerOperation(1);
    await updateDoc(orderRef, restoreData);
};

export const assignOperator = async (orderId, stage, operator) => {
    const realId = getRealId(orderId);
    const orderRef = doc(db, COLLECTION_NAME, realId);

    // Leer estadoGeneral actual para reescribirlo correctamente
    let estadoGeneralActual = null;
    try {
        const docSnap = await getDoc(orderRef);
        if (docSnap.exists()) {
            estadoGeneralActual = docSnap.data().estadoGeneral || null;
        }
    } catch (e) {
        console.warn("[assignOperator] No se pudo leer estadoGeneral:", e);
    }

    const now = serverTimestamp();

    // Entrada de historial compatible con el sistema principal
    const historialEntry = {
        fecha: now,
        usuario: operator,
        accion: "Asignación de operario",
        descripcion: `Operario '${operator}' asignado a etapa '${stage}'`,
        etapa: stage,
        nuevoEstado: estadoGeneralActual,
    };

    const updateData = {
        [`${stage}.operador`]: operator,
        [`${stage}.operadorNombre`]: operator,
        updatedAt: now,
        historialModificaciones: arrayUnion(historialEntry),
        // Reescribir estadoGeneral si lo conocemos (para mantener sincronía con el sistema principal)
        ...(estadoGeneralActual && { estadoGeneral: estadoGeneralActual }),
    };

    securityMonitor.registerOperation(1);
    await updateDoc(orderRef, updateData);
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

/**
 * Guarda los datos de agencia de envío dentro del subdocumento `empaquetado` del pedido.
 * Campos guardados:
 *   empaquetado.agencia         → "SHALOM" | "EVA"
 *   empaquetado.origenAgencia   → sucursal de origen (Shalom)
 *   empaquetado.destinoAgencia  → sucursal de destino (Shalom)
 *   empaquetado.mercaderia      → tipo de paquete (Shalom)
 */
export const saveAgenciaData = async (orderId, { agencia, origen, destino, mercaderia }) => {
    const realId = getRealId(orderId);
    const orderRef = doc(db, COLLECTION_NAME, realId);

    const updateData = {
        "empaquetado.agencia": agencia?.toUpperCase() || null,
    };

    if (agencia === 'shalom') {
        updateData["empaquetado.origenAgencia"] = origen || null;
        updateData["empaquetado.destinoAgencia"] = destino || null;
        updateData["empaquetado.mercaderia"] = mercaderia || null;
    }

    securityMonitor.registerOperation(1);
    await updateDoc(orderRef, updateData);
    console.log(`[Agencia] Pedido ${orderId} → agencia guardada:`, updateData);
};

