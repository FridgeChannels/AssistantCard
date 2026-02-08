import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { runStarterWorkflow } from '../../lib/relatedQuestionsService';
import { logUserAction } from '../../lib/loggingService';
import { Glass } from '../layout/Glass';

export function StarterQuestions({
    onSelect,
    cId = '',
    conversationId = '',
    preloadedQuestions = [],
    isLoadingPreloaded = false,
    onQuestionsLoaded,
    onLoadingChange,
    onNoAnswer, // no_answer 时写入首条助手消息（仅 App 主流程 chat 传入）
    skipFetch = false, // tp/:id 等场景不调用推荐接口
    industryId, // 来自 /api/magnets/by-sn 的 industry_id，会传给 workflows/run 的 inputs
}) {
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const hasFetched = useRef(false); // 防止重复调用

    // 组件加载时获取问题
    useEffect(() => {
        // 不调用推荐问题接口时，直接结束
        if (skipFetch) {
            setQuestions([]);
            setIsLoading(false);
            if (onLoadingChange) onLoadingChange(false);
            hasFetched.current = true;
            return;
        }

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

            // 无预加载时调用 workflow run（blocking）
            setIsLoading(true);
            if (onLoadingChange) onLoadingChange(true);
            hasFetched.current = true;
            try {
                const { answerType, recQuestion = [], noAnswerTxt = '' } = await runStarterWorkflow(cId, industryId);
                if (answerType === 'recom' && recQuestion.length > 0) {
                    const qs = recQuestion.map(r => (r && r.question) || r).slice(0, 3);
                    setQuestions(qs);
                    if (onQuestionsLoaded) onQuestionsLoaded(qs);
                } else if (answerType === 'no_answer' && onNoAnswer) {
                    onNoAnswer(noAnswerTxt);
                    setQuestions([]);
                } else {
                    setQuestions([]);
                }
            } catch (error) {
                console.error('获取推荐问题失败:', error);
                setQuestions([]);
                hasFetched.current = false;
            } finally {
                setIsLoading(false);
                if (onLoadingChange) onLoadingChange(false);
            }
        };

        fetchQuestions();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cId, conversationId, skipFetch, industryId]);

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
        if (skipFetch || !cId) return;
        setIsLoading(true);
        runStarterWorkflow(cId, industryId)
            .then(({ answerType, recQuestion = [], noAnswerTxt = '' }) => {
                if (answerType === 'recom' && recQuestion.length > 0) {
                    const qs = recQuestion.map(r => (r && r.question) || r).slice(0, 3);
                    setQuestions(qs);
                    if (onQuestionsLoaded) onQuestionsLoaded(qs);
                } else if (answerType === 'no_answer' && onNoAnswer) {
                    onNoAnswer(noAnswerTxt);
                    setQuestions([]);
                } else {
                    setQuestions([]);
                }
            })
            .catch(error => {
                console.error('获取推荐问题失败:', error);
                setQuestions([]);
            })
            .finally(() => setIsLoading(false));
    };

    const currentQuestions = questions.length > 0 ? questions : [];

    return (
        <div className="w-full max-w-sm mx-auto px-6">
            <div className="relative flex items-center justify-center mb-4">
                <span className="text-xs font-bold text-black uppercase tracking-widest">Where to start?</span>
                <button
                    onClick={handleRefresh}
                    className="absolute right-0 p-2 text-gray-500 hover:text-black bg-white/20 backdrop-blur-[20px] hover:bg-white/40 rounded-[30px] transition-colors border border-gray-200/40"
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
                    <AnimatePresence mode="sync">
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
                                className="w-full"
                            >
                                <Glass variant="pill" className="w-full text-center px-6 py-2 text-sothebys-navy font-medium cursor-pointer hover:opacity-90 transition-opacity">
                                    {q}
                                </Glass>
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
