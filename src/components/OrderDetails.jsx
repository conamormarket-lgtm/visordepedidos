import React from 'react';
import { Phone, Package, AlertTriangle, Truck, Home, Ruler } from 'lucide-react';

const OrderDetails = ({ order }) => {
    if (!order) return null;

    return (
        // Main Container: Adapts to vertical tablets (w-full) and large screens (w-1/2)
        <div className="w-full xl:w-[30%] p-5 overflow-y-auto flex flex-col h-auto xl:h-full relative backdrop-blur-xl bg-white/30 border-t xl:border-t-0 xl:border-l border-white/30 shadow-none flex-1">

            {/* Header Section */}
            <div className="flex flex-col mb-4 pb-4 border-b border-slate-200/60">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">Orden de Producción</span>
                        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">#{order.orderId}</h2>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {order.isPriority && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[10px] font-bold ring-1 ring-rose-200 flex items-center gap-1 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                                PRIORIDAD
                            </span>
                        )}
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                            {order.date ? new Date(order.date.seconds * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Pendiente'}
                        </span>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {order.deliveryType === 'AGENCIA' ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50/50 rounded-lg border border-indigo-100 text-indigo-700">
                            <Truck size={14} className="stroke-[2px]" />
                            <span className="text-xs font-bold">Agencia</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50/50 rounded-lg border border-emerald-100 text-emerald-700">
                            <Home size={14} className="stroke-[2px]" />
                            <span className="text-xs font-bold">Delivery</span>
                        </div>
                    )}

                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50/80 rounded-lg border border-slate-100 text-slate-600">
                        <span className="text-xs font-semibold">📷 {order.images?.length || 0} fotos</span>
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div className="space-y-4">

                {/* Destination & Contact Card */}
                <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white/60 p-3 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-l-xl"></div>
                        <div className="ml-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destino</span>
                            <p className="text-lg font-bold text-slate-800 mt-0.5 leading-tight">{order.destination}</p>
                        </div>
                    </div>

                    <div className="bg-white/60 p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between group">
                        <div className="ml-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contacto</span>
                            <p className="text-xl font-bold text-blue-600 mt-0.5 tracking-tight font-mono">{order.phone}</p>
                        </div>
                        <div className="bg-blue-50 text-blue-600 p-2 rounded-lg">
                            <Phone size={18} />
                        </div>
                    </div>
                </div>

                {/* Products Section */}
                <div className="bg-white/80 rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
                    <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-100 flex items-center gap-2">
                        <Package size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detalle del Pedido</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {order.products && Object.entries(order.products).map(([name, qty], idx) => (
                            <div key={idx} className="p-2.5 flex items-center gap-3">
                                <span className="flex items-center justify-center w-7 h-7 bg-slate-900 text-white rounded-lg font-bold text-sm">
                                    {qty}
                                </span>
                                <span className="text-sm font-semibold text-slate-700">{name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Specs / Sizes */}
                <div className="bg-amber-50/40 rounded-xl border border-amber-100/60 p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Ruler size={14} className="text-amber-500" />
                        <span className="text-[10px] font-bold text-amber-600/70 uppercase tracking-wider">Tallas</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800">
                        {typeof order.sizes === 'string' ? order.sizes : JSON.stringify(order.sizes)}
                    </p>
                </div>

                {/* Observations */}
                {(order.observations || order.comments) && (
                    <div className="bg-white/90 border border-slate-200 rounded-xl p-3 shadow-sm space-y-2">
                        {order.observations && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-1 text-rose-500">
                                    <AlertTriangle size={14} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider">Observaciones</span>
                                </div>
                                <p className="text-sm font-medium text-slate-700">{order.observations}</p>
                            </div>
                        )}
                        {order.comments && (
                            <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Comentarios</span>
                                <p className="text-xs text-slate-600 italic">"{order.comments}"</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderDetails;
