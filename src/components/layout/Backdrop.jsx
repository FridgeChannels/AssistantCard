import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Backdrop 背景层组件
 * 
 * @param {string} image - 可选背景图片 URL
 * @param {number} blurRadius - 模糊半径，默认 60（范围 40~70）
 * @param {number} scale - 缩放比例，默认 1.08（防露边）
 * @param {number} darkOverlayOpacity - 暗色遮罩透明度，默认 0.25（范围 0.20~0.35）
 * @param {boolean} vignetteEnabled - 是否启用 vignette 效果，默认 true
 * @param {string} className - 额外的 CSS 类名
 */
export function Backdrop({
  image = null,
  blurRadius = 60,
  scale = 1.08,
  darkOverlayOpacity = 0.25,
  vignetteEnabled = true,
  className = '',
}) {
  // 确保参数在有效范围内
  /* Allow 0 blur for clear background */
  const clampedBlurRadius = Math.max(0, Math.min(70, blurRadius));
  const clampedScale = Math.max(1.0, Math.min(1.2, scale));
  const clampedDarkOverlay = Math.max(0.0, Math.min(0.8, darkOverlayOpacity));

  // 默认渐变背景（中性、不花哨）
  const defaultGradient = 'linear-gradient(to bottom, #f3f4f6, #e5e7eb)';

  return (
    <div
      className={cn(
        'fixed inset-0 w-full h-full overflow-hidden',
        'pointer-events-none',
        className
      )}
      style={{
        // 忽略安全区域，全屏覆盖
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
      }}
    >
      {/* 背景图片或渐变 */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundImage: image ? `url(${image})` : defaultGradient,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          // aspectFill 效果：保持宽高比并填充
          objectFit: 'cover',
          // 缩放防露边
          transform: `scale(${clampedScale})`,
          // 模糊效果
          filter: `blur(${clampedBlurRadius}px)`,
          // 确保覆盖整个区域
          width: '100%',
          height: '100%',
        }}
      />

      {/* 暗色遮罩层 */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          backgroundColor: `rgba(0, 0, 0, ${clampedDarkOverlay})`,
        }}
      />

      {/* Vignette 效果（底部更重、顶部更轻） */}
      {vignetteEnabled && (
        <div
          className="absolute inset-0 w-full h-full"
          style={{
            background: `radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0, 0, 0, 0.3) 100%)`,
            // 底部更重的渐变叠加
            backgroundImage: `linear-gradient(to bottom, transparent 0%, transparent 30%, rgba(0, 0, 0, 0.15) 70%, rgba(0, 0, 0, 0.4) 100%)`,
          }}
        />
      )}
    </div>
  );
}
