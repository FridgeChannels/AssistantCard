import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Play, Pause, AlertCircle, MessageCircle, Link as LinkIcon, Phone, Mail, MessageSquare } from 'lucide-react';
import { getTodayPlayContent } from '../../lib/playContentService';
import { getRelatedQuestions } from '../../lib/relatedQuestionsService';
import { createPlayContentLog, updatePlayContentLog } from '../../lib/loggingService';
import { Glass } from '../layout/Glass';
import { LocationSelector } from './LocationSelector';
import { ZipCodeOnboarding } from './ZipCodeOnboarding';

// Chat with Leo 按钮显示条件：需同时具备以下三个权限
const CHAT_WITH_LEO_PERMISSIONS = [
    'MOD_MOD_ASSISTANT',
    'FUNC_FUNC_ASSISTANT_FC_CUSTOM_MADE',
    'METHOD_METHOD_ASSISTANT_FC_CUSTOM_MADE',
];
// Assistant Prompt 按钮显示条件：需同时具备以下三个权限
const ASSISTANT_PROMPT_PERMISSIONS = [
    'MOD_MOD_ASSISTANT',
    'FUNC_FUNC_ASSISTANT_CUSTOM_PROMT',
    'METHOD_METHOD_ASSISTANT_CUSTOM_PROMT',
];
// chat_url 按钮显示条件：需同时具备以下三个权限
const CHAT_URL_PERMISSIONS = [
    'MOD_MOD_ASSISTANT',
    'FUNC_FUNC_ASSISTANT_CHAT_URL',
    'METHOD_METHOD_ASSISTANT_CHAT_URL',
];
// skip_url 按钮显示条件：需同时具备以下三个权限，且 skip_url 不为空
const SKIP_URL_PERMISSIONS = [
    'MOD_MOD_CTA',
    'FUNC_FUNC_CTA_ROUTE',
    'METHOD_METHOD_CTA_SKIP',
];
// phone、SMS、email 按钮显示条件：需同时具备以下三个权限，且对应字段值不为空
const CTA_CONTACT_PERMISSIONS = [
    'MOD_MOD_CTA',
    'FUNC_FUNC_CTA_ROUTE',
    'METHOD_METHOD_CTA_CONTACT',
];

function hasAllPermissions(permissions = [], required = []) {
    if (!Array.isArray(permissions) || required.length === 0) return false;
    const set = new Set(permissions);
    return required.every((p) => set.has(p));
}

// 检查是否包含任何 Assistant 相关权限
function hasAnyAssistantPermission(permissions = []) {
    if (!Array.isArray(permissions)) return false;
    const assistantPermissions = [
        'MOD_MOD_ASSISTANT',
        'FUNC_FUNC_ASSISTANT_FC_CUSTOM_MADE',
        'METHOD_METHOD_ASSISTANT_FC_CUSTOM_MADE',
        'FUNC_FUNC_ASSISTANT_CHAT_URL',
        'METHOD_METHOD_ASSISTANT_CHAT_URL',
        'FUNC_FUNC_ASSISTANT_CUSTOM_PROMT',
        'METHOD_METHOD_ASSISTANT_CUSTOM_PROMT'
    ];
    const permissionSet = new Set(permissions);
    return assistantPermissions.some(p => permissionSet.has(p));
}

