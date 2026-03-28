> **BrainSync Context Pumper** 🧠
> Dynamically loaded for active file: `src\App.jsx` (Domain: **Frontend (React/UI)**)

### 📐 Frontend (React/UI) Conventions & Fixes
- **[what-changed] what-changed in constants.js**: File updated (external): src/constants.js

Content summary (18 lines):
export const STAGES = {
    PREPARACION: 'preparacion',
    ESTAMPADO: 'estampado',
    EMPAQUETADO: 'empaquetado',
};

export const STAGE_LABELS = {
    [STAGES.PREPARACION]: 'PREPARACIÓN',
    [STAGES.ESTAMPADO]: 'ESTAMPADO',
    [STAGES.EMPAQUETADO]: 'EMPAQUETADO',
};

export const STAGE_COLORS = {
    [STAGES.PREPARACION]: 'bg-blue-500',
    [STAGES.ESTAMPADO]: 'bg-indigo-500', // Placeholder
    [STAGES.EMPAQUETADO]: 'bg-purple-500', // Placeholder
};

- **[problem-fix] problem-fix in ImageCarousel.jsx**: File updated (external): src/components/ImageCarousel.jsx

Content summary (66 lines):
import React, { useState } from 'react';
import { convertDriveLink } from '../utils/drive';

const ImageItem = ({ img, idx }) => {
    const [failed, setFailed] = useState(false);
    const thumbnailUrl = convertDriveLink(img);

    if (failed) {
        return (
            <div className="relative rounded-2xl overflow-hidden shadow-md flex-shrink-0 w-full bg-slate-100/80 border border-slate-200 flex flex-col items-center justify-center py-10 gap-3">
                <span className="t
- **[how-it-works] how-it-works in StockPauseAlert.jsx**: File updated (external): src/components/StockPauseAlert.jsx

Content summary (17 lines):
import React from 'react';
import { AlertTriangle } from 'lucide-react';

const StockPauseAlert = ({ isPaused }) => {
    if (!isPaused) return null;

    return (
        <div className="bg-orange-500 text-white px-4 py-3 font-black text-center flex items-center justify-center gap-3 shadow-md relative overflow-hidden animate-pulse">
            <div className="absolute inset-0 bg-white/10 skew-x-12 transform -translate-x-full animate-shimmer"></div>
            <AlertTriangle size={24}
- **[how-it-works] how-it-works in Layout.jsx**: File updated (external): src/components/Layout.jsx

Content summary (24 lines):
import React from 'react';

const Layout = ({ children, header, footer, ...props }) => {
    return (
        <div className="flex flex-col h-screen overflow-hidden relative bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100" {...props}>
            {/* Background Gradient Mesh - 2 Colors (Blue/Violet) on Soft Base */}
            <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] 
