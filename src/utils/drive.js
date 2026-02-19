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
    // w2560 provides a high resolution image. This is the most stable public endpoint.
    return `https://drive.google.com/thumbnail?id=${id}&sz=w2560`;
};

// Removed getDriveThumbnail export since we are using a single robust method now

