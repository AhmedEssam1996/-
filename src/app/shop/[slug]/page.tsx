import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Truck } from 'lucide-react';

import { ProductActions } from '@/components/shop/product-actions';
import { Product3DViewerLoader } from '@/components/shop/product-3d-viewer-loader';
import { PageShell } from '@/components/shared/page-shell';
import { Badge } from '@/components/ui/badge';
import { getSessionUser } from '@/lib/auth/session';
import { getProductBySlug } from '@/lib/commerce/products';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || !product.is_active) notFound();

  const user = await getSessionUser();

  return (
    <PageShell>
      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-28 sm:px-6">
        <Link
          href="/shop"
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-bold text-fg-muted transition-colors hover:text-[var(--hd-pink)]"
        >
          <ArrowRight className="h-4 w-4" />
          رجوع للمتجر
        </Link>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div
              className="flex h-56 items-center justify-center rounded-3xl text-8xl"
              style={{ background: product.gradient ?? 'linear-gradient(135deg,#FF7BB0,#A97BFF)' }}
            >
              {product.emoji ?? '🎁'}
            </div>
            <Product3DViewerLoader
              modelUrl={product.model_url}
              emoji={product.emoji}
              accent={product.accent}
            />
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="rounded-full bg-[var(--card-soft)] text-fg-muted">
                {product.kind === 'physical' ? 'هدية حقيقية 📦' : 'هدية رقمية ✨'}
              </Badge>
              <Badge variant="default" className="rounded-full bg-[var(--card-soft)] text-fg-muted">
                {product.category}
              </Badge>
            </div>
            <h1 className="font-display text-4xl font-black text-fg">{product.title_ar}</h1>
            {product.description_ar ? (
              <p className="leading-relaxed text-fg-muted">{product.description_ar}</p>
            ) : null}

            {product.kind === 'physical' && product.shipping_note_ar ? (
              <p className="flex items-start gap-2 rounded-2xl bg-[var(--card-soft)]/70 px-4 py-3 text-sm text-fg-muted">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--hd-pink)]" />
                {product.shipping_note_ar}
              </p>
            ) : null}

            <ProductActions
              product={{
                id: product.id,
                slug: product.slug,
                kind: product.kind,
                price_cents: product.price_cents,
                currency: product.currency,
                stock: product.stock,
                max_per_user: product.max_per_user,
              }}
              isSignedIn={user !== null}
            />
          </div>
        </div>
      </section>
    </PageShell>
  );
}
