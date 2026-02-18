import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Monitor } from 'lucide-react';
import { STAGES, STAGE_LABELS } from '../constants';

const Header = ({ currentStage, onTabChange, onSearch }) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Logic for sliding background
    const [tabStyle, setTabStyle] = useState({});
    const tabsRef = useRef([]);

    useEffect(() => {
        const activeIndex = Object.values(STAGES).indexOf(currentStage);
        const activeTab = tabsRef.current[activeIndex];
        if (activeTab) {
            setTabStyle({
                left: activeTab.offsetLeft,
                width: activeTab.offsetWidth
            });
        }
    }, [currentStage]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchTerm(val);
        onSearch(val);
    };

    return (
        <div className="pt-4 px-4 z-30 relative">
            <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg relative overflow-hidden pb-4">

                {/* Top Bar */}
                <div className="px-8 pt-4 mb-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Monitor size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 leading-tight">Visor de Pedidos</h1>
                            <p className="text-xs font-medium text-slate-800/60">Sistema de Producción v1.0</p>
                        </div>
                    </div>

                    {/* Search Pill */}
                    <div className={`transition-all duration-300 ease-out ${isSearchOpen ? 'w-80' : 'w-12'}`}>
                        {isSearchOpen ? (
                            <div className="relative group">
                                <Search className="absolute left-4 top-3 text-slate-500 w-4 h-4" />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Buscar ID o Teléfono..."
                                    className="w-full pl-10 pr-10 py-2.5 bg-white/50 hover:bg-white/80 border-2 border-transparent hover:border-blue-100 focus:bg-white focus:border-blue-500/50 rounded-2xl text-sm font-semibold text-slate-800 outline-none transition-all shadow-inner placeholder:text-slate-500"
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    onBlur={() => !searchTerm && setIsSearchOpen(false)}
                                />
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        onSearch("");
                                        setIsSearchOpen(false);
                                    }}
                                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-700"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="w-12 h-12 flex items-center justify-center bg-white/50 hover:bg-white border border-white/40 hover:border-white/60 rounded-2xl text-slate-700 transition-all shadow-sm"
                            >
                                <Search size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Navigation Tabs - Sliding Background */}
                <div className="px-6 pb-4">
                    <div className="flex justify-center">
                        <div className="bg-slate-100/80 p-1.5 rounded-2xl flex relative shadow-inner backdrop-blur-sm border border-white/20">

                            {/* Sliding Background */}
                            <div
                                className="absolute bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-md transition-all duration-300 ease-out h-[calc(100%-0.75rem)] top-1.5"
                                style={{
                                    left: tabStyle.left,
                                    width: tabStyle.width
                                }}
                            />

                            {Object.values(STAGES).map((stage, idx) => {
                                const isActive = currentStage === stage;
                                return (
                                    <button
                                        key={stage}
                                        ref={el => tabsRef.current[idx] = el}
                                        onClick={() => onTabChange(stage)}
                                        className={`
                                            relative px-8 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 z-10
                                            ${isActive
                                                ? 'text-white'
                                                : 'text-slate-500 hover:text-slate-700'
                                            }
                                        `}
                                    >
                                        {STAGE_LABELS[stage]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
