import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Glass } from '../layout/Glass';
import { Search, ChevronDown, MapPin, X, Loader2 } from 'lucide-react';
import { searchLocations } from '../../lib/locationService';

export function LocationSelector({ selectedLocation, onSelect }) {
    const [query, setQuery] = useState(selectedLocation || '');
    const [showDropdown, setShowDropdown] = useState(false);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);
    const debounceTimeout = useRef(null);
    const latestQueryRef = useRef(query);

    // Sync query with prop
    useEffect(() => {
        if (selectedLocation && typeof selectedLocation === 'object') {
            setQuery(selectedLocation.formatted || '');
        } else {
            setQuery(selectedLocation || '');
        }
    }, [selectedLocation]);

    // Update ref whenever query changes
    useEffect(() => {
        latestQueryRef.current = query;
    }, [query]);

    // Handle search input with debounce
    useEffect(() => {
        if (!showDropdown) return; // Only search if dropdown is/should be open

        const q = (query || '').trim();

        if (q.length < 2) {
            setLocations([]);
            setLoading(false);
            return;
        }

        // Clear previous timeout
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }

        // Set loading immediately if user is typing
        setLoading(true);

        // Debounce API call
        debounceTimeout.current = setTimeout(async () => {
            // Check if query is still current before making request (optimization)
            if (q !== latestQueryRef.current) return;

            try {
                const results = await searchLocations(q);

                // Check if query is still current after request
                if (q !== latestQueryRef.current) return;

                setLocations(results);
            } catch (err) {
                if (q !== latestQueryRef.current) return;
                console.error("Failed to fetch locations", err);
                setLocations([]);
            } finally {
                // Only turn off loading if this was the latest request
                if (q === latestQueryRef.current) {
                    setLoading(false);
                }
            }
        }, 300); // 300ms debounce

        return () => {
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        };
    }, [query, showDropdown]);

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

    const handleSelect = (location) => {
        onSelect(location);
        setQuery(location.formatted);
        setShowDropdown(false);
    };

    return (
        <div className="w-full max-w-md mb-8 relative z-20" ref={wrapperRef}>
            <div className="relative">
                <Glass
                    variant="card"
                    cornerRadius={30}
                    className="px-6 py-0 max-w-[360px] mx-auto focus-within:ring-2 focus-within:ring-sothebys-navy/20 transition-all cursor-pointer"
                    onClick={() => {
                        // Focus input on wrapper click
                        const input = document.getElementById('location-input');
                        if (input) {
                            input.focus();
                            setShowDropdown(true);
                        }
                    }}
                >
                    <div className="flex items-center gap-2 w-full">
                        <MapPin className={`w-4 h-4 flex-shrink-0 transition-colors ${showDropdown ? 'text-sothebys-navy' : 'text-black'}`} />
                        <input
                            id="location-input"
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            placeholder="Pick an area"
                            className="flex-1 bg-transparent border-none outline-none text-[#010101] font-medium text-base cursor-pointer min-w-0 text-center"
                            autoComplete="off"
                        />
                        {loading ? (
                            <Loader2 className="w-4 h-4 text-sothebys-navy animate-spin" />
                        ) : query ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setQuery('');
                                    onSelect(null);
                                    setLocations([]);
                                    const input = document.getElementById('location-input');
                                    if (input) input.focus();
                                }}
                                className="p-1 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-black" />
                            </button>
                        ) : null}
                    </div>
                </Glass>

                <AnimatePresence>
                    {showDropdown && (query.length >= 2 || locations.length > 0) && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 z-30 overflow-hidden"
                        >
                            <Glass variant="card" className="py-2 max-h-60 overflow-y-auto">
                                {locations.length > 0 ? (
                                    locations.map((loc, index) => (
                                        <button
                                            key={`${loc.formatted}-${index}`}
                                            onClick={() => handleSelect(loc)}
                                            className="w-full text-left px-4 py-2 hover:bg-[#010101]/5 active:bg-[#010101]/10 transition-colors text-[#010101]"
                                        >
                                            <div className="font-medium text-sm text-[#010101]">{loc.formatted}</div>
                                            {(loc.city !== loc.formatted && loc.county) && (
                                                <div className="text-xs text-black">{loc.county}</div>
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    !loading && query.length >= 2 && (
                                        <div className="px-4 py-3 text-center text-black text-sm">
                                            No locations found
                                        </div>
                                    )
                                )}
                            </Glass>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
