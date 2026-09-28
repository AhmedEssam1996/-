﻿'use client';

import { motion } from 'motion/react';
import { ShoppingBag, Sparkles } from 'lucide-react';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/commerce/money';
import { cn } from '@/lib/utils';

/**
 * Dual-checkout switch for a product page.
 * price > 0  -> Stripe Checkout (hosted; card data never touches Hadiya).
 * price == 0 -> free claim, with a prior-claim check so returning visitors
 *               see the claimed state instead of a second request.
 */

export interface ProductActionsProps {
  product: {
    id: string;
    slug: string;
    kind: string;
    price_cents: number;
    currency: string;
    stock: number | null;
    max_per_user: number;
  };
  isSignedIn: boolean;
}

interface ApiErrorBody {
  error?: { code?: string; message?: string };
}

export function ProductActions({ product, isSignedIn }: ProductActionsProps) {
  const isFree = product.price_cents === 0;
  const maxQuantity = Math.max(1, Math.min(product.max_per_user, product.stock ?? product.max_per_user));
  const [quantity, setQuantity] = React.useState(1);
  const [busy, setBusy] = React.useState<'idle' | 'buy' | 'claim'>('idle');
  const [claimed, setClaimed] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isFree) return;
    let cancelled = false;
    fetch(`/api/claims?item_type=product&item_id=${encodeURIComponent(product.id)}`)
      .then((res) => res.json())
      .then((data: { claimed?: boolean }) => {
        if (!cancelled) setClaimed(Boolean(data.claimed));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isFree, product.id]);

  async function handleBuy(): Promise<void> {
    setBusy('buy');
    setError(null);
    try {
      const res = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: product.slug, quantity }),
      });
      const data = (await res.json()) as { url?: string } & ApiErrorBody;
      if (!res.ok || !data.url) {
        setError(data.error?.message ?? 'حصلت مشكلة. جرّب تاني.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('الشبكة بطّعت. جرّب تاني.');
    } finally {
      setBusy('idle');
    }
  }

  async function handleClaim(): Promise<void> {
    setBusy('claim');
    setError(null);
    try {
      const res = await fetch('/api/claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: 'product', item_id: product.id }),
      });
      const data = (await res.json()) as { claimed?: boolean; message?: string } & ApiErrorBody;
      if (!res.ok) {
        setError(data.error?.message ?? 'حصلت مشكلة. جرّب تاني.');
        return;
      }
      setClaimed(Boolean(data.claimed));
      setMessage(data.message ?? 'تمت المطالبة بنجاح 🎉');
      if (data.claimed) {
        const confetti = (await import('canvas-confetti')).default;
        confetti({
          particleCount: 120,
          spread: 75,
          origin: { y: 0.7 },
          colors: ['#FF7BB0', '#A97BFF', '#FF7A5C', '#FFD166'],
        });
      }
    } catch {
      setError('الشبكة بطّعت. جرّب تاني.');
    } finally {
      setBusy('idle');
    }
  }

  const outOfStock = product.stock !== null && product.stock <= 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-display text-3xl font-black text-[var(--hd-pink)]">
          {isFree ? 'مجاني 🎉' : formatMoney(product.price_cents * quantity, product.currency)}
        </span>
        {product.stock !== null ? (
          <Badge variant="default" className="rounded-full bg-[var(--card-soft)] text-fg-muted">
            متاح: {product.stock}
          </Badge>
        ) : null}
      </div>

      {!isFree ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-fg-muted">الكمية:</span>
          <div className="flex items-center gap-1 rounded-full border border-[var(--border-strong)] bg-[var(--card)]/70 p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="h-8 w-8 rounded-full text-lg font-bold text-fg-muted transition-colors hover:bg-[var(--card-soft)] disabled:opacity-40"
              aria-label="قلّل الكمية"
            >
              −
            </button>
            <span className="w-8 text-center font-display font-bold text-fg">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
              disabled={quantity >= maxQuantity}
              className="h-8 w-8 rounded-full text-lg font-bold text-fg-muted transition-colors hover:bg-[var(--card-soft)] disabled:opacity-40"
              aria-label="زوّد الكمية"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      <motion.div whileTap={{ scale: 0.97 }}>
        {isFree ? (
          <Button
            size="lg"
            disabled={claimed || busy === 'claim'}
            onClick={handleClaim}
            className={cn(
              'w-full rounded-2xl bg-gradient-to-l from-[var(--hd-pink)] to-[var(--hd-purple)] text-lg font-black text-[#0b0614]',
              'shadow-[0_18px_44px_-16px_rgba(255,123,176,0.9)] transition-all hover:brightness-110',
              claimed && 'opacity-90',
            )}
          >
            {claimed ? '✓ محجوزة لحسابك' : busy === 'claim' ? 'جاري الطلب…' : (
              <>
                <Sparkles className="ml-2 h-5 w-5" />
                اطلبها مجانًا
              </>
            )}
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={busy === 'buy' || outOfStock}
            onClick={handleBuy}
            className="w-full rounded-2xl bg-gradient-to-l from-[var(--hd-pink)] to-[var(--hd-purple)] text-lg font-black text-[#0b0614] shadow-[0_18px_44px_-16px_rgba(255,123,176,0.9)] transition-all hover:brightness-110"
          >
            {busy === 'buy' ? 'بنحوّلك للدفع…' : (
              <>
                <ShoppingBag className="ml-2 h-5 w-5" />
                اشترِ الآن — دفع آمن
              </>
            )}
          </Button>
        )}
      </motion.div>

      {!isFree && !isSignedIn ? (
        <p className="text-center text-xs text-fg-muted">
          هتحتاج تسجّل دخول الأول عشان تتابع طلبك —{' '}
          <a href="/login?next=/shop" className="font-bold text-[var(--hd-pink)] underline">
            سجّل من هنا
          </a>
        </p>
      ) : null}

      {message ? (
        <p className="rounded-2xl bg-[var(--card-soft)]/80 px-4 py-2.5 text-center text-sm font-bold text-fg">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-2xl bg-[#FF4D8D]/15 px-4 py-2.5 text-center text-sm font-bold text-[#FF4D8D]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
