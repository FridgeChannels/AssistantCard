import React from 'react';
import { motion } from 'framer-motion';
import { Home, Key } from 'lucide-react';
import { cn } from '../../lib/utils';

export function IdentitySelector({ onSelect }) {
    return (
        <div className="flex-1 flex flex-col justify-center px-6 py-12 space-y-8">

            <div className="text-center space-y-2 mb-8">
                <h1 className="text-2xl font-serif font-semibold text-sothebys-navy">Welcome</h1>
                <p className="text-gray-500">How can we help you today?</p>
            </div>

            <div className="space-y-4">
                {/* Buyer Option */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect('buyer')}
                    className="w-full bg-white/60 backdrop-blur-[20px] border border-white/20 p-6 rounded-[24px] shadow-sm hover:shadow-lg transition-all group text-left flex items-center justify-between ring-1 ring-white/40"
                >
                    <div>
                        <div className="w-10 h-10 bg-sothebys-navy/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-sothebys-navy group-hover:text-white transition-colors">
                            <Key className="w-5 h-5 text-sothebys-navy group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">I want to buy</h3>
                        <p className="text-sm text-gray-500 mt-1">Find and secure your dream home</p>
                    </div>
                </motion.button>

                {/* Seller Option */}
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelect('seller')}
                    className="w-full bg-white/60 backdrop-blur-[20px] border border-white/20 p-6 rounded-[24px] shadow-sm hover:shadow-lg transition-all group text-left flex items-center justify-between ring-1 ring-white/40"
                >
                    <div>
                        <div className="w-10 h-10 bg-sothebys-navy/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-sothebys-navy group-hover:text-white transition-colors">
                            <Home className="w-5 h-5 text-sothebys-navy group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">I want to sell</h3>
                        <p className="text-sm text-gray-500 mt-1">Maximize value and list your property</p>
                    </div>
                </motion.button>
            </div>

        </div>
    );
}
