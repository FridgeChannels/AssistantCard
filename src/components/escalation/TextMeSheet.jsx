import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Phone, MessageSquare } from 'lucide-react';

export function TextMeSheet({ isOpen, onClose, context }) {
    const [isSent, setIsSent] = useState(false);

    const handleSend = () => {
        setIsSent(true);
        setTimeout(() => {
            setIsSent(false);
            onClose();
        }, 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-[30px] border-t border-white/20 rounded-t-[32px] z-50 p-6 pb-10 max-w-md mx-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)] ring-1 ring-white/40"
                    >
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-sothebys-navy mb-1">Contact Agent</h3>
                                <p className="text-sm text-gray-500">Fastest way to get clarity on this.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {isSent ? (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center py-10 text-center"
                            >
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <Send className="w-8 h-8 text-green-600" />
                                </div>
                                <h4 className="text-lg font-semibold text-green-700">Message Sent!</h4>
                                <p className="text-gray-500">Your agent will reply shortly.</p>
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <span className="text-xs font-semibold text-gray-400 uppercase">Context</span>
                                    <p className="text-gray-700 text-sm mt-1 line-clamp-2">
                                        {context || "Asking about closing costs and timeline..."}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={handleSend}
                                        className="flex flex-col items-center justify-center p-4 bg-sothebys-navy text-white rounded-xl shadow-lg hover:bg-sothebys-navy/90 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        <MessageSquare className="w-6 h-6 mb-2" />
                                        <span className="font-medium">Text Me</span>
                                    </button>
                                    <a
                                        href="tel:1234567890"
                                        className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 text-sothebys-navy rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
                                    >
                                        <Phone className="w-6 h-6 mb-2" />
                                        <span className="font-medium">Call Now</span>
                                    </a>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
