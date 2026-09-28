'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ExternalLink, Ban, Trash2, Search } from 'lucide-react';

import { PageShell } from '@/components/shared/page-shell';
import { Section } from '@/components/shared/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import type { AdminGiftRow } from '@/types/database';

interface GiftsResponse {
  gifts: AdminGiftRow[];
  pagination: { page: number; page_size: number; total: number; has_more: boolean };
}

export default function AdminGiftsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'PUBLISHED' | 'DISABLED'>('ALL');
  const [demoFilter, setDemoFilter] = useState<'exclude' | 'all' | 'only'>('exclude');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    page_size: '20',
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    demo: demoFilter,
  });

  const { data, loading, error, refetch } = useAsync<GiftsResponse>(
    async () => {
      const res = await fetch(`/api/admin/gifts?${params.toString()}`);
      if (!res.ok) throw new Error('فشل تحميل الهدايا');
      return res.json();
    },
    [debouncedSearch, statusFilter, demoFilter, page],
  );

  const handleAction = async (giftId: string, action: string, value?: boolean) => {
    const res = await fetch('/api/admin/gifts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        gift_id: giftId,
        ...(value !== undefined ? { disabled: value } : {}),
      }),
    });

    if (res.ok) refetch();
  };

  return (
    <PageShell>
      <Section delay={0.1}>
        <div>
          <h1 className="text-2xl font-bold text-fg">الهدايا</h1>
          <p className="mt-1 text-sm text-fg-muted">إدارة ومراجعة جميع الهدايا على المنصة.</p>
        </div>

        <Card className="mt-4 border-[var(--border)] bg-[var(--card)]/40">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
                <Input
                  placeholder="بحث بعنوان أوسلاك..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                    const timer = setTimeout(() => setDebouncedSearch(e.target.value), 500);
                    return () => clearTimeout(timer);
                  }}
                  className="border-[var(--border)] bg-[var(--card-soft)] pl-10 focus:ring-[var(--primary)]/30"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'DRAFT' | 'PUBLISHED' | 'DISABLED')}
                className="w-40 rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="DRAFT">مسودات</option>
                <option value="PUBLISHED">منشورة</option>
                <option value="DISABLED">معطلة</option>
              </select>
              <select
                value={demoFilter}
                onChange={(e) => setDemoFilter(e.target.value as 'exclude' | 'all' | 'only')}
                className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-sm text-fg focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30"
              >
                <option value="exclude">استبعاد العينات</option>
                <option value="all">الكل</option>
                <option value="only">عينات فقط</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-4 border-[var(--border)] bg-[var(--card)]/40">
          <CardHeader>
            <CardTitle>القائمة</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : error ? (
              <p className="text-sm text-[var(--hd-rose)]">{error.message}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="py-3 text-right font-medium text-fg-muted">العنوان</th>
                        <th className="py-3 text-center font-medium text-fg-muted">الحالة</th>
                        <th className="py-3 text-center font-medium text-fg-muted">الملك</th>
                        <th className="py-3 text-center font-medium text-fg-muted">افتتاحات</th>
                        <th className="py-3 text-center font-medium text-fg-muted">تاريخ الإنشاء</th>
                        <th className="py-3 text-center font-medium text-fg-muted">#</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.gifts.map((gift) => (
                        <motion.tr
                          key={gift.id}
                          className="border-b border-white/[0.04] hover:bg-white/[0.02]"
                          whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                        >
                          <td className="py-3">
                            <div>
                              <p className="font-medium text-fg line-clamp-1">{gift.title}</p>
                              <p className="text-xs text-fg-faint">/{gift.category}</p>
                              {gift.is_demo && (
                                <Badge variant="default" className="mt-1 border-amber-500/30 bg-amber-500/10 text-amber-300">
                                  عينة
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <Badge
                              variant={gift.status === 'PUBLISHED' ? 'success' : gift.status === 'DISABLED' ? 'danger' : 'default'}
                              className="text-xs"
                            >
                              {gift.status === 'PUBLISHED' ? 'منشورة' : gift.status === 'DISABLED' ? 'موقوفة' : 'مسودة'}
                            </Badge>
                          </td>
                          <td className="py-3 text-center">
                              <span className="text-fg-muted">{gift.owner_email || '—'}</span>
                          </td>
                          <td className="py-3 text-center text-fg-muted">
                            {gift.opens ?? 0}
                          </td>
                          <td className="py-3 text-center text-fg-muted">
                            {gift.created_at ? new Date(gift.created_at).toLocaleDateString('ar-EG') : '—'}
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex justify-center gap-1">
                              {gift.status === 'PUBLISHED' && (
                                <Button asChild size="sm" variant="ghost">
                                  <a href={`/gift/${gift.slug}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                              {gift.status === 'PUBLISHED' && (
                                <Button size="sm" variant="ghost" onClick={() => handleAction(gift.id, 'disable', true)}>
                                  <Ban className="h-4 w-4 text-[var(--hd-rose)]" />
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => handleAction(gift.id, 'delete')}>
                                <Trash2 className="h-4 w-4 text-[var(--hd-rose)]" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex justify-center gap-2">
                    <Button
                    size="sm"
                    variant={page <= 1 ? 'outline' : 'primary'}
                    disabled={page <= 1 || loading}
                    onClick={() => setPage(page - 1)}
                  >
                    السابق
                  </Button>
                  <span className="flex items-center text-xs text-fg-faint">
                    صفحة {page}
                  </span>
                  <Button
                    size="sm"
                    variant={data?.pagination?.has_more ? 'primary' : 'outline'}
                    disabled={!data?.pagination?.has_more || loading}
                    onClick={() => setPage(page + 1)}
                  >
                    التالي
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </Section>
    </PageShell>
  );
}
