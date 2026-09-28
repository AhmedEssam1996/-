import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TimeSeriesPoint {
  date: string;
  value: number;
}

interface AdminTimeSeriesChartProps {
  timeSeries: Record<string, TimeSeriesPoint[]> | null;
}

const SERIES: Array<{ key: string; label: string; color: string }> = [
  { key: 'visitors', label: 'زوار', color: 'bg-emerald-400' },
  { key: 'new_users', label: 'مستخدمون جدد', color: 'bg-blue-400' },
  { key: 'gifts_created', label: 'هدايا مُنشأ', color: 'bg-purple-400' },
  { key: 'gifts_opened', label: 'هدايا مفتوحة', color: 'bg-pink-400' },
  { key: 'ai_generations', label: 'عمليات ذكاء', color: 'bg-violet-400' },
];

export function AdminTimeSeriesChart({ timeSeries }: AdminTimeSeriesChartProps) {
  if (!timeSeries) return null;

  const allPoints = SERIES.flatMap((s) => timeSeries[s.key] ?? []);
  const maxValue = Math.max(...allPoints.map((p) => p.value), 1);
  const dates = Array.from(new Set(allPoints.map((p) => p.date))).sort();
  const chartHeight = 200;

  return (
    <Card className="border-slate-800/50 bg-slate-900/50">
      <CardHeader>
        <CardTitle>النشاط على مر الوقت</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {SERIES.map((series) => {
            const points = timeSeries[series.key] ?? [];
            const plotPoints = dates.map((date) => {
              const day = points.find((p) => p.date === date);
              return (day?.value ?? 0) / maxValue;
            });

            return (
              <div key={series.key} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-fg-muted">
                    <span className={`h-3 w-3 rounded-full ${series.color}`} />
                    {series.label}
                  </span>
                  <span className="text-fg-faint">
                    {points.length > 0 ? points[points.length - 1]?.value ?? 0 : 0}
                  </span>
                </div>
                <div className="relative h-8">
                  <svg
                    width="100%"
                    height={chartHeight}
                    className="h-8 w-full"
                    preserveAspectRatio="none"
                  >
                    <polyline
                      points={plotPoints
                        .map((v, i) => `${(i / Math.max(dates.length - 1, 1)) * 100},${chartHeight - v * chartHeight}`)
                        .join(' ')}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={series.color.replace('bg-', 'text-')}
                    />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex justify-between text-xs text-fg-faint">
          {dates.length > 0 ? dates.map((date, i) => (
            (i === 0 || i === dates.length - 1 || i === Math.floor(dates.length / 2)) ? (
              <span key={date}>{date}</span>
            ) : null
          )) : <span>—</span>}
        </div>
      </CardContent>
    </Card>
  );
}
