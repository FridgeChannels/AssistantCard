import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MobileContainer } from './components/layout/MobileContainer';
import { StickyCTA } from './components/layout/StickyCTA';
import { InputSection } from './components/interaction/InputSection';
import { AnswerCard } from './components/cards/AnswerCard';
import { TextMeSheet } from './components/escalation/TextMeSheet';
import { IdentitySelector } from './components/onboarding/IdentitySelector';
import { StarterQuestions } from './components/chat/StarterQuestions';
import { findAnswer } from './lib/mockData';
import { Info, ArrowLeft } from 'lucide-react';

function App() {
  const [userRole, setUserRole] = useState(null); // 'buyer' | 'seller' | null
  const [chatHistory, setChatHistory] = useState([]); // Array of { question, answer }
  const [isTyping, setIsTyping] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const messagesEndRef = useRef(null);

  // Reset state when role changes
  useEffect(() => {
    setChatHistory([]);
  }, [userRole]);

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
      setChatHistory(prev => [...prev, { question: query, answer: result }]);
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
    <MobileContainer className={userRole ? "pb-24" : ""}>
      {/* Header - Apple Style Blur */}
      <header className="px-5 py-3 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-gray-100/50 sticky top-0 z-30 flex-none transition-all duration-300">
        <div className="flex items-center gap-2">
          {userRole && (
            <button
              onClick={() => setUserRole(null)}
              className="mr-1 text-sothebys-navy/70 hover:text-sothebys-navy p-1 hover:bg-black/5 rounded-full transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-7 h-7 bg-sothebys-navy text-white flex items-center justify-center font-serif text-xs rounded-lg shadow-sm">S</div>
          <span className="font-semibold text-sothebys-navy tracking-tight">FCAssistant</span>
        </div>
        <button className="p-2 text-gray-400 hover:text-sothebys-navy hover:bg-black/5 rounded-full transition-colors active:scale-95">
          <Info className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <AnimatePresence mode="wait">
          {!userRole ? (
            <motion.div
              key="selector"
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} // Apple spring curve
              className="flex-1 flex flex-col justify-center overflow-y-auto bg-gray-50/30"
            >
              <IdentitySelector onSelect={setUserRole} />
            </motion.div>
          ) : (
            <motion.div
              key="assistant"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex-1 flex flex-col h-full relative"
              style={{
                backgroundColor: '#F2F2F4', // Light gray matte
                backgroundImage: `
                  radial-gradient(at 100% 0%, rgba(255,255,255,0.8) 0px, transparent 50%),
                  radial-gradient(at 0% 0%, rgba(209,213,219,0.3) 0px, transparent 50%),
                  url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.03'/%3E%3C/svg%3E")
                `
              }}
            >
              {/* Scrollable Chat Area */}
              <div className="flex-1 overflow-y-auto px-0 py-6 space-y-2 no-scrollbar scroll-smooth">
                {/* Empty State: Center Content */}
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col justify-center items-center pb-20">
                    {/* Welcome Icon */}
                    <div className="mb-6 opacity-30">
                      <div className="w-16 h-16 bg-sothebys-navy rounded-full flex items-center justify-center text-white text-3xl font-serif">
                        S
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

                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Input Area (Pinned Bottom) */}
              <div className="flex-none bg-white border-t border-gray-50 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
                <InputSection
                  onSearch={handleSearch}
                  isCompact={chatHistory.length > 0}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {userRole && <StickyCTA onTextAgent={handleTextAgent} />}

      <TextMeSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        context={getLastContext()}
      />
    </MobileContainer>
  );
}

export default App;
