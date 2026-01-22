import React from 'react';
import { cn } from '../../lib/utils';

export function MobileContainer({ children, className }) {
    return (
        <div className={cn(
            "min-h-screen w-full bg-gray-100 flex justify-center",
            className
        )}>
            <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative overflow-hidden flex flex-col">
                {children}
            </div>
        </div>
    );
}
