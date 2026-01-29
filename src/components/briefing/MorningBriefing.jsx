import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Mic, Play, Pause, AlertCircle, MessageCircle } from 'lucide-react';
import { getTodayPlayContent } from '../../lib/playContentService';
import { getRelatedQuestions } from '../../lib/relatedQuestionsService';
import { createPlayContentLog, updatePlayContentLog } from '../../lib/loggingService';
import { Glass } from '../layout/Glass';
import { LocationSelector } from './LocationSelector';

export function MorningBriefing({
    onTalkToAssistant,
    cId = '',
    hasPreloaded = false,
    onQuestionsPreloaded,
    cachedPlayContent = null,
    isLoadingPlayContent = false,
    onPlayContentLoaded,
    onPlayContentLoadingChange,
    onSavePlaybackState,
    selectedLocation,
    onLocationSelect
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playContent, setPlayContent] = useState(cachedPlayContent); // 使用缓存的播放内容
    const [isLoading, setIsLoading] = useState(!cachedPlayContent); // 如果有缓存，不需要加载状态
    const [error, setError] = useState(null);
    const [audioElement, setAudioElement] = useState(null);
    const hasPreloadedQuestions = useRef(false); // 防止重复调用接口A
    const hasLoadedPlayContent = useRef(false); // 防止重复加载播放内容
    const currentPlayLogId = useRef(null); // 当前播放日志ID
    const playStartTime = useRef(null); // 播放开始时间
    const audioRef = useRef(null); // 用于cleanup中访问audioElement

    const currentDate = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayName = dayNames[currentDate.getDay()];
    const monthName = monthNames[currentDate.getMonth()];
    const day = currentDate.getDate();
    const dateString = `${dayName}, ${monthName} ${day}`;

    // 懒加载推荐问题：页面加载时立即触发（如果还没有加载过）
    useEffect(() => {
        // 如果已经加载过，不再重复加载
        if (hasPreloadedQuestions.current || hasPreloaded || !cId) {
            return;
        }

        // 立即调用接口A获取推荐问题（懒加载）
        hasPreloadedQuestions.current = true; // 标记已调用
        getRelatedQuestions(cId, '').then(questions => {
            if (questions && questions.length > 0 && onQuestionsPreloaded) {
                onQuestionsPreloaded(questions);
            }
        }).catch(error => {
            console.error('获取推荐问题失败:', error);
            hasPreloadedQuestions.current = false; // 失败时重置，允许重试
        });
    }, [cId, hasPreloaded, onQuestionsPreloaded]);

    // 如果有缓存的播放内容，直接使用（优先使用缓存）
    useEffect(() => {
        if (cachedPlayContent) {
            setPlayContent(cachedPlayContent);
            setIsLoading(false);
            hasLoadedPlayContent.current = true; // 标记已加载，避免重复请求

            // 创建音频元素（如果还没有）
            if (cachedPlayContent.audio_url) {
                // 使用函数式更新来避免依赖 audioElement
                setAudioElement(prev => {
                    if (prev) {
                        return prev; // 如果已经存在，不重复创建
                    }
                    const audio = new Audio(cachedPlayContent.audio_url);

                    // 恢复播放进度
                    if (cachedPlayContent.savedCurrentTime) {
                        audio.currentTime = cachedPlayContent.savedCurrentTime;
                    }

                    audio.addEventListener('ended', async () => {
                        setIsPlaying(false);

                        // 音频播放结束，更新播放日志
                        if (currentPlayLogId.current && playStartTime.current) {
                            const duration = Math.floor((Date.now() - playStartTime.current) / 1000);
                            const totalDuration = audio.duration ? Math.floor(audio.duration) : null;

                            await updatePlayContentLog(currentPlayLogId.current, {
                                duration: duration,
                                totalDuration: totalDuration,
                            });

                            // 重置
                            currentPlayLogId.current = null;
                            playStartTime.current = null;
                        }
                    });
                    audio.addEventListener('error', (e) => {
                        console.error('Audio loading issue:', e);
                        setError('Audio is not ready yet');
                    });

                    audioRef.current = audio; // 更新ref
                    return audio;
                });
            }
        }
    }, [cachedPlayContent]); // 只依赖 cachedPlayContent

    // 组件卸载时的清理
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                const audio = audioRef.current;

                // 如果正在播放，记录日志
                if (!audio.paused && currentPlayLogId.current && playStartTime.current) {
                    const duration = Math.floor((Date.now() - playStartTime.current) / 1000);
                    const totalDuration = audio.duration ? Math.floor(audio.duration) : null;

                    // 异步更新日志
                    updatePlayContentLog(currentPlayLogId.current, {
                        duration: duration,
                        totalDuration: totalDuration,
                    }).catch(console.error);
                }

                // 暂停播放
                audio.pause();

                // 保存进度到父组件
                if (onSavePlaybackState) {
                    onSavePlaybackState(audio.currentTime);
                }
            }
        };
    }, [onSavePlaybackState]);

    // Load play content - 只在首次加载时请求，或重新加载页面时请求
    useEffect(() => {
        // 如果有缓存，或者正在加载，或者已经加载过，不再重复请求
        if (cachedPlayContent || isLoadingPlayContent || hasLoadedPlayContent.current) {
            return;
        }

        async function loadPlayContent() {
            // 防止并发请求：再次检查状态
            if (hasLoadedPlayContent.current || isLoadingPlayContent || cachedPlayContent) {
                return;
            }

            hasLoadedPlayContent.current = true;

            try {
                setIsLoading(true);
                setError(null);
                if (onPlayContentLoadingChange) {
                    onPlayContentLoadingChange(true);
                }

                // Fetch today's play content (pass null to get global content)
                const content = await getTodayPlayContent(null);

                if (!content) {
                    setError('No content available at the moment');
                    if (onPlayContentLoadingChange) {
                        onPlayContentLoadingChange(false);
                    }
                    hasLoadedPlayContent.current = false; // 失败时允许重试
                    return;
                }

                setPlayContent(content);

                // 通知父组件缓存内容
                if (onPlayContentLoaded) {
                    onPlayContentLoaded(content);
                }

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
                    setAudioElement(audio);
                    audioRef.current = audio; // 更新ref
                }

            } catch (err) {
                console.error('Content loading issue:', err);
                setError('Please try again in a moment');
                hasLoadedPlayContent.current = false; // 失败时允许重试
            } finally {
                setIsLoading(false);
                if (onPlayContentLoadingChange) {
                    onPlayContentLoadingChange(false);
                }
            }
        }

        loadPlayContent();

        // Cleanup audio element
        return () => {
            // Cleanup logic moved to dedicated effect
        };
    }, []); // 只在组件首次挂载时执行，不依赖任何变量

    const handlePlay = async () => {
        if (!audioElement) {
            console.warn('No audio available');
            return;
        }

        if (isPlaying) {
            // 暂停播放
            audioElement.pause();
            setIsPlaying(false);

            // 更新播放日志
            if (currentPlayLogId.current && playStartTime.current) {
                const duration = Math.floor((Date.now() - playStartTime.current) / 1000);
                const totalDuration = audioElement.duration ? Math.floor(audioElement.duration) : null;

                await updatePlayContentLog(currentPlayLogId.current, {
                    duration: duration,
                    totalDuration: totalDuration,
                });
            }
        } else {
            // 开始播放
            audioElement.play().catch(err => {
                console.error('Playback issue:', err);
                setError('Unable to play at this time');
            });
            setIsPlaying(true);

            // 创建播放日志
            playStartTime.current = Date.now();
            const logId = await createPlayContentLog({
                cId: cId,
                playContentId: playContent?.id,
            });
            currentPlayLogId.current = logId;
        }
    };

    // Display title: use title field
    const displayTitle = playContent?.title || 'Daily Briefing';

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <header className="px-5 py-4 flex items-center justify-between relative z-10 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-sothebys-navy text-white flex items-center justify-center font-serif text-xs rounded-lg shadow-sm">L</div>
                    <span className="font-semibold text-sothebys-navy tracking-tight">Concierge Leo</span>
                </div>
            </header>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="flex flex-col items-center justify-center px-6 pb-24 min-h-full">
                    {/* Loading State */}
                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="w-full max-w-md mb-6 min-h-[354px]"
                        >
                            <Glass variant="panel" className="p-8 flex flex-col items-center justify-center">
                                <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-800 rounded-full animate-spin mb-4"></div>
                                <p className="text-gray-600">Loading...</p>
                            </Glass>
                        </motion.div>
                    )}

                    {/* Error State */}
                    {error && !isLoading && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-md mb-6 min-h-[354px]"
                        >
                            <Glass variant="panel" className="p-8 flex flex-col items-center justify-center">
                                <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
                                <p className="text-gray-800 font-medium mb-2">Content Coming Soon</p>
                                <p className="text-gray-600 text-sm text-center">{error}</p>
                            </Glass>
                        </motion.div>
                    )}

                    {/* Content Card */}
                    {playContent && !isLoading && !error && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="w-full max-w-md mb-3 min-h-[354px]"
                        >
                            <Glass variant="panel" className="p-8 flex flex-col justify-between">
                                <div className="flex flex-col items-center">
                                    {/* Date */}
                                    <p className="text-base text-[#010101]/80 text-center mb-4">{dateString}</p>

                                    {/* Title - using content from database */}
                                    <h2 className="text-2xl font-bold text-[#010101] text-center mb-8 leading-tight px-4">
                                        {displayTitle}
                                    </h2>
                                </div>

                                {/* Audio Player */}
                                <div className="flex items-center justify-center gap-6 mt-auto">
                                    {/* Left Waveform */}
                                    <div className="h-12 w-24 flex items-center justify-end">
                                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                                            <defs>
                                                <linearGradient id="fade-gradient" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#010101" stopOpacity="0.8" />
                                                    <stop offset="100%" stopColor="#010101" stopOpacity="0.2" />
                                                </linearGradient>
                                            </defs>
                                            {/* Upper Wave */}
                                            {isPlaying ? (
                                                <motion.path
                                                    d="M0 25 C 20 25, 30 5, 50 25 S 80 0, 100 25"
                                                    fill="none"
                                                    stroke="#010101"
                                                    strokeWidth="0"
                                                    style={{ fill: '#010101', opacity: 0.9 }}
                                                    animate={{
                                                        d: [
                                                            "M0 25 C 20 25, 30 15, 50 25 S 80 10, 100 25",
                                                            "M0 25 C 20 25, 30 5, 50 25 S 80 0, 100 25",
                                                            "M0 25 C 20 25, 30 15, 50 25 S 80 10, 100 25"
                                                        ]
                                                    }}
                                                    transition={{
                                                        duration: 1.5,
                                                        repeat: Infinity,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            ) : (
                                                <path
                                                    d="M0 25 C 20 25, 30 15, 50 25 S 80 10, 100 25"
                                                    fill="none"
                                                    stroke="#010101"
                                                    strokeWidth="0"
                                                    style={{ fill: '#010101', opacity: 0.9 }}
                                                />
                                            )}
                                            {/* Lower Wave (Mirrored) */}
                                            {isPlaying ? (
                                                <motion.path
                                                    d="M0 25 C 20 25, 30 45, 50 25 S 80 50, 100 25"
                                                    fill="none"
                                                    stroke="#010101"
                                                    strokeWidth="0"
                                                    style={{ fill: '#010101', opacity: 0.4 }}
                                                    animate={{
                                                        d: [
                                                            "M0 25 C 20 25, 30 35, 50 25 S 80 40, 100 25",
                                                            "M0 25 C 20 25, 30 45, 50 25 S 80 50, 100 25",
                                                            "M0 25 C 20 25, 30 35, 50 25 S 80 40, 100 25"
                                                        ]
                                                    }}
                                                    transition={{
                                                        duration: 1.5,
                                                        repeat: Infinity,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            ) : (
                                                <path
                                                    d="M0 25 C 20 25, 30 35, 50 25 S 80 40, 100 25"
                                                    fill="none"
                                                    stroke="#010101"
                                                    strokeWidth="0"
                                                    style={{ fill: '#010101', opacity: 0.4 }}
                                                />
                                            )}
                                        </svg>
                                    </div>

                                    {/* Play/Pause Button */}
                                    <button
                                        onClick={handlePlay}
                                        disabled={!audioElement}
                                        className="w-16 h-16 bg-white/10 backdrop-blur-[20px] border border-white/20 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-white/20 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                                    >
                                        {isPlaying ? (
                                            <Pause className="w-7 h-7 text-[#010101]" fill="#010101" />
                                        ) : (
                                            <Play className="w-7 h-7 text-[#010101] ml-0.5" fill="#010101" />
                                        )}
                                    </button>

                                    {/* Right Waveform */}
                                    <div className="h-12 w-24 flex items-center justify-start">
                                        <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                                            {/* Upper Wave */}
                                            {isPlaying ? (
                                                <motion.path
                                                    d="M0 25 C 20 5, 50 25, 70 10 S 100 25, 100 25"
                                                    fill="none"
                                                    stroke="#010101"
                                                    strokeWidth="0"
                                                    style={{ fill: '#010101', opacity: 0.9 }}
                                                    animate={{
                                                        d: [
                                                            "M0 25 C 20 0, 50 25, 70 5 S 100 25, 100 25",
                                                            "M0 25 C 20 10, 50 25, 70 15 S 100 25, 100 25",
                                                            "M0 25 C 20 0, 50 25, 70 5 S 100 25, 100 25"
                                                        ]
                                                    }}
                                                    transition={{
                                                        duration: 1.2,
                                                        repeat: Infinity,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            ) : (
                                                <path
                                                    d="M0 25 C 20 10, 50 25, 70 15 S 100 25, 100 25"
                                                    fill="none"
                                                    stroke="#010101"
                                                    strokeWidth="0"
                                                    style={{ fill: '#010101', opacity: 0.9 }}
                                                />
                                            )}
                                            {/* Lower Wave (Mirrored) */}
                                            {isPlaying ? (
                                                <motion.path
                                                    d="M0 25 C 20 45, 50 25, 70 40 S 100 25, 100 25"
                                                    fill="none"
                                                    stroke="#010101"
                                                    strokeWidth="0"
                                                    style={{ fill: '#010101', opacity: 0.4 }}
                                                    animate={{
                                                        d: [
                                                            "M0 25 C 20 50, 50 25, 70 45 S 100 25, 100 25",
                                                            "M0 25 C 20 40, 50 25, 70 35 S 100 25, 100 25",
                                                            "M0 25 C 20 50, 50 25, 70 45 S 100 25, 100 25"
                                                        ]
                                                    }}
                                                    transition={{
                                                        duration: 1.2,
                                                        repeat: Infinity,
                                                        ease: "easeInOut"
                                                    }}
                                                />
                                            ) : (
                                                <path
                                                    d="M0 25 C 20 40, 50 25, 70 35 S 100 25, 100 25"
                                                    fill="none"
                                                    stroke="#010101"
                                                    strokeWidth="0"
                                                    style={{ fill: '#010101', opacity: 0.4 }}
                                                />
                                            )}
                                        </svg>
                                    </div>
                                </div>
                                {/* End Audio Player */}
                            </Glass>
                        </motion.div>
                    )}

                    {/* Location Selector */}
                    <LocationSelector
                        selectedLocation={selectedLocation}
                        onSelect={onLocationSelect}
                    />

                    {/* Talk to Assistant Button */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="w-full max-w-md"
                    >
                        <Glass variant="card" className="px-6 py-4">
                            <button
                                onClick={onTalkToAssistant}
                                className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                            >
                                <MessageCircle className="w-5 h-5 text-[#010101]" />
                                <span className="text-base font-medium text-[#010101]">Chat with Leo</span>
                            </button>
                        </Glass>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
