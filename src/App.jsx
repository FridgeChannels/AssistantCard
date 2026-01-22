import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileContainer } from './components/layout/MobileContainer';
import { InputSection } from './components/interaction/InputSection';
import { AnswerCard } from './components/cards/AnswerCard';
import { JamesInviteCard } from './components/cards/JamesInviteCard';
import { TextMeSheet } from './components/escalation/TextMeSheet';
import { IdentitySelector } from './components/onboarding/IdentitySelector';
import { StarterQuestions } from './components/chat/StarterQuestions';
import { MorningBriefing } from './components/briefing/MorningBriefing';
import { MusicChat } from './components/chat/MusicChat';
import { History } from './components/history/History';
import { findAnswer } from './lib/mockData';
import { Info, ArrowLeft } from 'lucide-react';

function App() {
  const [page, setPage] = useState('selector'); // 'selector' | 'briefing' | 'chat' | 'musicChat' | 'history'
  const [userRole, setUserRole] = useState(null); // 'buyer' | 'seller' | null
  const [chatHistory, setChatHistory] = useState([]); // Array of { question, answer }
  const [isTyping, setIsTyping] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [showJamesInvite, setShowJamesInvite] = useState(false);

  const messagesEndRef = useRef(null);

  // Reset state when role changes
  useEffect(() => {
    setChatHistory([]);
    setShowJamesInvite(false);
  }, [userRole]);

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
    setIsTyping(true);

    setTimeout(() => {
      const result = findAnswer(query);
      setChatHistory(prev => {
        const newHistory = [...prev, { question: query, answer: result }];
        // 每三轮对话后显示 James 邀请（第3、6、9、12...轮）
        if (newHistory.length > 0 && newHistory.length % 3 === 0) {
          setShowJamesInvite(true);
        }
        return newHistory;
      });
      setIsTyping(false);
    }, 800);
  };

  const handleTextAgent = () => {
    setIsSheetOpen(true);
  };

  const getLastContext = () => {
    if (chatHistory.length === 0) return `General ${userRole || ''} Inquiry`;
    const lastAnswer = chatHistory[chatHistory.length - 1].answer;
    return `Regarding: ${lastAnswer.text.substring(0, 30)}...`;
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
              <IdentitySelector onSelect={handleRoleSelect} />
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
              <MorningBriefing onTalkToAssistant={handleTalkToAssistant} />
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
                    <StarterQuestions onSelect={handleSearch} />
                  </div>
                )}

                {/* Chat History */}
                {chatHistory.map((item, index) => (
                  <AnswerCard
                    key={index}
                    question={item.question}
                    answer={item.answer}
                    isFallback={item.answer?.isFallback}
                    onAction={() => setIsSheetOpen(true)}
                    onQuestionSelect={handleSearch}
                    showRelated={index === chatHistory.length - 1}
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

                {/* James Invite Card - Show every 3 rounds of conversation */}
                {showJamesInvite && chatHistory.length > 0 && chatHistory.length % 3 === 0 && (
                  <JamesInviteCard
                    onTextJames={() => {
                      setIsSheetOpen(true);
                      setShowJamesInvite(false);
                    }}
                    onNotNow={() => {
                      setShowJamesInvite(false);
                    }}
                  />
                )}

                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Input Area (Pinned Bottom) */}
              <div className="flex-none z-20 px-4 pb-4">
                <InputSection
                  onSearch={handleSearch}
                  isCompact={chatHistory.length > 0}
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
      />
    </MobileContainer>
  );
}

export default App;
