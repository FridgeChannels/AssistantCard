import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

export function JamesInviteCard({ onTextJames, onNotNow, hideNotNow = false, agentName = 'James' }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="pl-14 pr-2 pt-2"
        >
            {/* Action Buttons */}
            <div className={`flex gap-3 ${hideNotNow ? 'justify-start' : ''}`}>
                {!hideNotNow && (
                    <motion.button
                        onClick={onNotNow}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-5 py-3 bg-white/80 backdrop-blur-[20px] border border-white/40 text-sothebys-navy rounded-[30px] font-semibold text-sm shadow-sm hover:shadow-md hover:border-sothebys-navy/20 transition-all"
                    >
                        Not now
                    </motion.button>
                )}
                <motion.button
                    onClick={onTextJames}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`${hideNotNow ? 'flex-1' : ''} flex items-center justify-center gap-2 px-5 py-3 bg-green-400 text-white rounded-[30px] font-semibold text-sm shadow-[0_4px_12px_rgba(74,222,128,0.3)] hover:bg-green-500 transition-all`}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>Text {agentName}</span>
                </motion.button>
            </div>
        </motion.div>
    );
}
