import 'server-only';

import { isDatabaseConfigured, query } from '@/lib/db/pg';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';

/**
 * Stripe event idempotency ledger.
 *
 * Stripe delivers webhooks at-least-once. Inserting the event id first and
 * checking whether the row landed turns "at least once" into "effectively
 * once": a duplicate delivery finds its id already present and short-circuits.
 * The row is kept forever — the audit value outweighs the storage cost.
 */
export async function recordStripeEvent(
  id: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  if (isDatabaseConfigured()) {
    try {
      const rows = await query<{ id: string }>(
        `insert into public.stripe_events (id, type, payload)
         values ($1, $2, $3::jsonb)
         on conflict (id) do nothing
         returning id`,
        [id, type, JSON.stringify(payload ?? {})],
      );
      return (rows?.length ?? 0) > 0;
    } catch (error) {
      console.error('[stripe-events] insert failed:', (error as Error).message);
      // Fail closed-ish: reporting "already processed" would skip fulfilment,
      // so report "new" and let the guarded status transitions handle re-entry.
      return true;
    }
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('stripe_events')
      .upsert({ id, type, payload: payload ?? {} }, { onConflict: 'id', ignoreDuplicates: true })
      .select('id')
      .as<Array<{ id: string }>>();
    if (error) {
      console.error('[stripe-events] insert failed:', (error as { message?: string }).message);
      return true;
    }
    return (data?.length ?? 0) > 0;
  }

  // No database at all: acknowledge without fulfilment (dev-only condition).
  return true;
}
