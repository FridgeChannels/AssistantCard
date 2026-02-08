import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { AnswerCard } from '../cards/AnswerCard';
import { InputSection } from '../interaction/InputSection';
import { StarterQuestions } from '../chat/StarterQuestions';
import { Glass } from '../layout/Glass';
import { getHeaderCta } from '../../lib/ctaPermissions';

export function AssistantPromptChat({
  chatHistory,
  setChatHistory,
  isTyping,
  currentAnswer,
  handleSearch,
  handleBackToBriefing,
  agentInfo,
  answerStartRef,
  messagesEndRef,
  retryQuestion,
  starterQuestions,
  isLoadingStarterQuestions,
  conversationId,
  cId,
  hasInitialRecommendations = false,
  magnetContext = null, // CTA 数据与权限，用于 header 右侧单按钮
  onOpenContact, // 联系类 CTA 时打开 TextMeSheet 的回调
}) {
  const isChatEmpty = chatHistory.length === 0;

  return (
    <motion.div
      key="assistant-prompt-chat"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex-1 flex flex-col h-full relative min-h-0"
      style={{ height: '100%', maxHeight: '100dvh' }}
    >
      {/* Header - Apple Style Blur */}
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
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-sothebys-navy text-white flex items-center justify-center font-serif text-xs rounded-lg shadow-lg">L</div>
            <span className="font-semibold text-sothebys-navy tracking-tight drop-shadow-sm">Assistant</span>
          </div>
        </div>
        {/* Header CTA：chat_url > skip_url > 联系，无数据或无权限不展示 */}
        {(() => {
          const headerCta = getHeaderCta(magnetContext?.cta, magnetContext?.solution?.permissions);
          if (!headerCta) return null;
          const isContact = headerCta.type === 'contact';
          const btnClass = 'px-4 py-2 rounded-full text-sm font-medium text-sothebys-navy bg-white/20 backdrop-blur-[20px] hover:bg-white/40 transition-colors border border-gray-200/40';
          return isContact ? (
            <button type="button" onClick={() => onOpenContact?.()} className={btnClass}>
              {headerCta.label}
            </button>
          ) : (
            <a href={headerCta.href} target="_blank" rel="noopener noreferrer" className={btnClass}>
              {headerCta.label}
            </a>
          );
        })()}
      </header>

      {/* Scrollable Chat Area */}
      <div className="flex-1 overflow-y-auto px-0 py-6 space-y-2 no-scrollbar scroll-smooth min-h-0">
        {/* Empty State: Center Content - Only show if hasInitialRecommendations is true */}
        {isChatEmpty && hasInitialRecommendations && (
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
              industryId={magnetContext?.industry_id}
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
              showRelated={false} // Assistant对话中不显示推荐问题
              onTextJames={() => {
                // 处理 Text James 功能
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

      {/* Input Area (Pinned Bottom) - Show additional options when chat ends */}
      <div className="flex-none z-20 px-4 pb-4 pt-2 safe-area-inset-bottom" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}>
        {(chatHistory.length > 0 && !isTyping && !currentAnswer) ? (
          <div className="space-y-3">
            {/* <Glass variant="card" className="px-6 py-4">
              <button
                onClick={handleBackToBriefing}
                className="w-full flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
              >
                <ArrowLeft className="w-5 h-5 text-[#010101]" />
                <span className="text-base font-medium text-[#010101]">Back to Briefing</span>
              </button>
            </Glass> */}
            <InputSection
              onSearch={handleSearch}
              isCompact={true}
              initialValue={retryQuestion}
            />
          </div>
        ) : (
          <InputSection
            onSearch={handleSearch}
            isCompact={chatHistory.length > 0}
            initialValue={retryQuestion}
          />
        )}
      </div>
    </motion.div>
  );
}