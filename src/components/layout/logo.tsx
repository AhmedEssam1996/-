import { Sparkles } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * Brand lockup: an animated gift glyph + the Hadiya wordmark.
 *
 * The glyph is inline SVG rather than an emoji so it renders identically on
 * every platform (Windows emoji fonts in particular) and can be gradient-filled
 * from the brand tokens.
 */
export function Logo({
  size = 'md',
  href = '/',
  withWordmark = true,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
  withWordmark?: boolean;
  className?: string;
}) {
  const box = size === 'sm' ? 'size-9' : size === 'lg' ? 'size-13' : 'size-11';
  const text = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const glyph = size === 'sm' ? 'size-4.5' : size === 'lg' ? 'size-7' : 'size-5.5';

  const inner = (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'relative grid shrink-0 place-items-center rounded-2xl',
          'bg-gradient-to-br from-[var(--hd-pink)] via-[var(--hd-purple)] to-[var(--hd-coral)]',
          'shadow-[0_10px_26px_-12px_rgba(255,123,176,0.95)]',
          box,
        )}
      >
        {/* Soft highlight so the tile reads as a physical object. */}
        <span
          aria-hidden
          className="absolute inset-x-1.5 top-1 h-1/3 rounded-full bg-white/25 blur-[6px]"
        />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#160726"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn('relative drop-shadow-sm', glyph)}
          aria-hidden
        >
          {/* Box */}
          <rect x="3" y="10" width="18" height="10.5" rx="2.2" />
          {/* Lid */}
          <rect x="2" y="6.5" width="20" height="4" rx="1.8" />
          {/* Ribbon */}
          <path d="M12 6.5V20.5" />
          {/* Bow */}
          <path d="M12 6.5S10.6 3 8.9 3a1.9 1.9 0 000 3.8h3.1" />
          <path d="M12 6.5S13.4 3 15.1 3a1.9 1.9 0 010 3.8h-3.1" />
        </svg>
      </span>
      {withWordmark ? (
        <span className="flex flex-col leading-none">
          <span className={cn('font-extrabold tracking-tight text-fg', text)}>Hadiya</span>
          <span className="mt-1 text-[10px] font-semibold tracking-[0.2em] text-fg-faint">
            هدية
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) return inner;

  return (
    <Link href={href} className="group flex items-center" aria-label="Hadiya — الصفحة الرئيسية">
      <span className="transition-transform duration-300 group-hover:scale-[1.03]">{inner}</span>
    </Link>
  );
}

/** Small "وضع تجريبي" chip shown when the AI provider is the offline mock. */
export function DemoModeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-[var(--hd-gold)]/35 bg-[var(--hd-gold)]/12 px-2.5 py-1 text-[11px] font-bold text-[var(--hd-gold)]',
        className,
      )}
      title="مفيش OPENROUTER_API_KEY متظبط، فالردود دي مولّدة محليًا للتجربة"
    >
      <Sparkles className="size-3" aria-hidden />
      وضع تجريبي
    </span>
  );
}