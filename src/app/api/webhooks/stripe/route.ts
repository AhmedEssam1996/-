import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

import {
  getOrderByStripePaymentIntent,
  markOrderFailed,
  markOrderPaid,
  markOrderRefunded,
} from '@/lib/commerce/orders';
import { recordStripeEvent } from '@/lib/commerce/events';
import { getServerEnv } from '@/lib/env';
import { getStripe, isStripeWebhookConfigured } from '@/lib/stripe';

/**
 * POST /api/webhooks/stripe — the authoritative fulfilment endpoint.
 *
 * Security model:
 *  • The RAW request body is required — Stripe signs the exact bytes, so the
 *    handler must never parse-then-verify. App Router gives us that directly.
 *  • `constructEvent` verifies the signature against STRIPE_WEBHOOK_SECRET.
 *    A missing/invalid signature is a 400, never a 500 (Stripe retries 5xx).
 *  • Idempotency: every processed event id is recorded in `stripe_events`.
 *    Stripe delivers at-least-once; the DB makes it effectively-once.
 *  • Only this handler (and nothing client-reachable) moves an order out of
 *    `pending`. The DB trigger on that transition decrements stock + writes
 *    the audit row, so fulfilment is transactional with the status change.
 */

export const runtime = 'nodejs';

export async function POST(request: Request): Promise<NextResponse> {
  if (!isStripeWebhookConfigured()) {
    // Not a client error — misconfiguration. Stripe will retry; log loudly.
    console.error('[stripe-webhook] STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET missing');
    return NextResponse.json({ error: 'webhook not configured' }, { status: 500 });
  }

  const stripe = getStripe();
  const env = getServerEnv();
  if (!stripe) {
    return NextResponse.json({ error: 'webhook not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  const rawBody = await request.text();
  if (!signature) {
    return NextResponse.json({ error: 'missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret ?? '');
  } catch (error) {
    console.error('[stripe-webhook] signature verification failed:', (error as Error).message);
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 });
  }

  // Idempotency gate: insert-first. If the row already exists another delivery
  // processed this event, so ack it and stop.
  const inserted = await recordStripeEvent(
    event.id,
    event.type,
    event.data.object as unknown as Record<string, unknown>,
  );
  if (!inserted) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId =
          (session.metadata?.order_id as string | undefined) ??
          session.client_reference_id ??
          undefined;
        if (!orderId) {
          console.warn('[stripe-webhook] completed session without order id:', session.id);
          break;
        }

        const shipping = session.collected_information?.shipping_details ?? null;
        const shippingJson = shipping
          ? {
              name: shipping.name ?? null,
              address: shipping.address ?? null,
            }
          : null;

        const paid = await markOrderPaid(orderId, {
          stripePaymentIntent:
            typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          eventId: event.id,
          shippingAddress: shippingJson as Record<string, unknown> | null,
        });
        if (!paid) {
          // Already moved by a previous delivery of another event (or raced):
          // treat as processed — the DB's status guard prevented double stock loss.
          console.warn('[stripe-webhook] order not pending, skipping:', orderId);
        }
        break;
      }

      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id ?? session.client_reference_id;
        if (orderId) {
          await markOrderFailed(orderId, event.id);
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntent =
          typeof charge.payment_intent === 'string' ? charge.payment_intent : undefined;
        if (paymentIntent) {
          const order = await getOrderByStripePaymentIntent(paymentIntent);
          if (order) {
            await markOrderRefunded(order.id, event.id);
          }
        }
        break;
      }

      default:
        // Unhandled event types are recorded (idempotency ledger) and acked.
        break;
    }
  } catch (error) {
    // Processing error: return 500 so Stripe retries. The event row already
    // exists, so the retry path must handle re-entry — each mark* transition is
    // guarded by its FROM-status list, making re-processing a no-op.
    console.error(`[stripe-webhook] handler failed for ${event.type}:`, error);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
