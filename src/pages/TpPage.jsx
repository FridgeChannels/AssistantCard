/**
 * /tp/:id 独立页面：样式与 /p/:sn 完全一致，代码与 App 解耦。
 * :id 为 content_play 表主键 id，由路由层解析为 magnetId 后以 cId 传入。
 */
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileContainer } from '../components/layout/MobileContainer';
import { InputSection } from '../components/interaction/InputSection';
import { AnswerCard } from '../components/cards/AnswerCard';
import { TextMeSheet } from '../components/escalation/TextMeSheet';
import { StarterQuestions } from '../components/chat/StarterQuestions';
import { MorningBriefing } from '../components/briefing/MorningBriefing';
import { AssistantIdentity } from '../components/layout/AssistantIdentity';
import { sendChatMessageStream } from '../lib/chatService';
import { getAgentInfo } from '../lib/agentService';
import { logUserAction, logChatMessage } from '../lib/loggingService';
import { pageTimeTracker } from '../lib/pageTimeTracker';
import { ArrowLeft } from 'lucide-react';

function parseAnswerWithMethod(text) {
  if (!text || typeof text !== 'string') {
    return { text: text || '', answerMethod: null };
  }
  const methodMatch = text.match(/^\[([^\]]+)\]/);
  if (methodMatch) {
    const answerMethod = methodMatch[1].trim().toLowerCase();
    const cleanedText = text.substring(methodMatch[0].length).trim();
    return { text: cleanedText, answerMethod };
  }
  return { text, answerMethod: null };
}

