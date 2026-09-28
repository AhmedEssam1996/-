'use client';

import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import * as React from 'react';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';

/**
 * Hadiya button.
 *
 * `primary` is the coral gradient CTA — the only element on a page that should
 * carry that much saturation, which is what makes it read as *the* action.
 * Every variant lifts slightly on hover and presses on click, so the whole UI
 * feels physical without any per-component wiring.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 outline-none select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-gradient-to-l from-[var(--hd-pink)] via-[var(--hd-purple)] to-[var(--hd-coral)] bg-[length:200%_100%] bg-left text-[#160726] shadow-[0_12px_30px_-12px_rgba(255,123,176,0.9)] hover:bg-right hover:shadow-[0_18px_44px_-12px_rgba(169,123,255,0.95)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
        plum: 'bg-gradient-to-l from-[var(--hd-plum-soft)] to-[var(--hd-plum-deep)] text-[var(--hd-ink)] shadow-[0_12px_30px_-14px_rgba(0,0,0,0.9)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(0,0,0,0.95)] active:translate-y-0 active:scale-[0.98]',
        lavender:
          'bg-gradient-to-l from-[var(--hd-lavender)] to-[var(--hd-purple-deep)] text-[#160726] shadow-[0_12px_30px_-12px_rgba(169,123,255,0.9)] hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-12px_rgba(169,123,255,0.95)] active:translate-y-0 active:scale-[0.98]',
        gold: 'bg-gradient-to-l from-[var(--hd-gold-soft)] to-[var(--hd-gold)] text-[#3a2606] shadow-[0_12px_30px_-12px_rgba(255,201,77,0.85)] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0 active:scale-[0.98]',
        secondary:
          'border border-[var(--border-strong)] bg-[var(--card)] text-fg shadow-soft hover:-translate-y-0.5 hover:border-[var(--primary)]/55 hover:shadow-lift active:translate-y-0 active:scale-[0.98]',
        ghost: 'text-fg-muted hover:bg-[color-mix(in_oklab,var(--fg)_7%,transparent)] hover:text-fg active:scale-[0.98]',
        outline:
          'border border-[var(--primary)]/45 text-[var(--primary)] hover:bg-[var(--primary)]/10 hover:border-[var(--primary)]/75 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]',
        danger:
          'border border-[var(--hd-rose)]/40 bg-[var(--hd-rose)]/10 text-[var(--hd-rose)] hover:bg-[var(--hd-rose)]/20 active:scale-[0.98]',
        link: 'text-[var(--primary)] underline-offset-4 hover:underline rounded-md',
      },
      size: {
        sm: 'h-9 px-4 text-[13px] [&_svg]:size-4',
        md: 'h-11 px-5 [&_svg]:size-4',
        lg: 'h-13 px-7 text-base [&_svg]:size-5',
        xl: 'h-14 px-9 text-base [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-4',
        'icon-sm': 'size-8 [&_svg]:size-3.5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  /**
   * Magnetic pull: the button drifts toward the pointer inside a small radius,
   * giving the CTA a physical, 3D feel. Works for both real buttons and
   * `asChild` links, and is skipped automatically under reduced motion.
   */
  magnetic?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, loading = false, magnetic = false, children, disabled, ...props },
    ref,
  ) => {
    const reduceMotion = usePrefersReducedMotion();
    const [mag, setMag] = React.useState({ x: 0, y: 0 });
    const Comp = asChild ? Slot : 'button';
    const classes = cn(buttonVariants({ variant, size, className }));

    const trackMagnets = (event: React.PointerEvent<HTMLSpanElement>) => {
      if (reduceMotion) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      // Pull toward the cursor, clamped to a subtle radius — a nudge, not a chase.
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      setMag({
        x: Math.max(-18, Math.min(18, dx * 0.2)),
        y: Math.max(-14, Math.min(14, dy * 0.2)),
      });
    };

    // `asChild` merges onto a single child, so a spinner cannot be injected
    // without breaking the child's own markup. Loading is only honoured for
    // real buttons.
    const core = asChild ? (
      <Comp className={classes} ref={ref} {...props}>
        {children}
      </Comp>
    ) : (
      <button
        className={classes}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
        {children}
      </button>
    );

    if (!magnetic) return core;

    return (
      <motion.span
        onPointerMove={trackMagnets}
        onPointerLeave={() => setMag({ x: 0, y: 0 })}
        animate={reduceMotion ? undefined : { x: mag.x, y: mag.y }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className="inline-flex"
      >
        {core}
      </motion.span>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };