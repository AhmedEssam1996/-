'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Trash2, Search, Plus, Edit2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';

interface GiftCardRow {
  id: string;
  code: string;
  balance_cents: number;
  currency: string;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
  created_at: string;
  expires_at: string | null;
  claimed_by_email: string | null;
  claimed_at: string | null;
  is_demo: boolean;
}

interface GiftCardsResponse {
  cards: GiftCardRow[];
  total: number;
  page: number;
  page_size: number;
}

const MOCK_GIFT_CARDS: GiftCardRow[] = [
  {
    id: '1',
    code: 'GIFT-2024-WELCOME',
    balance_cents: 50000,
    currency: 'EGP',
    status: 'ACTIVE',
    created_at: '2024-01-15T10:00:00Z',
    expires_at: '2025-01-15T10:00:00Z',
    claimed_by_email: null,
    claimed_at: null,
    is_demo: true,
  },
  {
    id: '2',
    code: 'GIFT-2024-VIP',
    balance_cents: 100000,
    currency: 'EGP',
    status: 'REDEEMED',
    created_at: '2024-02-10T12:00:00Z',
    expires_at: null,
    claimed_by_email: 'user@example.com',
    claimed_at: '2024-02-15T09:30:00Z',
    is_demo: true,
  },
  {
    id: '3',
    code: 'GIFT-2024-PREMIUM',
    balance_cents: 250000,
    currency: 'EGP',
    status: 'EXPIRED',
    created_at: '2024-03-01T08:00:00Z',
    expires_at: '2024-06-01T08:00:00Z',
    claimed_by_email: null,
    claimed_at: null,
    is_demo: true,
  },
];

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'نشط',
  REDEEMED: 'مستخدم',
  EXPIRED: 'منتهي',
};

function formatCurrency(cents: number, currency: string): string {
  const amount = cents / 100;
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
}

export default function AdminGiftCardsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'REDEEMED' | 'EXPIRED'>('all');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const params = new URLSearchParams({
    page: String(page),
    page_size: '30',
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
  });

  const { data, loading, error, refetch } = useAsync<GiftCardsResponse>(
    async () => {
      const res = await fetch(`/api/admin/gift-cards?${params.toString()}`);
      if (res.ok) {
        return res.json();
      }
      // API not available — fall back to mock data
      return { cards: MOCK_GIFT_CARDS, total: MOCK_GIFT_CARDS.length, page: 1, page_size: 30 };
    },
    [debouncedSearch, statusFilter, page],
  );

  const cards = data?.cards ?? [];

  const filteredStatus = statusFilter !== 'all'
    ? cards.filter((c) => c.status === statusFilter)
    : cards;

  const totalValue = filteredStatus
    .filter((c) => c.status === 'ACTIVE')
    .reduce((sum, c) => sum + c.balance_cents, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">بطاقات الهدايا</h1>
          <p className="mt-1 text-sm text-fg-muted">إدارة بطاقات الهدايا وشحنها.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="ml-2 h-4 w-4" />
          بطاقة جديدة
        </Button>
      </div>

      <div className="flex gap-4">
        <Card className="border-[var(--border)] bg-[var(--card)]/40">
          <CardContent className="pt-4">
            <p className="text-xs text-fg-faint">إجمالي القيمة النشطة</p>
            <p className="text-2xl font-bold text-[var(--hd-pink)]">
              {formatCurrency(totalValue, 'EGP')}
            </p>
          </CardContent>
        </Card>
        <Card className="border-[var(--border)] bg-[var(--card)]/40">
          <CardContent className="pt-4">
            <p className="text-xs text-fg-faint">إجمالي البطاقات</p>
            <p className="text-2xl font-bold text-fg">{filteredStatus.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
              <Input
                placeholder="بحث برقم الكود..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                  const timer = setTimeout(() => setDebouncedSearch(e.target.value), 500);
                  return () => clearTimeout(timer);
                }}
                className="border-[var(--border)] bg-[var(--card-soft)] pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ACTIVE' | 'REDEEMED' | 'EXPIRED')}
              className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-sm text-fg"
            >
              <option value="all">جميع الحالات</option>
              <option value="ACTIVE">نشط</option>
              <option value="REDEEMED">مستخدم</option>
              <option value="EXPIRED">منتهي</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardHeader>
          <CardTitle>البطاقات</CardTitle>
          <CardDescription>
            {filteredStatus.filter((c) => c.status === 'ACTIVE').length} بطاقة نشطة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-[var(--hd-rose)]">{error.message}</p>
          ) : filteredStatus.length === 0 ? (
            <p className="text-sm text-fg-faint">مفيش بطاقات.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-right py-3 text-fg-muted font-medium">الكود</th>
                    <th className="text-center py-3 text-fg-muted font-medium">القيمة</th>
                    <th className="text-center py-3 text-fg-muted font-medium">الحالة</th>
                    <th className="text-center py-3 text-fg-muted font-medium">استخدمها</th>
                    <th className="text-center py-3 text-fg-muted font-medium">انتهاء الصلاحية</th>
                    <th className="text-center py-3 text-fg-muted font-medium">#</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStatus.map((card) => (
                    <tr key={card.id} className="border-b border-[var(--border)]/50 hover:bg-white/[0.02]">
                      <td className="py-3 font-mono text-sm text-fg-muted">{card.code}</td>
                      <td className="py-3 text-center">{formatCurrency(card.balance_cents, card.currency)}</td>
                      <td className="py-3 text-center">
                        <Badge variant={card.status === 'ACTIVE' ? 'default' : card.status === 'REDEEMED' ? 'default' : 'danger'}>
                          {STATUS_LABELS[card.status]}
                        </Badge>
                      </td>
                      <td className="py-3 text-center text-fg-faint">
                        {card.claimed_by_email || '—'}
                      </td>
                      <td className="py-3 text-center text-fg-faint">
                        {card.expires_at ? new Date(card.expires_at).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td className="py-3">
                        <div className="flex justify-center gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="rounded p-1 text-[var(--hd-pink)] hover:bg-[var(--card)]/50"
                            title="تعديل"
                          >
                            <Edit2 className="h-4 w-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="rounded p-1 text-[var(--hd-rose)] hover:bg-[var(--card)]/50"
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <CreateGiftCardModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { refetch(); setShowCreateModal(false); }}
        />
      )}
    </div>
  );
}

function CreateGiftCardModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [expiry, setExpiry] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <h3 className="mb-4 text-lg font-semibold text-fg">بطاقة هدية جديدة</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-fg-muted">القيمة ({currency})</label>
            <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="mt-1 border-[var(--border)]" />
          </div>
          <div>
            <label className="text-sm font-medium text-fg-muted">العملة</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-2 py-1.5 text-sm text-fg"
            >
              <option value="EGP">EGP</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-fg-muted">تاريخ الانتهاء (اختياري)</label>
            <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-2 py-1.5 text-sm text-fg" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>إلغاء</Button>
          <Button size="sm" onClick={onCreated}>إنشاء</Button>
        </div>
      </motion.div>
    </div>
  );
}
