import React from 'react';
import { cn } from '../../lib/utils';
import { Backdrop } from './Backdrop';

export function MobileContainer({ children, className, backdropImage = null }) {
    return (
        <div className={cn(
            "min-h-screen w-full flex justify-center relative",
            className
        )} style={{ minHeight: '100dvh' }}>
            {/* Backdrop 背景层 */}
            {/* Backdrop 背景层 - 移除全屏背景图，只保留背景色 */}
            <div className="fixed inset-0 bg-gray-200 -z-10" />

            {/* 主容器 - 使用 Glass 效果 */}
            <div
                className="w-full max-w-md min-h-screen relative overflow-hidden flex flex-col z-10"
                style={{
                    minHeight: '100dvh',
                    maxHeight: '100dvh',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    border: 'none',
                    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.5)',
                }}
            >
                {/* Background Layer with Blur */}
                <div
                    className="absolute inset-0 w-full h-full -z-10"
                    style={{
                        backgroundImage: backdropImage ? `url(${backdropImage})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        // filter: 'blur(1px)', // Removed blur
                        // transform: 'scale(1.1)', // Removed scale
                    }}
                />
                {children}
            </div>
        </div>
    );
}
