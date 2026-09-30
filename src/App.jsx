import React, { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from './components/Layout';
import Header from './components/Header';
import ImageCarousel from './components/ImageCarousel';
import OrderDetails from './components/OrderDetails';
import ActionFooter from './components/ActionFooter';
import StockPauseAlert from './components/StockPauseAlert';
const ImageActionModal = lazy(() => import('./components/ImageActionModal'));
const HistorialEnviosModal = lazy(() => import('./components/HistorialEnviosModal'));
import { startStage, subscribeToOrders, updateOrderStage, assignOperator, subscribeToOperators, undoOrderStage, updateOrderTag } from './services/orders';
import { ORDER_VIEWS, STAGES, ZONAS, isZonaSplitEnabled, isEnviarErpEnabled } from './constants';
import { securityMonitor } from './utils/securityMonitor';
import * as deviceStats from './utils/deviceStats';
import { triggerConfetti } from './utils/confetti';
import { getOrdersForView, zonaDe } from './utils/orderQueue';
// Assuming Search is imported from a library like lucide-react or similar
// import { Search } from 'lucide-react'; // Add this if Search is a component

// Kill-switch del split Lima/Provincia. Se lee una sola vez al cargar la app:
// apagarlo requiere recargar (localStorage.setItem('VISOR_ZONA_SPLIT','off')).
const ZONA_SPLIT_ON = isZonaSplitEnabled();

// Kill-switch del menú "Enviar a ERP". Apagado, tocar una imagen la abre
// directamente en una pestaña nueva, igual que antes de esta función.
const ENVIAR_ERP_ON = isEnviarErpEnabled();

// La zona elegida se recuerda por dispositivo: cada equipo suele trabajar
// siempre la misma cola y no queremos que vuelva a Lima en cada recarga.
const ZONA_STORAGE_KEY = 'VISOR_PREP_ZONA';

const readZonaGuardada = () => {
    try {
        return localStorage.getItem(ZONA_STORAGE_KEY) === ZONAS.PROVINCIA
            ? ZONAS.PROVINCIA
            : ZONAS.LIMA;
    } catch (e) {
        return ZONAS.LIMA;
    }
};

function App() {
    const [currentView, setCurrentView] = useState(ORDER_VIEWS.PREPARACION);
    const [prepZona, setPrepZona] = useState(readZonaGuardada);
    const [allOrders, setAllOrders] = useState([]); // Store all fetched orders for the stage
    const [currentIndex, setCurrentIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLocked, setIsLocked] = useState(securityMonitor.getIsLocked());
    const [lockReason, setLockReason] = useState("");
    const [operators, setOperators] = useState(["Sin Asignar"]);
    const [lastAction, setLastAction] = useState(null); // { orderId, prevStage, completedStage, prevSnapshot }
    const [stats, setStats] = useState(deviceStats.getStats());
    const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
    const [verHistorialEnvios, setVerHistorialEnvios] = useState(false);

    // Con un modal abierto no se navega entre pedidos. Sin esto, las flechas del
    // teclado y el swipe siguen cambiando el pedido POR DETRÁS del modal: en el
    // menú de acciones eso llega a asociar la imagen de un pedido con otro,
    // porque la imagen queda fija y el pedido cambia debajo.
    const hayModalAbierto = !!imagenSeleccionada || verHistorialEnvios;
    const openHistorial = useCallback(() => setVerHistorialEnvios(true), []);

    const incrementStats = (stage) => {
        const updated = deviceStats.incrementCount(stage);
        setStats(updated);
        const total = updated.counts.preparacion + updated.counts.estampado + updated.counts.empaquetado;
        if (total === 15) {
            triggerConfetti();
        }
    };

    // Swipe Logic
    const touch = useRef({});
    const [animDirection, setAnimDirection] = useState('right'); // 'right' means sliding IN from right (Next), 'left' means IN from left (Prev)
    const minSwipeDistance = 50;

    // Monitor de seguridad y Suscripción Global de Pedidos (Ahorro de lecturas)
    useEffect(() => {
        // Suscripción al monitor
        const unsubMonitor = securityMonitor.subscribe((status, reason) => {
            setIsLocked(status);
            if (reason) setLockReason(reason);
        });

        // Suscripción ÚNICA a Firebase para todas las etapas relevantes
        // Esto evita volver a leer los mismos ~250 docs cada vez que se cambia de pestaña
        const unsubscribeOrders = subscribeToOrders((fetchedOrders) => {
            console.log(`Estado: Lista de pedidos actualizada. Total en memoria: ${fetchedOrders.length}`);
            setAllOrders(fetchedOrders);
        }, (error) => {
            console.error("Firebase Error:", error);
            // Mock Data Fallback removed for brevity, assuming online data
        });

        // Suscripción a OPERARIOS (Configuración dinámica)
        const unsubscribeOperators = subscribeToOperators((list) => {
            setOperators(list);
        });

        return () => {
            unsubMonitor();
            unsubscribeOrders();
            unsubscribeOperators();
        };
    }, []); // SIN DEPENDENCIAS: Se ejecuta una sola vez al cargar la app

    // Vistas locales sobre la misma suscripción: no se agregan lecturas.
    const hasSearch = Boolean(searchTerm);
    const sortedStageOrders = useMemo(() => getOrdersForView(allOrders, currentView, {
        zonaSplitEnabled: ZONA_SPLIT_ON,
        prepZona,
        hasSearch,
    }), [currentView, allOrders, hasSearch, prepZona]);

    const filteredOrders = useMemo(() => {
        const stageOrders = sortedStageOrders;
        if (searchTerm) {
            const term = searchTerm.trim();
            const termLower = term.toLowerCase();
            const termClean = term.replace(/\s+/g, '');
            const isNumeric = /^\d+$/.test(termClean);

            let filtered;
            if (isNumeric) {
                const termLength = termClean.length;
                filtered = stageOrders.filter(o => {
                    if (termLength <= 5) {
                        return o.orderId && o.orderId.toString().includes(termClean);
                    } else if (termLength >= 6 && termLength <= 8) {
                        return o.clienteNumeroDocumento && o.clienteNumeroDocumento.toString().includes(termClean);
                    } else {
                        return o.phone && o.phone.toString().replace(/\s+/g, '').includes(termClean);
                    }
                });
            } else {
                // Búsqueda de texto: por destino u observaciones
                filtered = stageOrders.filter(o =>
                    (o.destination && o.destination.toLowerCase().includes(termLower)) ||
                    (o.observations && o.observations.toLowerCase().includes(termLower)) ||
                    (o.comments && o.comments.toLowerCase().includes(termLower))
                );
            }
            return filtered;
        } else {
            return stageOrders;
        }
    }, [sortedStageOrders, searchTerm]);

    useEffect(() => {
        if (currentIndex >= filteredOrders.length) setCurrentIndex(0);
    }, [currentIndex, filteredOrders.length]);

    const onTouchStart = (e) => {
        touch.current = { startX: e.targetTouches[0].clientX, startY: e.targetTouches[0].clientY };
    };

    const onTouchMove = (e) => {
        touch.current.endX = e.targetTouches[0].clientX;
        touch.current.endY = e.targetTouches[0].clientY;
    };

    const onTouchEnd = () => {
        if (hayModalAbierto) return;
        const { startX: touchStartX, startY: touchStartY, endX: touchEndX, endY: touchEndY } = touch.current;
        touch.current = {};
        if (touchStartX == null || touchEndX == null || touchStartY == null || touchEndY == null) return;

        const distanceX = touchStartX - touchEndX;
        const distanceY = touchStartY - touchEndY;

        // Solo procesar si el movimiento es predominantemente horizontal
        // (La distancia en X debe ser mayor que la distancia en Y)
        if (Math.abs(distanceX) > Math.abs(distanceY)) {
            const isLeftSwipe = distanceX > minSwipeDistance;
            const isRightSwipe = distanceX < -minSwipeDistance;

            if (isLeftSwipe) {
                handleNext();
            } else if (isRightSwipe) {
                handlePrev();
            }
        }
    };

    // Conteo de pedidos por zona en Preparación (cero costo de red: se calcula
    // sobre la lista que ya está en memoria, con el mismo filtro de cobranza).
    const zonaCounts = useMemo(() => {
        const counts = { [ZONAS.LIMA]: 0, [ZONAS.PROVINCIA]: 0 };
        if (!ZONA_SPLIT_ON) return counts;
        allOrders.forEach(o => {
            if (o.status !== STAGES.PREPARACION) return;
            if (o.cobranza?.estado !== 'Habilitado') return;
            counts[zonaDe(o)]++;
        });
        return counts;
    }, [allOrders]);

    const handleTabChange = (view) => {
        setImagenSeleccionada(null);
        setVerHistorialEnvios(false);
        setCurrentView(view);
        setCurrentIndex(0);
        setSearchTerm(""); // Clear search on tab change
        setAnimDirection('right');
    };

    const handleZonaChange = (zona) => {
        if (zona === prepZona) return;
        setPrepZona(zona);
        setCurrentIndex(0);
        setSearchTerm("");
        setAnimDirection('right');
        try {
            localStorage.setItem(ZONA_STORAGE_KEY, zona);
        } catch (e) {
            // Sin persistencia: el split sigue funcionando en la sesión actual
            console.warn('[App] No se pudo guardar la zona de preparación:', e);
        }
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        setCurrentIndex(0);
    };

    const handleNext = useCallback(() => {
        if (currentIndex < filteredOrders.length - 1) {
            setAnimDirection('right');
            setCurrentIndex(prev => prev + 1);
        }
    }, [currentIndex, filteredOrders.length]);

    const handlePrev = useCallback(() => {
        if (currentIndex > 0) {
            setAnimDirection('left');
            setCurrentIndex(prev => prev - 1);
        }
    }, [currentIndex]);

    // Navegación por teclado (solo desktop)
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignorar si el usuario está escribiendo en un input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            // Ni navegar por detrás de un modal abierto
            if (hayModalAbierto) return;
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev, hayModalAbierto]);

    const handleAssign = async (operator) => {
        const currentOrder = filteredOrders[currentIndex];
        if (!currentOrder) return;
        try {
            console.log(`[App] handleAssign: opciones → orderId=${currentOrder.id}, stage=${currentStage}, operator=${operator}, estadoGeneral=${currentOrder.estadoGeneral}`);
            await assignOperator(currentOrder.id, currentStage, operator, currentOrder.estadoGeneral);
        } catch (err) {
            console.error('[App] Error al asignar operador:', err);
        }
    };

    const handleTagSelect = async (tagValue) => {
        const currentOrder = filteredOrders[currentIndex];
        if (!currentOrder) return;
        const fieldName =
            currentStage === STAGES.PREPARACION ? 'etiquetaPreparacion' :
            currentStage === STAGES.ESTAMPADO    ? 'etiquetaEstampado'   :
                                                   'etiquetaEmpaquetado';
        try {
            await updateOrderTag(currentOrder.id, fieldName, tagValue);
        } catch (err) {
            console.error('[App] Error al actualizar etiqueta:', err);
        }
    };

    const handleStartStage = async () => {
        const order = filteredOrders[currentIndex];
        if (!order) return;
        return startStage(order.id, currentStage);
    };

    const handleComplete = async () => {
        const currentOrder = filteredOrders[currentIndex];
        if (!currentOrder) return;

        // Bloqueo: requiere operador asignado (que no sea 'Sin Asignar')
        const assignedOperator = currentOrder?.[currentStage]?.operador;
        if (!assignedOperator || assignedOperator === 'Sin Asignar') {
            // No hacer nada; el componente ActionFooter muestra el bloqueo visualmente
            return;
        }

        // Logic for next stage
        let nextStage = null;
        if (currentStage === STAGES.PREPARACION) nextStage = STAGES.ESTAMPADO;
        else if (currentStage === STAGES.ESTAMPADO) nextStage = STAGES.EMPAQUETADO;
        else if (currentStage === STAGES.EMPAQUETADO) nextStage = 'despacho';

        if (nextStage) {
            // Guardar snapshot ANTES de moverse para poder deshacer
            const prevSnapshot = {
                [`${currentStage}.estado`]: currentOrder[currentStage]?.estado || null,
                [`${currentStage}.fechaFin`]: currentOrder[currentStage]?.fechaFin || null,
                [`${nextStage}.estado`]: currentOrder[nextStage]?.estado || null,
                [`${nextStage}.fechaEntrada`]: currentOrder[nextStage]?.fechaEntrada || null,
            };

            try {
                // Guardar snapshot para poder deshacer SOLO si el avance fue exitoso
                await updateOrderStage(currentOrder.id, nextStage, currentStage);

                setLastAction({
                    orderId: currentOrder.id,
                    orderVisualId: currentOrder.orderId,
                    prevStage: currentStage,
                    completedStage: nextStage,
                    prevSnapshot,
                });
                incrementStats(currentStage);
            } catch (err) {
                // Error de stock insuficiente: el pedido ya fue revertido en Firestore
                if (err.message?.startsWith('SIN_STOCK:')) {
                    const detalle = err.message.replace('SIN_STOCK: ', '');
                    alert(
                        `⚠️ SIN STOCK — El pedido #${currentOrder.orderId} no puede avanzar.\n\n` +
                        `${detalle}\n\n` +
                        `El pedido ha sido movido automáticamente a "En Pausa por Stock".`
                    );
                    setLastAction(null);
                } else if (err.message?.startsWith('NO_EN_INVENTARIO:')) {
                    const detalle = err.message.replace('NO_EN_INVENTARIO: ', '');
                    alert(
                        `⚠️ PRENDA NO REGISTRADA EN INVENTARIO — Pedido #${currentOrder.orderId}\n\n` +
                        `${detalle}\n\n` +
                        `La prenda existe en el pedido pero no se encontró su ficha en el inventario.\n` +
                        `El pedido NO fue pausado — podés volver a intentarlo.\n\n` +
                        `Revisá en el sistema de inventario que el producto esté dado de alta con el ID correcto (visible en consola del navegador).`
                    );
                    setLastAction(null);
                } else if (err.message?.startsWith('SIN_PRENDAS:')) {
                    // El pedido volvió a Preparación automáticamente
                    alert(
                        `⚠️ PRENDAS NO DETECTADAS — Pedido #${currentOrder.orderId}\n\n` +
                        `No se encontraron prendas en este pedido para descontar del inventario.\n\n` +
                        `Por favor verifica que el campo de prendas/tallas esté correctamente rellenado en el ERP antes de volver a avanzarlo.\n\n` +
                        `El pedido ha sido devuelto a "Listo para Preparar".`
                    );
                    setLastAction(null);
                } else {
                    console.error('[App] Error al completar etapa:', err);
                    alert(`Error al completar la etapa: ${err.message}`);
                }
            }
        }
    };

    // Enviar pedido BOX/CUADRO: desde Estampado directamente a Empaquetado (sin requerir operador)
    const handleBox = async () => {
        const currentOrder = filteredOrders[currentIndex];
        if (!currentOrder) return;
        if (currentStage !== STAGES.ESTAMPADO) return;

        const nextStage = STAGES.EMPAQUETADO;
        const prevSnapshot = {
            [`${currentStage}.estado`]: currentOrder[currentStage]?.estado || null,
            [`${currentStage}.fechaFin`]: currentOrder[currentStage]?.fechaFin || null,
            [`${nextStage}.estado`]: currentOrder[nextStage]?.estado || null,
            [`${nextStage}.fechaEntrada`]: currentOrder[nextStage]?.fechaEntrada || null,
        };

        try {
            await updateOrderStage(currentOrder.id, nextStage, currentStage, undefined, { esBoxCuadro: true });
            setLastAction({
                orderId: currentOrder.id,
                orderVisualId: currentOrder.orderId,
                prevStage: currentStage,
                completedStage: nextStage,
                prevSnapshot,
            });
            incrementStats(currentStage);
        } catch (err) {
            alert(`Error al pasar a empaquetado: ${err.message}`);
        }
    };

    // Enviar pedido POR MAYOR directamente a Reparto (sin pasar por estampado/empaquetado)
    const handleWholesale = async () => {
        const currentOrder = filteredOrders[currentIndex];
        if (!currentOrder) return;
        if (currentStage !== STAGES.PREPARACION) return;
        // Solo disponible para pedidos sin imágenes
        if (currentOrder.images && currentOrder.images.length > 0) return;

        // Bloqueo: requiere operador asignado
        const assignedOperator = currentOrder?.[currentStage]?.operador;
        if (!assignedOperator || assignedOperator === 'Sin Asignar') return;

        // Saltar directamente a despacho (En Reparto)
        try {
            await updateOrderStage(currentOrder.id, 'despacho', currentStage);
            incrementStats(currentStage);
        } catch (err) {
            alert(`Error al pasar a reparto: ${err.message}`);
        }
    };

    const handleUndo = async () => {
        if (!lastAction) return;
        const { orderId, prevStage, completedStage, prevSnapshot } = lastAction;
        await undoOrderStage(orderId, prevStage, completedStage, prevSnapshot);
        setLastAction(null);
        setStats(deviceStats.decrementCount(prevStage));
    };

    const currentOrder = filteredOrders[currentIndex];

    // Prioridad es una vista: cada acción conserva la etapa real del pedido.
    const currentStage = currentOrder?.status
        ?? (currentView === ORDER_VIEWS.PRIORIDAD ? null : currentView);

    // Si el pedido no tiene imágenes, ocultamos el carrusel y la info ocupa todo el ancho
    const sinImagen = !!(
        currentOrder &&
        (!currentOrder.images || currentOrder.images.length === 0)
    );

    return (
        <Layout
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={() => { touch.current = {}; }}
            header={
                <>
                    <Header
                        currentView={currentView}
                        onTabChange={handleTabChange}
                        onSearch={handleSearch}
                        stats={stats}
                        zonaSplitEnabled={ZONA_SPLIT_ON}
                        prepZona={prepZona}
                        onZonaChange={handleZonaChange}
                        zonaCounts={zonaCounts}
                    />
                    <StockPauseAlert isPaused={currentOrder?.isStockPaused} />
                </>
            }
            footer={
                <ActionFooter
                    currentOrderIndex={currentIndex}
                    totalOrders={filteredOrders.length}
                    currentStage={currentStage}
                    operators={operators}
                    onAssign={handleAssign}
                    onComplete={handleComplete}
                    onStartStage={handleStartStage}
                    onUndo={handleUndo}
                    onWholesale={handleWholesale}
                    onBox={handleBox}
                    onTagSelect={handleTagSelect}
                    lastAction={lastAction}
                    assignedTo={currentOrder?.[currentStage]?.operador}
                    currentOrderId={currentOrder?.id}
                    currentOrder={currentOrder}
                    sinImagen={sinImagen}
                />
            }
        >
            {/* Wrapper relativo para posicionar las flechas laterales */}
            <div className={`relative w-full flex items-stretch ${currentOrder && !sinImagen ? 'min-h-full shrink-0' : 'h-full'}`}>

                {/* Flecha IZQUIERDA — solo desktop */}
                <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0 || filteredOrders.length === 0}
                    className={`hidden xl:flex items-center justify-center shrink-0 w-14 self-stretch rounded-l-2xl transition-all duration-200 group
                        ${currentIndex === 0 || filteredOrders.length === 0
                            ? 'opacity-20 cursor-not-allowed bg-transparent'
                            : 'opacity-80 hover:opacity-100 hover:bg-white/30 cursor-pointer active:scale-95'
                        }`}
                    aria-label="Pedido anterior"
                >
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-white/70 backdrop-blur-sm shadow-lg border border-white/60 transition-all duration-200
                        ${currentIndex === 0 || filteredOrders.length === 0 ? '' : 'group-hover:bg-white group-hover:shadow-xl group-hover:scale-110'}`}>
                        <ChevronLeft size={24} className="text-slate-700 stroke-[2.5px]" />
                    </div>
                </button>

                {/* Card del pedido */}
                <div
                    key={currentIndex}
                    className={`flex flex-col xl:flex-row flex-1 min-w-0 ${currentOrder && !sinImagen ? 'min-h-full' : 'h-full'} rounded-2xl overflow-hidden bg-white/40 backdrop-blur-sm shadow-xl transition-all duration-300 ${
                        currentOrder?.prioridadCRM
                            ? 'border-4 border-red-500 ring-4 ring-red-500/30'
                            : 'border border-white/60'
                    } ${!currentOrder ? 'opacity-80' : ''} ${animDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
                >
                    {currentOrder ? (
                        <>
                            {!sinImagen && (
                                <ImageCarousel
                                    images={currentOrder?.images || []}
                                    fechaVideo={currentOrder?.fechaVideo}
                                    // El menú (abrir / enviar a ERP) solo existe en
                                    // Preparación. En el resto de etapas la imagen se
                                    // abre directo, como siempre.
                                    onImageClick={
                                        ENVIAR_ERP_ON && currentStage === STAGES.PREPARACION
                                            ? setImagenSeleccionada
                                            : undefined
                                    }
                                    // El historial sí está en todas las etapas: enviar
                                    // solo se puede desde Preparación, pero saber qué se
                                    // mandó a imprimir sirve también más adelante.
                                    onVerHistorial={openHistorial}
                                />
                            )}
                            <OrderDetails order={currentOrder} fullWidth={sinImagen} showStage={currentView === ORDER_VIEWS.PRIORIDAD} />
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                            <span className="text-xl font-bold opacity-50">
                                {searchTerm ? "No se encontraron pedidos con ese criterio" : currentView === ORDER_VIEWS.PRIORIDAD ? "No hay pedidos marcados como prioridad" : "No hay pedidos en esta etapa"}
                            </span>
                        </div>
                    )}
                </div>

                {/* Flecha DERECHA — solo desktop */}
                <button
                    onClick={handleNext}
                    disabled={currentIndex >= filteredOrders.length - 1 || filteredOrders.length === 0}
                    className={`hidden xl:flex items-center justify-center shrink-0 w-14 self-stretch rounded-r-2xl transition-all duration-200 group
                        ${currentIndex >= filteredOrders.length - 1 || filteredOrders.length === 0
                            ? 'opacity-20 cursor-not-allowed bg-transparent'
                            : 'opacity-80 hover:opacity-100 hover:bg-white/30 cursor-pointer active:scale-95'
                        }`}
                    aria-label="Siguiente pedido"
                >
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-white/70 backdrop-blur-sm shadow-lg border border-white/60 transition-all duration-200
                        ${currentIndex >= filteredOrders.length - 1 || filteredOrders.length === 0 ? '' : 'group-hover:bg-white group-hover:shadow-xl group-hover:scale-110'}`}>
                        <ChevronRight size={24} className="text-slate-700 stroke-[2.5px]" />
                    </div>
                </button>

            </div>

            {/* Historial de envíos a Impresión del pedido actual */}
            <Suspense fallback={<div role="status" className="fixed inset-0 z-50 bg-white/95 flex items-center justify-center">Cargando…</div>}>
            {verHistorialEnvios && currentOrder && (
                <HistorialEnviosModal
                    order={currentOrder}
                    onClose={() => setVerHistorialEnvios(false)}
                />
            )}

            {/* Menú de acciones sobre una imagen (solo Preparación) */}
            {imagenSeleccionada && (
                <ImageActionModal
                    imagen={imagenSeleccionada}
                    order={currentOrder}
                    onClose={() => setImagenSeleccionada(null)}
                />
            )}

            {/* Emergency Brake Overlay */}
            </Suspense>
            {isLocked && (
                <div className="fixed inset-0 z-[9999] bg-red-600/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 text-center">
                    <div className="bg-white text-red-600 rounded-full p-6 mb-6 animate-bounce">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                    </div>
                    <h1 className="text-5xl font-black mb-4 tracking-tighter">SISTEMA BLOQUEADO</h1>
                    <p className="text-2xl font-light max-w-2xl mb-8">
                        Se ha detectado un consumo inusual de recursos (posible bucle de sincronización).
                        El freno de emergencia se ha activado para evitar cargos excesivos.
                    </p>
                    <div className="bg-black/20 p-4 rounded-lg font-mono text-sm border border-white/20">
                        Motivo: {lockReason || `>${'300'} op/seg o ráfaga inusual.`}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-10 px-8 py-3 bg-white text-red-600 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-lg"
                    >
                        RECARGAR APLICACIÓN
                    </button>
                </div>
            )}
        </Layout>
    );
}

export default App;
