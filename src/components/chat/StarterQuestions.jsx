import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { QUICK_QUESTIONS_POOLS } from '../../lib/mockData';

export function StarterQuestions({ onSelect }) {
    const [poolIndex, setPoolIndex] = useState(0);
    const currentQuestions = QUICK_QUESTIONS_POOLS[poolIndex];

    const handleRefresh = () => {
        setPoolIndex((prev) => (prev + 1) % QUICK_QUESTIONS_POOLS.length);
    };

    return (
        <div className="w-full max-w-sm mx-auto px-6">
            <div className="relative flex items-center justify-center mb-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Where to start?</span>
                <button
                    onClick={handleRefresh}
                    className="absolute right-0 p-2 text-gray-400 hover:text-sothebys-navy bg-white/60 backdrop-blur-[20px] hover:bg-white/80 rounded-[30px] transition-colors border border-white/40"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-3">
                <AnimatePresence mode="wait">
                    {currentQuestions.map((q, i) => (
                        <motion.button
                            key={q + poolIndex}
                            initial={{ opacity: 0, y: 20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -20, scale: 0.9 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            onClick={() => onSelect(q)}
                            className="w-full text-center px-6 py-2 bg-blue-200 rounded-[30px] shadow-[0_8px_30px_rgba(0,122,255,0.1)] text-sothebys-navy font-medium cursor-pointer hover:bg-blue-300 transition-all"
                        >
                            {q}
                        </motion.button>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
