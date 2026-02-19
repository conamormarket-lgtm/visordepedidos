import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Header from './components/Header';
import ImageCarousel from './components/ImageCarousel';
import OrderDetails from './components/OrderDetails';
import ActionFooter from './components/ActionFooter';
import StockPauseAlert from './components/StockPauseAlert';
import { subscribeToOrders, updateOrderStage, assignOperator, subscribeToOperators } from './services/orders';
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

        // Orden especial para preparación: primero 'Listo para Preparar', luego el resto
        if (currentStage === STAGES.PREPARACION) {
            stageOrders = [...stageOrders].sort((a, b) => {
                const priority = { "Listo para Preparar": 1, "En Pausa por Stock": 2 };
                return (priority[a.estadoGeneral] || 3) - (priority[b.estadoGeneral] || 3);
            });
        }

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = stageOrders.filter(o =>
                (o.orderId && o.orderId.toString().toLowerCase().includes(lowerTerm)) ||
                (o.phone && o.phone.toString().includes(lowerTerm))
            );
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

    const handleNext = () => {
        if (currentIndex < filteredOrders.length - 1) {
            setAnimDirection('right');
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setAnimDirection('left');
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleAssign = async (operator) => {
        const currentOrder = filteredOrders[currentIndex];
        if (currentOrder) {
            await assignOperator(currentOrder.id, currentStage, operator);
        }
    };

    const handleComplete = async () => {
        const currentOrder = filteredOrders[currentIndex];
        if (currentOrder) {
            // Logic for next stage
            let nextStage = null;
            if (currentStage === STAGES.PREPARACION) nextStage = STAGES.ESTAMPADO;
            else if (currentStage === STAGES.ESTAMPADO) nextStage = STAGES.EMPAQUETADO;
            else if (currentStage === STAGES.EMPAQUETADO) nextStage = 'despacho';

            if (nextStage) {
                await updateOrderStage(currentOrder.id, nextStage, currentStage);
            }
        }
    };

    const currentOrder = filteredOrders[currentIndex];

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
                    onAssign={(op) => assignOperator(currentOrder.id, currentStage, op)}
                    onComplete={handleComplete}
                    assignedTo={currentOrder?.[currentStage]?.operador}
                />
            }
        >
            <div
                key={currentIndex}
                className={`flex flex-col xl:flex-row w-full h-full border border-white/60 rounded-2xl overflow-hidden bg-white/40 backdrop-blur-sm shadow-xl transition-all duration-300 ${!currentOrder ? 'opacity-80' : ''} ${animDirection === 'right' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
            >
                {filteredOrders.length > 0 ? (
                    <>
                        {/* Ensure ImageCarousel handles null images gracefully */}
                        <ImageCarousel images={currentOrder?.images || []} />
                        <OrderDetails order={currentOrder} />
                    </>
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                        {/* <Search size={48} className="opacity-20" /> */}
                        <span className="text-xl font-bold opacity-50">
                            {searchTerm ? "No se encontraron pedidos con ese criterio" : "No hay pedidos en esta etapa"}
                        </span>
                    </div>
                )}
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
