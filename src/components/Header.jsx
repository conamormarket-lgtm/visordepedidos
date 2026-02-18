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
        <div className="pt-3 px-4 z-30 relative">
            <div className="bg-white/40 backdrop-blur-xl border border-white/40 rounded-3xl shadow-lg relative overflow-hidden px-6 py-3">
                <div className="flex justify-between items-center gap-4">

                    {/* Left: Title - Compact */}
                    <div className="flex items-center gap-3 min-w-fit">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/10">
                            <Monitor size={18} />
                        </div>
                        <div className="hidden sm:block">
                            <h1 className="text-sm font-bold text-slate-800 leading-tight">Visor de Pedidos</h1>
                            <p className="text-[10px] font-medium text-slate-800/60">Producción v1.0</p>
                        </div>
                    </div>

                    {/* Center: Navigation Tabs - More Compact */}
                    <div className="flex-1 flex justify-center overflow-hidden">
                        <div className="bg-slate-200/50 p-1 rounded-xl flex relative shadow-inner backdrop-blur-sm border border-white/20">

                            {/* Sliding Background */}
                            <div
                                className="absolute bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-md transition-all duration-300 ease-out h-[calc(100%-0.5rem)] top-1"
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
                                            relative px-4 sm:px-6 py-1.5 rounded-lg text-xs font-bold transition-colors duration-300 z-10 whitespace-nowrap
                                            ${isActive
                                                ? 'text-white'
                                                : 'text-slate-600 hover:text-slate-800'
                                            }
                                        `}
                                    >
                                        {STAGE_LABELS[stage]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Search - Compact */}
                    <div className={`flex justify-end transition-all duration-300 ease-out ${isSearchOpen ? 'w-48 sm:w-64' : 'w-10'}`}>
                        {isSearchOpen ? (
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-2.5 text-slate-500 w-3.5 h-3.5" />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="ID o Tel..."
                                    className="w-full pl-8 pr-8 py-1.5 bg-white/60 hover:bg-white/90 border border-transparent focus:bg-white focus:border-blue-500/30 rounded-xl text-xs font-bold text-slate-800 outline-none transition-all shadow-sm placeholder:text-slate-400"
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
                                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsSearchOpen(true)}
                                className="w-10 h-10 flex items-center justify-center bg-white/40 hover:bg-white/80 border border-white/30 rounded-xl text-slate-700 transition-all shadow-sm"
                            >
                                <Search size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Header;
