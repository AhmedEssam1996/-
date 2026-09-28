import 'server-only';

import { isDatabaseConfigured, queryOne } from '@/lib/db/pg';
import { getUntypedServiceClient } from '@/lib/db/supabase-typed';
import type { ClaimItemType, ClaimRow } from '@/types/database';

/**
 * Free digital item claiming.
 *
 * Claiming is idempotent at the DATABASE level: two unique indexes
 * (`claims_visitor_unique`, `claims_user_unique`) make a duplicate claim an
 * insert error, which this layer maps to `claimed: false` instead of a 500.
 * The rate limit lives in the route, the uniqueness lives here.
 */

const CLAIM_COLUMNS = `
  id, item_type, item_id, user_id, email, visitor_hash, claim_ip_hash,
  metadata_json, is_demo, created_at
`;

export interface CreateClaimInput {
  itemType: ClaimItemType;
  itemId: string;
  userId: string | null;
  email: string | null;
  /** Hashed visitor/session id — never a raw id or IP. */
  visitorHash: string;
  ipHash?: string | null;
  sessionId?: string | null;
  isDemo?: boolean;
}

export interface ClaimResult {
  claimed: boolean;
  claim: ClaimRow | null;
}

export async function createClaim(input: CreateClaimInput): Promise<ClaimResult> {
  const { itemType, itemId, userId, email, visitorHash, ipHash, sessionId, isDemo = false } = input;
  const metadata = { session_id: sessionId ?? null };

  if (isDatabaseConfigured()) {
    try {
      const row = await queryOne<Record<string, unknown>>(
        `insert into public.claims
           (item_type, item_id, user_id, email, visitor_hash, claim_ip_hash,
            metadata_json, is_demo)
         values ($1, $2::uuid, $3, $4, $5, $6, $7::jsonb, $8)
         returning ${CLAIM_COLUMNS}`,
        [
          itemType,
          itemId,
          userId,
          email,
          visitorHash,
          ipHash ?? null,
          JSON.stringify(metadata),
          isDemo,
        ],
      );
      return { claimed: true, claim: row ? (row as unknown as ClaimRow) : null };
    } catch (error) {
      // 23505 = unique_violation → this visitor/user already claimed it.
      if ((error as { code?: string }).code === '23505') {
        return { claimed: false, claim: null };
      }
      throw error;
    }
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('claims')
      .insert({
        item_type: itemType,
        item_id: itemId,
        user_id: userId,
        email,
        visitor_hash: visitorHash,
        claim_ip_hash: ipHash ?? null,
        metadata_json: metadata,
        is_demo: isDemo,
      })
      .select(CLAIM_COLUMNS)
      .single();
    // PostgREST surfaces the unique violation as a 409-ish error object.
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === '23505') return { claimed: false, claim: null };
      throw error;
    }
    return { claimed: true, claim: (data as ClaimRow) ?? null };
  }

  return { claimed: false, claim: null };
}

export async function hasClaimed(
  itemType: ClaimItemType,
  itemId: string,
  visitorHash: string,
  userId: string | null,
): Promise<boolean> {
  if (isDatabaseConfigured()) {
    const row = await queryOne<{ id: string }>(
      `select id from public.claims
       where item_type = $1 and item_id = $2::uuid
         and (visitor_hash = $3 or ($4::uuid is not null and user_id = $4::uuid))
       limit 1`,
      [itemType, itemId, visitorHash, userId],
    );
    return Boolean(row);
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    let builder = supabase
      .from('claims')
      .select('id')
      .eq('item_type', itemType)
      .eq('item_id', itemId);
    if (userId) {
      builder = builder.or(`visitor_hash.eq.${visitorHash},user_id.eq.${userId}`);
    } else {
      builder = builder.eq('visitor_hash', visitorHash);
    }
    const { data } = await builder.limit(1).as<Array<{ id: string }>>();
    return (data?.length ?? 0) > 0;
  }
  return false;
}

export async function countClaimsForItem(itemType: ClaimItemType, itemId: string): Promise<number> {
  if (isDatabaseConfigured()) {
    const row = await queryOne<{ total: string | number }>(
      `select count(*) as total from public.claims where item_type = $1 and item_id = $2::uuid`,
      [itemType, itemId],
    );
    return Number(row?.total ?? 0);
  }

  const supabase = getUntypedServiceClient();
  if (supabase) {
    const { count } = await supabase
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('item_type', itemType)
      .eq('item_id', itemId);
    return count ?? 0;
  }
  return 0;
}
