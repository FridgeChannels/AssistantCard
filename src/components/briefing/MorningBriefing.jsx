import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mic, Play, Pause } from 'lucide-react';

export function MorningBriefing({ onTalkToAssistant }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const currentDate = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayName = dayNames[currentDate.getDay()];
    const monthName = monthNames[currentDate.getMonth()];
    const day = currentDate.getDate();
    const dateString = `${dayName}, ${monthName} ${day}`;
    
    // 10-word metadata title
    const metadataTitle = "Daily Briefing Morning Update Today News Summary Report Analysis Insights";

    const handlePlay = () => {
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="flex-1 flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
            {/* Header */}
            <header className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-sothebys-navy text-white flex items-center justify-center font-serif text-xs rounded-lg shadow-sm">S</div>
                    <span className="font-semibold text-sothebys-navy tracking-tight">FCAssistant</span>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
                {/* AI Insights Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8 mb-6 min-h-[354px] flex flex-col justify-between"
                >
                    <div className="flex flex-col items-center">
                        {/* Date */}
                        <p className="text-base text-gray-600 text-center mb-4">{dateString}</p>

                        {/* Title */}
                        <h2 className="text-3xl font-bold text-gray-800 text-center mb-8 leading-tight">{metadataTitle}</h2>
                    </div>

                    {/* Audio Player */}
                    <div className="flex items-center justify-center gap-4 mt-auto">
                        {/* Left Waveform */}
                        <div className="flex items-end gap-1 h-12">
                            {[2, 4, 6, 8, 6, 4].map((baseHeight, i) => {
                                const minHeight = Math.max(2, baseHeight - 2);
                                const maxHeight = Math.min(8, baseHeight + 2);
                                return (
                                    <motion.div
                                        key={i}
                                        className="w-1 bg-gray-300 rounded-full"
                                        animate={isPlaying ? {
                                            height: [
                                                `${baseHeight * 4}px`,
                                                `${maxHeight * 4}px`,
                                                `${minHeight * 4}px`,
                                                `${baseHeight * 4}px`
                                            ],
                                        } : {
                                            height: `${baseHeight * 4}px`
                                        }}
                                        transition={{
                                            duration: 0.6 + (i % 3) * 0.2,
                                            repeat: isPlaying ? Infinity : 0,
                                            ease: "easeInOut",
                                            delay: i * 0.05
                                        }}
                                        style={{ height: `${baseHeight * 4}px` }}
                                    />
                                );
                            })}
                        </div>

                        {/* Play/Pause Button */}
                        <button
                            onClick={handlePlay}
                            className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.15)] hover:bg-gray-700 transition-colors flex-shrink-0"
                        >
                            {isPlaying ? (
                                <Pause className="w-7 h-7 text-white" fill="white" />
                            ) : (
                                <Play className="w-7 h-7 text-white ml-0.5" fill="white" />
                            )}
                        </button>

                        {/* Right Waveform */}
                        <div className="flex items-end gap-1 h-12">
                            {[3, 5, 7, 5, 3, 2].map((baseHeight, i) => {
                                const minHeight = Math.max(2, baseHeight - 2);
                                const maxHeight = Math.min(8, baseHeight + 2);
                                return (
                                    <motion.div
                                        key={i}
                                        className="w-1 bg-gray-300 rounded-full"
                                        animate={isPlaying ? {
                                            height: [
                                                `${baseHeight * 4}px`,
                                                `${maxHeight * 4}px`,
                                                `${minHeight * 4}px`,
                                                `${baseHeight * 4}px`
                                            ],
                                        } : {
                                            height: `${baseHeight * 4}px`
                                        }}
                                        transition={{
                                            duration: 0.6 + (i % 3) * 0.2,
                                            repeat: isPlaying ? Infinity : 0,
                                            ease: "easeInOut",
                                            delay: (i + 6) * 0.05
                                        }}
                                        style={{ height: `${baseHeight * 4}px` }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </motion.div>

                {/* Talk to Assistant Button */}
                <motion.button
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    onClick={onTalkToAssistant}
                    className="w-full max-w-md bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] px-6 py-4 flex items-center justify-center gap-3 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] transition-all"
                >
                    <Mic className="w-5 h-5 text-gray-700" />
                    <span className="text-base font-medium text-gray-800">Talk to Assistant</span>
                </motion.button>
            </div>
        </div>
    );
}
