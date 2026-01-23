import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { getRelatedQuestions } from '../../lib/relatedQuestionsService';
import { logUserAction } from '../../lib/loggingService';

export function StarterQuestions({
    onSelect,
    cId = '',
    conversationId = '',
    preloadedQuestions = [],
    isLoadingPreloaded = false,
    onQuestionsLoaded,
    onLoadingChange
}) {
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const hasFetched = useRef(false); // 防止重复调用

    // 组件加载时获取问题
    useEffect(() => {
        // 如果已经获取过，不再重复获取
        if (hasFetched.current) {
            return;
        }

        const fetchQuestions = async () => {
            if (!cId) {
                setIsLoading(false);
                if (onLoadingChange) onLoadingChange(false);
                return;
            }

            // 如果有预加载的问题，直接使用
            if (preloadedQuestions && preloadedQuestions.length > 0) {
                setQuestions(preloadedQuestions);
                setIsLoading(false);
                if (onLoadingChange) onLoadingChange(false);
                hasFetched.current = true;
                return;
            }

            // 如果没有预加载的问题，才发起请求
            setIsLoading(true);
            if (onLoadingChange) onLoadingChange(true);
            hasFetched.current = true; // 标记已调用
            try {
                const relatedQuestions = await getRelatedQuestions(cId, conversationId);
                if (relatedQuestions && relatedQuestions.length > 0) {
                    setQuestions(relatedQuestions);
                    if (onQuestionsLoaded) {
                        onQuestionsLoaded(relatedQuestions);
                    }
                } else {
                    setQuestions([]);
                }
            } catch (error) {
                console.error('获取推荐问题失败:', error);
                setQuestions([]);
                hasFetched.current = false; // 失败时重置，允许重试
            } finally {
                setIsLoading(false);
                if (onLoadingChange) onLoadingChange(false);
            }
        };

        fetchQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cId, conversationId]);

    // 当预加载的问题更新时，更新本地状态
    useEffect(() => {
        if (preloadedQuestions && preloadedQuestions.length > 0 && questions.length === 0 && !hasFetched.current) {
            setQuestions(preloadedQuestions);
            setIsLoading(false);
            hasFetched.current = true;
        }
    }, [preloadedQuestions, questions.length]);

    // 当 cId 或 conversationId 变化时，重置标志
    useEffect(() => {
        hasFetched.current = false;
    }, [cId, conversationId]);

    const handleRefresh = () => {
        // 刷新时重新获取问题
        if (!cId) {
            return;
        }

        setIsLoading(true);
        getRelatedQuestions(cId, conversationId)
            .then(relatedQuestions => {
                if (relatedQuestions && relatedQuestions.length > 0) {
                    setQuestions(relatedQuestions);
                } else {
                    setQuestions([]);
                }
            })
            .catch(error => {
                console.error('获取推荐问题失败:', error);
                setQuestions([]);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const currentQuestions = questions.length > 0 ? questions : [];

    return (
        <div className="w-full max-w-sm mx-auto px-6">
            <div className="relative flex items-center justify-center mb-4">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Where to start?</span>
                <button
                    onClick={handleRefresh}
                    className="absolute right-0 p-2 text-gray-400 hover:text-sothebys-navy bg-white/60 backdrop-blur-[20px] hover:bg-white/80 rounded-[30px] transition-colors border border-white/40"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-3">
                {isLoading ? (
                    <div className="flex items-center justify-center py-4">
                        <div className="w-5 h-5 border-2 border-gray-300 border-t-sothebys-navy rounded-full animate-spin"></div>
                    </div>
                ) : currentQuestions.length > 0 ? (
                    <AnimatePresence mode="wait">
                        {currentQuestions.map((q, i) => (
                            <motion.button
                                key={q + i}
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                                onClick={() => {
                                    // 记录点击推荐问题日志
                                    logUserAction({
                                        cId: cId,
                                        actionType: 'click_question',
                                        questionText: q,
                                        context: {
                                            source: 'starter_questions',
                                            questionIndex: i,
                                        },
                                    });
                                    onSelect(q);
                                }}
                                className="w-full text-center px-6 py-2 bg-blue-200 rounded-[30px] shadow-[0_8px_30px_rgba(0,122,255,0.1)] text-sothebys-navy font-medium cursor-pointer hover:bg-blue-300 transition-all"
                            >
                                {q}
                            </motion.button>
                        ))}
                    </AnimatePresence>
                ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">
                        No questions available
                    </div>
                )}
            </div>
        </div>
    );
}
