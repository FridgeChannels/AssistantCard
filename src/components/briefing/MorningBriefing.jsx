import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Play, Pause, AlertCircle, MessageCircle, Link as LinkIcon, Phone, Mail, MessageSquare } from 'lucide-react';
import { getPlayContentList } from '../../lib/playContentService';
import { pickPlayContentItemByLocalCalendar } from '../../lib/playContentSlot';
import { runStarterWorkflow } from '../../lib/relatedQuestionsService';
import { createPlayContentLog, updatePlayContentLog } from '../../lib/loggingService';
import { AssistantIdentity } from '../layout/AssistantIdentity';
import { Glass } from '../layout/Glass';
import { SingleLineMarqueeTitle } from '../SingleLineMarqueeTitle';
import { LocationSelector } from './LocationSelector';
import { ZipCodeOnboarding } from './ZipCodeOnboarding';

import {
    CHAT_WITH_LEO_PERMISSIONS,
    ASSISTANT_PROMPT_PERMISSIONS,
    CHAT_URL_PERMISSIONS,
    SKIP_URL_PERMISSIONS,
    CTA_CONTACT_PERMISSIONS,
    ZIPCODE_PERMISSIONS,
    normalizePermissionSet,
    hasAllPermissions,
    hasAnyAssistantPermission,
} from '../../lib/ctaPermissions';
import { isMinimalChromeSn } from '../../config/env';

const DEFAULT_ASSISTANT_CTA_LABEL = 'Explore More';
const renderDefaultAssistantCtaIcon = () => (
    <LinkIcon className="w-5 h-5 text-[#010101]" />
);

