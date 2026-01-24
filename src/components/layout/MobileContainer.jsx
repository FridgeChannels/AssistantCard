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
            <Backdrop
                image={backdropImage}
                darkOverlayOpacity={0}
                blurRadius={20}
                vignetteEnabled={false}
            />

            {/* 主容器 - 使用 Glass 效果 */}
            <div
                className="w-full max-w-md min-h-screen relative overflow-hidden flex flex-col z-10"
                style={{
                    minHeight: '100dvh',
                    maxHeight: '100dvh',
                    // Glass 效果 - 降低 tint 让背景更清晰
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    // border: '1px solid rgba(255, 255, 255, 0.12)', // Optional: remove border if desired, but user didn't ask. keeping it subtle
                    border: 'none',
                    boxShadow: 'none',
                }}
            >
                {children}
            </div>
        </div>
    );
}
