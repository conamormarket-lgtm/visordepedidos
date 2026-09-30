import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Monitor, Maximize, Minimize, Home, Truck, Zap, ZapOff } from 'lucide-react';
import { ORDER_VIEWS, ORDER_VIEW_LABELS, STAGES, ZONAS, ZONA_LABELS } from '../constants';
import AreaIcon from './AreaIcon';
import { isModoLigero, toggleModoLigero, subscribeModoLigero } from '../utils/modoLigero';

const Header = ({
    currentView,
    onTabChange,
    onSearch,
    stats,
    zonaSplitEnabled = false,
    prepZona = ZONAS.LIMA,
    onZonaChange = () => {},
    zonaCounts = {},
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [modoLigero, setModoLigeroState] = useState(isModoLigero);
    const inputRef = useRef(null);

    useEffect(() => subscribeModoLigero(setModoLigeroState), []);

    // El padre limpia la búsqueda al cambiar de vista; reflejarlo en el input.
    useEffect(() => setSearchTerm(''), [currentView]);

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

    // Sub-pestañas de Preparación. Los colores replican la semántica que ya usa
    // OrderDetails: verde = delivery (Lima), índigo = agencia (Provincia).
    const ZONA_TABS = [
        { zona: ZONAS.LIMA, Icon: Home, activeBg: 'from-emerald-500 to-teal-600' },
        { zona: ZONAS.PROVINCIA, Icon: Truck, activeBg: 'from-indigo-500 to-violet-600' },
    ];

    const showZonaTabs = zonaSplitEnabled && currentView === STAGES.PREPARACION;

    return (
        <div className="pt-3 px-4 z-30 relative">
            <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg overflow-hidden">

                {/* ── Fila principal ── */}
                <div className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 px-3 sm:px-6 py-3">

                    {/* Left: Title */}
                    <div className="flex items-center gap-2.5 min-w-fit">
                        <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/10">
                            <Monitor size={14} />
                        </div>
                        <div className="hidden lg:block">
                            <h1 className="text-[11px] font-bold text-slate-800 leading-tight">Visor de Pedidos</h1>
                            <p className="text-[9px] font-medium text-slate-800/60 leading-none">Producción v1.0</p>
                        </div>
                        {stats && (
                            <div className="relative group ml-1">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 hover:bg-emerald-500/15 cursor-pointer transition-all duration-200">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-[10px] font-extrabold tracking-wide uppercase">Hoy: {stats.counts.preparacion + stats.counts.estampado + stats.counts.empaquetado}</span>
                                </div>
                                {/* Desglose en hover */}
                                <div className="absolute top-full left-0 mt-1.5 w-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-3 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 z-50 text-[10px] font-bold text-slate-600 flex flex-col gap-2 shadow-black/5 ring-1 ring-black/5">
                                    <div className="border-b border-slate-100 pb-1.5 text-[9px] text-slate-400 uppercase tracking-wider">
                                        Procesados hoy
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">Preparación:</span>
                                        <span className="text-slate-800 font-extrabold">{stats.counts.preparacion}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">Estampado:</span>
                                        <span className="text-slate-800 font-extrabold">{stats.counts.estampado}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold">Empaquetado:</span>
                                        <span className="text-slate-800 font-extrabold">{stats.counts.empaquetado}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Center: Navigation Tabs */}
                    <nav aria-label="Áreas de producción" className="order-last col-span-2 flex justify-center sm:order-none sm:col-span-1">
                        <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1 shadow-inner backdrop-blur-sm border border-white/20">
                            {Object.values(ORDER_VIEWS).map(view => {
                                const isActive = currentView === view;
                                return (
                                    <button
                                        key={view}
                                        type="button"
                                        onClick={() => onTabChange(view)}
                                        title={ORDER_VIEW_LABELS[view]}
                                        aria-label={ORDER_VIEW_LABELS[view]}
                                        aria-pressed={isActive}
                                        className={`
                                            w-11 h-11 sm:w-14 flex items-center justify-center rounded-lg transition-colors duration-200
                                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2
                                            ${isActive
                                                ? view === ORDER_VIEWS.PRIORIDAD
                                                    ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md'
                                                    : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-md'
                                                : view === ORDER_VIEWS.PRIORIDAD
                                                    ? 'text-red-600 hover:bg-red-100'
                                                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                                            }
                                        `}
                                    >
                                        <AreaIcon area={view} />
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Right Actions */}
                    <div className="flex items-center justify-end gap-2">
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

                        {/* Modo ligero: apaga los efectos pesados (glass, blobs,
                            animaciones) y baja la resolución de las imágenes.
                            Encendido por defecto en las tablets del taller. */}
                        <button
                            onClick={toggleModoLigero}
                            className={`w-10 h-10 flex items-center justify-center border rounded-xl transition-all duration-200 shadow-sm ${modoLigero
                                ? 'bg-amber-500 border-amber-600 text-white'
                                : 'bg-white/40 hover:bg-white/80 border-white/30 text-slate-700'
                                }`}
                            title={modoLigero
                                ? 'Modo ligero ACTIVO — toca para volver a los efectos completos'
                                : 'Efectos completos — toca para activar el modo ligero (más fluido en tablets)'}
                        >
                            {modoLigero ? <Zap size={18} /> : <ZapOff size={18} />}
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

                {/* ── Sub-pestañas Lima / Provincia (solo en Preparación) ── */}
                {showZonaTabs && (
                    <div className="px-6 pb-3">
                        <div className="w-full h-px bg-white/40 mb-3" />
                        <div className="flex justify-center">
                            <div className="bg-slate-200/50 p-1 rounded-xl flex gap-1 shadow-inner backdrop-blur-sm border border-white/20">
                                {ZONA_TABS.map(({ zona, Icon, activeBg }) => {
                                    const isActive = prepZona === zona;
                                    return (
                                        <button
                                            key={zona}
                                            onClick={() => onZonaChange(zona)}
                                            className={`
                                                flex items-center gap-1.5 px-4 sm:px-5 py-1.5 rounded-lg text-[11px] font-bold
                                                transition-all duration-200 whitespace-nowrap
                                                ${isActive
                                                    ? `bg-gradient-to-r ${activeBg} text-white shadow-md`
                                                    : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
                                                }
                                            `}
                                        >
                                            <Icon size={13} className="stroke-[2.5px]" />
                                            {ZONA_LABELS[zona]}
                                            <span className={`
                                                px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tabular-nums
                                                ${isActive ? 'bg-white/25 text-white' : 'bg-white/70 text-slate-500'}
                                            `}>
                                                {zonaCounts?.[zona] ?? 0}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

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
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg whitespace-nowrap transition-all duration-200 ${
                                searchTerm.length >= 9
                                    ? 'bg-green-100 text-green-700'
                                    : searchTerm.length >= 6
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'bg-blue-100 text-blue-700'
                            }`}>
                                {searchTerm.length >= 9 ? 'Teléfono' : searchTerm.length >= 6 ? 'DNI' : 'Nº Pedido'}
                            </span>

                            {/* Input */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                                <input
                                    ref={inputRef}
                                    type="number"
                                    inputMode="numeric"
                                    placeholder={
                                        searchTerm.length >= 9
                                            ? "Ingresa teléfono del cliente..."
                                            : searchTerm.length >= 6
                                                ? "Ingresa DNI del cliente..."
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
