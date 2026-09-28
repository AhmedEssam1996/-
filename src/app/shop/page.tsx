import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/components/shared/page-shell';
import { listProducts } from '@/lib/commerce/products';
import { formatMoney } from '@/lib/commerce/money';

/**
 * /shop — the commerce catalogue.
 *
 * Server-rendered straight from `listProducts` (no client fetch round-trip):
 * physical products show their price, free digital items show "مجاني" and their
 * claim CTA lives on the detail page. When the database has no products yet the
 * page renders an honest empty state rather than sample data.
 */

export const metadata = {
  title: 'المتجر',
  description: 'هدايا مادية وهدايا رقمية مجانية — اشترِ بالدفع الآمن أو اطلب هديتك المجانية.',
};

export const dynamic = 'force-dynamic';

function productGradient(index: number): string {
  const gradients = [
    'from-[var(--hd-pink)] to-[var(--hd-purple)]',
    'from-[var(--hd-coral)] to-[var(--hd-pink)]',
    'from-[var(--hd-purple)] to-[var(--hd-lavender, #C9B6FF)]',
    'from-[#FFA552] to-[var(--hd-coral)]',
  ];
  return gradients[index % gradients.length];
}

export default async function ShopPage() {
  const { rows: products } = await listProducts({ limit: 24 });

  return (
    <PageShell>
      {/* Hero */}
      <header className="mb-10 text-center">
        <Badge variant="default" className="mb-4 rounded-full bg-[var(--card-soft)]/80 text-[var(--hd-pink-soft, var(--hd-pink))]">
          🛍️ متجر هدية
        </Badge>
        <h1 className="font-display text-4xl font-black text-fg sm:text-5xl">
          هدية مادية أو رقمية…{' '}
          <span className="bg-gradient-to-l from-[var(--hd-pink)] via-[var(--hd-purple)] to-[var(--hd-coral)] bg-clip-text text-transparent">
            اختار اللي يفرّح
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-fg-muted">
          المنتجات المادية بتوصل بالدفع الآمن (Stripe)، والهدايا الرقمية المجانية بتنضاف لحسابك بضغطة واحدة.
        </p>
      </header>

      {products.length === 0 ? (
        <div className="mx-auto max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)]/70 p-10 text-center">
          <div className="mb-4 text-5xl">🧺</div>
          <h2 className="font-display text-xl font-bold text-fg">المتجر لسه فاضي</h2>
          <p className="mt-2 text-sm text-fg-muted">
            لسه مفيش منتجات منشورة. لو انت المدير، شغّل <code className="rounded bg-[var(--card-soft)] px-1.5 py-0.5 text-xs">npm run db:seed</code> لإضافة منتجات تجريبية.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product, index) => {
            const isFree = product.price_cents === 0;
            return (
              <Link
                key={product.id}
                href={`/shop/${product.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/70 transition-all duration-300 hover:-translate-y-1.5 hover:border-[var(--border-strong)] hover:shadow-[0_28px_60px_-24px_rgba(11,6,20,0.85)]"
              >
                {/* Artwork */}
                <div
                  className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${productGradient(index)} opacity-90 transition-opacity group-hover:opacity-100`}
                >
                  {product.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.images[0]}
                      alt={product.title_ar}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-7xl drop-shadow-[0_12px_24px_rgba(11,6,20,0.45)] transition-transform duration-300 group-hover:scale-110">
                      {product.emoji ?? (product.kind === 'physical' ? '📦' : '🎁')}
                    </span>
                  )}
                  <span className="absolute top-3 left-3 rounded-full bg-black/35 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                    {product.kind === 'physical' ? 'مادي' : 'رقمي'}
                  </span>
                  {product.stock !== null && product.stock <= 3 ? (
                    <span className="absolute top-3 right-3 rounded-full bg-[#FF4D8D] px-3 py-1 text-xs font-bold text-white">
                      آخر {product.stock} قطع
                    </span>
                  ) : null}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="font-display text-lg font-bold text-fg">{product.title_ar}</h3>
                  {product.description_ar ? (
                    <p className="line-clamp-2 text-sm text-fg-muted">{product.description_ar}</p>
                  ) : null}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <span className="font-display text-xl font-black text-[var(--hd-pink)]">
                      {isFree ? 'مجاني 🎉' : formatMoney(product.price_cents, product.currency)}
                    </span>
                    <span className="rounded-full bg-[var(--card-soft)] px-3 py-1.5 text-xs font-bold text-fg-muted transition-colors group-hover:bg-[var(--hd-pink)] group-hover:text-[#0b0614]">
                      {isFree ? 'اطلبها' : 'اشترِ'} ←
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
