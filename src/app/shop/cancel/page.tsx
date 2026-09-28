import Link from 'next/link';
import { XCircle } from 'lucide-react';

import { PageShell } from '@/components/shared/page-shell';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'تم إلغاء الدفع | هدية' };

export default function CheckoutCancelPage() {
  return (
    <PageShell>
      <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 pb-16 pt-32 text-center">
        <XCircle className="h-16 w-16 text-fg-muted" />
        <h1 className="font-display text-4xl font-black text-fg">الدفع اتلغى</h1>
        <p className="text-fg-muted">
          مفيش فلوس اتخصمت. الهدية لسه مستنياك في المتجر لو غيّرت رأيك.
        </p>
        <Button asChild className="rounded-2xl bg-gradient-to-l from-[var(--hd-pink)] to-[var(--hd-purple)] font-bold text-[#0b0614]">
          <Link href="/shop">رجوع للمتجر</Link>
        </Button>
      </section>
    </PageShell>
  );
}
