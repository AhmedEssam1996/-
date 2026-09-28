import { NextResponse } from 'next/server';

import { z } from 'zod';

import { readBody } from '@/lib/api/route-helpers';
import { getOrCreateSessionId, hashIdentity, trackEvent } from '@/lib/analytics/track';
import { getSessionUser } from '@/lib/auth/session';
import {
  attachStripeSession,
  countPaidUnitsForProduct,
  createPendingOrder,
} from '@/lib/commerce/orders';
import { getProductBySlug } from '@/lib/commerce/products';
import { getServerEnv } from '@/lib/env';
import { ApiError, friendlyMessage } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { getSettings } from '@/lib/settings';
import { getStripe, isStripeConfigured } from '@/lib/stripe';

/**
 * POST /api/checkout/session — creates a Stripe Checkout Session for a paid
 * product and a matching `pending` order row.
 *
 * The order is created BEFORE the redirect, the session id is attached to it,
 * and ONLY the signature-verified webhook (/api/webhooks/stripe) may later move
 * it to `paid`. The success page confirms the session with the Stripe API, but
 * fulfilment authority stays with the webhook — a closed tab or a dropped
 * network call can never fabricate a paid order.
 */

export const runtime = 'nodejs';

const bodySchema = z
  .object({
    slug: z.string().trim().min(1).max(120),
    quantity: z.number().int().min(1).max(10).optional(),
    email: z.string().trim().email().max(200).optional(),
  })
  .strict();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const settings = await getSettings();
    if (settings.featureFlags.commerce !== true) {
      throw new ApiError('FEATURE_DISABLED', 'المتجر متوقف حاليًا.', 403);
    }
    if (settings.maintenanceMode) {
      throw new ApiError('MAINTENANCE', friendlyMessage('MAINTENANCE'), 503);
    }
    if (!isStripeConfigured()) {
      throw new ApiError('INTERNAL_ERROR', 'الدفع مش مفعّل حاليًا. تواصل مع الدعم.', 503);
    }

    const body = await readBody(request, bodySchema);
    const user = await getSessionUser();
    const { sessionId } = getOrCreateSessionId(request);
    const identity = user?.id ? hashIdentity(`user:${user.id}`) : hashIdentity(sessionId);
    const limiter = await rateLimit('checkout', identity, 10, 60);
    if (!limiter.allowed) {
      throw new ApiError('RATE_LIMIT', friendlyMessage('RATE_LIMIT'), 429);
    }

    const product = await getProductBySlug(body.slug);
    if (!product || !product.is_active) {
      throw new ApiError('NOT_FOUND', 'المنتج اللي بتدور عليه مش موجود.', 404);
    }
    if (product.price_cents <= 0) {
      // Free digital items never go through Stripe — they are claimed instead.
      throw new ApiError('CONFLICT', 'المنتج ده مجاني — المطالبة من صفحة المنتج.', 409);
    }

    const quantity = body.quantity ?? 1;
    if (product.stock !== null && product.stock < quantity) {
      throw new ApiError('CONFLICT', 'خلص المخزون من المنتج ده. جرّب كمية أقل.', 409);
    }
    if (product.kind === 'physical' && !user) {
      // Physical shipping needs an account so the order can be tracked later.
      throw new ApiError('AUTH_REQUIRED', 'لازم تسجّل دخول لشراء المنتجات المادية.', 401);
    }
    if (user) {
      const alreadyPaid = await countPaidUnitsForProduct(user.id, product.id);
      if (alreadyPaid + quantity > product.max_per_user) {
        throw new ApiError('CONFLICT', 'وصلت للحد الأقصى المسموح من المنتج ده.', 409);
      }
    }

    const order = await createPendingOrder({
      product,
      userId: user?.id ?? null,
      email: user?.email ?? body.email ?? null,
      quantity,
      sessionId,
    });
    if (!order) {
      throw new ApiError('DB_UNAVAILABLE', friendlyMessage('DB_UNAVAILABLE'), 503);
    }

    const stripe = getStripe();
    if (!stripe) {
      throw new ApiError('INTERNAL_ERROR', 'الدفع مش مفعّل حاليًا.', 503);
    }

    const env = getServerEnv();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: user?.email ?? body.email ?? undefined,
      client_reference_id: order.id,
      metadata: { order_id: order.id },
      line_items: [
        {
          quantity,
          price_data: {
            currency: product.currency,
            unit_amount: product.price_cents,
            product_data: {
              name: product.title_ar,
              description: product.description_ar ?? undefined,
              images: product.images.filter((url) => url.startsWith('https://')).slice(0, 2),
            },
          },
        },
      ],
      ...(product.kind === 'physical'
        ? {
            shipping_address_collection: {
              allowed_countries: ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'SA', 'AE', 'EG'],
            },
          }
        : {}),
      success_url: `${env.appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/shop/${product.slug}?canceled=1`,
    });

    await attachStripeSession(order.id, session.id);

    await trackEvent({
      sessionId,
      eventName: 'checkout_started',
      userId: user?.id ?? null,
      page: new URL(request.url).pathname,
      userAgent: request.headers.get('user-agent'),
      metadata: { order_id: order.id, slug: product.slug, quantity },
    });

    return NextResponse.json(
      { url: session.url, order_id: order.id },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    console.error('[checkout] session creation failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: friendlyMessage('INTERNAL_ERROR') } },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
