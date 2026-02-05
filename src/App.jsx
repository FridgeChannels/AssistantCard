import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileContainer } from './components/layout/MobileContainer';
import { InputSection } from './components/interaction/InputSection';
import { AnswerCard } from './components/cards/AnswerCard';
import { TextMeSheet } from './components/escalation/TextMeSheet';
import { IdentitySelector } from './components/onboarding/IdentitySelector';
import { StarterQuestions } from './components/chat/StarterQuestions';
import { MorningBriefing } from './components/briefing/MorningBriefing';
import { MusicChat } from './components/chat/MusicChat';
import { History } from './components/history/History';
import { AssistantPromptChat } from './components/briefing/AssistantPromptChat';
import { sendChatMessageStream, sendAssistantPromptMessageStream } from './lib/chatService';
import { getAgentInfo } from './lib/agentService';
import { getRelatedQuestions } from './lib/relatedQuestionsService';
import { updateMagnetZip } from './lib/locationService';
import { logUserAction, logChatMessage } from './lib/loggingService';
import { pageTimeTracker } from './lib/pageTimeTracker';
import { Info, ArrowLeft } from 'lucide-react';

/**
 * Parse answer text to extract answer_method from [method] prefix
 * @param {string} text - The answer text
 * @returns {{text: string, answerMethod: string|null}} - Cleaned text and extracted answerMethod
 */
function parseAnswerWithMethod(text) {
  if (!text || typeof text !== 'string') {
    return { text: text || '', answerMethod: null };
  }

  // Match [method] at the beginning of the text
  const methodMatch = text.match(/^\[([^\]]+)\]/);
  if (methodMatch) {
    const answerMethod = methodMatch[1].trim().toLowerCase();
    // Remove the [method] prefix from the text
    const cleanedText = text.substring(methodMatch[0].length).trim();
    return { text: cleanedText, answerMethod };
  }

  return { text, answerMethod: null };
}

