import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Gift, Sparkles, MousePointerClick } from 'lucide-react';

interface AdminFunnelChartProps {
  funnel: Record<string, number> | null;
}

const FUNNEL_STEPS = [
  { key: 'visitors', label: 'زوار', icon: MousePointerClick },
  { key: 'registered', label: 'مسجلات', icon: UserPlus },
  { key: 'created_gift', label: 'أنشأت هدية', icon: Gift },
  { key: 'used_ai', label: 'استخدمت الذكاء', icon: Sparkles },
  { key: 'published_gift', label: 'نشرت هدية', icon: Gift },
  { key: 'gift_opened', label: 'فتحت الهدية', icon: MousePointerClick },
];

export function AdminFunnelChart({ funnel }: AdminFunnelChartProps) {
  if (!funnel) return null;

  const values = FUNNEL_STEPS.map((s) => funnel[s.key] ?? 0);
  const maxValue = Math.max(...values, 1);

  return (
    <Card className="border-slate-800/50 bg-slate-900/50">
      <CardHeader>
        <CardTitle>مبيان التحويلات</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {FUNNEL_STEPS.map((step, i) => {
          const value = funnel[step.key] ?? 0;
          const pct = (value / maxValue) * 100;
          const dropPct = i > 0 ? ((value - values[i - 1]) / Math.max(values[i - 1], 1)) * 100 : 0;

          return (
            <div key={step.key}>
              <div className="flex items-center gap-3">
                <step.icon className="h-5 w-5 text-fg-muted" />
                <span className="w-24 text-sm text-fg-muted">{step.label}</span>
                <span className="text-xl font-bold text-fg">{value}</span>
                {i > 0 && (
                  <span className={`text-xs ${dropPct < 0 ? 'text-[var(--hd-rose)]' : 'text-[var(--hd-pink)]'}`}>
                    {dropPct < 0 ? '↓' : '↑'}{Math.abs(Math.round(dropPct))}%
                  </span>
                )}
              </div>
              <div className="mt-1 h-2 rounded-full bg-[var(--card-soft)] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--hd-pink)] to-[var(--hd-purple)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
