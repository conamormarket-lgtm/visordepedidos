import React, { useState, useEffect } from 'react';
import { Clock, X, Loader2, AlertTriangle, Check, Printer, ExternalLink } from 'lucide-react';
import { obtenerEnviosDePedido } from '../services/impresion';
import { convertDriveLink } from '../utils/drive';

/**
 * Historial de envíos a la etapa Impresión del ERP para un pedido.
 *
 * Se abre desde el botón de reloj del carrusel y está disponible en todas las
 * etapas: aunque solo se puede enviar desde Preparación, en Estampado o
 * Empaquetado sirve para saber qué se mandó a imprimir y cuándo.
 */

export const formatearFechaHora = (fecha) => {
    if (!fecha) return { dia: 'Sin fecha', hora: '' };
    const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const nd = String(fecha.getDate()).padStart(2, '0');
    // toLowerCase: según el entorno el mes corto sale "ago" o "Ago".
    const mes = fecha.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '').toLowerCase();
    const hora = fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
    return { dia: `${dias[fecha.getDay()]} ${nd} ${mes} ${fecha.getFullYear()}`, hora };
};

const HistorialEnviosModal = ({ order, onClose }) => {
    const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
    const [envios, setEnvios] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        let cancelado = false;
        setEstado('cargando');
        obtenerEnviosDePedido(order)
            .then((lista) => {
                if (cancelado) return;
                setEnvios(lista);
                setEstado('listo');
            })
            .catch((e) => {
                if (cancelado) return;
                console.error('[HistorialEnviosModal] Error al leer los envíos:', e);
                setError(e?.message || 'No se pudo cargar el historial');
                setEstado('error');
            });
        return () => { cancelado = true; };
    }, [order?.orderId]);

    return (
        <div
            className="fixed inset-0 z-[9998] bg-slate-900/60 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0">
                            <Clock size={15} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 leading-tight">Envíos a Impresión</p>
                            <p className="text-[11px] font-semibold text-slate-500 leading-tight">
                                Pedido #{order?.orderId ?? '—'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {estado === 'cargando' ? (
                        <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
                            <Loader2 size={22} className="animate-spin" />
                            <span className="text-xs font-semibold">Cargando…</span>
                        </div>
                    ) : estado === 'error' ? (
                        <div className="py-10 flex flex-col items-center gap-2 text-red-600">
                            <AlertTriangle size={22} />
                            <span className="text-xs font-bold">No se pudo cargar el historial</span>
                            <span className="text-[11px] text-slate-500 text-center px-4">{error}</span>
                        </div>
                    ) : envios.length === 0 ? (
                        <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
                            <Printer size={24} />
                            <span className="text-xs font-bold text-slate-500">Sin envíos a Impresión</span>
                            <span className="text-[11px] text-center px-6 leading-snug">
                                De este pedido todavía no se mandó ninguna imagen al ERP.
                            </span>
                        </div>
                    ) : (
                        <>
                            <p className="text-[11px] font-semibold text-slate-500 mb-3">
                                {envios.length} {envios.length === 1 ? 'envío' : 'envíos'}, del más reciente al más antiguo
                            </p>
                            <ul className="flex flex-col gap-2">
                                {envios.map((e) => {
                                    const { dia, hora } = formatearFechaHora(e.fecha);
                                    return (
                                        <li
                                            key={e.id}
                                            onClick={() => e.imagenUrl && window.open(e.imagenUrl, '_blank')}
                                            className={`group flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-white ${
                                                e.imagenUrl ? 'cursor-pointer hover:border-blue-300 hover:bg-slate-50' : ''
                                            } transition-colors`}
                                        >
                                            {e.imagenUrl && (
                                                <img
                                                    src={convertDriveLink(e.imagenUrl)}
                                                    alt=""
                                                    className="w-12 h-12 rounded-lg object-cover bg-slate-100 shrink-0"
                                                    loading="lazy"
                                                    decoding="async"
                                                    referrerPolicy="no-referrer"
                                                />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-slate-800 leading-tight">
                                                    {dia}
                                                    {hora && <span className="text-slate-500 font-semibold"> · {hora}</span>}
                                                </p>
                                                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                                    {e.cantidad !== null
                                                        ? `${e.cantidad} ${e.cantidad === 1 ? 'copia' : 'copias'}`
                                                        : 'Cantidad no indicada'}
                                                </p>
                                            </div>
                                            <span className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wide ${
                                                e.hecho
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                            }`}>
                                                {e.hecho ? <Check size={11} /> : <Clock size={11} />}
                                                {e.hecho ? 'Impreso' : 'Pendiente'}
                                            </span>
                                            {e.imagenUrl && (
                                                <ExternalLink
                                                    size={13}
                                                    className="shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors"
                                                />
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HistorialEnviosModal;
