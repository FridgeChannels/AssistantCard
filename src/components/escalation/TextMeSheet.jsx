import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Phone, Loader2 } from 'lucide-react';
import { getDocumentSummary } from '../../lib/documentSummaryService';
import { logUserAction } from '../../lib/loggingService';
import { Glass } from '../layout/Glass';

export function TextMeSheet({ isOpen, onClose, context, guideContent = '', agentName = 'James', phone = '', email = '', cId = '' }) {
    const [documentSummary, setDocumentSummary] = useState({ email: '', message: '' });
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [pendingAction, setPendingAction] = useState(null); // 'sms' 或 null
    const openTimeRef = useRef(null); // 记录打开时间

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
            openTimeRef.current = Date.now(); // 记录打开时间

            // 记录打开联系面板
            logUserAction({
                cId: cId,
                actionType: 'open_contact',
                context: {
                    context: context,
                    guideContent: guideContent.substring(0, 100),
                },
            });

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
            openTimeRef.current = Date.now(); // 记录打开时间

            // 记录打开联系面板
            logUserAction({
                cId: cId,
                actionType: 'open_contact',
                context: { context: context },
            });
        } else if (openTimeRef.current) {
            // 对话框关闭时记录停留时长
            const duration = Math.floor((Date.now() - openTimeRef.current) / 1000);
            logUserAction({
                cId: cId,
                actionType: 'close_contact',
                context: { durationSeconds: duration },
            });
            setPendingAction(null);
            openTimeRef.current = null;
        }
    }, [isOpen, guideContent, cId, context]);

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
            }
        }
    }, [isLoadingSummary, pendingAction, documentSummary, context, phone, onClose, replacePlaceholder]);

    const handleSendSMS = () => {
        if (!phone) return;

        // 记录点击SMS按钮
        logUserAction({
            cId: cId,
            actionType: 'click_sms',
            context: {
                phone: phone,
                messagePreview: (replacePlaceholder(documentSummary.message) || context || '').substring(0, 100),
            },
        });

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

    const handleCallNow = () => {
        if (!phone) return;

        // 记录点击Call按钮
        logUserAction({
            cId: cId,
            actionType: 'click_call',
            context: {
                phone: phone,
                source: 'contact_sheet'
            },
        });

        const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
        window.location.href = `tel:${formattedPhone}`;
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
                        className="fixed inset-0 bg-black/5 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(320px,calc(100vw-2rem))] h-fit z-50"
                    >
                        <Glass variant="panel" className="p-6">
                            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />

                            <div className="flex flex-col gap-4">
                                <button
                                    onClick={handleSendSMS}
                                    disabled={!phone || (isLoadingSummary && pendingAction === 'sms')}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-sothebys-navy/90 backdrop-blur-[20px] text-white rounded-[30px] shadow-lg hover:bg-sothebys-navy hover:scale-[1.02] active:scale-95 transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoadingSummary && pendingAction === 'sms' ? (
                                        <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
                                    ) : (
                                        <MessageSquare className="w-5 h-5 shrink-0" />
                                    )}
                                    <span className="font-medium">Text {agentName}</span>
                                </button>
                                <button
                                    onClick={handleCallNow}
                                    disabled={!phone}
                                    className="flex items-center justify-center gap-2 px-4 py-3 bg-white/40 backdrop-blur-[20px] border border-white/40 text-sothebys-navy rounded-[30px] hover:bg-white/60 hover:border-white/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Phone className="w-5 h-5 shrink-0" />
                                    <span className="font-medium">Call Now</span>
                                </button>
                            </div>
                        </Glass>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
