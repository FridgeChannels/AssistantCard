import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

export function InputSection({ onSearch, isCompact }) {
    const [input, setInput] = useState("");

    const handleSend = () => {
        if (!input.trim()) return;
        onSearch(input);
        setInput("");
    };

    return (
        <motion.div
            layout
            className="flex flex-col bg-white/60 backdrop-blur-[20px] border-t border-white/20 pt-2 pb-2"
        >
            <div className="px-5 mb-2 relative group">
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                    placeholder="What are you worried about right now?"
                    className={cn(
                        "w-full bg-transparent font-sans placeholder:text-gray-400 placeholder:font-normal text-gray-800 border-none outline-none resize-none p-0 leading-tight transition-all duration-500",
                        isCompact ? "text-[17px] min-h-[44px] py-1" : "text-[20px] min-h-[56px] py-2"
                    )}
                    rows={1}
                />
                <div className="absolute top-1/2 -translate-y-1/2 right-4">
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="p-3 bg-[#1D1D1F] text-white rounded-full shadow-lg disabled:opacity-0 disabled:scale-75 transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        <ArrowUp className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}
