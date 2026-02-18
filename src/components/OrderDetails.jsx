import React from 'react';
import { Phone, Package, AlertTriangle, Truck, Home, Ruler } from 'lucide-react';

const OrderDetails = ({ order }) => {
    if (!order) return null;

    return (
        // Main Container: "Mica" material effect - transparent glass
        <div className="w-1/2 p-8 overflow-y-auto flex flex-col h-full relative backdrop-blur-xl bg-white/30 border-l border-white/30 shadow-none">

            {/* Header Section */}
            <div className="flex flex-col mb-8 pb-6 border-b border-slate-200/60">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Orden de Producción</span>
                        <h2 className="text-5xl font-bold text-slate-800 tracking-tight">#{order.orderId}</h2>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {order.isPriority && (
                            <span className="px-3 py-1 bg-rose-100 text-rose-600 rounded-full text-xs font-bold ring-1 ring-rose-200 flex items-center gap-1.5 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                PRIORIDAD ALTA
                            </span>
                        )}
                        <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                            {order.date ? new Date(order.date.seconds * 1000).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }) : 'Fecha Pendiente'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    {order.deliveryType === 'AGENCIA' ? (
                        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50/50 rounded-xl border border-indigo-100 text-indigo-700">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                <Truck size={18} className="stroke-[2px]" />
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider opacity-60 leading-none">Tipo de Envío</span>
                                <span className="text-sm font-bold">Agencia</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50/50 rounded-xl border border-emerald-100 text-emerald-700">
                            <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                <Home size={18} className="stroke-[2px]" />
                            </div>
                            <div>
                                <span className="block text-[10px] font-bold uppercase tracking-wider opacity-60 leading-none">Tipo de Envío</span>
                                <span className="text-sm font-bold">Delivery</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-3 px-4 py-2 bg-slate-50/80 rounded-xl border border-slate-100 text-slate-600">
                        <span className="text-sm font-semibold">📷 {order.images?.length || 0} Imágenes adjuntas</span>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="space-y-6">

                {/* Destination & Contact Card */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white/60 p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-300/50 transition-colors">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-2xl"></div>
                        <div className="ml-2">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destino</span>
                            <p className="text-2xl font-bold text-slate-800 mt-1 leading-snug">{order.destination}</p>
                        </div>
                    </div>

                    <div className="bg-white/60 p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-300/50 transition-colors">
                        <div className="ml-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contacto</span>
                            <p className="text-3xl font-bold text-blue-600 mt-0.5 tracking-tight font-mono">{order.phone}</p>
                        </div>
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
                            <Phone size={24} />
                        </div>
                    </div>
                </div>

                {/* Products Section */}
                <div className="bg-white/80 rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="bg-slate-50/80 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                        <Package size={16} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalle del Pedido</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {order.products && Object.entries(order.products).map(([name, qty], idx) => (
                            <div key={idx} className="p-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                                <span className="flex items-center justify-center w-10 h-10 bg-slate-900 text-white rounded-xl font-bold text-lg shadow-md shadow-slate-200">
                                    {qty}
                                </span>
                                <span className="text-lg font-semibold text-slate-700">{name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Specs / Sizes */}
                <div className="bg-amber-50/40 rounded-2xl border border-amber-100/60 p-5">
                    <div className="flex items-center gap-2 mb-2">
                        <Ruler size={16} className="text-amber-500" />
                        <span className="text-xs font-bold text-amber-600/70 uppercase tracking-wider">Tallas y Especificaciones</span>
                    </div>
                    <p className="text-lg font-medium text-slate-800 leading-relaxed">
                        {typeof order.sizes === 'string' ? order.sizes : JSON.stringify(order.sizes)}
                    </p>
                </div>

                {/* Observations */}
                <div className="relative pt-2">
                    {(order.observations || order.comments) && (
                        <div className="bg-white/90 border border-slate-200 rounded-2xl p-5 shadow-sm">
                            {order.observations && (
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2 text-rose-500">
                                        <AlertTriangle size={18} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Observaciones</span>
                                    </div>
                                    <p className="font-medium text-slate-700">{order.observations}</p>
                                </div>
                            )}

                            {order.comments && (
                                <div className="pt-4 border-t border-slate-100">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Comentarios Adicionales</span>
                                    <p className="text-slate-600 italic">"{order.comments}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderDetails;
