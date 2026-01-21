import React from 'react';
import { motion } from 'framer-motion';

const QUESTIONS = [
    "What are the closing costs?",
    "Can I back out after inspection?",
    "How much deposit do I need?",
    "What if the appraisal is low?",
    "Explain the timeline again"
];

export function QuickQuestions({ onSelect, stage }) {
    return (
        <div className="w-full overflow-x-auto no-scrollbar py-4 pl-4 space-x-3 flex items-center bg-gray-50/50 backdrop-blur-sm sticky top-0 z-10">
            {QUESTIONS.map((q, i) => (
                <motion.button
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => onSelect(q)}
                    className="flex-none bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-sothebys-navy shadow-sm hover:shadow-md hover:border-sothebys-navy/20 active:scale-95 transition-all whitespace-nowrap"
                >
                    {q}
                </motion.button>
            ))}
            <div className="w-4 flex-none" /> {/* Spacer */}
        </div>
    );
}
