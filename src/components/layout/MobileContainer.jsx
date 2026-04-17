import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { isSegwayBackdropSn } from '../../config/env';

/** 默认背景图 */
const DEFAULT_BACKDROP = '/bg7.png';
const isDefaultBackdrop = (url) =>
  !url || url === DEFAULT_BACKDROP || (typeof url === 'string' && url.endsWith('bg7.png'));

/**
 * 是否需要先预加载再展示（自定义远程图、Segway 资源等；本地 bg7 不需要）
 * @param {string|null|undefined} backdropImage
 * @param {string} [sn='']
 */
export function backdropNeedsPreload(backdropImage, sn = '') {
  if (isSegwayBackdropSn(sn)) return true;
  if (!backdropImage) return false;
  const s = String(backdropImage);
  if (s === DEFAULT_BACKDROP || s.endsWith('bg7.png')) return false;
  return true;
}

/**
 * 主布局容器：支持可选背景图；有非默认地址时优先预加载该图，失败则预加载 bg7 再展示；默认 bg7 直接展示。
 * @param {React.ReactNode} children
 * @param {string} [className]
 * @param {string|null} [backdropImage=null] - 背景图 URL
 * @param {(payload: { status: 'loading' | 'ready' }) => void} [onBackdropStatusChange] - 预加载阶段通知（用于延后展示前景内容）
 */
export function MobileContainer({ children, className, backdropImage = null, onBackdropStatusChange }) {
  // 自定义 URL 时：{ url: 当前请求的 URL, displayed: 实际要展示的 URL }，仅当 url === backdropImage 时使用 displayed
  const [displayedFor, setDisplayedFor] = useState({ url: null, displayed: null });

  useEffect(() => {
    let cancelled = false;
    const notify = (status) => {
      if (!cancelled && typeof onBackdropStatusChange === 'function') {
        onBackdropStatusChange({ status });
      }
    };

    if (!backdropImage || isDefaultBackdrop(backdropImage)) {
      setDisplayedFor({ url: backdropImage || null, displayed: backdropImage || null });
      notify('ready');
      return () => {
        cancelled = true;
      };
    }

    // 非默认：优先加载给定地址，失败则切换为 bg7（先等 bg7 onload 再展示，减少闪屏）
    notify('loading');
    setDisplayedFor({ url: backdropImage, displayed: null });

    const applyFallback = () => {
      const fallback = new Image();
      fallback.onload = () => {
        if (cancelled) return;
        setDisplayedFor({ url: backdropImage, displayed: DEFAULT_BACKDROP });
        notify('ready');
      };
      fallback.onerror = () => {
        if (cancelled) return;
        setDisplayedFor({ url: backdropImage, displayed: DEFAULT_BACKDROP });
        notify('ready');
      };
      fallback.src = DEFAULT_BACKDROP;
    };

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setDisplayedFor({ url: backdropImage, displayed: backdropImage });
      notify('ready');
    };
    img.onerror = () => {
      if (cancelled) return;
      applyFallback();
    };
    img.src = backdropImage;

    return () => {
      cancelled = true;
    };
  }, [backdropImage, onBackdropStatusChange]);

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
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
          }}
        />
        {children}
      </div>
    </div>
  );
}
