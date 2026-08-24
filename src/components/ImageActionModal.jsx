import React, { useState, useEffect } from 'react';
import { ExternalLink, Printer, X, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { convertDriveLink } from '../utils/drive';
import { enviarImagenAImpresion } from '../services/impresion';

/**
 * Menú que aparece al tocar una imagen en Preparación: abrirla en una pestaña
 * nueva (lo que hacía antes) o mandarla a la etapa Impresión del ERP.
 */
const ImageActionModal = ({ imagen, order, onClose }) => {
    // 'idle' | 'enviando' | 'enviado' | 'error'
    const [estado, setEstado] = useState('idle');
    const [error, setError] = useState('');

    // Cerrar con Escape: en tablet no hay teclado, pero en el escritorio del
    // taller sí y es la salida que todo el mundo intenta primero.
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    if (!imagen) return null;

    const abrirEnPestana = () => {
        window.open(imagen, '_blank');
        onClose();
    };

    const enviarAlErp = async () => {
        if (estado === 'enviando' || estado === 'enviado') return;
        setEstado('enviando');
        setError('');
        try {
            await enviarImagenAImpresion(order, imagen);
            setEstado('enviado');
            // Se cierra solo, pero después de que el operario alcance a ver el ✓
            setTimeout(onClose, 1200);
        } catch (e) {
            console.error('[ImageActionModal] Error al enviar al ERP:', e);
            setEstado('error');
            setError(e?.message || 'No se pudo enviar');
        }
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
                            onClick={enviarAlErp}
                            disabled={estado === 'enviando' || estado === 'enviado'}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all text-left ${
                                estado === 'enviado'
                                    ? 'border-emerald-300 bg-emerald-50'
                                    : estado === 'error'
                                        ? 'border-red-300 bg-red-50'
                                        : 'border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.98]'
                            } ${estado === 'enviando' ? 'opacity-70' : ''}`}
                        >
                            <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                estado === 'enviado'
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : estado === 'error'
                                        ? 'bg-red-100 text-red-600'
                                        : 'bg-amber-50 text-amber-600'
                            }`}>
                                {estado === 'enviando' ? <Loader2 size={17} className="animate-spin" />
                                    : estado === 'enviado' ? <Check size={17} />
                                    : estado === 'error' ? <AlertTriangle size={17} />
                                    : <Printer size={17} />}
                            </span>
                            <span className="flex flex-col">
                                <span className="text-sm font-bold text-slate-800">
                                    {estado === 'enviando' ? 'Enviando...'
                                        : estado === 'enviado' ? 'Enviado a Impresión'
                                        : estado === 'error' ? 'No se pudo enviar'
                                        : 'Enviar a ERP'}
                                </span>
                                <span className="text-[11px] font-medium text-slate-500">
                                    {estado === 'error' ? error : 'Aparece en la etapa Impresión'}
                                </span>
                            </span>
                        </button>

                        {estado === 'error' && (
                            <button
                                onClick={() => { setEstado('idle'); setError(''); }}
                                className="text-xs font-bold text-slate-500 hover:text-slate-700 py-1"
                            >
                                Reintentar
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageActionModal;
