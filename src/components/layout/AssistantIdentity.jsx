import React from 'react';
import { cn } from '../../lib/utils';

export const DEFAULT_ASSISTANT_AVATAR = '/bg6.png';
export const DEFAULT_ASSISTANT_IDENTITY_AVATAR = '/FRIDGE_CHANNEL_logo.png';

export function AssistantLogo({
  imageSrc = DEFAULT_ASSISTANT_AVATAR,
  className,
  alt = 'Assistant logo',
}) {
  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn('w-7 h-7 rounded-lg object-cover flex-none', className)}
    />
  );
}

export function AssistantIdentity({
  label,
  imageSrc = DEFAULT_ASSISTANT_IDENTITY_AVATAR,
  className,
  imageClassName,
  textClassName,
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <AssistantLogo
        imageSrc={imageSrc}
        alt={label ? `${label} avatar` : 'Assistant avatar'}
        className={imageClassName}
      />
      <span className={cn('font-semibold text-sothebys-navy tracking-tight', textClassName)}>{label}</span>
    </div>
  );
}
