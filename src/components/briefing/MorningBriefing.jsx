import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Play, Pause, AlertCircle } from 'lucide-react';
import { getTodayPlayContent } from '../../lib/playContentService';
import { getRelatedQuestions } from '../../lib/relatedQuestionsService';

export function MorningBriefing({ onTalkToAssistant, cId = '', onQuestionsPreloaded }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playContent, setPlayContent] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [audioElement, setAudioElement] = useState(null);
    const hasPreloadedQuestions = useRef(false); // 防止重复调用接口A

    const currentDate = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayName = dayNames[currentDate.getDay()];
    const monthName = monthNames[currentDate.getMonth()];
    const day = currentDate.getDate();
    const dateString = `${dayName}, ${monthName} ${day}`;

    // Load play content
    useEffect(() => {
        async function loadPlayContent() {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch today's play content (pass null to get global content)
                const content = await getTodayPlayContent(null);

                if (!content) {
                    setError('No content available at the moment');
                    return;
                }

                setPlayContent(content);

                // Create audio element if audio URL exists
                if (content.audio_url) {
                    const audio = new Audio(content.audio_url);
                    audio.addEventListener('ended', () => {
                        setIsPlaying(false);
                    });
                    audio.addEventListener('error', (e) => {
                        console.error('Audio loading issue:', e);
                        setError('Audio is not ready yet');
                    });
                    // 当音频可以播放时（加载完成），调用接口A获取推荐问题
                    const handleCanPlay = () => {
                        // 防止重复调用：如果已经调用过，就不再调用
                        if (hasPreloadedQuestions.current) {
                            return;
                        }
                        
                        // 音频加载完成后调用接口A获取推荐问题（预加载）
                        if (cId) {
                            hasPreloadedQuestions.current = true; // 标记已调用
                            getRelatedQuestions(cId, '').then(questions => {
                                if (questions && questions.length > 0 && onQuestionsPreloaded) {
                                    onQuestionsPreloaded(questions);
                                }
                            }).catch(error => {
                                console.error('获取推荐问题失败:', error);
                                hasPreloadedQuestions.current = false; // 失败时重置，允许重试
                            });
                        }
                    };
                    audio.addEventListener('canplay', handleCanPlay, { once: true }); // 使用 once 选项，只触发一次
                    setAudioElement(audio);
                    
                    // 如果音频已经可以播放（可能已经缓存），立即调用接口A
                    if (audio.readyState >= 3 && !hasPreloadedQuestions.current) { // HAVE_FUTURE_DATA or higher
                        handleCanPlay();
                    }
                }

            } catch (err) {
                console.error('Content loading issue:', err);
                setError('Please try again in a moment');
            } finally {
                setIsLoading(false);
            }
        }

        loadPlayContent();

        // Cleanup audio element
        return () => {
            if (audioElement) {
                audioElement.pause();
                audioElement.src = '';
            }
            // 重置预加载标志
            hasPreloadedQuestions.current = false;
        };
    }, [cId]); // 添加 cId 作为依赖，当 cId 变化时重新加载

    const handlePlay = () => {
        if (!audioElement) {
            console.warn('No audio available');
            return;
        }

        if (isPlaying) {
            audioElement.pause();
            setIsPlaying(false);
        } else {
            audioElement.play().catch(err => {
                console.error('Playback issue:', err);
                setError('Unable to play at this time');
            });
            setIsPlaying(true);
        }
    };

    // Display title: use title field
    const displayTitle = playContent?.title || 'Daily Briefing';

    return (
        <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
            {/* Header */}
            <header className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-sothebys-navy text-white flex items-center justify-center font-serif text-xs rounded-lg shadow-sm">S</div>
                    <span className="font-semibold text-sothebys-navy tracking-tight">FCAssistant</span>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
                {/* Loading State */}
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8 mb-6 min-h-[354px] flex flex-col items-center justify-center"
                    >
                        <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">Loading...</p>
                    </motion.div>
                )}

                {/* Error State */}
                {error && !isLoading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8 mb-6 min-h-[354px] flex flex-col items-center justify-center"
                    >
                        <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-gray-800 font-medium mb-2">Content Coming Soon</p>
                        <p className="text-gray-600 text-sm text-center">{error}</p>
                    </motion.div>
                )}

                {/* Content Card */}
                {playContent && !isLoading && !error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8 mb-6 min-h-[354px] flex flex-col justify-between"
                    >
                        <div className="flex flex-col items-center">
                            {/* Date */}
                            <p className="text-base text-gray-600 text-center mb-4">{dateString}</p>

                            {/* Title - using content from database */}
                            <h2 className="text-2xl font-bold text-gray-800 text-center mb-8 leading-tight px-4">
                                {displayTitle}
                            </h2>

                            
                        </div>

                        {/* Audio Player */}
                        <div className="flex items-center justify-center gap-4 mt-auto">
                            {/* Left Waveform */}
                            <div className="flex items-end gap-1 h-12">
                                {[2, 4, 6, 8, 6, 4].map((baseHeight, i) => {
                                    const minHeight = Math.max(2, baseHeight - 2);
                                    const maxHeight = Math.min(8, baseHeight + 2);
                                    return (
                                        <motion.div
                                            key={i}
                                            className="w-1 bg-gray-300 rounded-full"
                                            animate={isPlaying ? {
                                                height: [
                                                    `${baseHeight * 4}px`,
                                                    `${maxHeight * 4}px`,
                                                    `${minHeight * 4}px`,
                                                    `${baseHeight * 4}px`
                                                ],
                                            } : {
                                                height: `${baseHeight * 4}px`
                                            }}
                                            transition={{
                                                duration: 0.6 + (i % 3) * 0.2,
                                                repeat: isPlaying ? Infinity : 0,
                                                ease: "easeInOut",
                                                delay: i * 0.05
                                            }}
                                            style={{ height: `${baseHeight * 4}px` }}
                                        />
                                    );
                                })}
                            </div>

                            {/* Play/Pause Button */}
                            <button
                                onClick={handlePlay}
                                disabled={!audioElement}
                                className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-gray-700 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPlaying ? (
                                    <Pause className="w-7 h-7 text-white" fill="white" />
                                ) : (
                                    <Play className="w-7 h-7 text-white ml-0.5" fill="white" />
                                )}
                            </button>

                            {/* Right Waveform */}
                            <div className="flex items-end gap-1 h-12">
                                {[3, 5, 7, 5, 3, 2].map((baseHeight, i) => {
                                    const minHeight = Math.max(2, baseHeight - 2);
                                    const maxHeight = Math.min(8, baseHeight + 2);
                                    return (
                                        <motion.div
                                            key={i}
                                            className="w-1 bg-gray-300 rounded-full"
                                            animate={isPlaying ? {
                                                height: [
                                                    `${baseHeight * 4}px`,
                                                    `${maxHeight * 4}px`,
                                                    `${minHeight * 4}px`,
                                                    `${baseHeight * 4}px`
                                                ],
                                            } : {
                                                height: `${baseHeight * 4}px`
                                            }}
                                            transition={{
                                                duration: 0.6 + (i % 3) * 0.2,
                                                repeat: isPlaying ? Infinity : 0,
                                                ease: "easeInOut",
                                                delay: (i + 6) * 0.05
                                            }}
                                            style={{ height: `${baseHeight * 4}px` }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Talk to Assistant Button */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    onClick={onTalkToAssistant}
                    className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] px-6 py-4 flex items-center justify-center gap-3 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition-all"
                >
                    <Mic className="w-5 h-5 text-gray-700" />
                    <span className="text-base font-medium text-gray-800">Talk to Assistant</span>
                </motion.button>
            </div>
        </div>
    );
}
