import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold leading-normal whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-[var(--border)] bg-[color-mix(in_oklab,var(--fg)_7%,transparent)] text-fg-muted',
        primary: 'border-[var(--primary)]/35 bg-[var(--primary)]/15 text-[var(--hd-pink-soft)]',
        lavender: 'border-[var(--hd-purple)]/35 bg-[var(--hd-purple)]/18 text-[var(--hd-lavender)]',
        rose: 'border-[var(--hd-rose)]/35 bg-[var(--hd-rose)]/15 text-[var(--hd-pink-soft)]',
        gold: 'border-[var(--hd-gold)]/40 bg-[var(--hd-gold)]/16 text-[var(--hd-gold-soft)]',
        success: 'border-[#3f9d6d]/35 bg-[#3f9d6d]/16 text-[#8fe3b8]',
        warning: 'border-[var(--hd-orange)]/40 bg-[var(--hd-orange)]/16 text-[var(--hd-orange)]',
        danger: 'border-[var(--hd-rose)]/35 bg-[var(--hd-rose)]/15 text-[var(--hd-pink-soft)]',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
  VariantProps<typeof badgeVariants> { }

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

/** Status pill for gift/user lifecycle, with Arabic labels. */
const STATUS_STYLES: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
  DRAFT: { label: 'مسودة', variant: 'default' },
  PUBLISHED: { label: 'منشورة', variant: 'success' },
  DISABLED: { label: 'موقوفة', variant: 'danger' },
  ACTIVE: { label: 'نشط', variant: 'success' },
  ADMIN: { label: 'أدمن', variant: 'gold' },
  USER: { label: 'مستخدم', variant: 'default' },
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const config = STATUS_STYLES[value] ?? { label: value, variant: 'default' as const };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

export { badgeVariants };