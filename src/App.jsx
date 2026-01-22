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
import { sendChatMessageStream } from './lib/chatService';
import { getAgentInfo } from './lib/agentService';
import { getRelatedQuestions } from './lib/relatedQuestionsService';
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

function App({ cId = '' }) {
  const [page, setPage] = useState('briefing'); // 'selector' | 'briefing' | 'chat' | 'musicChat' | 'history'
  const [userRole, setUserRole] = useState('buyer'); // 'buyer' | 'seller' | null - 默认设为 buyer
  const [chatHistory, setChatHistory] = useState([]); // Array of { question, answer }
  const [isTyping, setIsTyping] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [conversationId, setConversationId] = useState(''); // 用于保持对话上下文
  const [currentAnswer, setCurrentAnswer] = useState(''); // 用于流式更新当前答案
  const [retryQuestion, setRetryQuestion] = useState(''); // 用于存储需要重试的问题
  const [hasExtractedMethod, setHasExtractedMethod] = useState(false); // 标记是否已提取过 [method]
  const [agentInfo, setAgentInfo] = useState({ phone: '', email: '', name: 'James' }); // 代理联系信息
  const [starterQuestions, setStarterQuestions] = useState([]); // 存储预加载的推荐问题
  const [isLoadingStarterQuestions, setIsLoadingStarterQuestions] = useState(false); // 推荐问题加载状态

  const messagesEndRef = useRef(null);

  // Reset state when role changes or cId changes
  useEffect(() => {
    setChatHistory([]);
    setConversationId('');
    setCurrentAnswer('');
    setHasExtractedMethod(false);
    setStarterQuestions([]); // 重置推荐问题
  }, [userRole, cId]);

  // 获取代理信息
  useEffect(() => {
    const fetchAgentInfo = async () => {
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
  }, [cId]);

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

  const handleNavigateToHistory = () => {
    setPage('history');
  };

  const handleBackFromHistory = () => {
    setPage('chat');
  };

  const handleBackToBriefing = () => {
    setPage('briefing');
  };

  // Auto-scroll to bottom when chat history updates
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping]);

  const handleSearch = (query) => {
    if (!cId) {
      console.error('客户ID (cId) 未提供，无法发送消息');
      alert('错误：客户ID未配置，请检查URL参数');
      return;
    }

    // 清除重试问题
    setRetryQuestion('');

    // 添加用户问题到历史记录（临时，等待答案）
    const tempAnswer = { text: '', type: 'loading', relatedQuestions: [] };
    setChatHistory(prev => [...prev, { question: query, answer: tempAnswer }]);
    setIsTyping(true);
    setCurrentAnswer('');
    setHasExtractedMethod(false); // Reset method extraction flag for new question

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

    // 调用 chat API
    sendChatMessageStream(
      query,
      cId,
      conversationId,
      // onChunk: 接收到数据块时更新当前答案（纯文本格式）
      (chunk) => {
        // API returns plain text, not JSON
        const answerText = chunk;

        setCurrentAnswer(prev => {
          // Append chunk to previous answer (streaming)
          let newAnswer = prev + answerText;
          
          // Parse answer_method from [method] prefix (check continuously until found)
          // This ensures [method] is removed as soon as it's detected, not at the end
          let extractedAnswerMethod = null;
          if (!hasExtractedMethod) {
            // Continuously check for [method] prefix in the accumulated text
            // This handles cases where [method] might be split across chunks
            const parsed = parseAnswerWithMethod(newAnswer);
            if (parsed.answerMethod) {
              newAnswer = parsed.text;
              extractedAnswerMethod = parsed.answerMethod;
              setHasExtractedMethod(true); // Mark that we've extracted the method
            }
          } else {
            // If we've already extracted the method, make sure [method] is not in the text
            // This handles edge cases where [method] might appear again
            const parsed = parseAnswerWithMethod(newAnswer);
            if (parsed.answerMethod) {
              newAnswer = parsed.text;
            }
          }
          
          // Check if this looks like an error message (only check for explicit error messages, not empty strings during streaming)
          // Don't set retryQuestion here - wait for onComplete to make final determination
          const isErrorText = newAnswer === "I'm sorry, I didn't receive a valid response. Please try again.";
          
          // 实时更新最后一条消息的答案（保留现有字段）
          // 注意：在流式输出过程中不设置 answerMethod，只在 onComplete 中设置，确保按钮在内容完全渲染后才显示
          setChatHistory(prevHistory => {
            const newHistory = [...prevHistory];
            if (newHistory.length > 0) {
              const currentAnswer = newHistory[newHistory.length - 1].answer || {};
              
              newHistory[newHistory.length - 1] = {
                ...newHistory[newHistory.length - 1],
                answer: {
                  ...currentAnswer,
                  text: newAnswer,
                  type: isErrorText ? 'error' : (currentAnswer.type || 'result'),
                  // Don't set answerMethod during streaming - wait for onComplete
                  // This ensures buttons only appear after content is fully rendered
                  answerMethod: undefined, // Keep undefined during streaming
                  // Clear relatedQuestions only if explicit error message detected
                  relatedQuestions: isErrorText ? [] : (currentAnswer.relatedQuestions || []),
                }
              };
              
            }
            return newHistory;
          });
          return newAnswer;
        });
      },
      // onComplete: 完成时保存最终答案和 conversation_id
      (finalAnswer, newConversationId, answerMethod) => {
        // API returns plain text, not JSON
        let answerText = finalAnswer;

        // Parse answer_method from [method] prefix in the answer text (if not already extracted)
        const parsed = parseAnswerWithMethod(answerText);
        answerText = parsed.text;
        // Use extracted answerMethod if not already set
        if (!answerMethod) {
          answerMethod = parsed.answerMethod;
        }

        // Debug: Log answerMethod to check if it's being received
        console.log('onComplete - answerMethod:', answerMethod, 'parsed:', parsed.answerMethod, 'answerText:', answerText?.substring(0, 50));

        setConversationId(newConversationId);
        setCurrentAnswer(answerText);
        setIsTyping(false);
        
        // Check if this is an error response (empty answer or error message)
        const isErrorResponse = !answerText || 
          answerText === "I'm sorry, I didn't receive a valid response. Please try again." ||
          answerText.trim() === '';
        
        // 更新最后一条消息的最终答案
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory.length > 0) {
            const failedQuestion = newHistory[newHistory.length - 1].question;
            
            // If error response, copy question to input and don't show related questions
            if (isErrorResponse) {
              if (failedQuestion) {
                setRetryQuestion(failedQuestion);
              }
              newHistory[newHistory.length - 1] = {
                ...newHistory[newHistory.length - 1],
                answer: {
                  text: answerText || "I'm sorry, I didn't receive a valid response. Please try again.",
                  type: 'error',
                  relatedQuestions: [], // 错误时不显示推荐问题
                }
              };
            } else {
              // Normal response - clear retry question to ensure input is empty
              setRetryQuestion('');
              
              // Determine if should show James Invite Card based on answer_method
              // Show James Invite Card for "guide", "guide/direct", or "direct"
              // Normalize answerMethod: handle both "guide/direct" and "direct" cases
              const normalizedAnswerMethod = (answerMethod || newHistory[newHistory.length - 1].answer?.answerMethod || '').toString().toLowerCase().trim();
              const shouldShowJamesInvite = normalizedAnswerMethod === 'guide' || 
                                            normalizedAnswerMethod === 'guide/direct' || 
                                            normalizedAnswerMethod === 'direct';
              
              console.log('Checking James Invite Card - answerMethod:', normalizedAnswerMethod, 'original:', answerMethod, 'shouldShow:', shouldShowJamesInvite);
              
              // 获取当前已有的推荐问题（可能在流式渲染时已经获取到了）
              const existingRelatedQuestions = newHistory[newHistory.length - 1].answer?.relatedQuestions || [];
              
              newHistory[newHistory.length - 1] = {
                ...newHistory[newHistory.length - 1],
                answer: {
                  text: answerText,
                  type: 'result',
                  answerMethod: normalizedAnswerMethod, // Store answerMethod for James Invite Card display
                  relatedQuestions: existingRelatedQuestions, // 使用已经获取到的推荐问题（如果没有则为空数组）
                }
              };
              
              // Button will be shown automatically in AnswerCard based on answerMethod
            }
          }
          return newHistory;
        });
      },
      // onError: 错误处理
      (error) => {
        console.error('Chat API 调用失败:', error);
        setIsTyping(false);
        
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
      }
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

  return (
    <MobileContainer>
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
              className="flex-1 flex flex-col justify-center overflow-y-auto bg-gradient-to-b from-gray-50 to-gray-100"
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
                cId={cId}
                onQuestionsPreloaded={(questions) => {
                  // 预加载的推荐问题存储到App状态中
                  setStarterQuestions(questions);
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
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-1 flex flex-col h-full relative bg-gradient-to-b from-gray-50 to-gray-100"
            >
              {/* Header - Apple Style Blur */}
              <header className="px-5 py-3 flex items-center justify-between bg-gradient-to-b from-gray-50 to-gray-100 backdrop-blur-xl sticky top-0 z-30 flex-none transition-all duration-300">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToBriefing}
                    className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/60 backdrop-blur-[20px] transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-900" />
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-sothebys-navy text-white flex items-center justify-center font-serif text-xs rounded-lg shadow-sm">S</div>
                    <span className="font-semibold text-sothebys-navy tracking-tight">FCAssistant</span>
                  </div>
                </div>
              </header>

              {/* Scrollable Chat Area */}
              <div className="flex-1 overflow-y-auto px-0 py-6 space-y-2 no-scrollbar scroll-smooth">
                {/* Empty State: Center Content */}
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col justify-center items-center pb-20">
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
                {chatHistory.map((item, index) => (
                  <AnswerCard
                    key={index}
                    question={item.question}
                    answer={item.answer}
                    onQuestionSelect={handleSearch}
                    showRelated={index === chatHistory.length - 1}
                    onTextJames={() => {
                      setIsSheetOpen(true);
                    }}
                    agentName={agentInfo.name}
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
                ))}

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
              <div className="flex-none z-20 px-4 pb-4">
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
      />
    </MobileContainer>
  );
}

export default App;