function App({ cId = '', sn = '', magnetContext = null }) {
  const [page, setPage] = useState('briefing'); // 'selector' | 'briefing' | 'chat' | 'assistantPromptChat' | 'musicChat' | 'history'
  const [userRole, setUserRole] = useState('buyer'); // 'buyer' | 'seller' | null - 默认设为 buyer
  const [selectedLocation, setSelectedLocation] = useState(null); // Location selection for Morning Briefing
  const [chatHistory, setChatHistory] = useState([]); // Array of { question, answer }
  const [isTyping, setIsTyping] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [conversationId, setConversationId] = useState(''); // 用于保持对话上下文
  const [currentAnswer, setCurrentAnswer] = useState(''); // 用于流式更新当前答案
  const [retryQuestion, setRetryQuestion] = useState(''); // 用于存储需要重试的问题
  const [agentInfo, setAgentInfo] = useState({ phone: '', email: '', name: 'James' }); // 代理联系信息
  const [starterQuestions, setStarterQuestions] = useState([]); // 存储预加载的推荐问题
  const [isLoadingStarterQuestions, setIsLoadingStarterQuestions] = useState(false); // 推荐问题加载状态
  const hasPreloadedQuestionsRef = useRef(false); // 标记是否已经懒加载过推荐问题
  const playContentCacheRef = useRef(null); // 缓存播放内容，避免重复请求
  const isLoadingPlayContentRef = useRef(false); // 标记是否正在加载播放内容，防止并发请求
  const hasLoggedPageEnterRef = useRef(false); // 标记是否已记录页面进入日志

  const messagesEndRef = useRef(null);
  const answerStartRef = useRef(null); // 用于定位答案开始位置
  const prevChatHistoryLengthRef = useRef(0); // 记录上一次的 chatHistory 长度
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
          if (endIdx === -1) {
            return;
          }
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

  // Reset state when role changes or cId changes
  useEffect(() => {
    setChatHistory([]);
    setConversationId('');
    setCurrentAnswer('');
    streamPrefixCheckedRef.current = false;
    setStarterQuestions([]); // 重置推荐问题
    hasPreloadedQuestionsRef.current = false; // 重置懒加载标记
    playContentCacheRef.current = null; // 重置播放内容缓存（cId变化时需要重新加载）
    isLoadingPlayContentRef.current = false; // 重置加载状态
    prevChatHistoryLengthRef.current = 0; // 重置历史长度记录
  }, [userRole, cId]);

  // 获取代理信息
  useEffect(() => {
    const fetchAgentInfo = async () => {
      const cta = magnetContext?.cta || null;
      if (cta) {
        setAgentInfo({
          phone: cta.phone || '',
          email: cta.email || '',
          name: cta.name || 'James',
        });
        return;
      }
      if (cId) {
        const info = await getAgentInfo(cId);
        if (info) {
          setAgentInfo(info);
        } else {
          // 如果查询失败，使用默认值
          setAgentInfo({ phone: '', email: '', name: 'James' });
        }
      }
    };
    fetchAgentInfo();
  }, [cId, magnetContext]);

  // 记录页面进入日志（只记录一次）
  useEffect(() => {
    if (cId && !hasLoggedPageEnterRef.current) {
      hasLoggedPageEnterRef.current = true;

      logUserAction({
        cId: cId,
        actionType: 'page_enter',
        context: {
          enterTime: new Date().toISOString(),
          referrer: document.referrer || 'direct',
          url: window.location.href,
        },
      });
    }
  }, [cId]);

  // 追踪页面切换
  useEffect(() => {
    if (cId && page) {
      pageTimeTracker.startTracking(page, cId);
    }
  }, [page, cId]);

  useEffect(() => {
    return () => {
      stopStreamTimer();
    };
  }, []);

  const handleRoleSelect = (role) => {
    setUserRole(role);
    if (role === 'buyer') {
      setPage('briefing');
    } else {
      setPage('chat');
    }
  };

  const handleTalkToAssistant = () => {
    setPage('chat');
  };

  const handleOpenAssistantPromptChat = () => {
    setPage('assistantPromptChat');
  };

  const handleNavigateToHistory = () => {
    setPage('history');
  };

  const handleBackFromHistory = () => {
    setPage('chat');
  };

  const handleBackToBriefing = () => {
    setPage('briefing');
  };

  // 只在添加新消息时滚动到答案开始位置，流式更新和答案完成时不自动滚动
  useEffect(() => {
    const currentLength = chatHistory.length;
    const prevLength = prevChatHistoryLengthRef.current;

    // 只在添加新消息时（长度增加）滚动到答案开始位置
    if (currentLength > prevLength) {
      // 使用 requestAnimationFrame 确保 DOM 已更新
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (answerStartRef.current) {
            answerStartRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }

    // 更新记录的长度
    prevChatHistoryLengthRef.current = currentLength;
  }, [chatHistory.length]); // 只依赖长度，不依赖整个 chatHistory

  const handleSearch = (query) => {
    if (!cId) {
      console.error('客户ID (cId) 未提供，无法发送消息');
      alert('错误：客户ID未配置，请检查URL参数');
      return;
    }

    // 清除重试问题
    setRetryQuestion('');

    // 记录开始时间，用于计算响应时间
    const startTime = Date.now();

    // 添加用户问题到历史记录（临时，等待答案）
    const tempAnswer = { text: '', type: 'loading', relatedQuestions: [] };
    setChatHistory(prev => [...prev, { question: query, answer: tempAnswer }]);
    setIsTyping(true);
    setCurrentAnswer('');
    streamPrefixCheckedRef.current = false;

    // 立即开始获取推荐问题（接口A）- 在回答渲染时就开始请求
    getRelatedQuestions(cId, conversationId).then(questions => {
      if (questions && questions.length > 0) {
        // 更新最后一条消息的推荐问题
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory.length > 0) {
            const currentAnswer = newHistory[newHistory.length - 1].answer || {};
            newHistory[newHistory.length - 1] = {
              ...newHistory[newHistory.length - 1],
              answer: {
                ...currentAnswer,
                relatedQuestions: questions,
              }
            };
          }
          return newHistory;
        });
      }
    }).catch(error => {
      console.error('获取推荐问题失败:', error);
      // 失败时不显示推荐问题（不设置默认值）
    });

