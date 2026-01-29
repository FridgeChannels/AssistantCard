import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Glass } from '../layout/Glass';
import { LocationSelector } from './LocationSelector';

export function ZipCodeOnboarding({ onSelect, onSkip }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/30 backdrop-blur-md"
        >
            <Glass
                variant="panel"
                className="w-full max-w-lg p-10 flex flex-col items-center relative overflow-visible bg-white/60 dark:bg-black/60 shadow-2xl"
            >
                {/* Skip Button */}
                <button
                    onClick={onSkip}
                    className="absolute top-6 right-6 text-lg text-black hover:text-[#010101] transition-colors px-3 py-1 rounded-full hover:bg-black/5"
                >
                    Skip
                </button>

                <div className="w-16 h-16 bg-[#010101] rounded-2xl flex items-center justify-center mb-6 shadow-lg rotate-3">
                    <span className="text-3xl">📍</span>
                </div>

                <h2 className="text-3xl font-bold text-[#010101] text-center mb-3 tracking-tight">
                    What city is on your radar?
                </h2>

                <p className="text-black text-center mb-10 px-2 leading-relaxed text-lg max-w-sm">
                    Follow a city to center your daily update around the places you care about.
                </p>

                <p className="text-xs font-medium mb-4 text-black text-center tracking-wide uppercase">
                    You can change this anytime
                </p>
                <div className="w-full mb-8 relative z-50">
                    <LocationSelector
                        selectedLocation={null}
                        onSelect={(location) => {
                            if (location) {
                                onSelect(location);
                            }
                        }}
                    />
                </div>

            </Glass>
        </motion.div>
    );
}
