import { NextResponse } from 'next/server';

import { z } from 'zod';

import { readBody } from '@/lib/api/route-helpers';
import { getOrCreateSessionId, hashIdentity, trackEvent } from '@/lib/analytics/track';
import { getSessionUser } from '@/lib/auth/session';
import { createClaim, hasClaimed } from '@/lib/commerce/claims';
import { getProductById } from '@/lib/commerce/products';
import { getPublishedGiftBySlug } from '@/lib/gifts/queries';
import { ApiError, friendlyMessage } from '@/lib/http';
import { rateLimit } from '@/lib/rate-limit';
import { getSettings } from '@/lib/settings';

/**
 * POST /api/claims — claims a FREE digital item.
 *
 * Two item kinds share this endpoint:
 *  • `product` — a zero-price digital product from the shop.
 *  • `gift`    — a published public gift the visitor wants on their account.
 *
 * Rules:
 *  • Rate limited on a hashed identity (10 claims / 5 minutes).
 *  • The uniqueness is enforced by the DB (two unique indexes), so a race
 *    between two tabs degrades into `claimed: false`, never a duplicate.
 *  • The claim trigger writes the audit + analytics rows automatically.
 */

export const runtime = 'nodejs';

const bodySchema = z
  .object({
    item_type: z.enum(['product', 'gift']),
    item_id: z.string().trim().min(1).max(80),
  })
  .strict();

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const settings = await getSettings();
    if (settings.maintenanceMode) {
      throw new ApiError('MAINTENANCE', friendlyMessage('MAINTENANCE'), 503);
    }

    const body = await readBody(request, bodySchema);
    const user = await getSessionUser();
    const { sessionId } = getOrCreateSessionId(request);
    const visitorHash = hashIdentity(sessionId);
    const identity = user?.id ? hashIdentity(`user:${user.id}`) : visitorHash;
    const limiter = await rateLimit('claims', identity, 10, 300);
    if (!limiter.allowed) {
      throw new ApiError('RATE_LIMIT', friendlyMessage('RATE_LIMIT'), 429);
    }

    if (body.item_type === 'product') {
      if (settings.featureFlags.commerce !== true) {
        throw new ApiError('FEATURE_DISABLED', 'المتجر متوقف حاليًا.', 403);
      }
      const product = await getProductById(body.item_id);
      if (!product || !product.is_active) {
        throw new ApiError('NOT_FOUND', 'المنتج مش موجود.', 404);
      }
      if (product.price_cents > 0) {
        throw new ApiError('CONFLICT', 'المنتج ده مدفوع — الشراء من صفحة المنتج.', 409);
      }
      if (!product.is_claimable) {
        throw new ApiError('CONFLICT', 'المنتج ده مش قابل للمطالبة حاليًا.', 409);
      }
    } else {
      if (settings.featureFlags.public_gifts !== true) {
        throw new ApiError('FEATURE_DISABLED', friendlyMessage('FEATURE_DISABLED'), 403);
      }
      // `item_id` carries the gift SLUG for gift claims (slugs are the public
      // handle); the query validates it exists AND is published + public.
      const gift = await getPublishedGiftBySlug(body.item_id);
      if (!gift) {
        throw new ApiError('NOT_FOUND', 'الهدية مش موجودة أو مش منشورة.', 404);
      }
    }

    const ipHash = hashIdentity(request.headers.get('x-forwarded-for') ?? 'no-ip');
    const result = await createClaim({
      itemType: body.item_type,
      itemId: body.item_id,
      userId: user?.id ?? null,
      email: user?.email ?? null,
      visitorHash,
      ipHash,
      sessionId,
    });

    await trackEvent({
      sessionId,
      eventName: result.claimed ? 'claim_created' : 'claim_duplicate',
      userId: user?.id ?? null,
      page: new URL(request.url).pathname,
      userAgent: request.headers.get('user-agent'),
      metadata: { item_type: body.item_type, item_id: body.item_id, claimed: result.claimed },
    });

    return NextResponse.json(
      {
        claimed: result.claimed,
        claim_id: result.claim?.id ?? null,
        message: result.claimed ? 'تمت المطالبة بنجاح 🎉' : 'سبقت لها المطالبة قبل كده 😉',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message, details: error.details } },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    console.error('[claims] failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: friendlyMessage('INTERNAL_ERROR') } },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

/** GET — has the current visitor already claimed an item? */
export async function GET(request: Request): Promise<NextResponse> {
  const params = new URL(request.url).searchParams;
  const itemType = params.get('item_type');
  const itemId = params.get('item_id');
  if (itemType !== 'product' && itemType !== 'gift') {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'item_type غير صحيح' } }, { status: 422 });
  }
  if (!itemId) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'item_id مطلوب' } }, { status: 422 });
  }

  try {
    const { sessionId } = getOrCreateSessionId(request);
    const user = await getSessionUser();
    const visitorHash = hashIdentity(sessionId);
    const claimed = await hasClaimed(itemType, itemId, visitorHash, user?.id ?? null);
    return NextResponse.json(
      { claimed },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('[claims] check failed:', error);
    return NextResponse.json({ claimed: false }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  }
}
