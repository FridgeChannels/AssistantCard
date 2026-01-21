import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { cn } from '../../lib/utils';

export function NextMoveCard({ conclusion, audioUrl }) {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <div className="px-5 pt-6 pb-2">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Next Move</h2>
                {audioUrl && (
                    <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full text-[10px] font-semibold text-sothebys-navy hover:bg-gray-200 transition-colors"
                    >
                        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        {isPlaying ? "Playing..." : "Play 10s"}
                    </button>
                )}
            </div>

            <motion.div
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={conclusion} // Animate when conclusion changes
                className="relative bg-gradient-to-br from-sothebys-navy to-[#003366] rounded-2xl p-6 text-white shadow-xl overflow-hidden"
            >
                <div className="relative z-10">
                    <p className="text-xl md:text-2xl font-serif leading-tight opacity-95">
                        {conclusion}
                    </p>
                </div>

                {/* Subtle background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            </motion.div>

            <div className="mt-2 text-center">
                <span className="text-[10px] text-gray-400">Updated when you ask a question.</span>
            </div>
        </div>
    );
}
