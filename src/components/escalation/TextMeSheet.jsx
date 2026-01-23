import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, MessageSquare, Loader2 } from 'lucide-react';
import { getDocumentSummary } from '../../lib/documentSummaryService';

export function TextMeSheet({ isOpen, onClose, context, guideContent = '', agentName = 'James', phone = '', email = '', cId = '' }) {
    const [documentSummary, setDocumentSummary] = useState({ email: '', message: '' });
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // 'sms' 或 'email' 或 null

    // 替换占位符 [agentName] 为实际的 agentName
    const replacePlaceholder = useCallback((text) => {
        if (!text) return text;
        return text.replace(/\[agentName\]/g, agentName);
    }, [agentName]);

    // 当对话框打开时，调用接口B获取文档总结
    useEffect(() => {
        if (isOpen && guideContent) {
            setIsLoadingSummary(true);
            setPendingAction(null); // 重置待处理操作
            getDocumentSummary(guideContent, agentName, cId)
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
            setPendingAction(null); // 重置待处理操作
        } else {
            // 对话框关闭时重置状态
            setPendingAction(null);
        }
    }, [isOpen, guideContent]);

    // 当接口加载完成且有待处理的操作时，自动执行
    useEffect(() => {
        if (!isLoadingSummary && pendingAction) {
            if (pendingAction === 'sms' && phone) {
                const messageBody = replacePlaceholder(documentSummary.message) || context || '';
                const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
                const body = encodeURIComponent(messageBody);
                window.location.href = `sms:${formattedPhone}?body=${body}`;
                onClose();
                setPendingAction(null);
            } else if (pendingAction === 'email' && email) {
                const emailBody = replacePlaceholder(documentSummary.email) || context || 'Hi there';
                const subject = encodeURIComponent('Contact');
                const body = encodeURIComponent(emailBody);
                window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
                onClose();
                setPendingAction(null);
            }
        }
    }, [isLoadingSummary, pendingAction, documentSummary, context, phone, email, onClose, replacePlaceholder]);

    const handleSendSMS = () => {
        if (!phone) return;

        // 如果接口还在加载中，记录待处理的操作
        if (isLoadingSummary) {
            setPendingAction('sms');
            return;
        }

        // 接口已加载完成，直接发送
        const messageBody = replacePlaceholder(documentSummary.message) || context || '';
        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
        const body = encodeURIComponent(messageBody);
        window.location.href = `sms:${formattedPhone}?body=${body}`;
        onClose();
    };

    const handleSendEmail = () => {
        if (!email) return;

        // 如果接口还在加载中，记录待处理的操作
        if (isLoadingSummary) {
            setPendingAction('email');
            return;
        }

        // 接口已加载完成，直接发送
        const emailBody = replacePlaceholder(documentSummary.email) || context || 'Hi there';
        const subject = encodeURIComponent('Contact');
        const body = encodeURIComponent(emailBody);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        onClose();
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
                                    disabled={!phone || (isLoadingSummary && pendingAction === 'sms')}
                                    className="flex flex-col items-center justify-center p-4 bg-sothebys-navy/90 backdrop-blur-[20px] text-white rounded-[30px] shadow-lg hover:bg-sothebys-navy hover:scale-[1.02] active:scale-95 transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoadingSummary && pendingAction === 'sms' ? (
                                        <Loader2 className="w-6 h-6 mb-2 animate-spin" />
                                    ) : (
                                        <MessageSquare className="w-6 h-6 mb-2" />
                                    )}
                                    <span className="font-medium">Text {agentName}</span>
                                </button>
                                <button
                                    onClick={handleSendEmail}
                                    disabled={!email || (isLoadingSummary && pendingAction === 'email')}
                                    className="flex flex-col items-center justify-center p-4 bg-white/80 backdrop-blur-[20px] border border-white/40 text-sothebys-navy rounded-[30px] hover:bg-white/90 hover:border-white/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoadingSummary && pendingAction === 'email' ? (
                                        <Loader2 className="w-6 h-6 mb-2 animate-spin text-sothebys-navy" />
                                    ) : (
                                        <Mail className="w-6 h-6 mb-2" />
                                    )}
                                    <span className="font-medium">Send Email</span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
