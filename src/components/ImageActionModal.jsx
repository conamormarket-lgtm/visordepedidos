import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Printer, X, Check, AlertTriangle, Loader2, Minus, Plus, ChevronLeft } from 'lucide-react';
import { convertDriveLink } from '../utils/drive';
import { enviarImagenAImpresion, normalizarCantidad, CANTIDAD_MIN, CANTIDAD_MAX } from '../services/impresion';

/**
 * Menú que aparece al tocar una imagen en Preparación: abrirla en una pestaña
 * nueva (lo que hacía antes) o mandarla a la etapa Impresión del ERP.
 *
 * Enviar al ERP va en dos pasos: primero se pide cuántas copias hay que
 * imprimir y recién con ese dato se escribe en Firebase. Sin cantidad no se
 * envía nada — es lo que el impresor necesita para saber qué sacar.
 */
const ImageActionModal = ({ imagen, order, onClose }) => {
    // 'opciones' | 'cantidad'
    const [paso, setPaso] = useState('opciones');
    // 'idle' | 'enviando' | 'enviado' | 'error'
    const [estado, setEstado] = useState('idle');
    const [error, setError] = useState('');
    const [cantidad, setCantidad] = useState('1');
    const inputRef = useRef(null);

    // Cerrar con Escape: en tablet no hay teclado, pero en el escritorio del
    // taller sí y es la salida que todo el mundo intenta primero.
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Al entrar al paso de cantidad, dejar el número listo para reemplazar.
    useEffect(() => {
        if (paso === 'cantidad' && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [paso]);

    if (!imagen) return null;

    const cantidadValida = normalizarCantidad(cantidad);
    const puedeEnviar = cantidadValida !== null && estado !== 'enviando' && estado !== 'enviado';

    const abrirEnPestana = () => {
        window.open(imagen, '_blank');
        onClose();
    };

    const ajustar = (delta) => {
        const base = normalizarCantidad(cantidad) ?? 0;
        const nuevo = Math.min(CANTIDAD_MAX, Math.max(CANTIDAD_MIN, base + delta));
        setCantidad(String(nuevo));
        if (error) setError('');
        if (estado === 'error') setEstado('idle');
    };

    const enviarAlErp = async () => {
        if (!puedeEnviar) return;
        setEstado('enviando');
        setError('');
        try {
            await enviarImagenAImpresion(order, imagen, cantidadValida);
            setEstado('enviado');
            // Se cierra solo, pero después de que el operario alcance a ver el ✓
            setTimeout(onClose, 1200);
        } catch (e) {
            console.error('[ImageActionModal] Error al enviar al ERP:', e);
            setEstado('error');
            setError(e?.message || 'No se pudo enviar');
        }
    };

    const onKeyDownCantidad = (e) => {
        if (e.key === 'Enter' && puedeEnviar) enviarAlErp();
    };

    return (
        <div
            className="fixed inset-0 z-[9998] bg-slate-900/60 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabecera con la miniatura, para que se vea sobre qué imagen se actúa */}
                <div className="relative bg-slate-100 border-b border-slate-200">
                    <img
                        src={convertDriveLink(imagen)}
                        alt="Diseño seleccionado"
                        className="w-full h-32 object-contain"
                        referrerPolicy="no-referrer"
                        decoding="async"
                    />
                    <button
                        onClick={onClose}
                        className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 hover:bg-white rounded-lg shadow text-slate-600"
                        aria-label="Cerrar"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="p-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                        Pedido #{order?.orderId ?? '—'}
                    </p>

                    {paso === 'opciones' ? (
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={abrirEnPestana}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all text-left"
                            >
                                <span className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                    <ExternalLink size={17} />
                                </span>
                                <span className="text-sm font-bold text-slate-800">Abrir en otra pestaña</span>
                            </button>

                            <button
                                onClick={() => setPaso('cantidad')}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all text-left"
                            >
                                <span className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                    <Printer size={17} />
                                </span>
                                <span className="flex flex-col">
                                    <span className="text-sm font-bold text-slate-800">Enviar a ERP</span>
                                    <span className="text-[11px] font-medium text-slate-500">
                                        Aparece en la etapa Impresión
                                    </span>
                                </span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => { setPaso('opciones'); setEstado('idle'); setError(''); }}
                                    disabled={estado === 'enviando' || estado === 'enviado'}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                                    aria-label="Volver"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm font-bold text-slate-800">¿Cuántas hay que imprimir?</span>
                            </div>

                            {/* Botones grandes: esto se usa con el dedo en tablet */}
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => ajustar(-1)}
                                    disabled={estado === 'enviando' || estado === 'enviado'}
                                    className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 disabled:opacity-40 transition-all"
                                    aria-label="Restar uno"
                                >
                                    <Minus size={18} />
                                </button>

                                <input
                                    ref={inputRef}
                                    type="number"
                                    inputMode="numeric"
                                    min={CANTIDAD_MIN}
                                    max={CANTIDAD_MAX}
                                    value={cantidad}
                                    onChange={(e) => {
                                        setCantidad(e.target.value);
                                        if (error) setError('');
                                        if (estado === 'error') setEstado('idle');
                                    }}
                                    onKeyDown={onKeyDownCantidad}
                                    disabled={estado === 'enviando' || estado === 'enviado'}
                                    className={`flex-1 min-w-0 h-12 text-center text-2xl font-black rounded-xl border outline-none transition-all disabled:opacity-60 ${
                                        cantidadValida === null
                                            ? 'border-red-300 bg-red-50 text-red-700'
                                            : 'border-slate-200 bg-white text-slate-800 focus:border-blue-400'
                                    }`}
                                />

                                <button
                                    onClick={() => ajustar(1)}
                                    disabled={estado === 'enviando' || estado === 'enviado'}
                                    className="w-12 h-12 shrink-0 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-700 disabled:opacity-40 transition-all"
                                    aria-label="Sumar uno"
                                >
                                    <Plus size={18} />
                                </button>
                            </div>

                            {cantidadValida === null && (
                                <p className="text-[11px] font-semibold text-red-600 leading-tight">
                                    Ingresá un número entre {CANTIDAD_MIN} y {CANTIDAD_MAX}
                                </p>
                            )}

                            <button
                                onClick={enviarAlErp}
                                disabled={!puedeEnviar}
                                className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                    estado === 'enviado'
                                        ? 'bg-emerald-600 text-white'
                                        : estado === 'error'
                                            ? 'bg-red-50 text-red-700 border border-red-200'
                                            : 'bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100'
                                }`}
                            >
                                {estado === 'enviando' ? <Loader2 size={17} className="animate-spin" />
                                    : estado === 'enviado' ? <Check size={17} />
                                    : estado === 'error' ? <AlertTriangle size={17} />
                                    : <Printer size={17} />}
                                {estado === 'enviando' ? 'Enviando...'
                                    : estado === 'enviado' ? 'Enviado a Impresión'
                                    : estado === 'error' ? 'Reintentar'
                                    : `Enviar ${cantidadValida ?? ''} a Impresión`.replace('  ', ' ')}
                            </button>

                            {estado === 'error' && error && (
                                <p className="text-[11px] font-semibold text-red-600 leading-tight">{error}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImageActionModal;
