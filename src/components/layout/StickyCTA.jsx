import React from 'react';
import { Lock, MessageSquare } from 'lucide-react';

export function StickyCTA({ onTextAgent }) {
    return (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-50 pointer-events-none">
            <div className="max-w-md mx-auto pointer-events-auto">
                <button
                    onClick={onTextAgent}
                    className="w-full bg-sothebys-navy/80 backdrop-blur-[20px] text-white text-lg font-medium py-3.5 rounded-3xl shadow-[0_12px_40px_rgba(0,35,73,0.3)] border border-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                >
                    <MessageSquare className="w-5 h-5 group-hover:fill-white/20 transition-all" />
                    Text Your Agent
                </button>
                <div className="flex items-center justify-center gap-1.5 mt-2 opacity-50">
                    <Lock className="w-3 h-3" />
                    <span className="text-[10px] font-medium tracking-wide border-b border-transparent hover:border-gray-400 transition-colors cursor-help">Private & Confidential</span>
                </div>
            </div>
        </div>
    );
}
