import { isModoLigero } from './modoLigero';

/**
 * Ancho al que se piden las miniaturas de Drive.
 *
 * Antes estaba fijo en w2560. El carrusel ocupa ~70% del ancho de pantalla,
 * así que en una tablet de 1280px se mostraban imágenes de 2560px dentro de
 * un hueco de ~900px: el navegador descargaba y decodificaba ~6.5 millones de
 * píxeles por imagen para dibujar menos de un millón. Con 3-5 imágenes por
 * pedido eso son varios MB y cientos de ms de decodificación en cada swipe.
 *
 * Ahora se pide el ancho que realmente se va a mostrar, con topes prudentes.
 * El diseño en tamaño original sigue a un clic: la imagen abre en Drive.
 */
const TOPE_NORMAL = 1600;
const TOPE_LIGERO = 1100;

const anchoMiniatura = () => {
    const anchoPantalla = (typeof window !== 'undefined' && window.innerWidth) || 1280;
    // El carrusel ocupa el 70% en escritorio; en tablet vertical, el 100%.
    const anchoVisible = anchoPantalla >= 1280 ? anchoPantalla * 0.7 : anchoPantalla;
    // Se limita el DPR a 2: por encima no se nota y el costo se dispara.
    const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
    const tope = isModoLigero() ? TOPE_LIGERO : TOPE_NORMAL;
    const deseado = Math.round(anchoVisible * dpr);
    // Se redondea a saltos de 200px para que la URL se repita entre pedidos
    // y el navegador pueda reutilizar la caché en vez de pedir anchos sueltos.
    const escalonado = Math.ceil(deseado / 200) * 200;
    return Math.min(tope, Math.max(600, escalonado));
};

export const convertDriveLink = (url) => {
    if (!url) return '';
    // If it's already a direct link or not a drive link, return as is
    if (!url.includes('drive.google.com')) return url;

    // Extract ID
    // Patterns: 
    // /file/d/ID/view
    // id=ID
    let id = '';
    const parts = url.split('/');
    const dIndex = parts.indexOf('d');
    if (dIndex !== -1 && parts.length > dIndex + 1) {
        id = parts[dIndex + 1].split(/[?#]/)[0]; // Limpiar cualquier parámetro después del ID
    } else {
        try {
            const urlObj = new URL(url);
            id = urlObj.searchParams.get('id');
        } catch (e) {
            console.error("Error parsing URL:", url);
            return url;
        }
    }

    if (!id) return url;

    // Use the thumbnail endpoint with 'w' (width) parameter
    return `https://drive.google.com/thumbnail?id=${id}&sz=w${anchoMiniatura()}`;
};
