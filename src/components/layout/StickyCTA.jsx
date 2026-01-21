import React from 'react';
import { Lock, MessageSquare } from 'lucide-react';

export function StickyCTA({ onTextAgent }) {
    return (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-50 pointer-events-none">
            <div className="max-w-md mx-auto pointer-events-auto">
                <button
                    onClick={onTextAgent}
                    className="w-full bg-[#1D1D1F] backdrop-blur-[20px] text-white text-[17px] font-medium py-4 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.12)] border border-white/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group hover:bg-black"
                >
                    <MessageSquare className="w-5 h-5 text-white/90" />
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
