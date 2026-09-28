/**
 * Currency formatting, shared by server AND client components.
 *
 * This deliberately does NOT live in `lib/stripe.ts`: that module is
 * `server-only` (it holds the secret key), so a client component importing a
 * formatter from it would break the build. Formatting is pure, has no secrets,
 * and is needed on both sides of the boundary — hence its own module.
 */

/**
 * Formats integer cents into a display string the way Stripe displays it:
 * two decimal places by default, and none for zero-decimal currencies
 * (like JPY). Covers the currencies the shop is likely to use.
 */
export function formatMoney(cents: number, currency: string): string {
  const code = (currency || 'usd').toLowerCase();
  const zeroDecimal = new Set(['jpy', 'krw', 'vnd', 'clp']);
  const value = zeroDecimal.has(code) ? cents : cents / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: zeroDecimal.has(code) ? 0 : 2,
    maximumFractionDigits: zeroDecimal.has(code) ? 0 : 2,
  }).format(value);
  return `${formatted} ${code.toUpperCase()}`;
}