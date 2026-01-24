import React from 'react';
import { motion } from 'framer-motion';
import { Home, Key } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getRelatedQuestions } from '../../lib/relatedQuestionsService';
import { Glass } from '../layout/Glass';

export function IdentitySelector({ onSelect, cId = '' }) {
    return (
        <div className="flex-1 flex flex-col justify-center px-6 py-12 space-y-8">

            <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-serif font-semibold text-white drop-shadow-md">Welcome</h1>
                <p className="text-white/90 font-medium drop-shadow-md">How can we help you today?</p>
            </div>

            <div className="space-y-4">
                {/* Buyer Option */}
                {/* Buyer Option - Soft Cyan/Blue Gradient Hint */}
                <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full"
                >
                    <Glass variant="card" cornerRadius={30} className="p-6">
                        <button
                            onClick={() => {
                                // 选择身份时调用接口A获取推荐问题（预加载，问题会在StarterQuestions中显示）
                                if (cId) {
                                    getRelatedQuestions(cId, '').catch(error => {
                                        console.error('获取推荐问题失败:', error);
                                    });
                                }
                                onSelect('buyer');
                            }}
                            className="w-full relative overflow-hidden text-left flex items-center justify-between group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                    <Key className="w-6 h-6 text-cyan-600/80" />
                                </div>
                                <h3 className="text-[22px] font-semibold text-white tracking-tight drop-shadow-sm">I want to buy</h3>
                                <p className="text-[15px] text-white/80 mt-2 font-medium drop-shadow-sm">Find and secure your dream home</p>
                            </div>
                        </button>
                    </Glass>
                </motion.div>

                {/* Seller Option - Warm Orange Gradient Hint */}
                <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full"
                >
                    <Glass variant="panel" className="p-6">
                        <button
                            onClick={() => {
                                // 选择身份时调用接口A获取推荐问题（预加载，问题会在StarterQuestions中显示）
                                if (cId) {
                                    getRelatedQuestions(cId, '').catch(error => {
                                        console.error('获取推荐问题失败:', error);
                                    });
                                }
                                onSelect('seller');
                            }}
                            className="w-full relative overflow-hidden text-left flex items-center justify-between group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-amber-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                    <Home className="w-6 h-6 text-orange-500/80" />
                                </div>
                                <h3 className="text-[22px] font-semibold text-white tracking-tight drop-shadow-sm">I want to sell</h3>
                                <p className="text-[15px] text-white/80 mt-2 font-medium drop-shadow-sm">Maximize value and list your property</p>
                            </div>
                        </button>
                    </Glass>
                </motion.div>
            </div>

        </div>
    );
}
