'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Gift, BarChart3, Calendar, ExternalLink, Sparkles, Settings } from 'lucide-react';

import { PageShell } from '@/components/shared/page-shell';
import { Section } from '@/components/shared/section';
import { useAuth, useAsync } from '@/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface DashboardOverview {
  database: boolean;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: string;
  };
  overview: {
    total_gifts: number;
    published_gifts: number;
    draft_gifts: number;
    total_opens: number;
    unique_open_gifts: number;
    ai_generations: number;
  };
  recent_gifts: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    category: string;
    updated_at: string;
  }>;
  drafts: Array<{
    id: string;
    title: string;
    slug: string;
    updated_at: string;
  }>;
  ai_quota: {
    daily_limit: number | null;
    monthly_limit: number | null;
    used_today: number;
    used_month: number;
    remaining_today: number | null;
    remaining_month: number | null;
    exhausted: boolean;
    unlimited: boolean;
  };
}

const STAT_ITEMS = [
  { label: 'إجمالي الهدايا', key: 'total_gifts', icon: Gift, color: 'text-[var(--hd-pink)]' },
  { label: 'منشورة', key: 'published_gifts', icon: ExternalLink, color: 'text-[var(--hd-lavender)]' },
  { label: 'مسودات', key: 'draft_gifts', icon: BarChart3, color: 'text-fg-muted' },
  { label: 'افتتاحات', key: 'total_opens', icon: ExternalLink, color: 'text-[var(--hd-pink)]' },
  { label: 'مفرّرات AI', key: 'ai_generations', icon: Sparkles, color: 'text-[var(--hd-purple)]' },
  { label: 'فريد افتتاحي', key: 'unique_open_gifts', icon: Calendar, color: 'text-[var(--hd-orange)]' },
];

