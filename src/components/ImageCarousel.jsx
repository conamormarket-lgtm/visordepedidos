import React, { useState } from 'react';
import { convertDriveLink, getDriveFallbackUrls } from '../utils/drive';

/**
 * Componente de imagen con fallback en cascada.
 * Intenta la URL primaria y si falla va probando alternativas.
 * Si todas fallan, muestra un placeholder descriptivo.
 */
const DriveImage = ({ originalUrl, alt, className, onClick }) => {
    const primaryUrl = convertDriveLink(originalUrl);
    const fallbacks = getDriveFallbackUrls(originalUrl);

    const [currentSrc, setCurrentSrc] = useState(primaryUrl);
    const [fallbackIndex, setFallbackIndex] = useState(-1); // -1 = usando primaryUrl
    const [failed, setFailed] = useState(false);

    const handleError = () => {
        const nextIndex = fallbackIndex + 1;
        if (nextIndex < fallbacks.length) {
            console.warn(`[DriveImage] URL falló (intento ${nextIndex}): ${currentSrc}`);
            setFallbackIndex(nextIndex);
            setCurrentSrc(fallbacks[nextIndex]);
        } else {
            console.error(`[DriveImage] Todos los endpoints fallaron para: ${originalUrl}`);
            setFailed(true);
        }
    };

    if (failed) {
        return (
            <div
                className="w-full h-48 flex flex-col items-center justify-center bg-slate-100 rounded-lg border border-slate-200 gap-2 cursor-pointer hover:bg-slate-200 transition-colors"
                onClick={() => window.open(originalUrl, '_blank')}
                title="Abrir en Google Drive"
            >
                <span className="text-3xl">🖼️</span>
                <span className="text-xs text-slate-500 font-semibold text-center px-4">
                    Vista previa no disponible.<br />
                    <span className="underline text-blue-500">Abrir en Drive →</span>
                </span>
            </div>
        );
    }

    return (
        <img
            src={currentSrc}
            alt={alt}
            className={className}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={handleError}
            onClick={onClick}
        />
    );
};

const ImageCarousel = ({ images }) => {
    if (!images || images.length === 0) {
        return (
            <div className="w-full xl:w-[70%] bg-slate-200/40 backdrop-blur-md flex items-center justify-center text-slate-500 font-bold h-[51vh] xl:h-full border-b xl:border-b-0 xl:border-r border-white/40 flex-shrink-0">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-300/50 flex items-center justify-center">
                        <span className="text-3xl">📷</span>
                    </div>
                    <span className="tracking-widest uppercase text-xs opacity-60">Sin imágenes adjuntas</span>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full xl:w-[70%] bg-white/30 backdrop-blur-sm border-b xl:border-b-0 xl:border-r border-white/30 overflow-y-auto h-[51vh] xl:h-full p-4 flex flex-col gap-4 relative no-scrollbar scroll-smooth flex-shrink-0">
            {images.map((img, idx) => (
                <div
                    key={idx}
                    className="relative group rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-zoom-in flex-shrink-0 w-full"
                >
                    <DriveImage
                        originalUrl={img}
                        alt={`Diseño ${idx + 1}`}
                        className="w-full h-auto rounded-lg shadow-sm border border-gray-200"
                        onClick={() => window.open(img, '_blank')}
                    />
                </div>
            ))}
        </div>
    );
};

export default ImageCarousel;
