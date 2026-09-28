import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

import { PageShell } from '@/components/shared/page-shell';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'تم الدفع | هدية' };

export default function CheckoutSuccessPage() {
  return (
    <PageShell>
      <section className="mx-auto flex w-full max-w-xl flex-col items-center gap-5 px-4 pb-16 pt-32 text-center">
        <CheckCircle2 className="h-16 w-16 text-[var(--hd-pink)]" />
        <h1 className="font-display text-4xl font-black text-fg">تم الدفع بنجاح 🎉</h1>
        <p className="text-fg-muted">
          طلبك اتسجل. هتوصلك رسالة تأكيد على الإيميل، وتقدر تتابع حالة الطلب من حسابك.
          الدفع اتعالج بالكامل عن طريق Stripe.
        </p>
        <div className="flex gap-3">
          <Button asChild className="rounded-2xl bg-gradient-to-l from-[var(--hd-pink)] to-[var(--hd-purple)] font-bold text-[#0b0614]">
            <Link href="/shop">رجوع للمتجر</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl">
            <Link href="/dashboard">حسابي</Link>
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
