import { motion } from 'motion/react';
import { TrendingUp, Users, Gift, BarChart3, Sparkles, MousePointerClick } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface AdminStatCardsProps {
  overview: Record<string, number> | null;
}

const STAT_ITEMS = [
  { key: 'total_users', label: 'إجمالي المستخدمين', icon: Users, color: 'text-[var(--hd-lavender)]' },
  { key: 'new_users_today', label: 'مستخدمون جدد (اليوم)', icon: Users, color: 'text-[var(--hd-pink)]' },
  { key: 'total_gifts', label: 'إجمالي الهدايا', icon: Gift, color: 'text-purple-400' },
  { key: 'published_gifts', label: 'منشورة', icon: Gift, color: 'text-[var(--hd-pink)]' },
  { key: 'gifts_today', label: 'هدايا (اليوم)', icon: Gift, color: 'text-rose-400' },
  { key: 'total_opens', label: 'إجمالي الافتتاحات', icon: MousePointerClick, color: 'text-[var(--hd-orange)]' },
  { key: 'total_ai', label: 'عمليات ذكاء', icon: Sparkles, color: 'text-[var(--hd-purple)]' },
  { key: 'ai_today', label: 'ذكاء (اليوم)', icon: Sparkles, color: 'text-fuchsia-400' },
  { key: 'total_visitors', label: 'زوار', icon: TrendingUp, color: 'text-[var(--hd-lavender)]' },
  { key: 'visitors_today', label: 'زوار (اليوم)', icon: TrendingUp, color: 'text-[var(--hd-lavender)]' },
  { key: 'page_views', label: 'عمليات عرض', icon: BarChart3, color: 'text-[var(--hd-purple)]' },
  { key: 'active_users_30d', label: 'نشطون (30 يوم)', icon: Users, color: 'text-orange-400' },
];

export function AdminStatCards({ overview }: AdminStatCardsProps) {
  if (!overview) return null;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {STAT_ITEMS.map((item) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAT_ITEMS.indexOf(item) * 0.03 }}
        >
          <Card className="border-[var(--border)] bg-[var(--card)]/40 p-5 transition-all duration-300 hover:bg-[var(--card)]/80">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl',
                  'bg-[var(--card)]/40 border border-[var(--border)]',
                )}
              >
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-fg tabular">
                  {formatNumber(overview[item.key])}
                </p>
                <p className="text-xs text-fg-faint">{item.label}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function formatNumber(n: number | undefined): string {
  if (n === undefined || n === null || isNaN(n)) return '0';
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 >= 0.1 ? k.toFixed(1) : Math.floor(k)}K`;
  }
  return n.toLocaleString('en-US');
}
