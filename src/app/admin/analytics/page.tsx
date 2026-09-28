'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Download, RefreshCw } from 'lucide-react';

import { AdminTimeSeriesChart } from '@/components/admin/admin-time-series';
import { AdminDistributionBar } from '@/components/admin/admin-distribution-bar';
import { AdminFunnelChart } from '@/components/admin/admin-funnel';
import { AdminStatCards } from '@/components/admin/admin-stat-cards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';

interface AnalyticsResponse {
  available: boolean;
  range: string;
  since: string;
  overview: Record<string, number> | null;
  time_series: Record<string, Array<{ date: string; value: number }>> | null;
  distributions: Record<string, unknown> | null;
  funnel: Record<string, number> | null;
}

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<'today' | '7d' | '30d' | '90d'>('30d');

  const { data: stats, loading, error, refetch } = useAsync<AnalyticsResponse>(
    async () => {
      const res = await fetch(`/api/admin/stats?range=${range}`);
      if (!res.ok) throw new Error('فشل تحميل التحليلات');
      return res.json();
    },
    [range],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">التحليلات</h1>
          <p className="mt-1 text-sm text-fg-muted">
            بيانات حية عن استخدام المنصة. آخر تحديث: {stats?.since ? new Date(stats.since).toLocaleDateString('ar-EG') : '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as 'today' | '7d' | '30d' | '90d')}
            className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-sm text-fg"
          >
            <option value="today">اليوم</option>
            <option value="7d">7 أيام</option>
            <option value="30d">30 يوم</option>
            <option value="90d">90 يوم</option>
          </select>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {error && (
        <Badge variant="default" className="border-[var(--hd-rose)]/35 text-[var(--hd-pink-soft)] bg-[var(--hd-rose)]/12">
          {error.message}
        </Badge>
      )}

      {!stats?.available && stats !== undefined && (
        <Badge variant="default" className="border-amber-500/30 text-amber-300 bg-amber-500/10">
          البيانات غير متاحة — قاعدة البيانات غير متصلة
        </Badge>
      )}

      {loading && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}

      {stats?.available && (
        <>
          <AdminStatCards overview={stats.overview ?? null} />

          <div className="grid gap-6 lg:grid-cols-2">
            <AdminFunnelChart funnel={stats.funnel ?? null} />
            <AdminDistributionBar distributions={stats.distributions ?? null} />
          </div>

          <AdminTimeSeriesChart timeSeries={stats.time_series ?? null} />

          <Card className="border-[var(--border)] bg-[var(--card)]/40">
            <CardHeader>
              <CardTitle>ملخص الفترة</CardTitle>
              <CardDescription>
                {stats.range} · {stats.since}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatItem label="مجموع الزوار" value={stats.overview?.total_visitors ?? 0} />
                <StatItem label="زوار اليوم" value={stats.overview?.visitors_today ?? 0} />
                <StatItem label="مجموع الهدايا" value={stats.overview?.total_gifts ?? 0} />
                <StatItem label="هدايا اليوم" value={stats.overview?.gifts_today ?? 0} />
                <StatItem label="مجموع الافتتاحات" value={stats.overview?.total_opens ?? 0} />
                <StatItem label="مجموع عمليات الذكاء" value={stats.overview?.total_ai ?? 0} />
                <StatItem label="عمليات ذكاء اليوم" value={stats.overview?.ai_today ?? 0} />
                <StatItem label="مستخدمون نشطون (7d)" value={stats.overview?.active_users_7d ?? 0} />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <motion.div
      className="rounded-xl border border-[var(--border)] bg-[var(--card)]/40 p-3 text-center"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className="text-2xl font-bold text-[var(--hd-pink)]">{value}</p>
      <p className="text-xs text-fg-faint">{label}</p>
    </motion.div>
  );
}
