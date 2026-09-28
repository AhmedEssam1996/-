import * as React from 'react';

import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-11 w-full rounded-xl border border-white/[0.08] bg-[var(--card)]/40 px-4 py-2 text-sm text-fg',
      'placeholder:text-fg-faint',
      'transition-colors duration-200',
      'hover:border-white/[0.14]',
      'focus:border-[#00D6A3]/60 focus:bg-white/[0.05] focus:outline-none',
      'disabled:cursor-not-allowed disabled:opacity-55',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[104px] w-full resize-y rounded-xl border border-white/[0.08] bg-[var(--card)]/40 px-4 py-3 text-sm text-fg',
        'placeholder:text-fg-faint',
        'transition-colors duration-200',
        'hover:border-white/[0.14]',
        'focus:border-[#00D6A3]/60 focus:bg-white/[0.05] focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-55',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'flex h-11 w-full appearance-none rounded-xl border border-white/[0.08] bg-[var(--card)]/40 px-4 text-sm text-fg',
        'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")] bg-[length:16px] bg-[left_0.85rem_center] bg-no-repeat',
        'pr-4 pl-10 transition-colors duration-200 hover:border-white/[0.14]',
        'focus:border-[#00D6A3]/60 focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-55',
        '[&>option]:bg-[#10141A] [&>option]:text-fg',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export { Input, Textarea, Select };