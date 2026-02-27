import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, UserPlus, CheckCircle, RotateCcw, AlertTriangle } from 'lucide-react';

const ActionFooter = ({
    currentOrderIndex,
    totalOrders,
    currentStage,
    onAssign,
    onComplete,
    onUndo,
    lastAction,
    assignedTo,
    operators = []
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [undoCountdown, setUndoCountdown] = useState(null);
    const countdownRef = useRef(null);
    const dropdownRef = useRef(null);

    const isOperatorAssigned = assignedTo && assignedTo !== 'Sin Asignar';

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
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

    return (
        <div className="bg-white/40 backdrop-blur-xl border border-white/40 p-6 flex flex-col gap-4 shadow-2xl z-20 relative rounded-3xl mx-4 mb-4 ring-1 ring-white/40">

            <div className="grid grid-cols-3 items-center gap-4">

                {/* Pagination Info - Left Aligned */}
                <div className="flex items-center gap-4 px-2 justify-self-start">
                    <div className="flex flex-col min-w-[100px]">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-0.5 opacity-80">Pedido</span>
                        <span className="text-3xl font-black text-slate-900">
                            {currentOrderIndex + 1}
                            <span className="text-slate-900 mx-1">/</span>
                            {totalOrders}
                        </span>
                    </div>
                </div>

                {/* Operator Select - Custom Dropdown */}
                <div className="justify-self-center w-full max-w-md relative group" ref={dropdownRef}>
                    <div className={`absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl transition-opacity duration-300 ${isOperatorAssigned ? 'opacity-100' : 'opacity-0'}`}></div>

                    {/* Trigger Button */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="relative flex items-center w-full bg-white border-2 border-slate-100 hover:border-blue-300 rounded-2xl transition-all duration-300 shadow-sm group-hover:shadow-md overflow-hidden text-left"
                    >
                        <div className={`flex items-center justify-center w-14 h-14 ${isOperatorAssigned ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'} transition-colors duration-300`}>
                            {isOperatorAssigned ? <User size={24} strokeWidth={2.5} /> : <UserPlus size={24} strokeWidth={2.5} />}
                        </div>

                        <div className="flex-1 px-4 flex flex-col justify-center h-14">
                            <span className={`font-bold text-lg ${isOperatorAssigned ? 'text-slate-700' : 'text-slate-400'}`}>
                                {isOperatorAssigned ? assignedTo : "Sin Asignar"}
                            </span>
                        </div>

                        <div className={`pr-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-500' : ''}`}>
                            <ChevronDown size={20} className="stroke-[3px]" />
                        </div>
                    </button>

                    {/* Dropdown Menu - Slide Up Animation */}
                    {isOpen && (
                        <div className="absolute bottom-full left-0 w-full mb-3 bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 ring-1 ring-black/5 animate-slide-up-fade overflow-hidden z-30 flex flex-col-reverse">
                            {operators.map((op) => (
                                <button
                                    key={op}
                                    onClick={() => handleSelect(op)}
                                    className={`w-full px-5 py-3.5 text-left font-bold transition-colors flex items-center justify-between
                                        ${assignedTo === op
                                            ? 'bg-blue-50 text-blue-700'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }
                                    `}
                                >
                                    {op}
                                    {assignedTo === op && <CheckCircle size={18} className="text-blue-600" />}
                                </button>
                            ))}
                            <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                Seleccionar Operador
                            </div>
                        </div>
                    )}
                </div>

                {/* Botón Deshacer - Right column */}
                <div className="justify-self-end">
                    {lastAction && undoCountdown !== null ? (
                        <button
                            onClick={handleUndo}
                            title={`Deshacer: Pedido #${lastAction.orderVisualId} regresa a ${lastAction.prevStage}`}
                            className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-2xl bg-amber-50 border-2 border-amber-300 hover:bg-amber-100 active:scale-95 transition-all duration-200 shadow-md group"
                        >
                            <RotateCcw size={22} className="text-amber-600 group-hover:rotate-[-30deg] transition-transform duration-300" />
                            <span className="text-[10px] font-black text-amber-700 tracking-wider uppercase">Deshacer</span>
                            <span className="text-[10px] font-bold text-amber-500">{undoCountdown}s</span>
                        </button>
                    ) : (
                        <div className="w-[68px]" /> /* spacer */
                    )}
                </div>
            </div>

            {/* Alerta si no hay operador asignado */}
            {!isOperatorAssigned && (
                <div className="flex items-center gap-2.5 bg-orange-50 border border-orange-200 rounded-xl px-4 py-2.5 animate-pulse-soft">
                    <AlertTriangle size={16} className="text-orange-500 shrink-0" />
                    <span className="text-sm font-semibold text-orange-700">
                        Asigna un operador antes de pasar el pedido a la siguiente etapa
                    </span>
                </div>
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
                {/* Subtle sheen effect - only when enabled */}
                {isOperatorAssigned && (
                    <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
                )}

                <span className="text-xl font-black tracking-wider uppercase drop-shadow-sm">
                    {completeLabel}
                </span>
            </button>
        </div>
    );
};

export default ActionFooter;
