import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Play, Pause, AlertCircle, Phone, Mail, MessageSquare } from 'lucide-react';
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

/**
 * `new Audio(url)` 后若立刻 `play()`，常见「响一下就没声」（缓冲未达 HAVE_FUTURE_DATA 即解码/欠载）。
 * 等到 canplay / canplaythrough 再播，与「停一次再播就好」的现象一致。
 */
function waitUntilAudioPlayable(audio, timeoutMs = 20000) {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        return Promise.resolve();
    }
    return new Promise((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            audio.removeEventListener('canplay', onCanPlay);
            audio.removeEventListener('canplaythrough', onThrough);
            audio.removeEventListener('error', onErr);
            resolve();
        };
        const onCanPlay = () => finish();
        const onThrough = () => finish();
        const onErr = () => finish();
        const timer = setTimeout(finish, timeoutMs);
        audio.addEventListener('canplay', onCanPlay);
        audio.addEventListener('canplaythrough', onThrough);
        audio.addEventListener('error', onErr);
    });
}

function configurePlaybackAudio(audio) {
    audio.preload = 'auto';
}

function isSameOriginMediaUrl(mediaUrl) {
    if (!mediaUrl) return true;
    try {
        const u = new URL(mediaUrl, window.location.href);
        return u.origin === window.location.origin;
    } catch {
        // 兜底：解析失败时不强制 CORS，避免把可播放的资源“升级”为会失败的 CORS 模式
        return false;
    }
}

function createPlaybackAudio(audioUrl, { startAtSeconds } = {}) {
    const audio = new Audio();
    /**
     * 关键点：
     * - 设置 crossOrigin='anonymous' 会让浏览器以 CORS 模式加载媒体；
     * - 如果 mp3 服务器没返回 Access-Control-Allow-Origin，就会“直接无法播放”，并报 CORS Error。
     *
     * 因此这里只在“同源媒体”时才开启 crossOrigin，保证 /p/:sn 页面跨域 mp3 也能正常播放；
     * 需要频谱/硬件光晕分析时，跨域资源会在 useHardwareAmbientGlow 内自动降级为 fallback。
     */
    if (typeof window !== 'undefined' && isSameOriginMediaUrl(audioUrl)) {
        audio.crossOrigin = 'anonymous';
    }
    audio.src = audioUrl;
    configurePlaybackAudio(audio);
    if (startAtSeconds) audio.currentTime = startAtSeconds;
    return audio;
}

function prefersReducedMotion() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function clamp01(x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return x;
}

function SpectrumGlyph({ className = '' }) {
    const reduced = prefersReducedMotion();
    const bars = [
        { h: [0.25, 0.9, 0.35, 0.8, 0.3], d: 0.95, delay: 0.0 },
        { h: [0.15, 0.7, 0.25, 0.85, 0.2], d: 1.1, delay: 0.12 },
        { h: [0.35, 1.0, 0.4, 0.95, 0.3], d: 0.9, delay: 0.06 },
        { h: [0.2, 0.75, 0.25, 0.8, 0.18], d: 1.05, delay: 0.18 },
        { h: [0.28, 0.88, 0.32, 0.78, 0.24], d: 0.98, delay: 0.09 },
    ];

    return (
        <span aria-hidden className={`inline-flex items-end gap-[3px] h-5 ${className}`}>
            {bars.map((b, idx) => (
                <motion.span
                    // eslint-disable-next-line react/no-array-index-key
                    key={idx}
                    className="w-[3px] h-5 rounded-full bg-white/95"
                    style={{ transformOrigin: 'bottom' }}
                    animate={reduced ? undefined : { scaleY: b.h }}
                    initial={reduced ? undefined : { scaleY: b.h[0] }}
                    transition={reduced ? undefined : { duration: b.d, repeat: Infinity, ease: 'easeInOut', delay: b.delay }}
                />
            ))}
        </span>
    );
}

