import React, { useRef, useState, useEffect } from 'react';
import { cn } from '../lib/utils';

/**
 * 单行标题：过长时横向滚动（从右到左滚完 → 停顿 → 再滚）。
 * 尊重 prefers-reduced-motion：降级为单行省略 + title 提示。
 *
 * @param {React.ElementType} as - 语义标签 h2 / h3 / span
 * @param {string} className - 传给外层标签的样式（如字号、字重）
 * @param {React.ReactNode} children - 标题文案（建议字符串）
 */
export function SingleLineMarqueeTitle({ as: Tag = 'span', className = '', children }) {
    const containerRef = useRef(null);
    const innerRef = useRef(null);
    const [overflow, setOverflow] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);
    const [overflowPx, setOverflowPx] = useState(0);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setReduceMotion(mq.matches);
        const onChange = () => setReduceMotion(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        if (!containerRef.current || !innerRef.current) return;
        const update = () => {
            const container = containerRef.current;
            const inner = innerRef.current;
            if (!container || !inner) return;
            const overflowAmount = inner.scrollWidth - container.clientWidth;
            if (overflowAmount > 0) {
                setOverflow(true);
                setOverflowPx(overflowAmount);
            } else {
                setOverflow(false);
            }
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [children]);

    const shouldScroll = overflow && !reduceMotion;
    const fullText = typeof children === 'string' ? children : '';

    return (
        <Tag className={cn(className)}>
            <div ref={containerRef} className="overflow-hidden min-w-0">
                <span
                    ref={innerRef}
                    className={cn(
                        'inline-block whitespace-nowrap',
                        shouldScroll && 'animate-marquee-scroll',
                        !shouldScroll && 'max-w-full overflow-hidden text-ellipsis'
                    )}
                    style={
                        shouldScroll
                            ? { '--marquee-offset': `-${overflowPx}px` }
                            : undefined
                    }
                    title={fullText || undefined}
                >
                    {children}
                </span>
            </div>
        </Tag>
    );
}
