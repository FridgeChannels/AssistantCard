import React, { useState, useRef, useEffect } from 'react';
import { Mic, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Glass } from '../layout/Glass';

export function InputSection({ onSearch, isCompact, initialValue = "" }) {
    const [input, setInput] = useState(initialValue);
    const inputRef = useRef(null);

    // Update input when initialValue changes
    useEffect(() => {
        // Always sync with initialValue, whether it's empty or has a value
        setInput(initialValue || '');
        // Focus input when value is set from outside (and not empty)
        if (initialValue) {
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        }
    }, [initialValue]);

    const handleSend = () => {
        if (!input.trim()) return;
        onSearch(input);
        setInput("");
    };

    const handleMicClick = () => {
        // 处理麦克风点击
        console.log('Mic clicked');
    };

    const handleContainerClick = (e) => {
        // 如果点击的不是输入框或按钮，则聚焦输入框
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
            inputRef.current?.focus();
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <motion.div
            layout
            onClick={handleContainerClick}
            className="w-full max-w-[90%] mx-auto cursor-pointer"
        >
            <Glass variant="pill" className="p-0">
                <div className="flex items-center px-4 py-2 space-x-3 w-full">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        onClick={(e) => {
                            e.stopPropagation();
                            inputRef.current?.focus();
                        }}
                        placeholder="What are you worried about?"
                        className={cn(
                            "flex-1 bg-transparent border-none outline-none text-base cursor-text transition-colors",
                            input.trim() ? "text-[#010101]" : "text-[#010101]/60",
                            "placeholder:text-[#010101]/40"
                        )}
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                    />
                    {/* <button
                        onClick={handleMicClick}
                        className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
                    >
                        <Mic className="w-5 h-5 text-black" />
                    </button> */}
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="w-10 h-10 rounded-full bg-[#007AFF] flex items-center justify-center hover:bg-[#0062cc] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
                    >
                        <ArrowUp className="w-5 h-5 text-white" />
                    </button>
                </div>
            </Glass>
        </motion.div>
    );
}
