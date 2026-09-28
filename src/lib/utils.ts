import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formats a number with Arabic-Indic-friendly grouping. */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('ar-EG').format(value);
}

/** Compact form for stat cards: 12,481 → ١٢٫٥ ألف */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat('ar-EG', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}

export function formatPercent(value: number, digits = 0): string {
  return `${value.toFixed(digits)}%`;
}

const AR_DATE = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
const AR_TIME = new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit' });

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return AR_DATE.format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return `${AR_DATE.format(date)} · ${AR_TIME.format(date)}`;
}

/** "من ٣ أيام" / "النهاردة" — relative time in Arabic. */
export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return 'دلوقتي';
  if (minutes < 60) return `من ${formatNumber(minutes)} دقيقة`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `من ${formatNumber(hours)} ساعة`;

  const days = Math.round(hours / 24);
  if (days === 1) return 'امبارح';
  if (days < 30) return `من ${formatNumber(days)} يوم`;

  const months = Math.round(days / 30);
  if (months < 12) return `من ${formatNumber(months)} شهر`;

  return `من ${formatNumber(Math.round(months / 12))} سنة`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  if (seconds < 60) return `${formatNumber(Math.round(seconds))} ثانية`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return rest > 0
    ? `${formatNumber(minutes)} د ${formatNumber(rest)} ث`
    : `${formatNumber(minutes)} دقيقة`;
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

/**
 * Arabic-aware, URL-safe slug. Strips diacritics, keeps Arabic letters so a gift
 * can be shared as /g/كل-سنة-وانت-أجمل while staying copy-pasteable.
 */
export function slugify(input: string, maxLength = 48): string {
  const base = (input ?? '')
    .toString()
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .slice(0, maxLength)
    .replace(/^-|-$/g, '');

  return base || 'hadiya';
}

export function randomSuffix(length = 6): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1).trimEnd()}…`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '؟';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p.charAt(0)).join('');
}

/** Reads a `?date=7d` style range parameter into a start date. */
export type DateRangeKey = 'today' | '7d' | '30d' | '90d' | 'custom';

export function rangeToSince(range: DateRangeKey, customFrom?: string | null): Date {
  const now = new Date();
  switch (range) {
    case 'today': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case '7d':
      return new Date(now.getTime() - 7 * 86_400_000);
    case '30d':
      return new Date(now.getTime() - 30 * 86_400_000);
    case '90d':
      return new Date(now.getTime() - 90 * 86_400_000);
    case 'custom': {
      if (customFrom) {
        const parsed = new Date(customFrom);
        if (!Number.isNaN(parsed.getTime())) return parsed;
      }
      return new Date(now.getTime() - 30 * 86_400_000);
    }
    default:
      return new Date(now.getTime() - 30 * 86_400_000);
  }
}

/** Builds a full share URL for a gift slug. */
export function giftUrl(slug: string, appUrl?: string): string {
  const base = (appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  return `${base}/gift/${encodeURIComponent(slug)}`;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}