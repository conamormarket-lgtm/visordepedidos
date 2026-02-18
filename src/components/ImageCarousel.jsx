import React from 'react';
import { convertDriveLink } from '../utils/drive';

const ImageCarousel = ({ images }) => {
    if (!images || images.length === 0) {
        return (
            <div className="w-full xl:w-1/2 bg-slate-200/40 backdrop-blur-md flex items-center justify-center text-slate-500 font-bold py-32 xl:py-0 border-b xl:border-b-0 xl:border-r border-white/40">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-slate-300/50 flex items-center justify-center">
                        <span className="text-3xl">📷</span>
                    </div>
                    <span className="tracking-widest uppercase text-xs opacity-60">Sin imágenes adjuntas</span>
                </div>
            </div>
        );
    }

    // If multiple images? Design shows one big image and maybe scrolling?
    // User provided image uses a scrollbar potentially for multiple images.
    // "Imágenes: 2" suggests a count.
    // The design shows a list of images on the left.

    return (
        <div className="w-full xl:w-1/2 bg-white/30 backdrop-blur-sm border-b xl:border-b-0 xl:border-r border-white/30 overflow-x-auto xl:overflow-y-auto h-auto xl:h-full p-4 flex flex-row xl:flex-col gap-4 relative no-scrollbar">
            {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-zoom-in flex-shrink-0 w-[90%] xl:w-full"
                    onClick={() => window.open(convertDriveLink(img), '_blank')}>
                    <img
                        src={convertDriveLink(img)}
                        alt={`Diseño ${idx + 1}`}
                        className="w-full h-auto rounded-lg shadow-sm border border-gray-200"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                </div>
            ))}
        </div>
    );
};

// Removed ImageWithFallback component

export default ImageCarousel;
