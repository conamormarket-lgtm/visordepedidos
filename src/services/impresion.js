import { db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { securityMonitor } from "../utils/securityMonitor";

/**
 * Puente Visor → Sistema Gestión (etapa Impresión).
 *
 * Cuando un operario elige "Enviar a ERP" sobre una imagen de un pedido en
 * Preparación, se crea un documento en esta colección. El Sistema Gestión la
 * escucha en vivo desde la etapa Impresión y la muestra en su lista
 * "Agregados", con badge de no vistos.
 *
 * La colección vive en la base (default), que es la misma que usa el ERP para
 * el tenant por defecto: ambos sistemas apuntan al mismo proyecto de Firebase.
 *
 * IMPORTANTE: se guarda la URL ORIGINAL de Drive, no la miniatura. El ERP
 * genera su propia miniatura para mostrarla y al hacer clic abre el original.
 */
export const COLECCION_AGREGADOS = "impresion_agregados";

// Tope alto a propósito: no es una regla de negocio, es una red contra el
// teclado (escribir 1000 cuando se quiso 100). Si algún día hace falta más,
// se sube sin miedo.
export const CANTIDAD_MIN = 1;
export const CANTIDAD_MAX = 999;

/**
 * Normaliza lo que se escribió en el campo de cantidad.
 * Devuelve un entero dentro del rango, o null si no es un número usable.
 */
export const normalizarCantidad = (valor) => {
    if (valor === null || valor === undefined || valor === "") return null;
    const n = Number(valor);
    if (!Number.isFinite(n)) return null;
    const entero = Math.trunc(n);
    if (entero < CANTIDAD_MIN || entero > CANTIDAD_MAX) return null;
    return entero;
};

export const enviarImagenAImpresion = async (order, imagenUrl, cantidad) => {
    if (!imagenUrl) throw new Error("No hay imagen para enviar");

    // La cantidad se valida acá y no solo en el formulario: es el dato con el
    // que el impresor decide cuántas copias sacar, y un valor basura no debe
    // llegar nunca a la lista del ERP.
    const cantidadFinal = normalizarCantidad(cantidad);
    if (cantidadFinal === null) {
        throw new Error(`La cantidad debe ser un número entre ${CANTIDAD_MIN} y ${CANTIDAD_MAX}`);
    }

    securityMonitor.registerOperation(1);

    await addDoc(collection(db, COLECCION_AGREGADOS), {
        imagenUrl,
        cantidad: cantidadFinal,
        pedidoId: order?.id || null,
        numeroPedido: order?.orderId != null ? String(order.orderId) : null,
        destino: order?.destination || "",
        zonaEnvio: order?.zonaEnvio || null,
        // De dónde vino, por si más adelante otra pantalla también envía.
        enviadoDesde: "visor-preparacion",
        enviadoEn: serverTimestamp(),
        // El badge de la etapa Impresión cuenta los que tienen visto === false.
        visto: false,
    });
};
