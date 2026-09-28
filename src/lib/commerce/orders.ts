import 'server-only';

import { isDatabaseConfigured, query, queryOne } from '@/lib/db/pg';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';
import type { OrderProductSnapshot, OrderRow, OrderStatus, Product } from '@/types/database';

/**
 * Order persistence for the Stripe checkout flow.
 *
 * Lifecycle:
 *   createPendingOrder()      — the user clicked "اشترِ الآن"; nothing is paid.
 *   attachStripeSession()     — the Checkout Session id is linked to the order.
 *   markOrderPaid()           — the webhook's job. The DB trigger on this UPDATE
 *                               decrements stock and writes the audit row.
 *   markOrderFailed/Refunded  — webhook-driven status changes.
 *
 * The webhook is the ONLY writer that moves an order out of `pending`, and it
 * runs server-side with signature verification + an idempotency ledger, so the
 * client can never fabricate a paid order.
 */

const ORDER_COLUMNS = `
  id, user_id, email, product_id, product_snapshot, quantity, amount_total,
  currency, status, stripe_session_id, stripe_payment_intent, stripe_event_id,
  shipping_address, metadata_json, is_demo, created_at, updated_at
`;

function mapRow(row: Record<string, unknown>): OrderRow {
  return row as unknown as OrderRow;
}

export interface CreateOrderInput {
  product: Product;
  userId: string | null;
  email: string | null;
  quantity: number;
  sessionId: string | null;
  isDemo?: boolean;
}

export async function createPendingOrder(input: CreateOrderInput): Promise<OrderRow | null> {
  const { product, userId, email, quantity, sessionId, isDemo = false } = input;
  const snapshot: OrderProductSnapshot = {
    id: product.id,
    slug: product.slug,
    kind: product.kind,
    title_ar: product.title_ar,
    title_en: product.title_en,
    price_cents: product.price_cents,
    currency: product.currency,
    emoji: product.emoji,
    gradient: product.gradient,
  };
  const amountTotal = product.price_cents * quantity;
  const metadata = { session_id: sessionId ?? null };

  if (isDatabaseConfigured()) {
    const row = await queryOne<Record<string, unknown>>(
      `insert into public.orders
         (user_id, email, product_id, product_snapshot, quantity, amount_total,
          currency, status, metadata_json, is_demo)
       values ($1, $2, $3::uuid, $4::jsonb, $5, $6, $7, 'pending', $8::jsonb, $9)
       returning ${ORDER_COLUMNS}`,
      [
        userId,
        email,
        product.id,
        JSON.stringify(snapshot),
        quantity,
        amountTotal,
        product.currency,
        JSON.stringify(metadata),
        isDemo,
      ],
    );
    return row ? mapRow(row) : null;
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        email,
        product_id: product.id,
        product_snapshot: snapshot,
        quantity,
        amount_total: amountTotal,
        currency: product.currency,
        status: 'pending',
        metadata_json: metadata,
        is_demo: isDemo,
      })
      .select(ORDER_COLUMNS)
      .single<OrderRow>();
    if (error) throw error;
    return data ?? null;
  }
  return null;
}

export async function getOrderById(id: string): Promise<OrderRow | null> {
  if (isDatabaseConfigured()) {
    const row = await queryOne<Record<string, unknown>>(
      `select ${ORDER_COLUMNS} from public.orders where id = $1::uuid limit 1`,
      [id],
    );
    return row ? mapRow(row) : null;
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data } = await supabase.from('orders').select(ORDER_COLUMNS).eq('id', id).maybeSingle();
    return (data as OrderRow | null) ?? null;
  }
  return null;
}

export async function getOrderByStripeSession(sessionId: string): Promise<OrderRow | null> {
  if (isDatabaseConfigured()) {
    const row = await queryOne<Record<string, unknown>>(
      `select ${ORDER_COLUMNS} from public.orders where stripe_session_id = $1 limit 1`,
      [sessionId],
    );
    return row ? mapRow(row) : null;
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('stripe_session_id', sessionId)
      .maybeSingle();
    return (data as OrderRow | null) ?? null;
  }
  return null;
}

export async function attachStripeSession(orderId: string, sessionId: string): Promise<void> {
  if (isDatabaseConfigured()) {
    await query('update public.orders set stripe_session_id = $2 where id = $1::uuid', [
      orderId,
      sessionId,
    ]);
    return;
  }
  const supabase = getUntypedServiceClient();
  if (supabase) {
    await supabase.from('orders').update({ stripe_session_id: sessionId }).eq('id', orderId);
  }
}

