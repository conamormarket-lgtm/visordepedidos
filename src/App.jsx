import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Header from './components/Header';
import ImageCarousel from './components/ImageCarousel';
import OrderDetails from './components/OrderDetails';
import ActionFooter from './components/ActionFooter';
import StockPauseAlert from './components/StockPauseAlert';
import { subscribeToOrders, updateOrderStage, assignOperator } from './services/orders';
import { STAGES } from './constants';
// Assuming Search is imported from a library like lucide-react or similar
// import { Search } from 'lucide-react'; // Add this if Search is a component

function App() {
    const [currentStage, setCurrentStage] = useState(STAGES.PREPARACION);
    const [allOrders, setAllOrders] = useState([]); // Store all fetched orders for the stage
    const [filteredOrders, setFilteredOrders] = useState([]); // Store filtered results
    const [currentIndex, setCurrentIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");

    // Swipe Logic
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [animDirection, setAnimDirection] = useState('right'); // 'right' means sliding IN from right (Next), 'left' means IN from left (Prev)
    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe) {
            handleNext();
        } else if (isRightSwipe) {
            handlePrev();
        }
    };

    // Effect to subscribe and update both lists
    useEffect(() => {
        const unsubscribe = subscribeToOrders((fetchedOrders) => {
            const stageOrders = fetchedOrders.filter(o => o.status === currentStage);
            setAllOrders(stageOrders);

            // Re-apply filter if search term exists, otherwise set to all
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
        }, (error) => {
            console.error("Firebase Error:", error);
            // Mock Data Fallback
            const mocks = [
                {
                    id: 'sample-1',
                    orderId: '5952',
                    status: 'preparacion',
                    images: ['https://placehold.co/800x600?text=Diseño+Muestra'],
                    deliveryType: 'AGENCIA',
                    destination: 'Piura, Paita, Paita',
                    phone: '927 958 742',
                    products: { 'Box 2 Poleras Parejas': 1 },
                    sizes: 'Polera Blanco (S) - Polera Blanco (S)',
                    observations: 'regalo a elegir',
                    comments: 'Comentario de prueba',
                    isPriority: true,
                    date: { seconds: 1771344000 },
                    preparacion: { enPausa: false }
                },
                {
                    id: 'sample-2',
                    orderId: '5848',
                    status: 'preparacion',
                    images: ['https://placehold.co/800x600?text=Diseño+2'],
                    deliveryType: 'DELIVERY',
                    destination: 'Lima, San Borja',
                    phone: '999 888 777',
                    products: { 'Pijamas': 7 },
                    sizes: 'Varias tallas XL, L, M',
                    observations: '',
                    isPriority: false,
                    date: { seconds: 1771430400 },
                    preparacion: { enPausa: true, operador: 'JUAN' }
                }
            ];
            const stageMocks = mocks.filter(o => o.status === currentStage);
            setAllOrders(stageMocks);
            setFilteredOrders(stageMocks);
        });

        return () => unsubscribe && unsubscribe();
    }, [currentStage]); // Note: searchTerm dependency handled separately

    // Effect to handle local search filtering
    useEffect(() => {
        if (!searchTerm) {
            setFilteredOrders(allOrders);
        } else {
            const lowerTerm = searchTerm.toLowerCase();
            const filtered = allOrders.filter(o =>
                (o.orderId && o.orderId.toString().toLowerCase().includes(lowerTerm)) ||
                (o.phone && o.phone.toString().includes(lowerTerm))
            );
            setFilteredOrders(filtered);
            setCurrentIndex(0); // Reset to first result on search
        }
    }, [searchTerm, allOrders]);

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
                    onPrev={handlePrev}
                    onNext={handleNext}
                    onAssign={handleAssign}
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
        </Layout>
    );
}

export default App;
