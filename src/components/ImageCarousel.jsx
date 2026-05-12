import React, { useState } from 'react';
import { Video } from 'lucide-react';
import { convertDriveLink } from '../utils/drive';

const formatFechaVideo = (fechaVideo) => {
    if (!fechaVideo) return null;
    if (typeof fechaVideo === 'object' && fechaVideo.seconds) {
        return new Date(fechaVideo.seconds * 1000).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (typeof fechaVideo === 'string' && fechaVideo.trim()) {
        // Formato "yyyy-mm-dd" — parsear como fecha local para evitar desfase de zona horaria
        const parts = fechaVideo.trim().split('-');
        if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        const d = new Date(fechaVideo);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
        }
        return fechaVideo.trim();
    }
    return null;
};

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

const ImageCarousel = ({ images, fechaVideo }) => {
    const fechaVideoLabel = formatFechaVideo(fechaVideo);

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
            {/* Badge Fecha Video — esquina superior derecha del carrusel */}
            {fechaVideoLabel && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-violet-600/90 backdrop-blur-sm shadow-lg shadow-violet-500/30 border border-violet-400/40">
                    <Video size={11} className="text-violet-100 shrink-0" />
                    <span className="text-[10px] font-black text-white uppercase tracking-wider leading-none">{fechaVideoLabel}</span>
                </div>
            )}
            {images.map((img, idx) => (
                <ImageItem key={idx} img={img} idx={idx} />
            ))}
        </div>
    );
};

export default ImageCarousel;