export default function DashboardPage() {
  const { user: authUser, loading: authLoading } = useAuth();
  const { data: overview, loading, error } = useAsync<DashboardOverview>(
    async () => {
      const res = await fetch('/api/dashboard/overview', { credentials: 'include' });
      if (!res.ok) throw new Error('فشل تحميل البيانات');
      return res.json();
    },
    [],
  );

  if (authLoading) {
    return (
      <PageShell>
        <div className="py-12">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-4 w-96" />
        </div>
      </PageShell>
    );
  }

  if (!authUser && !authLoading) {
    return (
      <PageShell>
        <Section className="py-12 text-center">
          <motion.h2
            className="text-xl font-semibold text-fg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            تحتاج تسجيل دخول
          </motion.h2>
          <motion.p
            className="mt-2 text-fg-muted"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            سجل دخولك أو أنشئ حساب جديد عشان توصل لوحتك.
          </motion.p>
          <motion.div
            className="mt-6 flex justify-center gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button asChild>
              <Link href="/login">تسجيل دخول</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/register">إنشاء حساب</Link>
            </Button>
          </motion.div>
        </Section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <Section className="flex flex-wrap items-center justify-between gap-4" delay={0.1}>
        <div className="flex items-center gap-4">
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card-soft)]"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
          >
            {authUser?.avatarUrl ? (
              <img src={authUser.avatarUrl} alt={authUser.fullName ?? ''} className="h-11 w-11 rounded-full object-cover" /> // eslint-disable-line @next/next/no-img-element
            ) : (
              '👤'
            )}
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-fg">
              مرحبًا، {authUser?.fullName || 'صديقنا'}
            </h1>
            <p className="text-sm text-fg-faint">{overview?.user?.email || authUser?.email || ''}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/create-gift">
              <Sparkles className="ml-2 h-4 w-4" />
              هدية جديدة
            </Link>
          </Button>
        </div>
      </Section>

      {/* Overview stats */}
      <Section delay={0.2} className="mt-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <p className="text-center text-sm text-fg-faint">تعذر تحميل الإحصائيات.</p>
        ) : (
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
            initial="hide"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          >
            {STAT_ITEMS.map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.key}
                  variants={{ show: { opacity: 1, y: 0 }, hide: { opacity: 0, y: 20 } }}
                >
                  <Card className="border-[var(--border)] bg-[var(--card)]/40 p-5 transition-all duration-300 hover:bg-[var(--card)]/80">
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-xl',
                            'bg-[var(--card)]/40 border border-[var(--border)]',
                          )}
                        >
                          <Icon className={`h-4 w-4 ${stat.color}`} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-fg tabular">
                            {(overview?.overview?.[stat.key as keyof typeof overview.overview]) ?? 0}
                          </p>
                          <p className="text-xs text-fg-faint">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </Section>

      {/* AI Quota */}
      {overview?.ai_quota && (
        <Section className="mt-8">
          <Card className="border-[var(--border)] bg-[var(--card)]/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">استخدام الذكاء الاصطناعي</CardTitle>
              <CardDescription>
                {overview.ai_quota.unlimited
                  ? 'لديك حصة غير محدودة'
                  : `اليوم: ${overview.ai_quota.used_today} / ${overview.ai_quota.daily_limit ?? '—'}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview.ai_quota.exhausted && (
                <Badge variant="default" className="border-[var(--hd-rose)]/35 bg-[var(--hd-rose)]/12 text-[var(--hd-pink-soft)]">
                  الحد اليومي نفذ
                </Badge>
              )}
              {!overview.ai_quota.unlimited && !overview.ai_quota.exhausted && overview.ai_quota.daily_limit && (
                <div className="mt-3 w-full max-w-xs">
                  <div className="h-2 rounded-full bg-[var(--card-soft)] overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[var(--hd-pink)] to-[var(--hd-purple)]"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.max(0, Math.min(100, (overview.ai_quota.used_today / overview.ai_quota.daily_limit) * 100))}%`,
                      }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-fg-faint">
                    <span>{overview.ai_quota.used_today} مستخدم</span>
                    <span>{overview.ai_quota.remaining_today ?? 0} متبقي</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </Section>
      )}

      {/* Drafts */}
      {overview?.drafts && overview.drafts.length > 0 && (
        <Section className="mt-8">
          <motion.h2
            className="mb-4 text-lg font-bold text-fg"
            initial={{ opacity: 0, x: -20 }}
          >
            مسوداتك
          </motion.h2>
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            initial="hide"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          >
            {overview.drafts.map((draft) => (
              <motion.div key={draft.id} variants={{ show: { opacity: 1, y: 0 }, hide: { opacity: 0, y: 20 } }}>
                <Card className="border-[var(--border)] bg-[var(--card)]/30 p-5 transition-all duration-300 hover:bg-[var(--card)]/60">
                  <CardContent className="pt-0">
                    <h3 className="font-medium text-fg">{draft.title}</h3>
                    <Badge variant="default" className="mt-2 border-[var(--border)] text-xs">
                      مسودة
                    </Badge>
                    <div className="mt-3 flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/gifts/${draft.id}/edit`}>تحرير</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </Section>
      )}

      {/* Recent gifts */}
      <Section className="mt-8">
        <motion.h2
          className="mb-4 text-lg font-bold text-fg"
          initial={{ opacity: 0, x: -20 }}
        >
          هداياك الأخيرة
        </motion.h2>
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        ) : overview && overview.recent_gifts.length > 0 ? (
          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            initial="hide"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          >
            {overview.recent_gifts.map((gift) => (
              <motion.div key={gift.id} variants={{ show: { opacity: 1, y: 0 }, hide: { opacity: 0, y: 20 } }}>
                <Card className="border-[var(--border)] bg-[var(--card)]/30 overflow-hidden transition-all duration-300 hover:shadow-lg">
                  <CardContent className="pt-5">
                    <div className="mb-3 flex items-center justify-between">
                      <Badge variant="default" className="border-[var(--border)] text-xs">
                        {gift.status === 'PUBLISHED' ? 'منشورة' : 'مسودة'}
                      </Badge>
                    <Badge variant="default" className="border-[var(--border)] text-xs">
                      {gift.category}
                    </Badge>
                    </div>
                    <h3 className="font-medium text-fg line-clamp-1">{gift.title}</h3>
                    <p className="mt-2 text-xs text-fg-faint">
                      آخر تحديث: {new Date(gift.updated_at).toLocaleDateString('ar-EG')}
                    </p>
                    <div className="mt-3 flex gap-2">
                      {gift.status === 'PUBLISHED' && (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/gift/${gift.slug}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      )}
                      <Button asChild size="sm" variant="ghost">
                        <Link href="/create-gift">تحرير</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div className="py-12 text-center">
            <Gift className="mx-auto h-12 w-12 text-fg-faint" />
            <p className="mt-3 text-fg-muted">مفيش هدايا ظهرت حديثًا.</p>
            <Button asChild className="mt-4">
              <Link href="/create-gift">أنشئ هدية الأولى</Link>
            </Button>
          </motion.div>
        )}
      </Section>

      {/* CTA to AI tools */}
      <Section className="mt-8">
        <Card className="border-[var(--primary)]/25 bg-gradient-to-br from-[var(--primary)]/8 via-[var(--card)] to-[var(--hd-purple)]/8">
          <CardContent className="py-8 text-center sm:py-12">
            <h3 className="text-xl font-bold text-fg">هل تحتاج إلهام؟</h3>
            <p className="mt-2 text-fg-muted">استخدم الذكاء الاصطناعي لصياغة الوصف أو اختيار الهدايا.</p>
            <div className="mt-4 flex justify-center gap-3">
              <Button asChild>
                <Link href="/ai-gift">مكتشف الهدايا</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/ai-message">مولّد الرسائل</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </Section>
    </PageShell>
  );
}
