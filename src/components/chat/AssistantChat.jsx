import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, Sparkles } from 'lucide-react';
import { QuickQuestions } from './QuickQuestions';
import { TextMeSheet } from '../escalation/TextMeSheet';
import { cn } from '../../lib/utils';

const MOCK_KB = {
    "closing costs": "Closing costs typically range from 2% to 5% of the purchase price. They include loan origination fees, appraisal fees, title searches, title insurance, surveys, taxes, deed recording fees, and credit report charges.",
    "back out": "If you have an inspection contingency, you can potentialy back out or negotiate repairs if significant issues are found during the inspection period. We should review your specific contract terms.",
    "deposit": "Earnest money deposits are usually 1-3% of the purchase price, held in escrow. This shows the seller you are serious.",
    "timeline": "A typical closing timeline is 30-45 days. Key milestones: Offer Accepted → Inspection (Day 5-10) → Appraisal (Day 15-20) → Loan Approval (Day 25) → Closing (Day 30+).",
    "appraisal": "If the appraisal comes in low, we have options: 1) Negotiate a lower price, 2) You cover the gap, 3) Challenge the appraisal, or 4) Cancel if you have a contingency."
};

const DEFAULT_ANSWER = "That's a great specific question. To be 100% sure based on your file, I recommend asking your agent directly.";

export function AssistantChat({ stage }) {
    const [messages, setMessages] = useState([
        { id: 1, role: 'assistant', text: "Hi! I'm your assistant. I can help with quick questions about the process or your contract. What's on your mind?" }
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showEscalation, setShowEscalation] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSend = (text = input) => {
        if (!text.trim()) return;

        const userMsg = { id: Date.now(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        // Simulate RAG delay
        setTimeout(() => {
            const lowerText = text.toLowerCase();
            let answer = null;
            let shouldEscalate = false;

            // Simple keyword matching
            const match = Object.keys(MOCK_KB).find(k => lowerText.includes(k));

            if (match) {
                answer = MOCK_KB[match];
            } else {
                answer = DEFAULT_ANSWER;
                shouldEscalate = true;
            }

            const botMsg = { id: Date.now() + 1, role: 'assistant', text: answer, isEscalation: shouldEscalate };
            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);

            if (shouldEscalate) {
                setTimeout(() => setShowEscalation(true), 1500);
            }
        }, 1200);
    };

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-white relative">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6" ref={scrollRef}>
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                            "flex w-full",
                            msg.role === 'user' ? "justify-end" : "justify-start"
                        )}
                    >
                        <div className={cn(
                            "max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm",
                            msg.role === 'user'
                                ? "bg-sothebys-navy text-white rounded-br-none"
                                : "bg-gray-100 text-gray-800 rounded-bl-none"
                        )}>
                            {msg.role === 'assistant' && (
                                <div className="flex items-center gap-2 mb-1 opacity-50">
                                    <Sparkles className="w-3 h-3 text-sothebys-navy" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider">Assistant</span>
                                </div>
                            )}
                            {msg.text}
                            {msg.isEscalation && (
                                <button
                                    onClick={() => setShowEscalation(true)}
                                    className="block mt-3 text-xs font-semibold text-sothebys-navy underline decoration-sothebys-navy/30 underline-offset-4"
                                >
                                    Ask Agent for specific details
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}

                {isTyping && (
                    <div className="flex justify-start w-full">
                        <div className="bg-gray-50 rounded-2xl rounded-bl-none px-4 py-3 flex space-x-1 items-center">
                            <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-75" />
                            <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce delay-150" />
                        </div>
                    </div>
                )}
                <div className="h-4" />
            </div>

            <QuickQuestions onSelect={handleSend} stage={stage} />

            <div className="p-4 bg-white border-t border-gray-100">
                <form
                    onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                    className="flex items-center gap-2 bg-gray-50 rounded-full px-2 py-2 pr-2 border border-green-200/0 focus-within:border-sothebys-navy/20 focus-within:bg-white focus-within:shadow-md transition-all"
                >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-none">
                        <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask anything..."
                        className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400 min-w-0"
                    />
                    <button
                        type="disabled"
                        disabled={!input.trim()}
                        className="w-10 h-10 rounded-full bg-sothebys-navy flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-md"
                    >
                        <Send className="w-4 h-4 ml-0.5" />
                    </button>
                </form>
            </div>

            <TextMeSheet
                isOpen={showEscalation}
                onClose={() => setShowEscalation(false)}
                context={messages.length > 0 ? messages[messages.length - 1].text : ""}
            />
        </div>
    );
}
