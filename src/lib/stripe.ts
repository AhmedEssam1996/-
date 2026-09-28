import 'server-only';

import Stripe from 'stripe';

import { getServerEnv } from '@/lib/env';

/**
 * The single Stripe client.
 *
 * Rules:
 *  - `stripeSecretKey` is server-only. It is never imported by a client
 *    component ('server-only' guards against it) and never logged.
 *  - The client is memoised on `globalThis` so hot reload in development does
 *    not create a new client per request.
 *  - `apiVersion` is intentionally omitted: the installed SDK pins its types to
 *    its bundled latest API version, and omitting the field sends the account's
 *    configured version without a type mismatch.
 *  - When Stripe is not configured, `getStripe()` returns null and every caller
 *    degrades to a "المتجر غير متاح حاليًا" state instead of crashing — the
 *    rest of the product must stay usable without commerce.
 */

declare global {
  var __hadiyaStripe: Stripe | undefined;
}

export function isStripeConfigured(): boolean {
  return Boolean(getServerEnv().stripeSecretKey);
}

export function isStripeWebhookConfigured(): boolean {
  const env = getServerEnv();
  return Boolean(env.stripeSecretKey && env.stripeWebhookSecret);
}

export function getStripe(): Stripe | null {
  const env = getServerEnv();
  if (!env.stripeSecretKey) return null;

  if (!globalThis.__hadiyaStripe) {
    globalThis.__hadiyaStripe = new Stripe(env.stripeSecretKey, {
      typescript: true,
      maxNetworkRetries: 2,
      timeout: 30_000,
      appInfo: {
        name: 'Hadiya',
        version: '1.0.0',
        url: env.appUrl,
      },
    });
  }
  return globalThis.__hadiyaStripe;
}

// Re-exported so server-side callers can keep importing a single module.
// The implementation lives in `commerce/money` because that file is
// client-safe; this one is `server-only`.
export { formatMoney } from '@/lib/commerce/money';
