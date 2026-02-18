import React from 'react';
import { AlertTriangle } from 'lucide-react';

const StockPauseAlert = ({ isPaused }) => {
    if (!isPaused) return null;

    return (
        <div className="bg-orange-500 text-white px-4 py-3 font-black text-center flex items-center justify-center gap-3 shadow-md relative overflow-hidden animate-pulse">
            <div className="absolute inset-0 bg-white/10 skew-x-12 transform -translate-x-full animate-shimmer"></div>
            <AlertTriangle size={24} className="fill-white text-orange-600" />
            <span className="text-xl tracking-wider uppercase drop-shadow-sm">⚠️ EN PAUSA POR STOCK ⚠️</span>
        </div>
    );
};

export default StockPauseAlert;
