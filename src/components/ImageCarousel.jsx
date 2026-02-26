import React, { useState } from 'react';
import { convertDriveLink } from '../utils/drive';

const ImageItem = ({ img, idx }) => {
    const [failed, setFailed] = useState(false);
    const thumbnailUrl = convertDriveLink(img);

    if (failed) {
        return (
            <div className="relative rounded-2xl overflow-hidden shadow-md flex-shrink-0 w-full bg-slate-100/80 border border-slate-200 flex flex-col items-center justify-center py-10 gap-3">
                <span className="text-4xl">🖼️</span>
                <p className="text-xs font-semibold text-slate-500 text-center px-4">
                    La vista previa no está disponible.<br />Haz clic para abrir en Drive.
                </p>
                <button
                    onClick={() => window.open(img, '_blank')}
                    className="mt-1 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow hover:bg-blue-700 active:scale-95 transition-all"
                >
                    Abrir en Google Drive →
                </button>
            </div>
        );
    }

    return (
        <div
            className="relative group rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-zoom-in flex-shrink-0 w-full"
            onClick={() => window.open(img, '_blank')}
        >
            <img
                src={thumbnailUrl}
                alt={`Diseño ${idx + 1}`}
                className="w-full h-auto rounded-lg shadow-sm border border-gray-200"
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setFailed(true)}
            />
        </div>
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
                <ImageItem key={idx} img={img} idx={idx} />
            ))}
        </div>
    );
};

export default ImageCarousel;
