'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
  aspect?: string;
  priority?: boolean;
}

const GiftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" className="size-10 text-fg-faint">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9.75L15 12l2.25-2.25M12 15V3m0 12l-2.25-2.25M12 15l2.25 2.25M12 15v3"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 6c0-1.654-.895-3-2-3S5 4.346 5 6s.895 3 2 3 2-1.346 2-3zM15 6c0-1.654-.895-3-2-3s-2 1.346-2 3 .895 3 2 3 2-1.346 2-3z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9.75V6m0 0L9 9M12 6l3 3"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 18v-3h.375a2.625 2.625 0 00.225-5.25A2.25 2.25 0 0015 9.75V9a3 3 0 00-6 0v.75a2.25 2.25 0 000 4.125H9V18"
    />
  </svg>
);

const GradientFallback = () => (
  <div
    className={cn(
      'relative flex items-center justify-center',
      'bg-gradient-to-br from-emerald-500/10 via-violet-500/10 to-pink-500/10',
      'border border-[var(--border)]',
    )}
  >
    <div className="absolute inset-0 bg-grid-faint opacity-[0.3]" />
    <div className="relative z-10 flex flex-col items-center gap-2 text-center">
      <GiftIcon />
      <span className="text-xs text-fg-faint">صورة غير متوفرة</span>
    </div>
  </div>
);

export function SafeImage({
  src,
  alt,
  fallback,
  aspect = 'aspect-[4/3]',
  className,
  onError,
  ...props
}: SafeImageProps) {
  const [hasError, setHasError] = React.useState(false);

  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    setHasError(true);
    onError?.(e);
  };

  if (hasError || !src) {
    return (
      <div className={cn('overflow-hidden', aspect, className)}>
        {fallback ?? <GradientFallback />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={handleError}
      className={cn('h-full w-full object-cover', className)}
      {...props}
    />
  );
}

export function GiftImage({
  src,
  alt,
  aspect = 'aspect-[4/3]',
  rounded = 'rounded-xl',
  className,
  priority = false,
}: {
  src?: string;
  alt: string;
  aspect?: string;
  rounded?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn('relative overflow-hidden', rounded, aspect, className)}>
      <SafeImage src={src ?? ''} alt={alt} aspect={aspect} priority={priority} />
    </div>
  );
}
