import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Glass } from '../layout/Glass';
import { Search, ChevronDown, MapPin, X } from 'lucide-react';

const MOCK_CITIES = [
    'Austin, TX',
    'Atlanta, GA',
    'Boston, MA',
    'Chicago, IL',
    'Dallas, TX',
    'Denver, CO',
    'Houston, TX',
    'Los Angeles, CA',
    'Miami, FL',
    'New York, NY',
    'San Francisco, CA',
    'Seattle, WA',
    'Washington, DC',
];

export function LocationSelector({ selectedLocation, onSelect }) {
    const [query, setQuery] = useState(selectedLocation || '');
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredCities, setFilteredCities] = useState([]);
    const wrapperRef = useRef(null);

    // 当外部 selectedLocation 改变时，同步到输入框（保持可编辑）
    useEffect(() => {
        setQuery(selectedLocation || '');
    }, [selectedLocation]);

    useEffect(() => {
        const q = (query || '').trim().toLowerCase();
        if (q.length === 0) {
            setFilteredCities(MOCK_CITIES);
            // Don't auto-show dropdown here to prevent flashing, handled by onFocus
        } else {
            // 首字母/前缀优先，其次再用 contains 兜底（更“聪明”）
            const prefix = MOCK_CITIES.filter(city => city.toLowerCase().startsWith(q));
            const contains = prefix.length > 0
                ? prefix
                : MOCK_CITIES.filter(city => city.toLowerCase().includes(q));
            setFilteredCities(contains);
            setShowDropdown(true);
        }
    }, [query]);

    // Click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (city) => {
        onSelect(city);
        setQuery(city); // 选完后仍保留在输入框，可继续编辑
        setShowDropdown(false);
    };

    return (
        <div className="w-full max-w-md mb-8 relative z-20 mt-[-120px]" ref={wrapperRef}>
            <div className="relative">
                <Glass
                    variant="card"
                    cornerRadius={30}
                    className="px-6 py-0 max-w-[360px] mx-auto focus-within:ring-2 focus-within:ring-sothebys-navy/20 transition-all cursor-pointer"
                    onClick={() => {
                        // Focus input on wrapper click
                        const input = document.getElementById('location-input');
                        if (input) input.focus();
                    }}
                >
                    <div className="flex items-center gap-2 w-full">
                        <MapPin className={`w-4 h-4 flex-shrink-0 transition-colors ${showDropdown ? 'text-sothebys-navy' : 'text-gray-400'}`} />
                        <input
                            id="location-input"
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={(e) => {
                                e.target.select();
                                const q = (query || '').trim().toLowerCase();
                                const prefix = MOCK_CITIES.filter(c => c.toLowerCase().startsWith(q));
                                const contains = prefix.length > 0
                                    ? prefix
                                    : MOCK_CITIES.filter(c => c.toLowerCase().includes(q));
                                setFilteredCities(q.length === 0 ? MOCK_CITIES : contains);
                                setShowDropdown(true);
                            }}
                            placeholder="Pick an area to get local news"
                            className="flex-1 bg-transparent border-none outline-none text-[#010101] placeholder:text-gray-500 font-medium text-base cursor-pointer min-w-0"
                        />
                        {query ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setQuery('');
                                    onSelect(null);
                                    setFilteredCities(MOCK_CITIES);
                                    const input = document.getElementById('location-input');
                                    if (input) input.focus();
                                }}
                                className="p-1 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-400" />
                            </button>
                        ) : (
                            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                        )}
                    </div>
                </Glass>

                <AnimatePresence>
                    {showDropdown && filteredCities.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 z-30 overflow-hidden"
                        >
                            <Glass variant="card" className="py-2 max-h-60 overflow-y-auto">
                                {filteredCities.map((city) => (
                                    <button
                                        key={city}
                                        onClick={() => handleSelect(city)}
                                        className="w-full text-left px-4 py-2 hover:bg-[#010101]/5 active:bg-[#010101]/10 transition-colors text-[#010101]"
                                    >
                                        {city}
                                    </button>
                                ))}
                            </Glass>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
