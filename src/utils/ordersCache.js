// Caché auxiliar: Firebase sigue siendo la fuente de verdad. Si IndexedDB
// no está disponible, la aplicación continúa con datos de la suscripción.
let opening;
const openCache = () => {
    if (!globalThis.indexedDB) return Promise.resolve(null);
    if (!opening) opening = new Promise(resolve => {
        const request = indexedDB.open('visor-orders-cache', 1);
        request.onupgradeneeded = () => request.result.createObjectStore('orders');
        request.onsuccess = () => {
            const db = request.result;
            db.onversionchange = () => { db.close(); opening = null; };
            resolve(db);
        };
        request.onerror = () => { opening = null; resolve(null); };
        request.onblocked = () => resolve(null);
    });
    return opening;
};

export const readOrdersCache = async () => {
    try {
        const db = await openCache();
        if (!db) return [];
        return await new Promise(resolve => {
            const tx = db.transaction('orders', 'readonly');
            const request = tx.objectStore('orders').get('v3');
            request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
            request.onerror = () => resolve([]);
            tx.onabort = () => resolve([]);
        });
    } catch { return []; }
};

export const writeOrdersCache = async orders => {
    try {
        const db = await openCache();
        if (!db) return;
        await new Promise(resolve => {
            const tx = db.transaction('orders', 'readwrite');
            tx.objectStore('orders').put(orders, 'v3');
            tx.oncomplete = resolve;
            tx.onerror = resolve;
            tx.onabort = resolve;
        });
    } catch { /* Una caché fallida no interrumpe las operaciones. */ }
};