function TpPage({ cId = '', contentPlay = null }) {
  const [page, setPage] = useState('briefing');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [retryQuestion, setRetryQuestion] = useState('');
  const [agentInfo, setAgentInfo] = useState({ phone: '', email: '', name: 'James' });
  const [starterQuestions, setStarterQuestions] = useState([]);
  const [isLoadingStarterQuestions, setIsLoadingStarterQuestions] = useState(false);
  const hasPreloadedQuestionsRef = useRef(false);
  const playContentCacheRef = useRef(null);
  const [playContentCache, setPlayContentCache] = useState(null);
  const isLoadingPlayContentRef = useRef(false);
  const hasLoggedPageEnterRef = useRef(false);

  const answerStartRef = useRef(null);
  const prevChatHistoryLengthRef = useRef(0);
  const streamQueueRef = useRef('');
  const streamTimerRef = useRef(null);
  const streamPrefixCheckedRef = useRef(false);

  const stopStreamTimer = () => {
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }
  };
  const startStreamTimer = () => {
    if (streamTimerRef.current) return;
    streamTimerRef.current = setInterval(() => {
      let pending = streamQueueRef.current;
      if (!pending) {
        stopStreamTimer();
        return;
      }
      if (!streamPrefixCheckedRef.current) {
        const trimmed = pending.trimStart();
        if (trimmed.startsWith('[')) {
          const endIdx = trimmed.indexOf(']');
          if (endIdx === -1) return;
          const rest = trimmed.slice(endIdx + 1).replace(/^\s+/, '');
          pending = rest;
          streamQueueRef.current = rest;
        }
        streamPrefixCheckedRef.current = true;
      }
      const sliceSize = Math.min(Math.max(6, Math.ceil(pending.length / 60)), 64);
      const slice = pending.slice(0, sliceSize);
      streamQueueRef.current = pending.slice(sliceSize);
      setCurrentAnswer(prev => prev + slice);
    }, 30);
  };

  useEffect(() => {
    setChatHistory([]);
    setConversationId('');
    setCurrentAnswer('');
    streamPrefixCheckedRef.current = false;
    setStarterQuestions([]);
    hasPreloadedQuestionsRef.current = false;
    playContentCacheRef.current = null;
    setPlayContentCache(null);
    isLoadingPlayContentRef.current = false;
    prevChatHistoryLengthRef.current = 0;
  }, [cId]);

  useEffect(() => {
    const fetchAgentInfo = async () => {
      if (cId) {
        const info = await getAgentInfo(cId);
        if (info) setAgentInfo(info);
        else setAgentInfo({ phone: '', email: '', name: 'James' });
      }
    };
    fetchAgentInfo();
  }, [cId]);

  useEffect(() => {
    if (cId && !hasLoggedPageEnterRef.current) {
      hasLoggedPageEnterRef.current = true;
      logUserAction({
        cId,
        actionType: 'page_enter',
        context: {
          enterTime: new Date().toISOString(),
          referrer: document.referrer || 'direct',
          url: window.location.href,
        },
      });
    }
  }, [cId]);

  useEffect(() => {
    if (cId && page) pageTimeTracker.startTracking(page, cId);
  }, [page, cId]);

  useEffect(() => {
    return () => stopStreamTimer();
  }, []);

  const handleTalkToAssistant = () => setPage('chat');
  const handleBackToBriefing = () => setPage('briefing');

  useEffect(() => {
    const currentLength = chatHistory.length;
    const prevLength = prevChatHistoryLengthRef.current;
    if (currentLength > prevLength) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (answerStartRef.current) {
            answerStartRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }
    prevChatHistoryLengthRef.current = currentLength;
  }, [chatHistory.length]);

  const handleSearch = (query) => {
    if (!cId) {
      console.error('客户ID (cId) 未提供，无法发送消息');
      alert('错误：客户ID未配置，请检查URL参数');
      return;
    }
    setRetryQuestion('');
    const startTime = Date.now();
    const tempAnswer = { text: '', type: 'loading', relatedQuestions: [] };
    setChatHistory(prev => [...prev, { question: query, answer: tempAnswer }]);
    setIsTyping(true);
    setCurrentAnswer('');
    streamPrefixCheckedRef.current = false;

    sendChatMessageStream(
      query,
      cId,
      conversationId,
      (chunk) => {
        streamQueueRef.current += chunk;
        
        startStreamTimer();
      },
      (finalAnswer, newConversationId, answerMethodFromAPI) => {
        setConversationId(newConversationId);
        setIsTyping(false);
        streamQueueRef.current = '';
        stopStreamTimer();
        streamPrefixCheckedRef.current = false;
        const responseTime = Date.now() - startTime;

        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory.length === 0) return newHistory;
          const currentAnswer = newHistory[newHistory.length - 1].answer || {};
          const existingAnswerMethod = currentAnswer.answerMethod;
          const parsed = parseAnswerWithMethod(finalAnswer);
          const answerText = parsed.text;
          const finalAnswerMethod = answerMethodFromAPI || existingAnswerMethod || parsed.answerMethod;
          const normalizedAnswerMethod = finalAnswerMethod ? String(finalAnswerMethod).toLowerCase().trim() : null;
          const isErrorResponse = (!normalizedAnswerMethod && (!answerText ||
            answerText === "I'm sorry, I didn't receive a valid response. Please try again." ||
            answerText.trim() === ''));

          if (isErrorResponse) {
            const failedQuestion = newHistory[newHistory.length - 1].question;
            if (failedQuestion) setRetryQuestion(failedQuestion);
            newHistory[newHistory.length - 1] = {
              ...newHistory[newHistory.length - 1],
              answer: {
                text: answerText || "I'm sorry, I didn't receive a valid response. Please try again.",
                type: 'error',
                relatedQuestions: [],
              },
            };
          } else {
            setRetryQuestion('');
            newHistory[newHistory.length - 1] = {
              ...newHistory[newHistory.length - 1],
              answer: {
                text: answerText || '',
                type: 'result',
                answerMethod: normalizedAnswerMethod,
                relatedQuestions: currentAnswer.relatedQuestions || [],
              },
            };
            logChatMessage({
              cId,
              conversationId: newConversationId,
              question: query,
              answer: answerText,
              answerMethod: normalizedAnswerMethod,
              responseTimeMs: responseTime,
            });
            logUserAction({
              cId,
              actionType: 'chat',
              conversationId: newConversationId,
              questionText: query,
              context: { answerMethod: normalizedAnswerMethod, responseTimeMs: responseTime },
            });
          }
          return newHistory;
        });
        setCurrentAnswer('');
      },
      (error) => {
        console.error('Chat API 调用失败:', error);
        setIsTyping(false);
        streamQueueRef.current = '';
        stopStreamTimer();
        setCurrentAnswer('');
        streamPrefixCheckedRef.current = false;
        const errorMessage = error.message || 'Sorry, an error occurred while sending the message. Please try again.';
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory.length > 0) {
            const failedQuestion = newHistory[newHistory.length - 1].question;
            if (failedQuestion) setRetryQuestion(failedQuestion);
            newHistory[newHistory.length - 1] = {
              ...newHistory[newHistory.length - 1],
              answer: { text: errorMessage, type: 'error', relatedQuestions: [] },
            };
          }
          return newHistory;
        });
      },
      agentInfo.name || 'James'
    );
  };

  const getLastContext = () => {
    if (chatHistory.length === 0) return 'General buyer Inquiry';
    const lastAnswer = chatHistory[chatHistory.length - 1].answer;
    return `Regarding: ${lastAnswer.text.substring(0, 30)}...`;
  };

  const getLastGuideContent = () => {
    if (chatHistory.length === 0) return '';
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const answer = chatHistory[i].answer;
      if (answer?.answerMethod) {
        const method = String(answer.answerMethod).toLowerCase().trim();
        if (method === 'guide' || method === 'guide/direct' || method === 'direct') {
          return answer.text || '';
        }
      }
    }
    const lastAnswer = chatHistory[chatHistory.length - 1].answer;
    return lastAnswer?.text || '';
  };

  // 兼容第二参数 longTextIndex（TpPage 无 longtext 列表，仅用 currentTime）
  const handleSavePlaybackState = (currentTime, _longTextIndex) => {
    if (!playContentCacheRef.current) return;
    const prev = playContentCacheRef.current;
    const next = { ...prev, savedCurrentTime: currentTime };
    if (prev.savedCurrentTime === next.savedCurrentTime) return;
    playContentCacheRef.current = next;
    setPlayContentCache(next);
  };

  // tp/:id 使用 content_play 表的数据作为播放内容来源
  const initialPlayContent = contentPlay
    ? {
        id: contentPlay.id,
        title:
          contentPlay.display_title ||
          contentPlay.generated_play_text ||
          contentPlay.original_title ||
          contentPlay.original_content ||
          'Daily Briefing',
        audio_url: contentPlay.audio_url,
        created_at: contentPlay.created_at,
      }
    : playContentCache;

  const ctaText = contentPlay?.cta_text || undefined;
  const ctaLink = contentPlay?.cta_link || undefined;

  return (
    <MobileContainer backdropImage="/bg7.png">
      <div className="flex-1 flex flex-col min-h-0 relative">
        <AnimatePresence mode="wait">
          {page === 'briefing' ? (
            <motion.div
              key="briefing"
              initial={{ x: 50 }}
              animate={{ x: 0 }}
              exit={{ x: -50 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <MorningBriefing
                onTalkToAssistant={handleTalkToAssistant}
                cId={cId}
                hideLocationSelector={true}
                disableRelatedQuestions={true}
                ctaTextOverride={ctaText}
                ctaLink={ctaLink}
                hasPreloaded={hasPreloadedQuestionsRef.current}
                cachedPlayContent={initialPlayContent}
                isLoadingPlayContent={isLoadingPlayContentRef.current}
                onQuestionsPreloaded={(questions) => {
                  setStarterQuestions(questions);
                  hasPreloadedQuestionsRef.current = true;
                }}
                onPlayContentLoaded={(content) => {
                  playContentCacheRef.current = content;
                  setPlayContentCache(content);
                  isLoadingPlayContentRef.current = false;
                }}
                onPlayContentLoadingChange={(loading) => {
                  isLoadingPlayContentRef.current = loading;
                }}
                onSavePlaybackState={handleSavePlaybackState}
                selectedLocation={selectedLocation}
                onLocationSelect={setSelectedLocation}
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="flex-1 flex flex-col h-full relative min-h-0"
              style={{ height: '100%', maxHeight: '100dvh' }}
            >
              <header
                className="px-5 py-3 flex items-center justify-between sticky top-0 z-30 flex-none transition-all duration-300 relative"
                style={{
                  background: 'transparent',
                  backdropFilter: 'none',
                  WebkitBackdropFilter: 'none',
                  backgroundColor: 'transparent',
                  borderBottom: 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToBriefing}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/20 backdrop-blur-[20px] transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-sothebys-navy drop-shadow-sm" />
                  </button>
                  <AssistantIdentity
                    label="Bruce Lee"
                    imageClassName="shadow-lg"
                    textClassName="drop-shadow-sm"
                  />
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-0 py-6 space-y-2 no-scrollbar scroll-smooth min-h-0">
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col justify-center items-center pb-32 min-h-0">
                    <div className="mb-6">
                      <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-200">
                        <img
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face&q=80"
                          alt="Agent"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <StarterQuestions
                      onSelect={handleSearch}
                      cId={cId}
                      conversationId={conversationId}
                      preloadedQuestions={starterQuestions}
                      isLoadingPreloaded={isLoadingStarterQuestions}
                      onQuestionsLoaded={setStarterQuestions}
                      onLoadingChange={setIsLoadingStarterQuestions}
                      skipFetch={true}
                    />
                  </div>
                )}

                {chatHistory.map((item, index) => {
                  const isLastMessage = index === chatHistory.length - 1;
                  const displayAnswer = (isLastMessage && isTyping)
                    ? { ...item.answer, text: currentAnswer || '' }
                    : item.answer;
                  return (
                    <AnswerCard
                      key={index}
                      question={item.question}
                      answer={displayAnswer}
                      onQuestionSelect={handleSearch}
                      showRelated={isLastMessage}
                      onTextJames={() => setIsSheetOpen(true)}
                      agentName={agentInfo.name}
                      answerStartRef={isLastMessage ? answerStartRef : null}
                      onNotNow={() => {
                        setChatHistory(prev => {
                          const newHistory = [...prev];
                          if (newHistory[index]) {
                            newHistory[index] = {
                              ...newHistory[index],
                              answer: { ...newHistory[index].answer, answerMethod: null },
                            };
                          }
                          return newHistory;
                        });
                      }}
                    />
                  );
                })}

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="px-8 py-4 flex items-center gap-2 text-gray-400"
                  >
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75" />
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150" />
                  </motion.div>
                )}
                <div className="h-4" />
              </div>

              <div className="flex-none z-20 px-4 pb-4 pt-2 safe-area-inset-bottom" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
                <InputSection
                  onSearch={handleSearch}
                  isCompact={chatHistory.length > 0}
                  initialValue={retryQuestion}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <TextMeSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        context={getLastContext()}
        guideContent={getLastGuideContent()}
        agentName={agentInfo.name}
        phone={agentInfo.phone}
        email={agentInfo.email}
        cId={cId}
      />
    </MobileContainer>
  );
}

export default TpPage;
