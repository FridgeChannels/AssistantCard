import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mail, MessageSquare } from 'lucide-react';
import { getDocumentSummary } from '../../lib/documentSummaryService';

export function TextMeSheet({ isOpen, onClose, context, guideContent = '', agentName = 'James', phone = '', email = '' }) {
    const [isSent, setIsSent] = useState(false);
    const [documentSummary, setDocumentSummary] = useState({ email: '', message: '' });
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);

    // 当对话框打开时，调用接口B获取文档总结
    useEffect(() => {
        if (isOpen && guideContent) {
            setIsLoadingSummary(true);
            getDocumentSummary(guideContent)
                .then(summary => {
                    setDocumentSummary(summary);
                    setIsLoadingSummary(false);
                })
                .catch(error => {
                    console.error('获取文档总结失败:', error);
                    setIsLoadingSummary(false);
                    // 失败时使用默认内容
                    setDocumentSummary({ email: '', message: '' });
                });
        } else if (isOpen) {
            // 如果没有guide内容，清空文档总结
            setDocumentSummary({ email: '', message: '' });
        }
    }, [isOpen, guideContent]);

    const handleSendSMS = () => {
        if (phone) {
            // 使用sms:协议发送短信，包含body参数
            // 优先使用接口B返回的message，如果没有则使用context
            const messageBody = documentSummary.message || context || '';
            const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
            const body = encodeURIComponent(messageBody);
            window.location.href = `sms:${formattedPhone}?body=${body}`;
        }
        setIsSent(true);
        setTimeout(() => {
            setIsSent(false);
            onClose();
        }, 2000);
    };

    const handleSendEmail = () => {
        if (email) {
            // 使用mailto:协议发送邮件，包含subject和body参数
            // 优先使用接口B返回的email内容，如果没有则使用context
            const emailBody = documentSummary.email || context || 'Hi there';
            const subject = encodeURIComponent('Contact');
            const body = encodeURIComponent(emailBody);
            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
            // 邮件客户端打开后关闭对话框
            onClose();
        }
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
                                <h3 className="text-xl font-bold text-sothebys-navy mb-1">Contact {agentName}</h3>
                                <p className="text-sm text-gray-500">Fastest way to get clarity on this.</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white/60 backdrop-blur-[20px] border border-white/40 rounded-[30px] hover:bg-white/80 transition-colors"
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
                                        onClick={handleSendSMS}
                                        disabled={!phone}
                                        className="flex flex-col items-center justify-center p-4 bg-sothebys-navy/90 backdrop-blur-[20px] text-white rounded-[30px] shadow-lg hover:bg-sothebys-navy hover:scale-[1.02] active:scale-95 transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <MessageSquare className="w-6 h-6 mb-2" />
                                        <span className="font-medium">Text {agentName}</span>
                                    </button>
                                    <button
                                        onClick={handleSendEmail}
                                        disabled={!email}
                                        className="flex flex-col items-center justify-center p-4 bg-white/80 backdrop-blur-[20px] border border-white/40 text-sothebys-navy rounded-[30px] hover:bg-white/90 hover:border-white/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Mail className="w-6 h-6 mb-2" />
                                        <span className="font-medium">Send Email</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
