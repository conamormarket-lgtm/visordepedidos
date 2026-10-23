import React, { useState, useEffect, useMemo } from 'react';
import { Gift, X, Loader2, AlertTriangle, Minus, Plus, Search } from 'lucide-react';
import { cargarRegalos, etiquetaRegalo } from '../services/regalos';

// "marrón" encuentra "Marron" y "gorro negro" encuentra "Gorro Negro".
const normalizar = texto => String(texto).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Elegir los regalos que van en el paquete. Solo arma la selección: el stock se
 * descuenta al marcar el pedido como Empaquetado, junto con el avance.
 */
const RegalosModal = ({ order, seleccion, onGuardar, onClose }) => {
    const [estado, setEstado] = useState('cargando'); // 'cargando' | 'listo' | 'error'
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');
    const [cantidades, setCantidades] = useState(() => new Map(seleccion.map(r => [r.id, r.cantidad])));
    const [busqueda, setBusqueda] = useState('');
    const yaEntregados = order?.empaquetado?.regalosEntregados || [];

    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    useEffect(() => {
        let cancelado = false;
        cargarRegalos()
            .then((lista) => {
                if (cancelado) return;
                setItems(lista);
                setEstado('listo');
            })
            .catch((e) => {
                if (cancelado) return;
                console.error('[RegalosModal] Error al leer el inventario de regalos:', e);
                setError(e?.message || 'No se pudo cargar el inventario');
                setEstado('error');
            });
        return () => { cancelado = true; };
    }, []);

    const grupos = useMemo(() => {
        const palabras = normalizar(busqueda).split(/\s+/).filter(Boolean);
        const porTipo = new Map();
        for (const item of items) {
            const texto = normalizar(item.etiqueta);
            if (!palabras.every(p => texto.includes(p))) continue;
            const tipo = item.tipo || 'Otros';
            if (!porTipo.has(tipo)) porTipo.set(tipo, []);
            porTipo.get(tipo).push(item);
        }
        return [...porTipo];
    }, [items, busqueda]);

    const cambiar = (item, delta) => setCantidades(prev => {
        const next = new Map(prev);
        const valor = Math.min(item.stock, Math.max(0, (next.get(item.id) || 0) + delta));
        if (valor > 0) next.set(item.id, valor); else next.delete(item.id);
        return next;
    });

    const totalElegidos = [...cantidades.values()].reduce((n, c) => n + c, 0);

    const guardar = () => {
        onGuardar(items
            .filter(item => cantidades.get(item.id) > 0)
            .map(item => ({ id: item.id, cantidad: cantidades.get(item.id), etiqueta: item.etiqueta })));
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[9998] bg-slate-900/60 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-pink-600 text-white flex items-center justify-center shrink-0">
                            <Gift size={15} />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 leading-tight">Regalos del paquete</p>
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
                    {yaEntregados.length > 0 ? (
                        <div className="flex flex-col gap-3">
                            <p className="text-xs font-semibold text-slate-600 leading-snug">
                                Estos regalos ya se descontaron del inventario cuando el pedido se empaquetó antes. No se vuelven a descontar.
                            </p>
                            <ul className="flex flex-col gap-2">
                                {yaEntregados.map(r => (
                                    <li key={r.itemId} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700">
                                        <span>{etiquetaRegalo(r)}</span>
                                        <span>× {r.cantidad}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : estado === 'cargando' ? (
                        <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
                            <Loader2 size={22} className="animate-spin" />
                            <span className="text-xs font-semibold">Cargando…</span>
                        </div>
                    ) : estado === 'error' ? (
                        <div className="py-10 flex flex-col items-center gap-2 text-red-600">
                            <AlertTriangle size={22} />
                            <span className="text-xs font-bold">No se pudo cargar el inventario de regalos</span>
                            <span className="text-[11px] text-slate-500 text-center px-4">{error}</span>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <p className="text-[11px] font-semibold text-slate-500 leading-snug">
                                Se descuenta del Inventario de Regalos al marcar el pedido como Empaquetado.
                            </p>
                            <div className="sticky -top-4 z-10 -mx-4 -mt-2 px-4 py-2 bg-white">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    <input
                                        type="text"
                                        enterKeyHint="search"
                                        value={busqueda}
                                        onChange={e => setBusqueda(e.target.value)}
                                        placeholder="Buscar: gorro negro, billetera beige…"
                                        aria-label="Buscar regalo"
                                        className="w-full h-11 pl-9 pr-10 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-pink-400"
                                    />
                                    {busqueda && (
                                        <button
                                            onClick={() => setBusqueda('')}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
                                            aria-label="Limpiar búsqueda"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {grupos.length === 0 && (
                                <p className="py-8 text-center text-xs font-semibold text-slate-400">
                                    Ningún regalo coincide con "{busqueda}".
                                </p>
                            )}
                            {grupos.map(([tipo, lista]) => (
                                <section key={tipo}>
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1.5">{tipo}</h3>
                                    <ul className="flex flex-col gap-1.5">
                                        {lista.map(item => {
                                            const cantidad = cantidades.get(item.id) || 0;
                                            return (
                                                <li
                                                    key={item.id}
                                                    className={`flex items-center gap-2 p-2 rounded-xl border ${cantidad ? 'border-pink-300 bg-pink-50' : 'border-slate-200'}`}
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold text-slate-800 leading-tight truncate">{item.etiqueta}</p>
                                                        <p className={`text-[11px] font-semibold ${item.stock > 0 ? 'text-slate-500' : 'text-red-600'}`}>
                                                            Stock: {item.stock}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => cambiar(item, -1)}
                                                        disabled={!cantidad}
                                                        className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30"
                                                        aria-label={`Quitar ${item.etiqueta}`}
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="w-6 text-center text-base font-black text-slate-800">{cantidad}</span>
                                                    <button
                                                        onClick={() => cambiar(item, 1)}
                                                        disabled={cantidad >= item.stock}
                                                        className="w-10 h-10 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30"
                                                        aria-label={`Agregar ${item.etiqueta}`}
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    )}
                </div>

                {yaEntregados.length === 0 && estado === 'listo' && (
                    <div className="flex gap-2 p-4 border-t border-slate-200">
                        <button
                            onClick={() => setCantidades(new Map())}
                            disabled={!totalElegidos}
                            className="px-4 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-40"
                        >
                            Quitar todo
                        </button>
                        <button
                            onClick={guardar}
                            className="flex-1 py-3 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-sm font-black"
                        >
                            {totalElegidos ? `Listo (${totalElegidos})` : 'Listo, sin regalos'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RegalosModal;
