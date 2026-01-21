import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const STAGES = [
    { id: 1, label: 'Stage 1: Getting Started' },
    { id: 2, label: 'Stage 2: Pre-Approval' },
    { id: 3, label: 'Stage 3: House Hunting' },
    { id: 4, label: 'Stage 4: Making an Offer' },
    { id: 5, label: 'Stage 5: Under Contract' },
    { id: 6, label: 'Stage 6: Inspection & Review' },
    { id: 7, label: 'Stage 7: Closing Prep' },
    { id: 8, label: 'Stage 8: Closing Day' },
];

export function StageSelector({ currentStage, onStageChange }) {
    const [isOpen, setIsOpen] = React.useState(false);

    const activeStage = STAGES.find(s => s.id === currentStage) || STAGES[0];

    return (
        <div className="relative z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 flex-none">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-6 py-4 outline-none active:bg-gray-50 transition-colors"
            >
                <div className="flex flex-col items-start">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Stage</span>
                    <span className="text-sm font-medium text-sothebys-navy">{activeStage.label}</span>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform duration-300", isOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/20 backdrop-blur-sm top-[3.75rem] z-40"
                        />
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="absolute top-full left-0 right-0 bg-white shadow-xl rounded-b-2xl overflow-hidden z-50 border-t border-gray-100"
                        >
                            <div className="py-2 max-h-[60vh] overflow-y-auto">
                                {STAGES.map((stage) => (
                                    <button
                                        key={stage.id}
                                        onClick={() => {
                                            onStageChange(stage.id);
                                            setIsOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-50 transition-colors",
                                            currentStage === stage.id ? "bg-sothebys-navy/5 text-sothebys-navy font-medium" : "text-gray-600"
                                        )}
                                    >
                                        <span>{stage.label}</span>
                                        {currentStage === stage.id && <Check className="w-4 h-4 text-sothebys-navy" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
