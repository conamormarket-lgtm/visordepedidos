import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Layout from './components/Layout';
import Header from './components/Header';
import ImageCarousel from './components/ImageCarousel';
import OrderDetails from './components/OrderDetails';
import ActionFooter from './components/ActionFooter';
import StockPauseAlert from './components/StockPauseAlert';
import { subscribeToOrders, updateOrderStage, assignOperator, subscribeToOperators, undoOrderStage, updateOrderTag } from './services/orders';
import { STAGES } from './constants';
import { securityMonitor } from './utils/securityMonitor';
// Assuming Search is imported from a library like lucide-react or similar
// import { Search } from 'lucide-react'; // Add this if Search is a component

function App() {
    const [currentStage, setCurrentStage] = useState(STAGES.PREPARACION);
    const [allOrders, setAllOrders] = useState([]); // Store all fetched orders for the stage
    const [filteredOrders, setFilteredOrders] = useState([]); // Store filtered results
    const [currentIndex, setCurrentIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [isLocked, setIsLocked] = useState(securityMonitor.getIsLocked());
    const [lockReason, setLockReason] = useState("");
    const [operators, setOperators] = useState(["Sin Asignar"]);
    const [lastAction, setLastAction] = useState(null); // { orderId, prevStage, completedStage, prevSnapshot }

    // Swipe Logic
    const [touchStartX, setTouchStartX] = useState(null);
    const [touchStartY, setTouchStartY] = useState(null);
    const [touchEndX, setTouchEndX] = useState(null);
    const [touchEndY, setTouchEndY] = useState(null);
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

    // Filtrado local por etapa actual (Cero costo de red)
    useEffect(() => {
        let stageOrders = allOrders.filter(o => o.status === currentStage);

        // ── Filtro de cobranza (solo en Preparación) ──────────────────────────
        // Solo se muestran pedidos cuyo campo cobranza.estado sea "Habilitado".
        if (currentStage === STAGES.PREPARACION) {
            stageOrders = stageOrders.filter(o => o.cobranza?.estado === 'Habilitado');
        }

        // ── Orden de cola unificado para todas las etapas ───────────────────────────────
        // Grupo 1: pedidos prioritarios (esPrioridad=true y no en pausa por stock)
        //          ordenados ascendentemente por numeroCola.
        // Grupo 2: pedidos normales (no prioritarios, no en pausa por stock)
        //          ordenados ascendentemente por numeroCola.
        // Grupo 3: pedidos en pausa por stock (siempre al final).
        stageOrders = [...stageOrders].sort((a, b) => {
            const aStock = a.isStockPaused ? 1 : 0;
            const bStock = b.isStockPaused ? 1 : 0;

            // Pausa por stock siempre al final
            if (aStock !== bStock) return aStock - bStock;

            // Dentro de los activos: prioridad primero
            const aPriority = a.esPrioridad ? 0 : 1;
            const bPriority = b.esPrioridad ? 0 : 1;
            if (aPriority !== bPriority) return aPriority - bPriority;

            // Dentro del mismo grupo: ordenar por numeroCola ascendente.
            // Si un pedido no tiene numeroCola va al final de su grupo.
            const aCol = a.numeroCola ?? Infinity;
            const bCol = b.numeroCola ?? Infinity;
            return aCol - bCol;
        });

        // ── Renumeración en tiempo real de las posiciones de cola ──────────────────
        // El numeroCola guardado en Firebase es el ticket de entrada (nunca baja),
        // pero lo que el usuario necesita ver es su POSICIÓN ACTUAL en la cola.
        // La calculamos aquí, en el cliente, a partir del orden ya sorted, sin
        // costo de red ni escrituras a Firebase.
        //
        //  Grupo prioridad activos → P-1, P-2, P-3 ...
        //  Grupo normal activos    → 1, 2, 3 ...
        //  Pausa por stock         → sin número de cola
        let posPrioridad = 0;
        let posNormal    = 0;
        stageOrders = stageOrders.map(order => {
            if (order.isStockPaused) {
                // En pausa por stock: sin número de cola asignado
                return { ...order, numeroColaDisplay: null, numeroCola: null };
            }
            if (order.esPrioridad) {
                posPrioridad++;
                return {
                    ...order,
                    numeroCola:        posPrioridad,
                    numeroColaDisplay: `P-${posPrioridad}`,
                };
            }
            posNormal++;
            return {
                ...order,
                numeroCola:        posNormal,
                numeroColaDisplay: String(posNormal),
            };
        });

        if (searchTerm) {
            const term = searchTerm.trim();
            const termLower = term.toLowerCase();
            const termClean = term.replace(/\s+/g, '');
            const isNumeric = /^\d+$/.test(termClean);

            let filtered;
            if (isNumeric) {
                const termLength = termClean.length;
                filtered = stageOrders.filter(o => {
                    if (termLength <= 4) {
                        return o.orderId && o.orderId.toString().includes(termClean);
                    } else if (termLength >= 5 && termLength <= 8) {
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
            setFilteredOrders(filtered);
        } else {
            setFilteredOrders(stageOrders);
        }

        // Reset index bounds check
        if (currentIndex >= stageOrders.length && stageOrders.length > 0) {
            setCurrentIndex(0);
        }
    }, [currentStage, allOrders, searchTerm]);

    const onTouchStart = (e) => {
        setTouchEndX(null);
        setTouchEndY(null);
        setTouchStartX(e.targetTouches[0].clientX);
        setTouchStartY(e.targetTouches[0].clientY);
    };

    const onTouchMove = (e) => {
        setTouchEndX(e.targetTouches[0].clientX);
        setTouchEndY(e.targetTouches[0].clientY);
    };

    const onTouchEnd = () => {
        if (touchStartX === null || touchEndX === null || touchStartY === null || touchEndY === null) return;

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

    const handleTabChange = (stage) => {
        setCurrentStage(stage);
        setCurrentIndex(0);
        setSearchTerm(""); // Clear search on tab change
        setAnimDirection('right');
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
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
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNext, handlePrev]);

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
        try {
            await updateOrderTag(currentOrder.id, tagValue);
        } catch (err) {
            console.error('[App] Error al actualizar etiqueta:', err);
        }
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
            } catch (err) {
                // Error de stock insuficiente: el pedido ya fue revertido en Firestore
                if (err.message?.startsWith('SIN_STOCK:')) {
                    const detalle = err.message.replace('SIN_STOCK: ', '');
                    alert(
                        `⚠️ SIN STOCK — El pedido #${currentOrder.orderId} no puede avanzar.\n\n` +
                        `${detalle}\n\n` +
                        `El pedido ha sido movido automáticamente a "En Pausa por Stock".`
                    );
                    setLastAction(null); // No hay nada que deshacer (Firestore ya revirtió)
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

        setLastAction({
            orderId: currentOrder.id,
            orderVisualId: currentOrder.orderId,
            prevStage: currentStage,
            completedStage: nextStage,
            prevSnapshot,
        });

        await updateOrderStage(currentOrder.id, nextStage, currentStage);
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
        await updateOrderStage(currentOrder.id, 'despacho', currentStage);
    };

    const handleUndo = async () => {
        if (!lastAction) return;
        const { orderId, prevStage, completedStage, prevSnapshot } = lastAction;
        await undoOrderStage(orderId, prevStage, completedStage, prevSnapshot);
        setLastAction(null);
    };

    const currentOrder = filteredOrders[currentIndex];

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
            header={
                <>
                    <Header
                        currentStage={currentStage}
                        onTabChange={handleTabChange}
                        onSearch={handleSearch}
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
            <div className="relative w-full h-full flex items-stretch">

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
                    className={`flex flex-col xl:flex-row flex-1 min-w-0 h-full border border-white/60 rounded-2xl overflow-hidden bg-white/40 backdrop-blur-sm shadow-xl transition-all duration-300 ${!currentOrder ? 'opacity-80' : ''} ${animDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
                >
                    {filteredOrders.length > 0 ? (
                        <>
                            {!sinImagen && (
                                <ImageCarousel images={currentOrder?.images || []} />
                            )}
                            <OrderDetails order={currentOrder} fullWidth={sinImagen} />
                        </>
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                            <span className="text-xl font-bold opacity-50">
                                {searchTerm ? "No se encontraron pedidos con ese criterio" : "No hay pedidos en esta etapa"}
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

            {/* Emergency Brake Overlay */}
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
