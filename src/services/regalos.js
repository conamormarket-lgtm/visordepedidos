import { db } from "../firebase/config";
import { collection, doc, getDocs, serverTimestamp } from "firebase/firestore";

// En el ERP esta colección se muestra como "Inventario de Regalos": billeteras,
// gorros, placas, collares… por color y marca / diseño.
export const INVENTARIO_REGALOS = "inventario-accesorios";
const COLLECTION_MOVIMIENTOS = "movimientosInventarioGlobal";

// Firestore no conserva el orden de los atributos: "Color" va antes que "Marca / Diseño".
export const etiquetaRegalo = item => [
    item.tipo,
    ...Object.entries(item.attrs || {}).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
        .filter(v => v && v !== "Sin marca"),
].join(" ");

const stockDe = data => data.quantity ?? data.cantidad ?? 0;

export const cargarRegalos = async () => {
    const snap = await getDocs(collection(db, INVENTARIO_REGALOS));
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(item => !item.deletedAt)
        .map(item => ({ ...item, stock: stockDe(item), etiqueta: etiquetaRegalo(item) }))
        .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, "es"));
};

// Lee y valida dentro de la transacción del avance; devuelve las escrituras.
// Movimiento con el mismo formato que las salidas genéricas del ERP
// (inventory-operations.ts), para que aparezca en su historial de Regalos.
export const prepararDescuentoRegalos = async (tx, seleccion, { numeroPedido, pedidoId, usuario }) => {
    const porId = new Map();
    for (const { id, cantidad } of seleccion) {
        if (!id || id.includes("/") || !Number.isSafeInteger(cantidad) || cantidad <= 0) {
            throw new Error(`REGALO_INVALIDO: ${id || "sin identificar"}`);
        }
        porId.set(id, (porId.get(id) || 0) + cantidad);
    }
    const lineas = [...porId].map(([id, cantidad]) => ({ id, cantidad, ref: doc(db, INVENTARIO_REGALOS, id) }));
    const snaps = [];
    for (const linea of lineas) snaps.push(await tx.get(linea.ref));

    const movimientos = lineas.map((linea, i) => {
        const snap = snaps[i];
        if (!snap.exists() || snap.data().deletedAt) throw new Error(`REGALO_NO_ENCONTRADO: ${linea.id}`);
        const data = snap.data();
        const item = { ...data, etiqueta: etiquetaRegalo(data) };
        const previousStock = stockDe(data);
        if (!Number.isFinite(previousStock) || previousStock < linea.cantidad) {
            throw new Error(`SIN_STOCK_REGALO: ${item.etiqueta} — disponible: ${previousStock}, requerido: ${linea.cantidad}`);
        }
        return { ...linea, data, item, previousStock, newStock: previousStock - linea.cantidad };
    });

    const entregados = movimientos.map(m => ({
        inventarioId: INVENTARIO_REGALOS, itemId: m.id, tipo: m.data.tipo || "",
        attrs: m.data.attrs || {}, cantidad: m.cantidad,
    }));

    const guardar = () => {
        const ahora = new Date().toISOString();
        for (const m of movimientos) {
            tx.update(m.ref, {
                quantity: m.newStock,
                ...(m.data.cantidad !== undefined && { cantidad: m.newStock }),
                updatedAt: serverTimestamp(),
                updatedAtStr: ahora,
            });
            tx.set(doc(collection(db, COLLECTION_MOVIMIENTOS)), {
                timestamp: serverTimestamp(), createdAt: serverTimestamp(), createdAtStr: ahora,
                user: usuario || "Visor Pedidos",
                action: "Salida",
                details: `Regalo en empaquetado del pedido #${numeroPedido} - ${m.item.etiqueta} (Cant: ${m.cantidad})`,
                quantity: m.cantidad,
                inventarioId: INVENTARIO_REGALOS,
                source: "visor_pedidos",
                previousStock: m.previousStock,
                newStock: m.newStock,
                metadata: {
                    ...(m.data.attrs || {}), type: m.data.tipo || "", quantity: m.cantidad,
                    originalActionType: "exit", pedidoOrigenId: pedidoId,
                },
            });
        }
    };

    return { entregados, guardar };
};
