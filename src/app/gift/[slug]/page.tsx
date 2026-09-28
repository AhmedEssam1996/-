import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { getPublishedGiftBySlug } from '@/lib/gifts/queries';
import { getGiftOpenStats } from '@/lib/gifts/queries';
import { isDatabaseConfigured } from '@/lib/db/pg';
import { GiftViewer } from '@/components/gift/gift-viewer';
import { GiftUnwrap } from '@/components/gift/gift-unwrap';
import { getGiftBySlug } from '@/lib/mock-data';

interface GiftPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: GiftPageProps) {
  const { slug } = await params;
  const mock = getGiftBySlug(slug);
  return {
    title: mock ? `${mock.title} — هدية تفاعلية` : 'الهدية | هدايا',
    description: mock?.description || 'هدية تفاعلية مُصممة بعناية.',
  };
}

export default async function GiftPage({ params }: GiftPageProps) {
  const { slug } = await params;

  let bundle;
  if (isDatabaseConfigured()) {
    bundle = await getPublishedGiftBySlug(slug);
  }

  if (!bundle) {
    const mock = getGiftBySlug(slug);
    if (!mock) notFound();

    // Sample gifts render through the same unwrap sequence as real ones, so the
    // demo experience and the real experience never diverge.
    return (
      <Suspense>
        <GiftUnwrap gift={mock} />
      </Suspense>
    );
  }

  const stats = isDatabaseConfigured()
    ? await getGiftOpenStats(bundle.gift.id, bundle.gift.user_id).catch(() => null)
    : null;

  return (
    <Suspense>
      <GiftViewer gift={bundle} stats={stats} />
    </Suspense>
  );
}
