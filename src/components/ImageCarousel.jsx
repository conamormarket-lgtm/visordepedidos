import React from 'react';
import { convertDriveLink } from '../utils/drive';

const ImageCarousel = ({ images }) => {
    if (!images || images.length === 0) {
        return (
            <div className="w-1/2 bg-gray-200 flex items-center justify-center text-gray-400">
                Sin imágenes
            </div>
        );
    }

    // If multiple images? Design shows one big image and maybe scrolling?
    // User provided image uses a scrollbar potentially for multiple images.
    // "Imágenes: 2" suggests a count.
    // The design shows a list of images on the left.

    return (
        <div className="w-1/2 bg-white/30 backdrop-blur-sm border-r border-white/30 overflow-y-auto h-full p-4 space-y-4 relative no-scrollbar">
            {images.map((img, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                    <span className="absolute top-2 left-2 bg-red-500 text-white font-bold px-2 py-1 rounded z-10">
                        {/* ID badge if needed */}
                    </span>
                    <img
                        src={convertDriveLink(img)}
                        alt={`Diseño ${idx + 1}`}
                        className="w-full h-auto rounded-lg shadow-sm border border-gray-200"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                            e.target.style.display = 'none'; // Hide if completely failed
                            // Alternatively show placeholder:
                            // e.target.src = 'https://placehold.co/600x400?text=Error';
                            // e.target.style.display = 'block';
                        }}
                    />
                </div>
            ))}
        </div>
    );
};

// Removed ImageWithFallback component

export default ImageCarousel;