// 根据当前页面选择API
    const isAssistantPromptChat = page === 'assistantPromptChat';
    const chatApiFunction = isAssistantPromptChat ? sendAssistantPromptMessageStream : sendChatMessageStream;
    
    // 调用 chat API
    chatApiFunction(
      query,
      cId,
      conversationId,
      // onChunk: 接收到数据块时更新当前答案（纯文本格式）
      (chunk) => {
        streamQueueRef.current += chunk;
        startStreamTimer();
      },
      // onComplete: 完成时保存最终答案和 conversation_id
      (finalAnswer, newConversationId, answerMethodFromAPI) => {
        // 只有在非Assistant Prompt页面时才更新conversationId
        if (!isAssistantPromptChat) {
          setConversationId(newConversationId);
        }
        
        setIsTyping(false);
        streamQueueRef.current = '';
        stopStreamTimer();
        streamPrefixCheckedRef.current = false;

        // 计算响应时间
        const responseTime = Date.now() - startTime;

        // 从 chatHistory 中获取已有的 answerMethod（可能在流式过程中已经提取）
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory.length > 0) {
            const currentAnswer = newHistory[newHistory.length - 1].answer || {};
            const existingAnswerMethod = currentAnswer.answerMethod;

            // 解析最终答案，移除 [method] 前缀
            const parsed = parseAnswerWithMethod(finalAnswer);
            let answerText = parsed.text;

            // 确定最终的 answerMethod：优先级 API > 已有 > 解析
            const finalAnswerMethod = answerMethodFromAPI || existingAnswerMethod || parsed.answerMethod;
            const normalizedAnswerMethod = finalAnswerMethod ? finalAnswerMethod.toString().toLowerCase().trim() : null;

            // Check if this is an error response
            const isErrorResponse = (!normalizedAnswerMethod && (!answerText ||
              answerText === "I'm sorry, I didn't receive a valid response. Please try again." ||
              answerText.trim() === ''));

            if (isErrorResponse) {
              const failedQuestion = newHistory[newHistory.length - 1].question;
              if (failedQuestion) {
                setRetryQuestion(failedQuestion);
              }
              newHistory[newHistory.length - 1] = {
                ...newHistory[newHistory.length - 1],
                answer: {
                  text: answerText || "I'm sorry, I didn't receive a valid response. Please try again.",
                  type: 'error',
                  relatedQuestions: [],
                }
              };
            } else {
              setRetryQuestion('');
              const existingRelatedQuestions = currentAnswer.relatedQuestions || [];

              newHistory[newHistory.length - 1] = {
                ...newHistory[newHistory.length - 1],
                answer: {
                  text: answerText || '',
                  type: 'result',
                  answerMethod: normalizedAnswerMethod,
                  relatedQuestions: existingRelatedQuestions,
                }
              };

              // 记录聊天日志（只在成功时记录）
              logChatMessage({
                cId: cId,
                conversationId: isAssistantPromptChat ? conversationId : newConversationId,
                question: query,
                answer: answerText,
                answerMethod: normalizedAnswerMethod,
                responseTimeMs: responseTime,
              });

              // 记录用户行为日志
              logUserAction({
                cId: cId,
                actionType: isAssistantPromptChat ? 'assistant_prompt_chat' : 'chat',
                conversationId: isAssistantPromptChat ? conversationId : newConversationId,
                questionText: query,
                context: {
                  answerMethod: normalizedAnswerMethod,
                  responseTimeMs: responseTime,
                },
              });
            }
          }
          return newHistory;
        });

        setCurrentAnswer('');
      },
      // onError: 错误处理
      (error) => {
        console.error(`${isAssistantPromptChat ? 'Assistant Prompt' : 'Chat'} API 调用失败:`, error);
        setIsTyping(false);
        streamQueueRef.current = '';
        stopStreamTimer();
        setCurrentAnswer('');
        streamPrefixCheckedRef.current = false;

        // 获取错误消息
        const errorMessage = error.message || 'Sorry, an error occurred while sending the message. Please try again.';

        // 更新最后一条消息显示错误，并获取失败的问题用于重试
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory.length > 0) {
            const failedQuestion = newHistory[newHistory.length - 1].question;

            // 将问题复制到输入框，方便用户重试
            if (failedQuestion) {
              setRetryQuestion(failedQuestion);
            }

            newHistory[newHistory.length - 1] = {
              ...newHistory[newHistory.length - 1],
              answer: {
                text: errorMessage,
                type: 'error',
                relatedQuestions: [], // 错误时不显示推荐问题
              }
            };
          }
          return newHistory;
        });
      },
      // agentName: 代理名称
      agentInfo.name || 'James'
    );
  };

  const handleTextAgent = () => {
    setIsSheetOpen(true);
  };

  const getLastContext = () => {
    if (chatHistory.length === 0) return `General ${userRole || ''} Inquiry`;
    const lastAnswer = chatHistory[chatHistory.length - 1].answer;
    return `Regarding: ${lastAnswer.text.substring(0, 30)}...`;
  };

  // 获取最后一条guide状态的回答内容（用于接口B）
  const getLastGuideContent = () => {
    if (chatHistory.length === 0) return '';
    // 从后往前查找最后一条guide状态的回答
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const answer = chatHistory[i].answer;
      if (answer && answer.answerMethod) {
        const method = answer.answerMethod.toString().toLowerCase().trim();
        if (method === 'guide' || method === 'guide/direct' || method === 'direct') {
          return answer.text || '';
        }
      }
    }
    // 如果没找到guide状态，返回最后一条回答
    const lastAnswer = chatHistory[chatHistory.length - 1].answer;
    return lastAnswer?.text || '';
  };

  // Save playback state (current time) when leaving briefing page
  const handleSavePlaybackState = (currentTime) => {
    if (playContentCacheRef.current) {
      playContentCacheRef.current = {
        ...playContentCacheRef.current,
        savedCurrentTime: currentTime
      };
    }
  };

  return (
    <MobileContainer backdropImage="/bg2.png">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <AnimatePresence mode="wait">
          {page === 'selector' ? (
            <motion.div
              key="selector"
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col justify-center overflow-y-auto"
            >
              <IdentitySelector onSelect={handleRoleSelect} cId={cId} />
            </motion.div>
          ) : page === 'briefing' ? (
            <motion.div
              key="briefing"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <MorningBriefing
                onTalkToAssistant={handleTalkToAssistant}
                onOpenAssistantPromptChat={handleOpenAssistantPromptChat}
                cId={cId}
                sn={sn}
                magnetContext={magnetContext}
                hasPreloaded={hasPreloadedQuestionsRef.current}
                cachedPlayContent={playContentCacheRef.current}
                isLoadingPlayContent={isLoadingPlayContentRef.current}
                onQuestionsPreloaded={(questions) => {
                  // 预加载的推荐问题存储到App状态中
                  setStarterQuestions(questions);
                  hasPreloadedQuestionsRef.current = true; // 标记已加载
                }}
                onPlayContentLoaded={(content) => {
                  // 缓存播放内容
                  playContentCacheRef.current = content;
                  isLoadingPlayContentRef.current = false;
                }}
                onPlayContentLoadingChange={(loading) => {
                  // 更新加载状态
                  isLoadingPlayContentRef.current = loading;
                }}
                onSavePlaybackState={handleSavePlaybackState}
                selectedLocation={selectedLocation}
                onLocationSelect={(location) => {
                  setSelectedLocation(location);
                  if (location && location.postcode && cId) {
                    updateMagnetZip(cId, location);
                  }
                }}
              />
            </motion.div>
          ) : page === 'musicChat' ? (
            <motion.div
              key="musicChat"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <MusicChat onNavigateToHistory={handleNavigateToHistory} />
            </motion.div>
          ) : page === 'history' ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <History onBack={handleBackFromHistory} />
            </motion.div>
          ) : page === 'assistantPromptChat' ? (
            <AssistantPromptChat
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              isTyping={isTyping}
              currentAnswer={currentAnswer}
              handleSearch={handleSearch}
              handleBackToBriefing={handleBackToBriefing}
              agentInfo={agentInfo}
              answerStartRef={answerStartRef}
              messagesEndRef={messagesEndRef}
              retryQuestion={retryQuestion}
              starterQuestions={starterQuestions}
              isLoadingStarterQuestions={isLoadingStarterQuestions}
              conversationId={conversationId}
              cId={cId}
              hasInitialRecommendations={false} // 不显示初始推荐问题
            />
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-1 flex flex-col h-full relative min-h-0"
              style={{ height: '100%', maxHeight: '100dvh' }}
            >
              {/* Header - Apple Style Blur */}
              <header className="px-5 py-3 flex items-center justify-between sticky top-0 z-30 flex-none transition-all duration-300 relative"
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
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-sothebys-navy text-white flex items-center justify-center font-serif text-xs rounded-lg shadow-lg">L</div>
                    <span className="font-semibold text-sothebys-navy tracking-tight drop-shadow-sm">Concierge Leo</span>
                  </div>
                </div>
              </header>

              {/* Scrollable Chat Area */}
              <div className="flex-1 overflow-y-auto px-0 py-6 space-y-2 no-scrollbar scroll-smooth min-h-0">
                {/* Empty State: Center Content */}
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col justify-center items-center pb-32 min-h-0">
                    {/* Welcome Icon */}
                    <div className="mb-6">
                      <div className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-200">
                        <img
                          src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face&q=80"
                          alt="Agent"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    {/* Center Starter Questions */}
                    <StarterQuestions
                      onSelect={handleSearch}
                      cId={cId}
                      conversationId={conversationId}
                      preloadedQuestions={starterQuestions}
                      isLoadingPreloaded={isLoadingStarterQuestions}
                      onQuestionsLoaded={setStarterQuestions}
                      onLoadingChange={setIsLoadingStarterQuestions}
                    />
                  </div>
                )}

                {/* Chat History */}
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
                      onTextJames={() => {
                        setIsSheetOpen(true);
                      }}
                      agentName={agentInfo.name}
                      answerStartRef={isLastMessage ? answerStartRef : null}
                      onNotNow={() => {
                        // Hide the button by updating the answer
                        setChatHistory(prev => {
                          const newHistory = [...prev];
                          if (newHistory[index]) {
                            newHistory[index] = {
                              ...newHistory[index],
                              answer: {
                                ...newHistory[index].answer,
                                answerMethod: null, // Remove answerMethod to hide button
                              }
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

                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Input Area (Pinned Bottom) */}
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

export default App;
