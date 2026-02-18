const getDriveImageId = (url) => {
    if (!url) return null;
    const match = url.match(/\/d\/(.+?)\/view/);
    return match ? match[1] : null;
};

const convertDriveLink = (url) => {
    if (!url) return '';
    if (!url.includes('drive.google.com')) return url;

    let id = '';
    const parts = url.split('/');
    const dIndex = parts.indexOf('d');
    if (dIndex !== -1 && parts.length > dIndex + 1) {
        id = parts[dIndex + 1];
    } else {
        const urlObj = new URL(url);
        id = urlObj.searchParams.get('id');
    }

    if (!id) return url;
    return `https://lh3.googleusercontent.com/d/${id}=s1000?authuser=0`;
};

// Simulation of data from Firestore
const rawData = {
    diseño: {
        urlImagen: "https://drive.google.com/file/d/12-IXD70p6cas1e9qHkb0GXedurTBEKbq/view?usp=drive_link  https://drive.google.com/file/d/1619241GwM"
    }
};

let images = [];
const rawImages = rawData.diseño?.urlImagen;

if (Array.isArray(rawImages)) {
    images = rawImages;
} else if (typeof rawImages === 'string') {
    images = rawImages.split(/\s+/).filter(Boolean);
}

console.log("Parsed Images:", images);
const converted = images.map(convertDriveLink);
console.log("Converted URLs:", converted);
