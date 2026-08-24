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

export const enviarImagenAImpresion = async (order, imagenUrl) => {
    if (!imagenUrl) throw new Error("No hay imagen para enviar");

    securityMonitor.registerOperation(1);

    await addDoc(collection(db, COLECCION_AGREGADOS), {
        imagenUrl,
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