export function MorningBriefing({
    onTalkToAssistant,
    onOpenAssistantPromptChat,
    cId = '',
    sn = '',
    magnetContext = null,
    hasPreloaded = false,
    onQuestionsPreloaded,
    onStarterNoAnswerTxt,
    cachedPlayContent = null,
    isLoadingPlayContent = false,
    onPlayContentLoaded,
    onPlayContentLoadingChange,
    onSavePlaybackState,
    onLongTextIndexChange,
    selectedLocation,
    onLocationSelect,
    hideLocationSelector = false,
    ctaTextOverride,
    ctaLink,
    disableRelatedQuestions = false,
    initialLocation = null,
    /** 背景图预加载完成后再展示播放器区域（由 App / MobileContainer 驱动） */
    backdropReady = true,
}) {
    const [isPlaying, setIsPlaying] = useState(false);
    // Initial playContent: list-response cache is hydrated in effect; single-item/legacy cache used as-is
    const [playContent, setPlayContent] = useState(() => {
        if (cachedPlayContent && cachedPlayContent.playback_rule == null && cachedPlayContent.id != null) {
            return cachedPlayContent;
        }
        if (initialLocation && initialLocation.formatted) {
            return {
                locationFormatted: initialLocation.formatted,
                hasZipCode: !!initialLocation.zipCode,
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
    const currentLongTextIndexRef = useRef(null); // longtext 当前展示条索引，卸载/ended 时同步到父 cache
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

    // 懒加载推荐问题：调用 workflow run（blocking），recom 时传问题列表，no_answer 时传首条助手文案
    useEffect(() => {
        if (disableRelatedQuestions || hasPreloadedQuestions.current || hasPreloaded || !cId) {
            return;
        }
        hasPreloadedQuestions.current = true;
        runStarterWorkflow(cId, magnetContext?.industry_id)
            .then(({ answerType, recQuestion = [], noAnswerTxt = '' }) => {
                if (answerType === 'recom' && recQuestion.length > 0 && onQuestionsPreloaded) {
                    onQuestionsPreloaded(recQuestion.map(r => (r && r.question) || r).slice(0, 3));
                } else if (answerType === 'no_answer' && onStarterNoAnswerTxt) {
                    onStarterNoAnswerTxt(noAnswerTxt);
                }
            })
            .catch(error => {
                console.error('预加载推荐 workflow 失败:', error);
                hasPreloadedQuestions.current = false;
            });
    }, [cId, hasPreloaded, onQuestionsPreloaded, onStarterNoAnswerTxt, disableRelatedQuestions]);

    // 如果有缓存的播放内容，直接使用（支持 list 响应与旧单条缓存）
    useEffect(() => {
        if (!cachedPlayContent) return;

        const rule = cachedPlayContent.playback_rule;
        const items = cachedPlayContent.items;
        const hasZipCode = cachedPlayContent.hasZipCode;
        const locationFormatted = cachedPlayContent.locationFormatted ?? null;

        const applyItem = (item, audioUrl, onEnded) => {
            if (!item) return;
            const current = {
                ...item,
                ...(hasZipCode != null && { hasZipCode }),
                ...(locationFormatted != null && { locationFormatted }),
            };
            setPlayContent(current);
            setIsLoading(false);
            hasLoadedPlayContent.current = true;

            if (audioUrl) {
                setAudioElement(prev => {
                    if (prev) return prev;
                    const audio = new Audio(audioUrl);
                    if (cachedPlayContent.savedCurrentTime) {
                        audio.currentTime = cachedPlayContent.savedCurrentTime;
                    }
                    audio.addEventListener('ended', async () => {
                        if (onEnded) console.log('audio ended', { longtext: true });
                        setIsPlaying(false);
                        if (currentPlayLogId.current && playStartTime.current) {
                            const duration = Math.floor((Date.now() - playStartTime.current) / 1000);
                            const totalDuration = audio.duration ? Math.floor(audio.duration) : null;
                            await updatePlayContentLog(currentPlayLogId.current, { duration, totalDuration });
                            currentPlayLogId.current = null;
                            playStartTime.current = null;
                        }
                        if (onEnded) onEnded();
                    });
                    audio.addEventListener('error', (e) => {
                        console.error('Audio loading issue:', e);
                        setError('Audio is not ready yet');
                    });
                    // longtext 播完未停兜底：timeupdate 在 ended 未触发时同步 isPlaying
                    if (onEnded) {
                        const onTimeUpdate = () => {
                            if (audio.duration && !Number.isNaN(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration) {
                                setIsPlaying(false);
                                audio.removeEventListener('timeupdate', onTimeUpdate);
                            }
                        };
                        audio.addEventListener('timeupdate', onTimeUpdate);
                    }
                    audioRef.current = audio;
                    return audio;
                });
            }
        };

        // 单条：rss 或 latest 仅一条
        if (rule === 'rss' || (rule === 'latest' && (!items || items.length <= 1))) {
            const item = items?.[0];
            if (item) applyItem(item, item.audio_url, null);
            return;
        }

        // 顺序列表：long_text_sequential（有 config_id）或 latest 多条；按本地日 + order_index 槽位选一条，播完不换条
        const isOrderSlotList =
            (rule === 'long_text_sequential' && items?.length > 0 && cachedPlayContent.config_id != null) ||
            (rule === 'latest' && items?.length > 1);
        if (isOrderSlotList) {
            const { item, arrayIndex } = pickPlayContentItemByLocalCalendar(items);
            if (!item) return;
            currentLongTextIndexRef.current = arrayIndex;
            if (onLongTextIndexChange) onLongTextIndexChange(arrayIndex);
            applyItem(item, item?.audio_url, null);
            return;
        }

        // Legacy single-item cache (no playback_rule)
        setPlayContent(cachedPlayContent);
        setIsLoading(false);
        hasLoadedPlayContent.current = true;
        if (cachedPlayContent.audio_url) {
            setAudioElement(prev => {
                if (prev) return prev;
                const audio = new Audio(cachedPlayContent.audio_url);
                if (cachedPlayContent.savedCurrentTime) audio.currentTime = cachedPlayContent.savedCurrentTime;
                audio.addEventListener('ended', async () => {
                    setIsPlaying(false);
                    if (currentPlayLogId.current && playStartTime.current) {
                        const duration = Math.floor((Date.now() - playStartTime.current) / 1000);
                        const totalDuration = audio.duration ? Math.floor(audio.duration) : null;
                        await updatePlayContentLog(currentPlayLogId.current, { duration, totalDuration });
                        currentPlayLogId.current = null;
                        playStartTime.current = null;
                    }
                });
                audio.addEventListener('error', (e) => {
                    console.error('Audio loading issue:', e);
                    setError('Audio is not ready yet');
                });
                audioRef.current = audio;
                return audio;
            });
        }
    }, [cachedPlayContent, cId, onLongTextIndexChange]);

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

                // 保存进度到父组件（longtext 时一并传当前索引，便于返回同一条）
                if (onSavePlaybackState) {
                    onSavePlaybackState(audio.currentTime, currentLongTextIndexRef.current);
                }
            }
        };
    }, [onSavePlaybackState]);

    // Load play content - 使用新接口 getPlayContentList（三种规则）
    useEffect(() => {
        if (cachedPlayContent || hasLoadedPlayContent.current) return;

        async function loadPlayContent() {
            if (hasLoadedPlayContent.current || cachedPlayContent) return;

            hasLoadedPlayContent.current = true;
            try {
                if (!playContent) setIsLoading(true);
                setError(null);
                if (onPlayContentLoadingChange) onPlayContentLoadingChange(true);

                const response = await getPlayContentList(sn ? { sn } : { magnetId: cId || null });
                if (!response) {
                    setError('No content available at the moment');
                    hasLoadedPlayContent.current = false;
                    return;
                }

                const { playback_rule: rule, items = [], config_id: configId, hasZipCode, locationFormatted } = response;
                const hasZip = hasZipCode != null ? hasZipCode : false;
                const locFormatted = locationFormatted ?? null;

                let currentItem = null;
                let isOrderSlotList = false;
                let longTextDisplayIndex = null; // order_slot 列表时写入 cache 的 items 下标

                // 单条：rss 或 latest 仅一条
                if (rule === 'rss' || (rule === 'latest' && items.length <= 1)) {
                    currentItem = items[0] ?? null;
                } else if (
                    (rule === 'long_text_sequential' && items.length > 0 && configId != null) ||
                    (rule === 'latest' && items.length > 1)
                ) {
                    isOrderSlotList = true;
                    const pick = pickPlayContentItemByLocalCalendar(items);
                    currentItem = pick.item;
                    longTextDisplayIndex = pick.arrayIndex >= 0 ? pick.arrayIndex : null;
                    currentLongTextIndexRef.current = pick.arrayIndex >= 0 ? pick.arrayIndex : null;
                    if (onLongTextIndexChange && pick.arrayIndex >= 0) onLongTextIndexChange(pick.arrayIndex);
                }

                if (!currentItem) {
                    setError('No content available at the moment');
                    hasLoadedPlayContent.current = false;
                    return;
                }

                const content = {
                    ...currentItem,
                    hasZipCode: hasZip,
                    locationFormatted: locFormatted,
                };
                setPlayContent(content);

                // Zip 引导弹窗：有 zip 权限 + 未填 zip + 未 skip 时展示
                const permissions = magnetContext?.solution?.permissions ?? [];
                const permSet = normalizePermissionSet(permissions);
                const hasZipPermission = hasAllPermissions(permSet, ZIPCODE_PERMISSIONS);
                const skipped = localStorage.getItem('zip_onboarding_skipped');
                if (hasZipPermission && !hasZip && !skipped) setShowOnboarding(true);

                if (onPlayContentLoaded) {
                    const payload = longTextDisplayIndex != null
                        ? { ...response, currentLongTextIndex: longTextDisplayIndex }
                        : response;
                    onPlayContentLoaded(payload);
                }

                if (content.audio_url) {
                    const audio = new Audio(content.audio_url);
                    audio.addEventListener('ended', () => {
                        if (isOrderSlotList) console.log('audio ended', { orderSlotList: true });
                        setIsPlaying(false);
                    });
                    audio.addEventListener('error', (e) => {
                        console.error('Audio loading issue:', e);
                        setError('Audio is not ready yet');
                    });
                    if (isOrderSlotList) {
                        const onTimeUpdate = () => {
                            if (audio.duration && !Number.isNaN(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration) {
                                setIsPlaying(false);
                                audio.removeEventListener('timeupdate', onTimeUpdate);
                            }
                        };
                        audio.addEventListener('timeupdate', onTimeUpdate);
                    }
                    setAudioElement(audio);
                    audioRef.current = audio;
                }
            } catch (err) {
                console.error('Content loading issue:', err);
                setError('Please try again in a moment');
                hasLoadedPlayContent.current = false;
            } finally {
                setIsLoading(false);
                if (onPlayContentLoadingChange) onPlayContentLoadingChange(false);
            }
        }

        loadPlayContent();
    }, []);

    // 当 magnetContext 晚于 play content 到达时，仍按 zip 权限 + 未填 zip + 未 skip 决定是否展示 zip 引导
    useEffect(() => {
        if (!magnetContext?.solution?.permissions?.length || !playContent) return;
        const permSet = normalizePermissionSet(magnetContext.solution.permissions);
        const hasZipPermission = hasAllPermissions(permSet, ZIPCODE_PERMISSIONS);
        const hasZip = !!playContent.hasZipCode;
        const skipped = localStorage.getItem('zip_onboarding_skipped');
        if (hasZipPermission && !hasZip && !skipped) setShowOnboarding(true);
    }, [magnetContext, playContent]);

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

    // 底部 CTA：有 magnetContext.cta 时展示多按钮；仅 ctaTextOverride/ctaLink 时（如 TpPage）展示单按钮
    const cta = magnetContext?.cta;
    const hasFullCta = cta && (cta.name != null || cta.phone || cta.email || cta.chat_url || cta.skip_url);
    const permissions = magnetContext?.solution?.permissions ?? [];
    const permissionSet = normalizePermissionSet(permissions);
    const showChatWithLeo = hasAllPermissions(permissionSet, CHAT_WITH_LEO_PERMISSIONS);
    const showChatUrlButton = hasAllPermissions(permissionSet, CHAT_URL_PERMISSIONS);
    
    // 权限冲突检测：当 FUNC_FUNC_CTA_ROUTE 与 ASSISTANT 相关权限同时存在时，优先显示 ASSISTANT 按钮，隐藏 CTA 按钮
    const hasCtaRoute = permissionSet.has('FUNC_FUNC_CTA_ROUTE');
    const hasAssistantCustomMade = permissionSet.has('FUNC_FUNC_ASSISTANT_FC_CUSTOM_MADE');
    const hasAssistantChatUrl = permissionSet.has('FUNC_FUNC_ASSISTANT_CHAT_URL');
    const hasConflict = hasCtaRoute && (hasAssistantCustomMade || hasAssistantChatUrl);
    
    const showSkipUrlButton = hasConflict ? false : hasAllPermissions(permissionSet, SKIP_URL_PERMISSIONS);
    const showCtaContactButton = hasConflict ? false : hasAllPermissions(permissionSet, CTA_CONTACT_PERMISSIONS);
    // Zip 权限：控制 zip 引导弹窗与播放器下方 zipcode 选择入口的显隐
    const hasZipPermission = hasAllPermissions(permissionSet, ZIPCODE_PERMISSIONS);

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
            {/* <header className="px-5 py-4 flex items-center justify-between relative z-10 flex-shrink-0">
                {!isMinimalChromeSn(sn) && (
                  <AssistantIdentity
                      label={magnetContext?.assistant_prompt_label || 'DailyPlay'}
                      imageClassName="shadow-sm"
                  />
                )}
            </header> */}

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="flex flex-col items-center justify-center px-6 pb-24 min-h-full">
                    {/* 背景图预加载中：仅展示加载态，不展示播放器文案与控件 */}
                    {!backdropReady && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center w-full max-w-md py-16"
                        >
                            <div
                                className="w-12 h-12 rounded-full border-4 border-white/25 border-t-white animate-spin mb-4"
                                aria-hidden
                            />
                            <p className="text-sm text-white/90 text-center">Loading…</p>
                        </motion.div>
                    )}

                    {/* Loading State */}
                    {backdropReady && isLoading && (
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
                    {backdropReady && error && !isLoading && (
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
                    {backdropReady && playContent && !isLoading && !error && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="w-full max-w-md mb-3"
                        >
                            <div className="p-8 flex flex-col justify-between w-full">
                                <div className="flex flex-col items-center">
                                    {/* Title - single line, marquee when long；文案用 assistant_prompt_label */}
                                    <SingleLineMarqueeTitle
                                        as="h2"
                                        className="text-2xl font-bold text-white text-center mb-3 leading-tight px-4 w-full"
                                    >
                                        {magnetContext?.assistant_prompt_label || 'Daily Briefing'}
                                    </SingleLineMarqueeTitle>

                                    {/* Date（置于标题下方） */}
                                    <p className="text-base text-white/80 text-center mb-8">{dateString}</p>
                                </div>

                                {/* Audio Player */}
                                {!showOnboarding && (
                                    <div className="flex items-center justify-center gap-6 mt-auto">
                                        {/* Left Waveform */}
                                        <div className="h-12 w-24 flex items-center justify-end">
                                            <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible">
                                                <defs>
                                                    <linearGradient id="fade-gradient" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                                                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
                                                    </linearGradient>
                                                </defs>
                                                {/* Upper Wave */}
                                                {isPlaying ? (
                                                    <motion.path
                                                        d="M0 25 C 20 25, 30 5, 50 25 S 80 0, 100 25"
                                                        fill="none"
                                                        stroke="#ffffff"
                                                        strokeWidth="0"
                                                        style={{ fill: '#ffffff', opacity: 0.9 }}
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
                                                        stroke="#ffffff"
                                                        strokeWidth="0"
                                                        style={{ fill: '#ffffff', opacity: 0.9 }}
                                                    />
                                                )}
                                                {/* Lower Wave (Mirrored) */}
                                                {isPlaying ? (
                                                    <motion.path
                                                        d="M0 25 C 20 25, 30 45, 50 25 S 80 50, 100 25"
                                                        fill="none"
                                                        stroke="#ffffff"
                                                        strokeWidth="0"
                                                        style={{ fill: '#ffffff', opacity: 0.4 }}
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
                                                        stroke="#ffffff"
                                                        strokeWidth="0"
                                                        style={{ fill: '#ffffff', opacity: 0.4 }}
                                                    />
                                                )}
                                            </svg>
                                        </div>

                                        {/* Play/Pause Button */}
                                        <button
                                            onClick={handlePlay}
                                            disabled={!audioElement}
                                            className="w-16 h-16 bg-white/15 rounded-full flex items-center justify-center hover:bg-white/25 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed z-10"
                                        >
                                            {isPlaying ? (
                                                <Pause className="w-7 h-7 text-white" fill="currentColor" />
                                            ) : (
                                                <Play className="w-7 h-7 text-white ml-0.5" fill="currentColor" />
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
                                                        stroke="#ffffff"
                                                        strokeWidth="0"
                                                        style={{ fill: '#ffffff', opacity: 0.9 }}
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
                                                        stroke="#ffffff"
                                                        strokeWidth="0"
                                                        style={{ fill: '#ffffff', opacity: 0.9 }}
                                                    />
                                                )}
                                                {/* Lower Wave (Mirrored) */}
                                                {isPlaying ? (
                                                    <motion.path
                                                        d="M0 25 C 20 45, 50 25, 70 40 S 100 25, 100 25"
                                                        fill="none"
                                                        stroke="#ffffff"
                                                        strokeWidth="0"
                                                        style={{ fill: '#ffffff', opacity: 0.4 }}
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
                                                        stroke="#ffffff"
                                                        strokeWidth="0"
                                                        style={{ fill: '#ffffff', opacity: 0.4 }}
                                                    />
                                                )}
                                            </svg>
                                        </div>
                                    </div>
                                )}
                                {/* End Audio Player */}
                            </div>
                        </motion.div>
                    )}

                    {/* Location Selector / zipcode 选择：仅在有 zip 权限时展示，无权限不显示 */}
                    {backdropReady && hasZipPermission && !hideLocationSelector && !showOnboarding && (
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
                    {backdropReady && !showOnboarding && (
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
                                    {hasAnyAssistantPermission(permissionSet) ? (
                                        <>
                                            {/* Assistant 类型按钮优先显示 */}
                                            {/* 第1个：跳转站内 Chat 页面，仅当具备 MOD_MOD_ASSISTANT、FUNC_FUNC_ASSISTANT_FC_CUSTOM_MADE、METHOD_METHOD_ASSISTANT_FC_CUSTOM_MADE 时显示 */}
                                            {showChatWithLeo && (
                                                <Glass variant="card" className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={onTalkToAssistant}
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                    >
                                                        {renderDefaultAssistantCtaIcon()}
                                                        <span className="text-base font-medium text-[#010101]">{DEFAULT_ASSISTANT_CTA_LABEL}</span>
                                                    </button>
                                                </Glass>
                                            )}
                                            {/* 第2个：Assistant 按钮，仅当具备 MOD_MOD_ASSISTANT、FUNC_FUNC_ASSISTANT_CUSTOM_PROMT、METHOD_METHOD_ASSISTANT_CUSTOM_PROMT 时显示，但当默认 CTA 按钮已显示时不显示 */}
                                            {!showChatWithLeo && hasAllPermissions(permissionSet, ASSISTANT_PROMPT_PERMISSIONS) && (
                                                <Glass variant="card" className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={onOpenAssistantPromptChat}
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                    >
                                                        <MessageCircle className="w-5 h-5 text-[#010101]" />
                                                        <span className="text-base font-medium text-[#010101]">{magnetContext?.assistant_prompt_label || 'Chat With Me'}</span>
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
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
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
                                                    className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
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
                                                className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
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
                                    {hasAnyAssistantPermission(permissionSet) ? (
                                        // 最高优先级：Assistant
                                        <>
                                            <Glass variant="card" className="px-6 py-4">
                                                {ctaLink ? (
                                                    <a
                                                        href={ctaLink}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                    >
                                                        {ctaTextOverride ? <LinkIcon className="w-5 h-5 text-[#010101]" /> : renderDefaultAssistantCtaIcon()}
                                                        <span className="text-base font-medium text-[#010101]">{ctaTextOverride || DEFAULT_ASSISTANT_CTA_LABEL}</span>
                                                    </a>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={onTalkToAssistant}
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                    >
                                                        {ctaTextOverride ? <MessageCircle className="w-5 h-5 text-[#010101]" /> : renderDefaultAssistantCtaIcon()}
                                                        <span className="text-base font-medium text-[#010101]">{ctaTextOverride || DEFAULT_ASSISTANT_CTA_LABEL}</span>
                                                    </button>
                                                )}
                                            </Glass>
                                            {/* Assistant 按钮，仅当具备 MOD_MOD_ASSISTANT、FUNC_FUNC_ASSISTANT_CUSTOM_PROMT、METHOD_METHOD_ASSISTANT_CUSTOM_PROMT 时显示，但当默认 CTA 按钮已显示时不显示 */}
                                            {!ctaLink && !ctaTextOverride && hasAllPermissions(permissionSet, ASSISTANT_PROMPT_PERMISSIONS) && (
                                                <Glass variant="card" className="px-6 py-4">
                                                    <button
                                                        type="button"
                                                        onClick={onOpenAssistantPromptChat}
                                                        className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                    >
                                                        <MessageCircle className="w-5 h-5 text-[#010101]" />
                                                        <span className="text-base font-medium text-[#010101]">{magnetContext?.assistant_prompt_label || 'Chat With Me'}</span>
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
                                                    className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
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
                                                className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
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
                                                className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                            >
                                                {ctaTextOverride ? <LinkIcon className="w-5 h-5 text-[#010101]" /> : renderDefaultAssistantCtaIcon()}
                                                <span className="text-base font-medium text-[#010101]">{ctaTextOverride || DEFAULT_ASSISTANT_CTA_LABEL}</span>
                                            </a>
                                        </Glass>
                                    ) : (
                                        // 最后备选：Talk to Assistant
                                        <Glass variant="card" className="px-6 py-4">
                                            <button
                                                type="button"
                                                onClick={onTalkToAssistant}
                                                className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                            >
                                                {ctaTextOverride ? <MessageCircle className="w-5 h-5 text-[#010101]" /> : renderDefaultAssistantCtaIcon()}
                                                <span className="text-base font-medium text-[#010101]">{ctaTextOverride || DEFAULT_ASSISTANT_CTA_LABEL}</span>
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
