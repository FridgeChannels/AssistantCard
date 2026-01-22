import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, User } from 'lucide-react';
import { cn } from '../../lib/utils';

export function AnswerCard({ answer, question, isFallback, onAction, onQuestionSelect, showRelated }) {
    if (!answer) return null;

    return (
        <div className="px-5 py-2 pb-4 space-y-4">

            {/* User Bubble */}
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex justify-end items-end gap-2"
            >
                <div className="bg-gradient-to-br from-[#007AFF] to-[#005ECB] text-white px-5 py-3 rounded-2xl rounded-br-sm shadow-[0_2px_8px_rgba(0,122,255,0.25)] max-w-[85%] text-[17px] leading-snug tracking-tight font-medium">
                    {question}
                </div>
            </motion.div>

            {/* Assistant Bubble */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-start gap-3"
            >
                {/* Assistant Avatar - Smaller & Subtler */}
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white shadow-sm ring-1 ring-gray-100 flex items-center justify-center flex-none mt-1">
                    <img 
                        src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" 
                        alt="Agent" 
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Answer Content */}
                <div className="flex-1 space-y-3 max-w-[90%]">
                    <div className="bg-white/60 backdrop-blur-[20px] rounded-[24px] rounded-tl-sm shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/20 p-6 ring-1 ring-white/40">
                        {/* Fallback specific header */}
                        {isFallback && (
                            <div className="flex items-center gap-2 mb-3 bg-amber-50/50 p-2 rounded-lg -mx-1 -mt-1 border border-amber-100/50">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Needs Agent Confirmation
                                </h3>
                            </div>
                        )}

                        {/* Main Text */}
                        <p className="text-[#1D1D1F] text-[17px] leading-relaxed tracking-normal font-normal">
                            {answer.text}
                        </p>
                    </div>

                    {/* Action Button - Only show for fallback cases */}
                    {isFallback && (
                        <motion.button
                            onClick={onAction}
                            className="flex items-center justify-center gap-2 px-5 py-3 bg-green-400 text-white rounded-[30px] font-semibold text-sm shadow-[0_4px_12px_rgba(74,222,128,0.3)] hover:bg-green-500 transition-all"
                        >
                            {answer.actionLabel || "Text Agent"}
                            <MessageSquare className="w-4 h-4" />
                        </motion.button>
                    )}

                </div>
            </motion.div>

            {/* Related Questions (Loop) - Only show if enabled (e.g. latest message) */}
            {showRelated && answer.relatedQuestions && answer.relatedQuestions.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="pl-14 pr-2 pt-2"
                >
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block pl-1">You may worried about too...</span>
                    <div className="flex flex-col gap-2">
                        {answer.relatedQuestions.map((q, i) => (
                            <button
                                key={i}
                                onClick={() => onQuestionSelect(q)}
                                className="text-left px-4 py-1.5 bg-blue-200 rounded-[30px] shadow-[0_8px_30px_rgba(0,122,255,0.1)] text-sothebys-navy text-sm font-medium hover:bg-blue-300 transition-all active:scale-[0.99]"
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

        </div>
    );
}
