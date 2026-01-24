import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Glass 前景玻璃表面组件
 * 
 * @param {React.ReactNode} children - 子元素
 * @param {string} variant - 预设样式：'card' | 'panel' | 'pill'，默认 'card'
 * @param {number} cornerRadius - 自定义圆角半径（覆盖预设）
 * @param {number} tintOpacity - tint overlay 透明度，默认 0.24（范围 0.18~0.32）
 * @param {string} material - 材质类型：'ultraThin' | 'thin' | 'regular'，默认 'ultraThin'
 * @param {number} borderOpacity - 边框透明度，默认 0.12（范围 0.10~0.18）
 * @param {boolean} shadowEnabled - 是否启用阴影，默认 true
 * @param {boolean} highlightEnabled - 是否启用内部高光，默认 true
 * @param {string} className - 额外的 CSS 类名
 */
export function Glass({
  children,
  variant = 'card',
  cornerRadius = null,
  tintOpacity = 0.24,
  material = 'ultraThin',
  borderOpacity = 0.12,
  shadowEnabled = true,
  highlightEnabled = true,
  className = '',
}) {
  // 预设圆角
  const presetRadius = {
    card: 18,
    panel: 32,
    pill: 28,
  };

  // 预设阴影配置
  const presetShadow = {
    card: {
      color: 'rgba(0, 0, 0, 0.18)',
      blur: 30,
      y: 16,
    },
    panel: {
      color: 'rgba(0, 0, 0, 0.22)',
      blur: 60,
      y: 24,
    },
    pill: {
      color: 'rgba(0, 0, 0, 0.14)',
      blur: 24,
      y: 12,
    },
  };

  // 材质对应的模糊强度
  const materialBlur = {
    ultraThin: 20,
    thin: 30,
    regular: 40,
  };

  // 确保参数在有效范围内
  const clampedTintOpacity = Math.max(0.18, Math.min(0.32, tintOpacity));
  const clampedBorderOpacity = Math.max(0.10, Math.min(0.18, borderOpacity));
  const finalRadius = cornerRadius !== null ? cornerRadius : presetRadius[variant] || presetRadius.card;
  const shadow = presetShadow[variant] || presetShadow.card;

  return (
    <div
      className={cn(
        'relative',
        className
      )}
      style={{
        borderRadius: `${finalRadius}px`,
        // 毛玻璃背景效果 + Tint overlay（白玻璃效果） - 增加不透明度提升实体感
        backgroundColor: `rgba(255, 255, 255, ${clampedTintOpacity * 1.2})`,
        backdropFilter: `blur(${materialBlur[material] || materialBlur.ultraThin}px)`,
        WebkitBackdropFilter: `blur(${materialBlur[material] || materialBlur.ultraThin}px)`,
        // 边框
        border: `1px solid rgba(255, 255, 255, ${clampedBorderOpacity + 0.1})`,
        // 阴影
        boxShadow: shadowEnabled
          ? `0 ${shadow.y}px ${shadow.blur}px ${shadow.color}`
          : 'none',
        // 确保内容在 tint 之上
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 内部高光（顶部淡白色渐变） */}
      {highlightEnabled && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            borderRadius: `${finalRadius}px`,
            background: `linear-gradient(to bottom, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 30%)`,
            zIndex: 1,
          }}
        />
      )}

      {/* 内容区域 */}
      <div
        className="relative"
        style={{
          zIndex: 2,
        }}
      >
        {children}
      </div>
    </div>
  );
}
