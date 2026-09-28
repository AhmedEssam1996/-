'use client';

import dynamic from 'next/dynamic';

/**
 * Client-side loader for the product 3D viewer.
 *
 * `next/dynamic` with `ssr: false` is only legal inside a Client Component, and
 * the product page is a Server Component. This thin wrapper exists solely to
 * hold that boundary: the page imports the wrapper (a client module), which in
 * turn lazy-loads the WebGL viewer after hydration. Keeping the boundary in its
 * own file is what lets the page stay a Server Component.
 */
const Product3DViewer = dynamic(() => import('@/components/shop/product-3d-viewer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-3xl border border-[var(--border)] bg-[var(--card)]/60 text-fg-muted sm:h-80">
      بنجهّز المعاينة ثلاثية الأبعاد…
    </div>
  ),
});

export interface Product3DViewerLoaderProps {
  modelUrl?: string | null;
  emoji?: string | null;
  accent?: string | null;
}

export function Product3DViewerLoader(props: Product3DViewerLoaderProps) {
  return <Product3DViewer {...props} />;
}