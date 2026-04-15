import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, UserPlus, CheckCircle, RotateCcw, AlertTriangle, Printer, Loader2, Truck } from 'lucide-react';
import { printTicket } from '../services/printService';

const ActionFooter = ({
    currentOrderIndex,
    totalOrders,
    currentStage,
    onAssign,
    onComplete,
    onUndo,
    onWholesale,
    onBox,
    lastAction,
    assignedTo,
    operators = [],
    currentOrderId,
    currentOrder,
    sinImagen,
    onTagSelect,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isTagOpen, setIsTagOpen] = useState(false);
    const [undoCountdown, setUndoCountdown] = useState(null);
    const [printStatus, setPrintStatus] = useState(null); // null | 'loading' | 'success' | 'error'
    const [printError, setPrintError] = useState('');
    const countdownRef = useRef(null);
    const dropdownRef = useRef(null);
    const tagDropdownRef = useRef(null);

    const TAG_OPTIONS = [
        "Falta regalo",
        "Falta polera",
        "Falta jogger",
        "Falta casaca",
        "Falta polo",
        "Falta gorra"
    ];

    const isOperatorAssigned = assignedTo && assignedTo !== 'Sin Asignar';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
            if (tagDropdownRef.current && !tagDropdownRef.current.contains(event.target)) {
                setIsTagOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    // Countdown automático de 30 segundos para el botón de deshacer
    useEffect(() => {
        if (lastAction) {
            setUndoCountdown(30);
            if (countdownRef.current) clearInterval(countdownRef.current);
            countdownRef.current = setInterval(() => {
                setUndoCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current);
                        return null;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setUndoCountdown(null);
            if (countdownRef.current) clearInterval(countdownRef.current);
        }
        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [lastAction]);

    const handlePrint = async () => {
        if (!currentOrder || printStatus === 'loading') return;
        setPrintStatus('loading');
        setPrintError('');
        try {
            await printTicket(currentOrder);
            setPrintStatus('success');
            setTimeout(() => setPrintStatus(null), 3000);
        } catch (err) {
            console.error('[Print] Error:', err.message);
            setPrintError(err.message);
            setPrintStatus('error');
            setTimeout(() => { setPrintStatus(null); setPrintError(''); }, 6000);
        }
    };

    const handleSelect = (op) => {
        onAssign(op);
        setIsOpen(false);
    };

    const handleUndo = () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setUndoCountdown(null);
        onUndo();
    };

    const stageName = currentStage === 'preparacion' ? 'Preparación'
        : currentStage === 'estampado' ? 'Estampado'
            : currentStage === 'empaquetado' ? 'Empaquetado'
                : currentStage;


    const completeLabel = currentStage === 'preparacion' ? 'Marcar como Preparado'
        : currentStage === 'estampado' ? 'Marcar como Estampado'
            : currentStage === 'empaquetado' ? 'Marcar como Empaquetado'
                : 'Marcar como Completado';

    // Estilos y contenido del botón de impresión según estado
    const printBtnStyle = printStatus === 'success'
        ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/30'
        : printStatus === 'error'
            ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-md shadow-rose-500/30'
            : printStatus === 'loading'
                ? 'bg-slate-700 text-white opacity-80 cursor-wait'
                : 'bg-slate-800 hover:bg-slate-700 text-white shadow-md active:scale-95';

    const printBtnContent = printStatus === 'loading'
        ? <><Loader2 size={15} className="animate-spin" /><span>Imprimiendo...</span></>
        : printStatus === 'success'
            ? <><CheckCircle size={15} /><span>¡Impreso!</span></>
            : printStatus === 'error'
                ? <><AlertTriangle size={15} /><span>Error</span></>
                : <><Printer size={15} /><span>Ticket</span></>;

    return (
        <>
            <div className="bg-white/40 backdrop-blur-xl border border-white/40 p-6 flex flex-col gap-4 shadow-2xl z-20 relative rounded-3xl mx-4 mb-4 ring-1 ring-white/40">

                <div className="flex flex-row items-center justify-between gap-2 w-full">

                    {/* Pagination Info - Left */}
                    <div className="flex items-center gap-2 px-1 shrink-0">
                        <div className="flex flex-col min-w-[100px]">
                            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-0.5 opacity-80 whitespace-nowrap">Pedido</span>
                            <span className="text-2xl font-black text-slate-900 leading-none">
                                {currentOrderIndex + 1}
                                <span className="text-slate-900 mx-0.5 font-normal opacity-40">/</span>
                                {totalOrders}
                            </span>
                        </div>
                    </div>

                    {/* Operator Select - Custom Dropdown */}
                    <div className="flex-1 max-w-[280px] relative group" ref={dropdownRef}>
                        <div className={`absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl transition-opacity duration-300 ${isOperatorAssigned ? 'opacity-100' : 'opacity-0'}`}></div>

                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="relative flex items-center w-full bg-white border-2 border-slate-100 hover:border-blue-300 rounded-2xl transition-all duration-300 shadow-sm group-hover:shadow-md overflow-hidden text-left"
                        >
                            <div className={`flex items-center justify-center w-12 h-12 shrink-0 ${isOperatorAssigned ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'} transition-colors duration-300`}>
                                {isOperatorAssigned ? <User size={20} strokeWidth={2.5} /> : <UserPlus size={20} strokeWidth={2.5} />}
                            </div>
                            <div className="flex-1 px-3 flex flex-col justify-center h-12 overflow-hidden">
                                <span className={`font-bold text-sm truncate ${isOperatorAssigned ? 'text-slate-700' : 'text-slate-400'}`}>
                                    {isOperatorAssigned ? assignedTo : "Sin Asignar"}
                                </span>
                            </div>
                            <div className={`pr-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}>
                                <ChevronDown size={20} className="stroke-[3px]" />
                            </div>
                        </button>

                        {isOpen && (
                            <div className="absolute bottom-full left-0 w-full mb-3 max-h-[60vh] overflow-y-auto bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 ring-1 ring-black/5 animate-slide-up-fade z-30 flex flex-col">
                                <div className="sticky top-0 z-10 px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Seleccionar Operador
                                </div>
                                {operators.map((op) => (
                                    <button
                                        key={op}
                                        onClick={() => handleSelect(op)}
                                        className={`w-full px-5 py-3.5 text-left font-bold transition-colors flex items-center justify-between
                                            ${assignedTo === op
                                                ? 'bg-blue-50 text-blue-700'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                    >
                                        {op}
                                        {assignedTo === op && <CheckCircle size={18} className="text-blue-600 shrink-0" />}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right column: Imprimir Ticket (empaquetado) + Deshacer */}
                    <div className="flex items-center justify-end gap-1.5 shrink-0">
                        {currentStage === 'empaquetado' && (
                            <div className="relative group" ref={tagDropdownRef}>
                                <button
                                    onClick={() => setIsTagOpen(!isTagOpen)}
                                    className="px-3 py-2 rounded-xl border-2 border-slate-200 bg-white hover:border-slate-300 text-xs font-bold text-slate-700 shadow-sm transition-all flex items-center gap-1.5 h-[40px] whitespace-nowrap"
                                >
                                    <span>Etiquetar</span>
                                    <ChevronDown size={14} className={`transition-transform duration-300 ${isTagOpen ? 'rotate-180 text-blue-500' : 'text-slate-400'}`} />
                                </button>

                                {isTagOpen && (
                                    <div className="absolute bottom-full right-0 mb-3 w-48 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 ring-1 ring-black/5 animate-slide-up-fade z-30 flex flex-col overflow-hidden">
                                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">
                                            Etiquetas
                                        </div>
                                        {TAG_OPTIONS.map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => {
                                                    onTagSelect?.(tag);
                                                    setIsTagOpen(false);
                                                }}
                                                className={`w-full px-4 py-3 text-left font-bold transition-colors flex items-center justify-between text-sm
                                                    ${currentOrder?.etiquetaEmpaquetado === tag
                                                        ? 'bg-rose-50 text-rose-700'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                    }`}
                                            >
                                                {tag}
                                                {currentOrder?.etiquetaEmpaquetado === tag && <CheckCircle size={16} className="text-rose-600 shrink-0" />}
                                            </button>
                                        ))}
                                        {currentOrder?.etiquetaEmpaquetado && (
                                            <button
                                                onClick={() => {
                                                    onTagSelect?.(null);
                                                    setIsTagOpen(false);
                                                }}
                                                className="w-full px-4 py-2 border-t border-slate-100 text-xs font-bold text-slate-400 hover:bg-slate-50 hover:text-slate-600 text-center uppercase tracking-wider"
                                            >
                                                Quitar etiqueta
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStage === 'empaquetado' && (
                            <button
                                type="button"
                                onClick={handlePrint}
                                disabled={!currentOrder || printStatus === 'loading'}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 h-[40px] whitespace-nowrap ${printBtnStyle}`}
                            >
                                {printBtnContent}
                            </button>
                        )}

                        {lastAction && undoCountdown !== null ? (
                            <button
                                onClick={handleUndo}
                                title={`Deshacer: Pedido #${lastAction.orderVisualId} regresa a ${lastAction.prevStage}`}
                                className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 active:scale-95 transition-all duration-200 shadow-md group h-[46px]"
                            >
                                <span className="text-[9px] font-black text-amber-700 tracking-tight uppercase flex flex-col items-center leading-none">
                                    <RotateCcw size={14} className="text-amber-600 group-hover:rotate-[-30deg] transition-transform duration-300" />
                                    <span>Deshacer {undoCountdown}s</span>
                                </span>
                            </button>
                        ) : (
                            currentStage !== 'empaquetado' && <div className="w-[50px]" />
                        )}
                    </div>
                </div>

                {/* Error de impresión */}
                {printStatus === 'error' && printError && (
                    <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
                        <AlertTriangle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                        <span className="text-sm font-semibold text-rose-700">{printError}</span>
                    </div>
                )}

                {/* Alerta si no hay operador asignado */}
                {!isOperatorAssigned && (
                    <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 animate-pulse-soft">
                        <AlertTriangle size={16} className="text-orange-500 shrink-0" />
                        <span className="text-sm font-semibold text-orange-700">
                            Asigna un operador antes de pasar el pedido a la siguiente etapa
                        </span>
                    </div>
                )}


                {/* Botón POR MAYOR: solo en preparacion + sin imágenes */}
                {currentStage === 'preparacion' && sinImagen && (
                    <button
                        onClick={onWholesale}
                        disabled={!isOperatorAssigned}
                        className={`w-full group relative overflow-hidden py-3 rounded-2xl flex items-center justify-center gap-3 border transition-all duration-300 transform
                            ${isOperatorAssigned
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white shadow-lg shadow-orange-500/30 active:scale-[0.99] border-white/10 cursor-pointer'
                                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                            }`}
                    >
                        {isOperatorAssigned && (
                            <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                        )}
                        <Truck size={20} className="shrink-0" />
                        <span className="text-lg font-black tracking-wider uppercase drop-shadow-sm">
                            POR MAYOR → Reparto
                        </span>
                    </button>
                )}

                {/* Complete Button */}
                <button
                    onClick={onComplete}
                    disabled={!isOperatorAssigned}
                    className={`w-full group relative overflow-hidden py-4 rounded-2xl flex items-center justify-center gap-3 border transition-all duration-300 transform
                        ${isOperatorAssigned
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white shadow-lg shadow-blue-600/25 active:scale-[0.99] border-white/10 cursor-pointer'
                            : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-70'
                        }`}
                >
                    {isOperatorAssigned && (
                        <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                    )}
                    <span className="text-xl font-black tracking-wider uppercase drop-shadow-sm">
                        {completeLabel}
                    </span>
                </button>

                {/* Botón BOX/CUADRO: solo en estampado → siempre activo, sin requerir operador */}
                {currentStage === 'estampado' && (
                    <button
                        onClick={onBox}
                        className="w-full group relative overflow-hidden py-3 rounded-2xl flex items-center justify-center gap-3 border border-white/10 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/30 active:scale-[0.99] transition-all duration-300 transform cursor-pointer"
                    >
                        <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                        <span className="text-2xl">📦</span>
                        <span className="text-lg font-black tracking-wider uppercase drop-shadow-sm">
                            BOX / CUADRO → Empaquetado
                        </span>
                    </button>
                )}
            </div>
        </>
    );
};

export default ActionFooter;

