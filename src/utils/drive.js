/**
 * Extrae el ID de archivo desde cualquier formato de URL de Google Drive.
 */
export const extractDriveId = (url) => {
    if (!url || !url.includes('drive.google.com')) return null;

    const parts = url.split('/');
    const dIndex = parts.indexOf('d');
    if (dIndex !== -1 && parts.length > dIndex + 1) {
        return parts[dIndex + 1].split(/[?#]/)[0];
    }

    try {
        const urlObj = new URL(url);
        return urlObj.searchParams.get('id');
    } catch (e) {
        return null;
    }
};

/**
 * Devuelve la URL primaria para mostrar la imagen (thumbnail de alta resolución).
 * Si falla, usar getDriveFallbackUrls() para intentar alternativas.
 */
export const convertDriveLink = (url) => {
    if (!url) return '';
    if (!url.includes('drive.google.com')) return url;

    const id = extractDriveId(url);
    if (!id) return url;

    // Endpoint más estable y rápido como primera opción
    return `https://drive.google.com/thumbnail?id=${id}&sz=w2560`;
};

/**
 * Lista de URLs alternativas a intentar en orden cuando la URL primaria falla.
 * Esto cubre casos donde el thumbnail no está disponible para ciertos archivos.
 */
export const getDriveFallbackUrls = (url) => {
    if (!url) return [];
    const id = extractDriveId(url);
    if (!id) return [];

    return [
        `https://lh3.googleusercontent.com/d/${id}`,           // CDN de Google Photos (muy confiable)
        `https://drive.google.com/uc?export=view&id=${id}`,    // Descarga directa
        `https://drive.google.com/thumbnail?id=${id}&sz=w1280`, // Thumbnail menor resolución
    ];
};

