import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mic, ArrowUp, Pause, Music, Search, MessageSquare } from 'lucide-react';

export function MusicChat({ onNavigateToHistory }) {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'assistant',
            text: "Hello! I've analyzed your listening history. How can I help you discover new music today?",
            timestamp: null
        },
        {
            id: 2,
            role: 'user',
            text: "Play something upbeat.",
            timestamp: "SENT 9:42 AM"
        },
        {
            id: 3,
            role: 'assistant',
            text: "Sure. Playing **Solar Power** by Lorde. Would you like similar tracks?",
            timestamp: null,
            song: {
                title: "Solar Power",
                artist: "Lorde",
                albumArt: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop"
            }
        }
    ]);
    const [isPlaying, setIsPlaying] = useState(true);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim()) return;
        
        const userMessage = {
            id: Date.now(),
            role: 'user',
            text: input,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase().replace(' ', ' ')
        };
        
        setMessages(prev => [...prev, userMessage]);
        setInput("");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-gradient-to-b from-blue-50 to-blue-100 w-full h-full overflow-hidden">
            {/* Header */}
            <header className="px-5 py-4 bg-transparent flex-none">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-xs text-gray-500">ONLINE NOW</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            if (onNavigateToHistory) {
                                onNavigateToHistory();
                            }
                        }}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-full flex items-center gap-2 text-sm font-medium shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                        {/* Music Equalizer Icon */}
                        <div className="flex items-end gap-0.5 h-4">
                            <div className="w-0.5 h-2 bg-white rounded-full"></div>
                            <div className="w-0.5 h-3 bg-white rounded-full"></div>
                            <div className="w-0.5 h-2 bg-white rounded-full"></div>
                        </div>
                        <span>PLAYING Daily Mix</span>
                    </button>
                </div>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
                {/* Date Separator */}
                <div className="flex justify-center my-4">
                    <div className="bg-gray-200 text-gray-600 text-xs font-medium px-4 py-1.5 rounded-full">
                        TODAY
                    </div>
                </div>

                {/* Messages */}
                <div className="space-y-4">
                    {/* Assistant Message 1 */}
                    <div className="flex justify-start items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-500"></div>
                        </div>
                        <div className="flex flex-col items-start max-w-[75%]">
                            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                                <p className="text-sm text-gray-800 leading-relaxed">
                                    Hello! I've analyzed your listening history. How can I help you discover new music today?
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* User Message */}
                    <div className="flex justify-end items-start gap-2">
                        <div className="flex flex-col items-end max-w-[75%]">
                            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                                <p className="text-sm text-gray-800">Play something upbeat.</p>
                            </div>
                            <span className="text-xs text-gray-400 mt-1">SENT 9:42 AM</span>
                        </div>
                    </div>

                    {/* Assistant Message 2 with Song */}
                    <div className="flex justify-start items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-500"></div>
                        </div>
                        <div className="flex flex-col items-start max-w-[75%]">
                            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                                <p className="text-sm text-gray-800 leading-relaxed">
                                    Sure. Playing <span className="text-blue-600 font-semibold">Solar Power</span> by Lorde. Would you like similar tracks?
                                </p>
                            </div>

                            {/* Music Player Card - rounded-2xl for card */}
                            <div className="mt-3 bg-white rounded-2xl p-4 shadow-md w-full flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 flex-shrink-0 shadow-sm">
                                    <img 
                                        src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&h=200&fit=crop" 
                                        alt="Solar Power"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-900 text-base truncate">Solar Power</h4>
                                    <p className="text-sm text-gray-500 truncate mt-0.5">Lorde</p>
                                </div>
                                <button
                                    onClick={() => setIsPlaying(!isPlaying)}
                                    className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 hover:bg-blue-700 transition-colors shadow-lg"
                                >
                                    <Pause className="w-6 h-6 text-white" />
                                </button>
                            </div>

                            {/* Action Buttons - rounded-xl for buttons */}
                            <div className="mt-2 flex gap-2 w-full">
                                <button className="flex-1 bg-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                                    <div className="relative w-5 h-5">
                                        <MessageSquare className="w-4 h-4 text-blue-600 absolute" />
                                        <Music className="w-2.5 h-2.5 text-blue-600 absolute bottom-0 right-0" />
                                    </div>
                                    <span className="text-sm text-gray-800 font-medium">Show lyrics</span>
                                </button>
                                <button className="flex-1 bg-white rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm hover:shadow-md transition-all">
                                    <div className="relative w-5 h-5">
                                        <Search className="w-4 h-4 text-blue-600 absolute" />
                                        <div className="w-2 h-2 bg-blue-600 rounded-full absolute -top-0.5 -right-0.5 border border-white"></div>
                                    </div>
                                    <span className="text-sm text-gray-800 font-medium">Who is this artist?</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div ref={messagesEndRef} className="h-4" />
            </div>

            {/* Input Bar - rounded-2xl */}
            <div className="px-4 pb-6 pt-2 bg-transparent flex-none">
                <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        className="flex-1 bg-transparent border-none outline-none text-gray-800 text-sm placeholder:text-gray-400"
                    />
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <Mic className="w-5 h-5 text-black" />
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                    >
                        <ArrowUp className="w-5 h-5 text-white" />
                    </button>
                </div>
                {/* Home Indicator */}
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3"></div>
            </div>
        </div>
    );
}
