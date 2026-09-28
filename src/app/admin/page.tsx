'use client';

import { Suspense } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';

import { AdminStatCards } from '@/components/admin/admin-stat-cards';
import { AdminTimeSeriesChart } from '@/components/admin/admin-time-series';
import { AdminDistributionBar } from '@/components/admin/admin-distribution-bar';
import { AdminFunnelChart } from '@/components/admin/admin-funnel';
import { MockBanner } from '@/components/shared/mock-banner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAsync } from '@/hooks/useAsync';

interface AdminStatsResponse {
  available: boolean;
  range: string;
  since: string;
  overview: Record<string, number> | null;
  time_series: Record<string, Array<{ date: string; value: number }>> | null;
  distributions: Record<string, unknown> | null;
  funnel: Record<string, number> | null;
}

export default function AdminPage() {
  const { data: stats, loading: _loading, error, refetch } = useAsync<AdminStatsResponse>(
    async () => {
      const res = await fetch('/api/admin/stats?range=30d');
      if (!res.ok) throw new Error('فشل تحميل الإحصائيات');
      return res.json();
    },
    [],
  );

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-fg">لوحة التحكم</h1>
          <p className="mt-1 text-sm text-fg-muted">إحصائيات وتحليلات المنصة في الوقت الحقيقي.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            defaultValue="30d"
            className="w-32 rounded-xl border border-[var(--border)] bg-[var(--card)]/60 px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
          >
            <option value="today">اليوم</option>
            <option value="7d">7 أيام</option>
            <option value="30d">30 يوم</option>
            <option value="90d">90 يوم</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-[var(--border)] bg-[var(--card)]/40"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!stats?.available && stats !== undefined && <MockBanner className="mb-4" />}

      {error && (
        <Badge variant="default" className="border-[var(--hd-rose)]/35 bg-[var(--hd-rose)]/12 text-[var(--hd-pink-soft)]">
          {error.message}
        </Badge>
      )}

      {stats?.available ? (
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-[var(--hd-pink)]" />}>
          <>
            <AdminStatCards overview={stats.overview ?? null} />
            <AdminTimeSeriesChart timeSeries={stats.time_series ?? null} />
            <div className="grid gap-6 lg:grid-cols-2">
              <AdminFunnelChart funnel={stats.funnel ?? null} />
              <AdminDistributionBar distributions={stats.distributions ?? null} />
            </div>
          </>
        </Suspense>
      ) : (
        <Card className="border-[var(--border)] bg-[var(--card)]/40">
          <CardHeader>
            <CardTitle>البيانات غير متاحة</CardTitle>
            <CardDescription>
              الموقع لم يتصل بالقاعدة بعد. الإحصائيات الحية لن تظهر إلا بعد إعداد قاعدة البيانات.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-fg-muted">
              راجع <code className="rounded bg-[var(--card-soft)] px-1.5 py-0.5">.env.local</code> وتأكد من إعداد{' '}
              <code className="rounded bg-[var(--card-soft)] px-1.5 py-0.5">DATABASE_URL</code> ثم أعد المحاولة.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
