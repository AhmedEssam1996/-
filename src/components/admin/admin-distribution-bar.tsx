import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DistributionSlice {
  label: string;
  value: number;
}

interface AdminDistributionBarProps {
  distributions: Record<string, unknown> | null;
}

export function AdminDistributionBar({ distributions }: AdminDistributionBarProps) {
  if (!distributions) return null;

  const topCategories = (distributions.top_categories as DistributionSlice[]) ?? [];
  const aiFeatures = (distributions.ai_features as DistributionSlice[]) ?? [];

  return (
    <div className="space-y-6">
      <Card className="border-slate-800/50 bg-slate-900/50">
        <CardHeader>
          <CardTitle>توزيع الهدايا حسب الفئة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topCategories.length === 0 ? (
            <p className="text-sm text-fg-faint">مفيش بيانات بعد.</p>
          ) : (
            topCategories.map((item) => {
              const pct = item.value > 0 ? Math.max(2, (item.value / Math.max(...topCategories.map((d) => d.value))) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">{item.label}</span>
                    <span className="text-fg-faint">{item.value}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-[var(--card-soft)] overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-800/50 bg-slate-900/50">
        <CardHeader>
          <CardTitle>استخدام ميزات الذكاء</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiFeatures.length === 0 ? (
            <p className="text-sm text-fg-faint">مفيش بيانات بعد.</p>
          ) : (
            aiFeatures.map((item) => {
              const pct = item.value > 0 ? Math.max(2, (item.value / Math.max(...aiFeatures.map((d) => d.value))) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-muted">{item.label}</span>
                    <span className="text-fg-faint">{item.value}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-[var(--card-soft)] overflow-hidden">
                    <div className="h-full bg-violet-400" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