export async function getOrderByStripePaymentIntent(paymentIntentId: string): Promise<OrderRow | null> {
  if (isDatabaseConfigured()) {
    const row = await queryOne<Record<string, unknown>>(
      `select ${ORDER_COLUMNS} from public.orders
       where stripe_payment_intent = $1 limit 1`,
      [paymentIntentId],
    );
    return row ? mapRow(row) : null;
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('stripe_payment_intent', paymentIntentId)
      .maybeSingle();
    return (data as OrderRow | null) ?? null;
  }
  return null;
}

/** Shared guarded transition: only moves a row OUT of its old status once. */
async function transitionStatus(
  orderId: string,
  from: OrderStatus[],
  to: OrderStatus,
  patch: {
    stripePaymentIntent?: string;
    eventId?: string;
    shippingAddress?: Record<string, unknown> | null;
  },
): Promise<boolean> {
  if (isDatabaseConfigured()) {
    const row = await queryOne<{ id: string }>(
      `update public.orders
          set status = $2::order_status,
              stripe_payment_intent = coalesce($3, stripe_payment_intent),
              stripe_event_id = coalesce($4, stripe_event_id),
              shipping_address = coalesce($5::jsonb, shipping_address)
        where id = $1::uuid
          and status::text = any($6::text[])
        returning id`,
      [
        orderId,
        to,
        patch.stripePaymentIntent ?? null,
        patch.eventId ?? null,
        patch.shippingAddress ? JSON.stringify(patch.shippingAddress) : null,
        from,
      ],
    );
    return Boolean(row);
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from('orders')
      .update({
        status: to,
        ...(patch.stripePaymentIntent ? { stripe_payment_intent: patch.stripePaymentIntent } : {}),
        ...(patch.eventId ? { stripe_event_id: patch.eventId } : {}),
        ...(patch.shippingAddress ? { shipping_address: patch.shippingAddress } : {}),
      })
      .eq('id', orderId)
      .in('status', from)
      .as<Array<{ id: string }>>();
    return (data?.length ?? 0) > 0;
  }
  return false;
}

export async function markOrderPaid(
  orderId: string,
  patch: {
    stripePaymentIntent?: string;
    eventId?: string;
    shippingAddress?: Record<string, unknown> | null;
  },
): Promise<boolean> {
  return transitionStatus(orderId, ['pending'], 'paid', patch);
}

export async function markOrderFailed(orderId: string, eventId?: string): Promise<boolean> {
  return transitionStatus(orderId, ['pending'], 'failed', { eventId });
}

export async function markOrderRefunded(orderId: string, eventId?: string): Promise<boolean> {
  return transitionStatus(orderId, ['paid', 'shipped'], 'refunded', { eventId });
}

export async function markOrderShipped(orderId: string, trackingNumber?: string): Promise<boolean> {
  const ok = await transitionStatus(orderId, ['paid'], 'shipped', {});
  if (ok && trackingNumber && isDatabaseConfigured()) {
    await query(
      `update public.orders
          set metadata_json = metadata_json || $2::jsonb
        where id = $1::uuid`,
      [orderId, JSON.stringify({ tracking_number: trackingNumber })],
    );
  }
  return ok;
}

export async function listUserOrders(userId: string, limit = 20): Promise<OrderRow[]> {
  if (isDatabaseConfigured()) {
    const rows = await query<Record<string, unknown>>(
      `select ${ORDER_COLUMNS} from public.orders
       where user_id = $1::uuid
       order by created_at desc
       limit ${Math.min(Math.max(limit, 1), 50)}`,
      [userId],
    );
    return rows.map(mapRow);
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data } = await supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(Math.min(Math.max(limit, 1), 50));
    return (data ?? []) as OrderRow[];
  }
  return [];
}

/** Enforces `products.max_per_user` across paid orders only. */
export async function countPaidUnitsForProduct(userId: string, productId: string): Promise<number> {
  if (isDatabaseConfigured()) {
    const row = await queryOne<{ total: string | number }>(
      `select coalesce(sum(quantity), 0) as total from public.orders
       where user_id = $1::uuid and product_id = $2::uuid
         and status in ('paid', 'shipped')`,
      [userId, productId],
    );
    return Number(row?.total ?? 0);
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data, count } = await supabase
      .from('orders')
      .select('quantity', { count: 'exact' })
      .eq('user_id', userId)
      .eq('product_id', productId)
      .in('status', ['paid', 'shipped'])
      .as<Array<{ quantity: number }>>();
    if (count === null) return 0;
    return (data ?? []).reduce(
      (sum, row) => sum + Number(row.quantity ?? 0),
      0,
    );
  }
  return 0;
}

