import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Monitor, Maximize, Minimize } from 'lucide-react';
import { STAGES, STAGE_LABELS } from '../constants';

const Header = ({ currentStage, onTabChange, onSearch }) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const inputRef = useRef(null);

    // Logic for sliding background
    const [tabStyle, setTabStyle] = useState({});
    const tabsRef = useRef([]);

    useEffect(() => {
        const activeIndex = Object.values(STAGES).indexOf(currentStage);
        const activeTab = tabsRef.current[activeIndex];
        if (activeTab) {
            setTabStyle({
                left: activeTab.offsetLeft,
                width: activeTab.offsetWidth
            });
        }
    }, [currentStage]);

    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    // Focus input when search panel opens
    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        onSearch(val);
    };

    const handleCloseSearch = () => {
        setSearchTerm("");
        onSearch("");
        setIsSearchOpen(false);
    };

    const handleToggleSearch = () => {
        if (isSearchOpen) {
            handleCloseSearch();
        } else {
            setIsSearchOpen(true);
        }
    };

    return (
        <div className="pt-3 px-4 z-30 relative">
            <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg overflow-hidden">

                {/* ── Fila principal ── */}
                <div className="flex justify-between items-center gap-4 px-6 py-3">

                    {/* Left: Title */}
                    <div className="flex items-center gap-2.5 min-w-fit">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/10">
                            <Monitor size={14} />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-[11px] font-bold text-slate-800 leading-tight">Visor de Pedidos</h1>
                            <p className="text-[9px] font-medium text-slate-800/60 leading-none">Producción v1.0</p>
                        </div>
                    </div>

                    {/* Center: Navigation Tabs */}
                    <div className="flex-1 flex justify-center overflow-hidden">
                        <div className="bg-slate-200/50 p-1 rounded-xl flex relative shadow-inner backdrop-blur-sm border border-white/20">

                            {/* Sliding Background */}
                            <div
                                className="absolute bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-md transition-all duration-300 ease-out h-[calc(100%-0.5rem)] top-1"
                                style={{
                                    left: tabStyle.left,
                                    width: tabStyle.width
                                }}
                            />

                            {Object.values(STAGES).map((stage, idx) => {
                                const isActive = currentStage === stage;
                                return (
                                    <button
                                        key={stage}
                                        ref={el => tabsRef.current[idx] = el}
                                        onClick={() => onTabChange(stage)}
                                        className={`
                                            relative px-4 sm:px-6 py-1.5 rounded-lg text-xs font-bold transition-colors duration-300 z-10 whitespace-nowrap
                                            ${isActive
                                                ? 'text-white'
                                                : 'text-slate-600 hover:text-slate-800'
                                            }
                                        `}
                                    >
                                        {STAGE_LABELS[stage]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        {/* Search toggle button */}
                        <button
                            onClick={handleToggleSearch}
                            className={`w-10 h-10 flex items-center justify-center border rounded-xl transition-all duration-200 shadow-sm ${isSearchOpen
                                ? 'bg-blue-600 border-blue-700 text-white'
                                : 'bg-white/40 hover:bg-white/80 border-white/30 text-slate-700'
                                }`}
                            title={isSearchOpen ? "Cerrar búsqueda" : "Buscar pedido"}
                        >
                            {isSearchOpen ? <X size={18} /> : <Search size={18} />}
                        </button>

                        {/* Fullscreen Button */}
                        <button
                            onClick={toggleFullScreen}
                            className="w-10 h-10 flex items-center justify-center bg-white/40 hover:bg-white/80 border border-white/30 rounded-xl text-slate-700 transition-all shadow-sm"
                            title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                        >
                            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                        </button>
                    </div>
                </div>

                {/* ── Subsección de búsqueda (se despliega debajo) ── */}
                {/* Usamos un wrapper con altura fija para no depender de max-height */}
                <div
                    style={{
                        height: isSearchOpen ? '56px' : '0px',
                        overflow: 'hidden',
                        transition: 'height 150ms ease-out'
                    }}
                >
                    <div
                        className="px-6 pb-3"
                        style={{
                            willChange: 'transform, opacity',
                            transform: isSearchOpen ? 'translateY(0)' : 'translateY(-8px)',
                            opacity: isSearchOpen ? 1 : 0,
                            transition: 'transform 150ms ease-out, opacity 100ms ease-out'
                        }}
                    >
                        {/* Separador sutil */}
                        <div className="w-full h-px bg-white/40 mb-3" />

                        <div className="flex items-center gap-3">
                            {/* Indicador de modo */}
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap transition-all duration-200 ${searchTerm.length >= 6
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                                }`}>
                                {searchTerm.length >= 6 ? 'DNI / Teléfono' : 'Nº Pedido'}
                            </span>

                            {/* Input */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                                <input
                                    ref={inputRef}
                                    type="number"
                                    inputMode="numeric"
                                    placeholder={
                                        searchTerm.length >= 6
                                            ? "Ingresa DNI o teléfono del cliente..."
                                            : "Ingresa el número de pedido (máx. 5 dígitos)..."
                                    }
                                    className="w-full pl-8 pr-4 py-2 bg-white/70 hover:bg-white/90 border border-white/60 focus:bg-white focus:border-blue-400/60 rounded-xl text-xs font-semibold text-slate-800 outline-none transition-all shadow-sm placeholder:text-slate-400 placeholder:font-normal"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                />
                            </div>

                            {/* Botón limpiar (visible solo si hay texto) */}
                            {searchTerm && (
                                <button
                                    onClick={handleCloseSearch}
                                    className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200/60 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
                                >
                                    <X size={12} />
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Header;
