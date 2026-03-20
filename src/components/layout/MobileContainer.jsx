import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

/** 默认背景图：不预加载，直接展示 */
const DEFAULT_BACKDROP = '/bg7.png';
const isDefaultBackdrop = (url) =>
  !url || url === DEFAULT_BACKDROP || (typeof url === 'string' && url.endsWith('bg7.png'));

/**
 * 主布局容器：支持可选背景图；自定义 URL 时预加载后再展示，失败回退 /bg7.png，避免闪烁。
 * @param {React.ReactNode} children
 * @param {string} [className]
 * @param {string|null} [backdropImage=null] - 背景图 URL；空则无图；自定义 URL 时预加载并预加载 bg7 以备回退
 */
export function MobileContainer({ children, className, backdropImage = null }) {
  // 自定义 URL 时：{ url: 当前请求的 URL, displayed: 实际要展示的 URL }，仅当 url === backdropImage 时使用 displayed
  const [displayedFor, setDisplayedFor] = useState({ url: null, displayed: null });

  useEffect(() => {
    if (!backdropImage || isDefaultBackdrop(backdropImage)) return;
    // 自定义 URL：先清空展示，预加载自定义图与 bg7（bg7 仅备回退，不展示）
    setDisplayedFor({ url: backdropImage, displayed: null });
    const img = new Image();
    const bg7 = new Image();
    bg7.src = DEFAULT_BACKDROP;
    let cancelled = false;
    img.onload = () => {
      if (!cancelled) setDisplayedFor({ url: backdropImage, displayed: backdropImage });
    };
    img.onerror = () => {
      if (!cancelled) setDisplayedFor({ url: backdropImage, displayed: DEFAULT_BACKDROP });
    };
    img.src = backdropImage;
    return () => {
      cancelled = true;
    };
  }, [backdropImage]);

  const effectiveUrl =
    isDefaultBackdrop(backdropImage)
      ? backdropImage
      : displayedFor.url === backdropImage
        ? displayedFor.displayed
        : null;

  return (
    <div
      className={cn('min-h-screen w-full flex justify-center relative', className)}
      style={{ minHeight: '100dvh' }}
    >
      <div className="fixed inset-0 bg-gray-200 -z-10" />

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
        <div
          className="absolute inset-0 w-full h-full -z-10"
          style={{
            backgroundImage: effectiveUrl ? `url(${effectiveUrl})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {children}
      </div>
    </div>
  );
}
