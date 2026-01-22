import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, X } from 'lucide-react';

// 预设的推荐话题列表
const SUGGESTED_TOPICS = [
    "financing options",
    "inspection process",
    "closing timeline"
];

export function JamesInviteCard({ onTextJames, onNotNow }) {
    // 格式化话题列表显示
    const topicsText = SUGGESTED_TOPICS.slice(0, 2).join('、');

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="px-5 py-2 pb-4"
        >
            {/* Assistant Message Style */}
            <div className="flex items-start gap-3">
                {/* Assistant Avatar */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm ring-1 ring-gray-100 flex items-center justify-center flex-none mt-1">
                    <img 
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" 
                        alt="Agent" 
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Invite Card Content */}
                <div className="flex-1 space-y-3 max-w-[90%]">
                    <div className="bg-white/60 backdrop-blur-[20px] rounded-[24px] rounded-tl-sm shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/20 p-6 ring-1 ring-white/40">
                        <p className="text-[#1D1D1F] text-[17px] leading-relaxed tracking-normal font-normal">
                            Based on the questions you've asked, you might also be wondering about <span className="font-semibold">{topicsText}</span>. Would you like to schedule a deeper conversation with James to explore these topics?
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pl-1">
                        <motion.button
                            onClick={onNotNow}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-5 py-3 bg-white/80 backdrop-blur-[20px] border border-white/40 text-sothebys-navy rounded-[30px] font-semibold text-sm shadow-sm hover:shadow-md hover:border-sothebys-navy/20 transition-all"
                        >
                            Not now
                        </motion.button>
                        <motion.button
                            onClick={onTextJames}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-green-400 text-white rounded-[30px] font-semibold text-sm shadow-[0_4px_12px_rgba(74,222,128,0.3)] hover:bg-green-500 transition-all"
                        >
                            <MessageSquare className="w-4 h-4" />
                            <span>Text James</span>
                        </motion.button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
