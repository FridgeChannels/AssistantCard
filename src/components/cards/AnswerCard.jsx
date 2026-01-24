import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquare, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';
import { Glass } from '../layout/Glass';

export function AnswerCard({ answer, question, onQuestionSelect, showRelated, onTextJames, onNotNow, agentName = 'James', answerStartRef }) {
    if (!answer) return null;

    return (
        <div className="px-5 py-2 pb-4 space-y-4">

            {/* User Bubble */}
            <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex justify-end items-end gap-2"
            >
                <div className="bg-[#007AFF]/80 backdrop-blur-[12px] border border-white/20 text-white px-5 py-3 rounded-[24px] rounded-br-sm shadow-[0_8px_20px_rgba(0,122,255,0.3)] max-w-[85%] text-[17px] leading-snug tracking-tight font-medium relative overflow-hidden">
                    {/* Inner highlight for glass feel */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />
                    <div className="relative z-10">{question}</div>
                </div>
            </motion.div>

            {/* Assistant Bubble - 答案开始位置标记 */}
            <motion.div
                ref={answerStartRef}
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
                    <Glass variant="card" cornerRadius={24} className="rounded-tl-sm p-6">
                        {/* Main Text - Support Markdown */}
                        <div className="text-[#1D1D1F] text-[17px] leading-relaxed tracking-normal font-normal">
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                                    ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1.5 ml-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1.5 ml-1">{children}</ol>,
                                    li: ({ children }) => <li className="ml-1">{children}</li>,
                                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                    em: ({ children }) => <em className="italic">{children}</em>,
                                    code: ({ children }) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-[15px] font-mono text-gray-800">{children}</code>,
                                    h1: ({ children }) => <h1 className="text-xl font-bold mb-2 mt-4 first:mt-0 text-gray-900">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-4 first:mt-0 text-gray-900">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-base font-bold mb-1 mt-3 first:mt-0 text-gray-900">{children}</h3>,
                                    hr: () => <hr className="my-4 border-gray-200" />,
                                    blockquote: ({ children }) => <blockquote className="border-l-4 border-gray-300 pl-4 my-3 italic text-gray-600">{children}</blockquote>,
                                }}
                            >
                                {answer.text || ''}
                            </ReactMarkdown>
                        </div>
                    </Glass>

                    {/* Contact James Button - Show if answerMethod indicates guide/direct and answer is complete */}
                    {answer.type !== 'loading' && answer.answerMethod && (answer.answerMethod === 'guide') && (
                        <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{
                                type: "spring",
                                stiffness: 400,
                                damping: 30,
                                delay: 0.15
                            }}
                            className="mt-3 pl-1"
                        >
                            <div className={`flex gap-3 ${answer.answerMethod === 'direct' ? 'justify-start' : ''}`}>
                                {/* {onNotNow && (
                                    <motion.button
                                        onClick={onNotNow}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ 
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 30,
                                            delay: 0.2
                                        }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className="px-5 py-3 bg-white/80 backdrop-blur-[20px] border border-white/40 text-sothebys-navy rounded-[30px] font-semibold text-sm shadow-sm hover:shadow-md hover:border-sothebys-navy/20 transition-all"
                                    >
                                        Not now
                                    </motion.button>
                                )} */}
                                {onTextJames && (
                                    <motion.button
                                        onClick={onTextJames}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 400,
                                            damping: 30,
                                            delay: 0.25
                                        }}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`${answer.answerMethod === 'direct' ? 'flex-1' : ''} flex items-center justify-center gap-2 px-5 py-3 bg-green-400 text-white rounded-[30px] font-semibold text-sm shadow-[0_4px_12px_rgba(74,222,128,0.3)] hover:bg-green-500 transition-all`}
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        <span>Contact {agentName}</span>
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>
                    )}

                </div>
            </motion.div>

            {/* Related Questions (Loop) - Only show if enabled (e.g. latest message) and answer is complete */}
            {(() => {
                // 推荐问题不依赖于 answerMethod，只依赖于 showRelated、relatedQuestions 和答案是否完成
                const shouldShow = answer.type !== 'loading' && showRelated && answer.relatedQuestions && answer.relatedQuestions.length > 0;
                if (showRelated) {
                    console.log('AnswerCard - showRelated check:', {
                        answerType: answer.type,
                        answerMethod: answer.answerMethod,
                        showRelated,
                        hasRelatedQuestions: !!answer.relatedQuestions,
                        relatedQuestionsLength: answer.relatedQuestions?.length || 0,
                        shouldShow
                    });
                }
                return shouldShow;
            })() && (
                    <motion.div
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{
                            type: "spring",
                            stiffness: 350,
                            damping: 28,
                            delay: 0.3
                        }}
                        className="pl-14 pr-2 pt-2"
                    >
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.35 }}
                            className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block pl-1"
                        >
                            You may worried about too...
                        </motion.span>
                        <div className="flex flex-col gap-2">
                            {answer.relatedQuestions.map((q, i) => (
                                <motion.button
                                    key={i}
                                    initial={{ opacity: 0, x: -12, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 400,
                                        damping: 30,
                                        delay: 0.4 + i * 0.05
                                    }}
                                    onClick={() => onQuestionSelect(q)}
                                    whileHover={{ scale: 1.02, x: 2 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="text-left px-4 py-1.5 bg-blue-200 rounded-[30px] shadow-[0_8px_30px_rgba(0,122,255,0.1)] text-sothebys-navy text-sm font-medium hover:bg-blue-300 transition-all"
                                >
                                    {q}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}

        </div>
    );
}
