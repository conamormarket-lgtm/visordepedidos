import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDnQ5TPUyQfUTJ7GcgDHB71PncDj0De5pc",
    projectId: "sistema-gestion-3b225",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkOrder(orderVisualId) {
    const q = query(collection(db, "pedidos"), where("numeroPedido", "==", orderVisualId));
    const snap = await getDocs(q);
    if(snap.empty) {
        // check doc id
        const d = await getDoc(doc(db, "pedidos", String(orderVisualId)));
        if(d.exists()) {
             return { id: d.id, ...d.data() };
        }
        return null;
    } else {
        return { id: snap.docs[0].id, ...snap.docs[0].data() };
    }
}

async function analyze() {
    const o7327 = await checkOrder("7327") || await checkOrder(7327);
    if(o7327) {
        console.log("--- ORDEN 7327 ---");
        console.log(JSON.stringify({ 
           id: o7327.id, 
           inventarioDescontado: o7327.inventarioDescontado, 
           prendas: o7327.prendas, 
           talla: o7327.talla,
           productos: o7327.productos,
           esWeb: !!o7327.webData 
        }, null, 2));
    }

    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const q = query(collection(db, "pedidos"), where("estadoGeneral", "==", "En Estampado"));
    const snap = await getDocs(q);
    
    const ordersHoy = [];
    snap.forEach(doc => {
        const data = doc.data();
        const est = data.estampado;
        if(est && est.fechaEntrada && typeof est.fechaEntrada.toDate === 'function') {
            if(est.fechaEntrada.toDate() > hoy) {
                ordersHoy.push({
                   id: doc.id,
                   numeroPedido: data.numeroPedido,
                   inventarioDescontado: data.inventarioDescontado,
                   prendas: data.prendas,
                   talla: data.talla,
                   productos: data.productos
                });
            }
        }
    });

    console.log(`\n--- PEDIDOS DE HOY EN ESTAMPADO (${ordersHoy.length}) ---`);
    if(ordersHoy.length > 0) {
        const noDescontados = ordersHoy.filter(o => !o.inventarioDescontado);
        console.log(`No descontados hoy: ${noDescontados.length}`);
        if(noDescontados.length > 0) {
            console.log("Ejemplo de pedido NO descontado:");
            console.log(JSON.stringify({
               id: noDescontados[0].id,
               numeroPedido: noDescontados[0].numeroPedido,
               inventarioDescontado: noDescontados[0].inventarioDescontado,
               prendas: noDescontados[0].prendas,
               talla: noDescontados[0].talla,
               productos: noDescontados[0].productos ? `${noDescontados[0].productos.length} items` : "no"
            }, null, 2));
        }
    }
    process.exit(0);
}

analyze().catch(console.error);