/**
 * 首段缓冲播完后若后续数据未到会「假播放」：监听 waiting/stalled，续缓冲后自动 play() 恢复。
 * getPlayIntent 为 true 时表示用户仍处于播放态（未主动暂停、未播完）。
 */
function attachPlayResumeAfterBuffer(audio, getPlayIntent) {
    let awaitingData = false;

    const tryResume = () => {
        if (!awaitingData || !getPlayIntent() || audio.ended) return;
        if (audio.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        audio.play().catch((e) => {
            if (e?.name === 'AbortError') return;
        });
    };

    const onWaiting = () => {
        if (getPlayIntent()) awaitingData = true;
    };
    const onStalled = () => {
        if (getPlayIntent()) awaitingData = true;
    };
    const onProgress = () => {
        if (awaitingData) tryResume();
    };
    const onCanPlay = () => {
        if (awaitingData) tryResume();
    };
    const onPlaying = () => {
        awaitingData = false;
    };
    const onPause = () => {
        if (!getPlayIntent()) awaitingData = false;
    };
    const onEnded = () => {
        awaitingData = false;
    };
    const onEmptied = () => {
        awaitingData = false;
    };

    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('progress', onProgress);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('emptied', onEmptied);

    return () => {
        audio.removeEventListener('waiting', onWaiting);
        audio.removeEventListener('stalled', onStalled);
        audio.removeEventListener('progress', onProgress);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('playing', onPlaying);
        audio.removeEventListener('pause', onPause);
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('emptied', onEmptied);
    };
}

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
    const playIntentRef = useRef(false); // 用户期望在播（含缓冲欠载），供 attachPlayResumeAfterBuffer
    const currentLongTextIndexRef = useRef(null); // longtext 当前展示条索引，卸载/ended 时同步到父 cache
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [showContactOptions, setShowContactOptions] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

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
                    const audio = createPlaybackAudio(audioUrl, { startAtSeconds: cachedPlayContent?.savedCurrentTime });
                    audio.addEventListener('ended', async () => {
                        if (onEnded) console.log('audio ended', { longtext: true });
                        playIntentRef.current = false;
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
                        playIntentRef.current = false;
                        setError('Audio is not ready yet');
                    });
                    // longtext 播完未停兜底：timeupdate 在 ended 未触发时同步 isPlaying
                    if (onEnded) {
                        const onTimeUpdate = () => {
                            if (audio.duration && !Number.isNaN(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration) {
                                playIntentRef.current = false;
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
            // 仅当与缓存里的索引不一致时再通知父组件，避免 setPlayContentCache → 新 props → 本 effect 死循环
            if (onLongTextIndexChange && cachedPlayContent.currentLongTextIndex !== arrayIndex) {
                onLongTextIndexChange(arrayIndex);
            }
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
                const audio = createPlaybackAudio(cachedPlayContent.audio_url, { startAtSeconds: cachedPlayContent.savedCurrentTime });
                audio.addEventListener('ended', async () => {
                    playIntentRef.current = false;
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
                    playIntentRef.current = false;
                    setError('Audio is not ready yet');
                });
                audioRef.current = audio;
                return audio;
            });
        }
    }, [cachedPlayContent, cId, onLongTextIndexChange]);

    // 监听播放器的进度和时长
    useEffect(() => {
        if (!audioElement) return;

        const onTimeUpdate = () => setCurrentTime(audioElement.currentTime);
        const onDurationChange = () => {
            if (!Number.isNaN(audioElement.duration)) {
                setDuration(audioElement.duration);
            }
        };

        setCurrentTime(audioElement.currentTime);
        if (audioElement.readyState > 0 && !Number.isNaN(audioElement.duration)) {
            setDuration(audioElement.duration);
        }

        audioElement.addEventListener('timeupdate', onTimeUpdate);
        audioElement.addEventListener('durationchange', onDurationChange);
        audioElement.addEventListener('loadedmetadata', onDurationChange);

        return () => {
            audioElement.removeEventListener('timeupdate', onTimeUpdate);
            audioElement.removeEventListener('durationchange', onDurationChange);
            audioElement.removeEventListener('loadedmetadata', onDurationChange);
        };
    }, [audioElement]);

    const formatTime = (timeInSeconds) => {
        if (Number.isNaN(timeInSeconds)) return "0:00";
        const totalSeconds = Math.floor(timeInSeconds);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSeek = (e) => {
        if (!audioElement) return;
        const newTime = Number(e.target.value);
        audioElement.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const skipBackward = () => {
        if (!audioElement) return;
        audioElement.currentTime = Math.max(0, audioElement.currentTime - 15);
    };

    const skipForward = () => {
        if (!audioElement) return;
        audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 15);
    };

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
                playIntentRef.current = false;
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
                    const audio = createPlaybackAudio(content.audio_url);
                    audio.addEventListener('ended', () => {
                        if (isOrderSlotList) console.log('audio ended', { orderSlotList: true });
                        playIntentRef.current = false;
                        setIsPlaying(false);
                    });
                    audio.addEventListener('error', (e) => {
                        console.error('Audio loading issue:', e);
                        playIntentRef.current = false;
                        setError('Audio is not ready yet');
                    });
                    if (isOrderSlotList) {
                        const onTimeUpdate = () => {
                            if (audio.duration && !Number.isNaN(audio.duration) && audio.duration > 0 && audio.currentTime >= audio.duration) {
                                playIntentRef.current = false;
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

    useEffect(() => {
        if (!audioElement) return undefined;
        return attachPlayResumeAfterBuffer(audioElement, () => playIntentRef.current);
    }, [audioElement]);

    const handlePlay = async () => {
        if (!audioElement) {
            console.warn('No audio available');
            return;
        }

        if (isPlaying) {
            // 暂停播放
            playIntentRef.current = false;
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
            // 先等到可播再 play，避免首击「只响一截」；再 await play()；pause 打断会抛 AbortError
            try {
                await waitUntilAudioPlayable(audioElement);
                await audioElement.play();
            } catch (err) {
                if (err?.name === 'AbortError') {
                    playIntentRef.current = false;
                    return;
                }
                console.error('Playback issue:', err);
                setError('Unable to play at this time');
                playIntentRef.current = false;
                return;
            }
            playIntentRef.current = true;
            setIsPlaying(true);
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
            {/* Scrim / Gradient Overlay */}
            <motion.div
                initial={{ opacity: 0, y: '50%' }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="absolute bottom-0 left-0 right-0 h-[65%] bg-gradient-to-t from-black/95 via-black/40 to-transparent pointer-events-none z-0"
            />

            <AnimatePresence>
                {showOnboarding && (
                    <ZipCodeOnboarding
                        onSelect={handleOnboardingSelect}
                        onSkip={handleOnboardingSkip}
                    />
                )}
            </AnimatePresence>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-y-auto no-scrollbar relative z-10">
                <div className="flex flex-col items-center px-6 pt-12 pb-12 min-h-full">
                    {/* 背景未就绪或播放内容加载中：与 main.jsx 路由首屏相同的 navy 转圈，视觉与第一段加载一致 */}
                    {!error && (!backdropReady || isLoading) && (
                        <motion.div
                            initial={{ y: 12 }}
                            animate={{ y: 0 }}
                            transition={{ duration: 0.35 }}
                            className="flex flex-col items-center justify-center w-full max-w-md py-16 text-sothebys-navy/80"
                        >
                            <div
                                className="w-8 h-8 border-2 border-sothebys-navy/30 border-t-sothebys-navy rounded-full animate-spin"
                                aria-hidden
                            />
                        </motion.div>
                    )}

                    {/* Error State */}
                    {backdropReady && error && !isLoading && (
                        <motion.div
                            initial={{ y: 20 }}
                            animate={{ y: 0 }}
                            transition={{ duration: 0.4 }}
                            className="w-full max-w-md mb-6"
                        >
                            <Glass variant="panel" className="p-8 flex flex-col items-center justify-center">
                                <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
                                <p className="text-gray-800 font-medium mb-2">Content Coming Soon</p>
                                <p className="text-gray-600 text-sm text-center">{error}</p>
                            </Glass>
                        </motion.div>
                    )}

                    <div className="w-full max-w-md mt-auto flex flex-col gap-6">
                        {/* Content Card */}
                        {backdropReady && playContent && !isLoading && !error && (
                            <motion.div
                                initial={{ y: 20 }}
                                animate={{ y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="w-full"
                            >
                                <div className="px-6 flex flex-col w-full">
                                    <div className="flex flex-col items-start mb-6">
                                        <p className="text-base text-white/80 w-full text-center">
                                            {dateString}
                                        </p>
                                    </div>

                                    {/* Audio Player */}
                                    {!showOnboarding && (
                                        <div className="flex flex-col w-full">
                                            {/* Progress Bar */}
                                            <div className="flex flex-col w-full mb-6">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={duration || 100}
                                                    value={currentTime || 0}
                                                    onChange={handleSeek}
                                                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                                                />
                                                <div className="flex justify-between items-center mt-2 text-xs font-medium text-white/90 font-mono tracking-wider">
                                                    <span>{formatTime(currentTime)}</span>
                                                    <span>{formatTime(duration)}</span>
                                                </div>
                                            </div>

                                            {/* Controls */}
                                            <div className="flex items-center justify-center gap-8">
                                                <button
                                                    type="button"
                                                    onClick={skipBackward}
                                                    className="text-white hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-full p-2"
                                                    aria-label="Back 15 seconds"
                                                >
                                                    <SpectrumGlyph />
                                                </button>
                                                
                                                <button
                                                    onClick={handlePlay}
                                                    disabled={!audioElement}
                                                    className="relative w-16 h-16 border-2 border-white rounded-full flex items-center justify-center hover:bg-white/10 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                                                    aria-label={isPlaying ? 'Pause' : 'Play'}
                                                >
                                                    {isPlaying ? (
                                                        <Pause className="w-6 h-6 text-white relative z-10" fill="currentColor" />
                                                    ) : (
                                                        <Play className="w-6 h-6 text-white ml-1 relative z-10" fill="currentColor" />
                                                    )}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={skipForward}
                                                    className="text-white hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-full p-2"
                                                    aria-label="Forward 15 seconds"
                                                >
                                                    <SpectrumGlyph />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                        {/* Location Selector / zipcode 选择：仅在有 zip 权限时展示，无权限不显示 */}
                        {backdropReady && !isLoading && hasZipPermission && !hideLocationSelector && !showOnboarding && (
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
                        {backdropReady && !isLoading && !showOnboarding && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="w-full space-y-3"
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
                                                <button
                                                        type="button"
                                                        onClick={onTalkToAssistant}
                                                        className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                    >
        <span className="text-base font-bold text-[#010101]">{DEFAULT_ASSISTANT_CTA_LABEL}</span>
    </button>
                                            )}
                                            {/* 第2个：Assistant 按钮，仅当具备 MOD_MOD_ASSISTANT、FUNC_FUNC_ASSISTANT_CUSTOM_PROMT、METHOD_METHOD_ASSISTANT_CUSTOM_PROMT 时显示，但当默认 CTA 按钮已显示时不显示 */}
                                            {!showChatWithLeo && hasAllPermissions(permissionSet, ASSISTANT_PROMPT_PERMISSIONS) && (
                                                <button
                                                        type="button"
                                                        onClick={onOpenAssistantPromptChat}
                                                        className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                    >
        <span className="text-base font-bold text-[#010101]">{magnetContext?.assistant_prompt_label || 'Chat With Me'}</span>
    </button>
                                            )}
                                            {/* 第3个：跳转第三方 URL（chat_url），仅当具备 MOD_MOD_ASSISTANT、FUNC_FUNC_ASSISTANT_CHAT_URL、METHOD_METHOD_ASSISTANT_CHAT_URL 时显示 */}
                                            {showChatUrlButton && cta.chat_url && (
                                                <a
                                                        href={cta.chat_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                    >
        <span className="text-base font-bold text-[#010101]">{cta.name || 'Chat'}</span>
    </a>
                                            )}
                                        </>
                                    ) : showCtaContactButton && (cta.phone || cta.email) ? (
                                        // 如果没有 Assistant 权限但有 Contact 权限，则显示 Contact 按钮 - 中等优先级
                                        <>
                                            <button
                                                    type="button"
                                                    onClick={handleContactButtonClick}
                                                    className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                >
        <span className="text-base font-bold text-[#010101]">{cta.name || 'Contact'}</span>
    </button>
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
                                        <a
                                                href={cta.skip_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                            >
        <span className="text-base font-bold text-[#010101]">{cta.name || 'Link'}</span>
    </a>
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
                                                        className="w-full flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                    >
                                                        <span className="text-base font-medium text-[#010101]">{ctaTextOverride || DEFAULT_ASSISTANT_CTA_LABEL}</span>
                                                    </a>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={onTalkToAssistant}
                                                        className="w-full flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                    >
                                                        <span className="text-base font-medium text-[#010101]">{ctaTextOverride || DEFAULT_ASSISTANT_CTA_LABEL}</span>
                                                    </button>
                                                )}
                                            </Glass>
                                            {/* Assistant 按钮，仅当具备 MOD_MOD_ASSISTANT、FUNC_FUNC_ASSISTANT_CUSTOM_PROMT、METHOD_METHOD_ASSISTANT_CUSTOM_PROMT 时显示，但当默认 CTA 按钮已显示时不显示 */}
                                            {!ctaLink && !ctaTextOverride && hasAllPermissions(permissionSet, ASSISTANT_PROMPT_PERMISSIONS) && (
                                                <button
                                                        type="button"
                                                        onClick={onOpenAssistantPromptChat}
                                                        className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                    >
        <span className="text-base font-bold text-[#010101]">{magnetContext?.assistant_prompt_label || 'Chat With Me'}</span>
    </button>
                                            )}
                                        </>
                                    ) : showCtaContactButton && (cta?.phone || cta?.email) ? (
                                        // 中等优先级：Contact
                                        <>
                                            <button
                                                    type="button"
                                                    onClick={handleContactButtonClick}
                                                    className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                                >
        <span className="text-base font-bold text-[#010101]">{cta?.name || 'Contact'}</span>
    </button>
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
                                        <a
                                                href={cta.skip_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                            >
        <span className="text-base font-bold text-[#010101]">{cta?.name || 'Link'}</span>
    </a>
                                    ) : ctaLink ? (
                                        // 如果以上权限都没有，但有链接，则显示链接
                                        <a
                                                href={ctaLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                            >
        <span className="text-base font-bold text-[#010101]">{ctaTextOverride || DEFAULT_ASSISTANT_CTA_LABEL}</span>
    </a>
                                    ) : (
                                        // 最后备选：Talk to Assistant
                                        <button
                                                type="button"
                                                onClick={onTalkToAssistant}
                                                className="w-full h-14 bg-white rounded-2xl flex items-center justify-center hover:opacity-90 transition-all duration-150 active:scale-[0.97]"
                                            >
        <span className="text-base font-bold text-[#010101]">{ctaTextOverride || DEFAULT_ASSISTANT_CTA_LABEL}</span>
    </button>
                                    )}
                                </>
                            )}
                        </motion.div>
                    )}
                    </div>
                </div>
            </div>
        </div>
    );
}
