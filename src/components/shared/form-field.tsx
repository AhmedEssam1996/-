import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value?: string | number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (e: React.ChangeEvent<any>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBlur?: (e: React.FocusEvent<any>) => void;
  error?: string;
  helper?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  autoComplete?: string;
  rows?: number;
  as?: 'textarea';
  icon?: React.ReactNode;
}

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  helper,
  required,
  disabled,
  className,
  autoComplete,
  rows = 3,
  as,
  icon,
}: FormFieldProps) {
  const inputClasses = cn(
    'w-full rounded-2xl border border-[var(--border)] bg-slate-900/50 px-4 py-2.5 text-sm text-fg',
    'placeholder:text-fg-faint focus:border-[var(--primary)]/55 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30',
    'transition-colors',
    error && 'border-red-500 focus:ring-red-500/30',
    disabled && 'opacity-50',
    icon && 'pl-10',
    className,
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm font-medium text-fg-muted">
        {label}
        {required && <span className="text-[var(--hd-rose)]"> *</span>}
      </Label>
      <div className="relative">
        {icon ? <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-fg-faint">{icon}</div> : null}
        {as === 'textarea' ? (
          <textarea
            id={name}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            rows={rows}
            className={cn(inputClasses, 'resize-y')}
          />
        ) : (
          <input
            id={name}
            type={type}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            autoComplete={autoComplete}
            className={inputClasses}
          />
        )}
      </div>
      {error && <p className="text-xs text-[var(--hd-rose)]">{error}</p>}
      {helper && !error && <p className="text-xs text-fg-faint">{helper}</p>}
    </div>
  );
}
