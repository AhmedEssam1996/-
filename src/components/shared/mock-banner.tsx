import { Info } from 'lucide-react';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface MockBannerProps {
  className?: string;
  text?: string;
  children?: React.ReactNode;
}

export function MockBanner({ className, text, children }: MockBannerProps) {
  const message = text ?? children;

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300',
        className,
      )}
    >
      <Info className="mt-0.25 h-3.5 w-3.5 shrink-0 text-[var(--hd-orange)]" />
      <span>{message}</span>
    </div>
  );
}