export function MorningBriefing({
    onTalkToAssistant,
    onOpenAssistantPromptChat,
    cId = '',
    sn = '',
    magnetContext = null,
    hasPreloaded = false,
    onQuestionsPreloaded,
    cachedPlayContent = null,
    isLoadingPlayContent = false,
    onPlayContentLoaded,
    onPlayContentLoadingChange,
    onSavePlaybackState,
    selectedLocation,
    onLocationSelect,
    hideLocationSelector = false,
    ctaTextOverride,
    ctaLink,
    disableRelatedQuestions = false,
    initialLocation = null,
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    // Use cachedPlayContent if available, otherwise construct initial using initialLocation if available
    const [playContent, setPlayContent] = useState(() => {
        if (cachedPlayContent) return cachedPlayContent;
        if (initialLocation && initialLocation.formatted) {
            return {
                locationFormatted: initialLocation.formatted,
                hasZipCode: !!initialLocation.zipCode,
                // Other fields will be populated when fetch completes
            };
        }
        return null;
    });
    const [isLoading, setIsLoading] = useState(!cachedPlayContent && !playContent); // Only load if we don't have any content
    const [error, setError] = useState(null);
    const [audioElement, setAudioElement] = useState(null);
    const hasPreloadedQuestions = useRef(false); // 防止重复调用接口A
    const hasLoadedPlayContent = useRef(false); // 防止重复加载播放内容
    const currentPlayLogId = useRef(null); // 当前播放日志ID
    const playStartTime = useRef(null); // 播放开始时间
    const audioRef = useRef(null); // 用于cleanup中访问audioElement
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [showContactOptions, setShowContactOptions] = useState(false);

    // 日期显示：
    // - 若播放内容包含 created_at（例如 tp/:id 使用 content_play 表），则用该时间
    // - 否则回退到当前日期（原有行为）
    const baseDate = playContent?.created_at ? new Date(playContent.created_at) : new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayName = dayNames[baseDate.getDay()];
    const monthName = monthNames[baseDate.getMonth()];
    const day = baseDate.getDate();
    const dateString = `${dayName}, ${monthName} ${day}`;

    // 懒加载推荐问题：页面加载时立即触发（如果还没有加载过）
    useEffect(() => {
        // tp/:id 等场景可以通过 disableRelatedQuestions 关闭该逻辑
        if (disableRelatedQuestions) {
            return;
        }

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
    }, [cId, hasPreloaded, onQuestionsPreloaded, disableRelatedQuestions]);

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
        // 注意：这里 isLoadingPlayContent 可能是父组件传入的props (false)，不要混淆
        // 这里的逻辑主要是为了防止多次调用 getTodayPlayContent

        if (cachedPlayContent || hasLoadedPlayContent.current) {
            return;
        }

        async function loadPlayContent() {
            // 防止并发请求：再次检查状态
            if (hasLoadedPlayContent.current || cachedPlayContent) {
                return;
            }

            hasLoadedPlayContent.current = true;

            try {
                // Only show loading state if we don't have tentative content
                if (!playContent) {
                    setIsLoading(true);
                }

                setError(null);
                if (onPlayContentLoadingChange) {
                    onPlayContentLoadingChange(true);
                }

                // Fetch play content：根据 URL 的 sn（/p/:sn）定位 magnet，无 sn 时用 cId（magnet id）
                const content = await getTodayPlayContent(sn ? { sn } : { magnetId: cId || null });

                if (!content) {
                    setError('No content available at the moment');
                    if (onPlayContentLoadingChange) {
                        onPlayContentLoadingChange(false);
                    }
                    hasLoadedPlayContent.current = false; // 失败时允许重试
                    return;
                }

                setPlayContent(content);

                // Onboarding check: no zip code and not skipped
                const skipped = localStorage.getItem('zip_onboarding_skipped');
                if (!content.hasZipCode && !skipped) {
                    setShowOnboarding(true);
                }

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

            // 创建播放日志（写入 play_news_contents_id）
            playStartTime.current = Date.now();
            const logId = await createPlayContentLog({
                cId: cId,
                playNewsContentsId: playContent?.id ?? null,
            });
            currentPlayLogId.current = logId;
        }
    };

    // Display title: use title field
    const displayTitle = playContent?.title || 'Daily Briefing';

    // 底部 CTA：有 magnetContext.cta 时展示多按钮；仅 ctaTextOverride/ctaLink 时（如 TpPage）展示单按钮
    const cta = magnetContext?.cta;
    const hasFullCta = cta && (cta.name != null || cta.phone || cta.email || cta.chat_url || cta.skip_url);
    const permissions = magnetContext?.solution?.permissions ?? [];
    const showChatWithLeo = hasAllPermissions(permissions, CHAT_WITH_LEO_PERMISSIONS);
    const showChatUrlButton = hasAllPermissions(permissions, CHAT_URL_PERMISSIONS);
    
    // 权限冲突检测：当 FUNC_FUNC_CTA_ROUTE 与 ASSISTANT 相关权限同时存在时，优先显示 ASSISTANT 按钮，隐藏 CTA 按钮
    const hasCtaRoute = permissions.includes('FUNC_FUNC_CTA_ROUTE');
    const hasAssistantCustomMade = permissions.includes('FUNC_FUNC_ASSISTANT_FC_CUSTOM_MADE');
    const hasAssistantChatUrl = permissions.includes('FUNC_FUNC_ASSISTANT_CHAT_URL');
    const hasConflict = hasCtaRoute && (hasAssistantCustomMade || hasAssistantChatUrl);
    
    const showSkipUrlButton = hasConflict ? false : hasAllPermissions(permissions, SKIP_URL_PERMISSIONS);
    const showCtaContactButton = hasConflict ? false : hasAllPermissions(permissions, CTA_CONTACT_PERMISSIONS);

    const handleOnboardingSkip = () => {
        localStorage.setItem('zip_onboarding_skipped', 'true');
        setShowOnboarding(false);
    };

    const handleOnboardingSelect = (location) => {
        onLocationSelect(location);
        localStorage.setItem('zip_onboarding_skipped', 'true');
        setShowOnboarding(false);
    };

    // 处理联系选项
    const handleContactButtonClick = (e) => {
        e.preventDefault();
        setShowContactOptions(true);
    };

    const handleContactOptionClick = (option) => {
        if (cta && cta.phone) {
            switch (option) {
                case 'call':
                    window.location.href = `tel:${cta.phone}`;
                    break;
                case 'sms':
                    window.location.href = `sms:${cta.phone}`;
                    break;
                case 'email':
                    if (cta.email) {
                        window.location.href = `mailto:${cta.email}`;
                    }
                    break;
                default:
                    break;
            }
        }
        setShowContactOptions(false);
    };

    const closeContactOptions = () => {
        setShowContactOptions(false);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <AnimatePresence>
                {showOnboarding && (
                    <ZipCodeOnboarding
                        onSelect={handleOnboardingSelect}
                        onSkip={handleOnboardingSkip}
                    />
                )}
            </AnimatePresence>
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
                            className="w-full max-w-md mb-6"
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
                            className="w-full max-w-md mb-6"
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
                            className="w-full max-w-md mb-3"
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
                                {!showOnboarding && (
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
                                )}
                                {/* End Audio Player */}
                            </Glass>
                        </motion.div>
                    )}

                    {/* Location Selector or Formatted Text */}
                    {!hideLocationSelector && !showOnboarding && (
                        playContent?.locationFormatted && !isEditingLocation ? (
                            <button
                                onClick={() => setIsEditingLocation(true)}
                                className="w-full max-w-md px-4 py-2 text-center text-sm font-medium text-gray-500 hover:text-[#010101] transition-colors"
                            >
                                {playContent.locationFormatted}
                            </button>
                        ) : (
                            <LocationSelector
                                selectedLocation={selectedLocation}
                                onSelect={(loc) => {
                                    onLocationSelect(loc);
                                    if (loc) {
                                        setIsEditingLocation(false);
                                    }
                                }}
                            />
                        )
                    )}

                    {/* 底部 CTA 按钮区：第1 站内 Chat / 第2 第三方 chat_url / 第3 打电话 / 第4 发短信 / 第5 发邮件 / 第6 skip_url */}
                    {!showOnboarding && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="w-full max-w-md mt-24 space-y-3"
                        >
                            {hasFullCta ? (
                                <>
                                    {/* 按钮优先级：Assistant > Contact > Skip URL */}
                                    {/* 检查是否有任何 Assistant 相关权限 - 最高优先级 */}
                                    {hasAnyAssistantPermission(permissions) ? (
                                        <>
                                            {/* Assistant 类型按钮优先显示 */}
                                            {/* 第1个：跳转站内 Chat 页面，仅当具备 MOD_MOD_ASSISTANT、FUNC_FUNC_ASSISTANT_FC_CUSTOM_MADE、METHOD_METHOD_ASSISTANT_FC_CUSTOM_MADE 时显示 */}
                                            {showChatWithLeo && (
                                                <Glass variant="card" className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={onTalkToAssistant}
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                                    >
                                                        <MessageCircle className="w-5 h-5 text-[#010101]" />
                                                        <span className="text-base font-medium text-[#010101]">Chat with Leo</span>
                                                    </button>
                                                </Glass>
                                            )}
                                            {/* 第2个：Assistant Prompt 按钮，仅当具备 MOD_MOD_ASSISTANT、FUNC_FUNC_ASSISTANT_CUSTOM_PROMT、METHOD_METHOD_ASSISTANT_CUSTOM_PROMT 时显示，但当 Chat with Leo 按钮已显示时不显示 */}
                                            {!showChatWithLeo && hasAllPermissions(permissions, ASSISTANT_PROMPT_PERMISSIONS) && (
                                                <Glass variant="card" className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={onOpenAssistantPromptChat}
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                                    >
                                                        <MessageCircle className="w-5 h-5 text-[#010101]" />
                                                        <span className="text-base font-medium text-[#010101]">Assistant Prompt</span>
                                                    </button>
                                                </Glass>
                                            )}
                                            {/* 第3个：跳转第三方 URL（chat_url），仅当具备 MOD_MOD_ASSISTANT、FUNC_FUNC_ASSISTANT_CHAT_URL、METHOD_METHOD_ASSISTANT_CHAT_URL 时显示 */}
                                            {showChatUrlButton && cta.chat_url && (
                                                <Glass variant="card" className="px-6 py-4">
                                                    <a
                                                        href={cta.chat_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                                    >
                                                        <MessageCircle className="w-5 h-5 text-[#010101]" />
                                                        <span className="text-base font-medium text-[#010101]">{cta.name || 'Chat'}</span>
                                                    </a>
                                                </Glass>
                                            )}
                                        </>
                                    ) : showCtaContactButton && (cta.phone || cta.email) ? (
                                        // 如果没有 Assistant 权限但有 Contact 权限，则显示 Contact 按钮 - 中等优先级
                                        <>
                                            <Glass variant="card" className="px-6 py-4">
                                                <button
                                                    type="button"
                                                    onClick={handleContactButtonClick}
                                                    className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                                >
                                                    <Phone className="w-5 h-5 text-[#010101]" />
                                                    <span className="text-base font-medium text-[#010101]">{cta.name || 'Contact'}</span>
                                                </button>
                                            </Glass>
                                            {/* 联系选项弹窗 */}
                                            {showContactOptions && (
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Options</h3>
                                                        <div className="space-y-3">
                                                            {cta.phone && (
                                                                <button
                                                                    onClick={() => handleContactOptionClick('call')}
                                                                    className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-3"
                                                                >
                                                                    <Phone className="w-5 h-5 text-blue-600" />
                                                                    <span className="text-gray-800">Call {cta.phone}</span>
                                                                </button>
                                                            )}
                                                            {cta.phone && (
                                                                <button
                                                                    onClick={() => handleContactOptionClick('sms')}
                                                                    className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-3"
                                                                >
                                                                    <MessageSquare className="w-5 h-5 text-green-600" />
                                                                    <span className="text-gray-800">Text {cta.phone}</span>
                                                                </button>
                                                            )}
                                                            {cta.email && (
                                                                <button
                                                                    onClick={() => handleContactOptionClick('email')}
                                                                    className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-3"
                                                                >
                                                                    <Mail className="w-5 h-5 text-purple-600" />
                                                                    <span className="text-gray-800">Email {cta.email}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={closeContactOptions}
                                                            className="w-full mt-4 px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors text-gray-800"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : showSkipUrlButton && cta.skip_url ? (
                                        // 如果没有 Assistant 和 Contact 权限，但有 Skip 权限，则显示 Skip 按钮 - 最低优先级
                                        <Glass variant="card" className="px-6 py-4">
                                            <a
                                                href={cta.skip_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                            >
                                                <LinkIcon className="w-5 h-5 text-[#010101]" />
                                                <span className="text-base font-medium text-[#010101]">{cta.name || 'Link'}</span>
                                            </a>
                                        </Glass>
                                    ) : null}
                                </>
                            ) : (
                                <>
                                    {/* 对于没有完整 CTA 的情况，按优先级显示按钮：Assistant > Contact > Skip */}
                                    {hasAnyAssistantPermission(permissions) ? (
                                        // 最高优先级：Assistant
                                        <>
                                            <Glass variant="card" className="px-6 py-4">
                                                {ctaLink ? (
                                                    <a
                                                        href={ctaLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                                    >
                                                        <LinkIcon className="w-5 h-5 text-[#010101]" />
                                                        <span className="text-base font-medium text-[#010101]">{ctaTextOverride || 'Chat with Leo'}</span>
                                                    </a>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={onTalkToAssistant}
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                                    >
                                                        <MessageCircle className="w-5 h-5 text-[#010101]" />
                                                        <span className="text-base font-medium text-[#010101]">{ctaTextOverride || 'Chat with Leo'}</span>
                                                    </button>
                                                )}
                                            </Glass>
                                            {/* Assistant Prompt 按钮，仅当具备 MOD_MOD_ASSISTANT、FUNC_FUNC_ASSISTANT_CUSTOM_PROMT、METHOD_METHOD_ASSISTANT_CUSTOM_PROMT 时显示，但当 Chat with Leo 按钮已显示时不显示 */}
                                            {!ctaLink && !ctaTextOverride && hasAllPermissions(permissions, ASSISTANT_PROMPT_PERMISSIONS) && (
                                                <Glass variant="card" className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={onOpenAssistantPromptChat}
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                                    >
                                                        <MessageCircle className="w-5 h-5 text-[#010101]" />
                                                        <span className="text-base font-medium text-[#010101]">Assistant Prompt</span>
                                                    </button>
                                                </Glass>
                                            )}
                                        </>
                                    ) : showCtaContactButton && (cta?.phone || cta?.email) ? (
                                        // 中等优先级：Contact
                                        <>
                                            <Glass variant="card" className="px-6 py-4">
                                                <button
                                                    type="button"
                                                    onClick={handleContactButtonClick}
                                                    className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                                >
                                                    <Phone className="w-5 h-5 text-[#010101]" />
                                                    <span className="text-base font-medium text-[#010101]">{cta?.name || 'Contact'}</span>
                                                </button>
                                            </Glass>
                                            {/* 联系选项弹窗 */}
                                            {showContactOptions && (
                                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                                                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                                                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Contact Options</h3>
                                                        <div className="space-y-3">
                                                            {cta?.phone && (
                                                            <button
                                                                onClick={() => handleContactOptionClick('call')}
                                                                className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-3"
                                                            >
                                                                <Phone className="w-5 h-5 text-blue-600" />
                                                                <span className="text-gray-800">Call {cta.phone}</span>
                                                            </button>
                                                        )}
                                                        {cta?.phone && (
                                                            <button
                                                                onClick={() => handleContactOptionClick('sms')}
                                                                className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-3"
                                                            >
                                                                <MessageSquare className="w-5 h-5 text-green-600" />
                                                                <span className="text-gray-800">Text {cta.phone}</span>
                                                            </button>
                                                        )}
                                                        {cta?.email && (
                                                            <button
                                                                onClick={() => handleContactOptionClick('email')}
                                                                className="w-full text-left px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-3"
                                                            >
                                                                <Mail className="w-5 h-5 text-purple-600" />
                                                                <span className="text-gray-800">Email {cta.email}</span>
                                                            </button>
                                                        )}
                                                        </div>
                                                        <button
                                                            onClick={closeContactOptions}
                                                            className="w-full mt-4 px-4 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : showSkipUrlButton && cta?.skip_url ? (
                                        // 最低优先级：Skip
                                        <Glass variant="card" className="px-6 py-4">
                                            <a
                                                href={cta.skip_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                            >
                                                <LinkIcon className="w-5 h-5 text-[#010101]" />
                                                <span className="text-base font-medium text-[#010101]">{cta?.name || 'Link'}</span>
                                            </a>
                                        </Glass>
                                    ) : ctaLink ? (
                                        // 如果以上权限都没有，但有链接，则显示链接
                                        <Glass variant="card" className="px-6 py-4">
                                            <a
                                                href={ctaLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                            >
                                                <LinkIcon className="w-5 h-5 text-[#010101]" />
                                                <span className="text-base font-medium text-[#010101]">{ctaTextOverride || 'Chat with Leo'}</span>
                                            </a>
                                        </Glass>
                                    ) : (
                                        // 最后备选：Talk to Assistant
                                        <Glass variant="card" className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={onTalkToAssistant}
                                                className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
                                            >
                                                <MessageCircle className="w-5 h-5 text-[#010101]" />
                                                <span className="text-base font-medium text-[#010101]">{ctaTextOverride || 'Chat with Leo'}</span>
                                            </button>
                                        </Glass>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
