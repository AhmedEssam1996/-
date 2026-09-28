'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';

interface AiGenerationRow {
  id: string;
  user_email: string | null;
  feature: string;
  model: string;
  provider: string;
  status: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  latency_ms: number | null;
  gift_id: string | null;
  error_code: string | null;
  is_demo: boolean;
  created_at: string;
}

interface AiGenerationsResponse {
  rows: AiGenerationRow[];
  total: number;
  page: number;
  page_size: number;
}

export default function AdminAiGenerationsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [featureFilter, setFeatureFilter] = useState('all');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    page_size: '30',
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(featureFilter !== 'all' ? { feature: featureFilter } : {}),
  });

  const { data, loading, error, refetch: _refetch } = useAsync<AiGenerationsResponse>(
    async () => {
      const res = await fetch(`/api/admin/ai-generations?${params.toString()}`);
      if (!res.ok) throw new Error('فشل تحميل سجل الذكاء');
      return res.json();
    },
    [debouncedSearch, statusFilter, featureFilter, page],
  );

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">سجل عمليات الذكاء</h1>
        <p className="mt-1 text-sm text-fg-muted">مراجعة كل طلب توليد ذكاء اصطناعي على المنصة.</p>
      </div>

      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
              <Input
                placeholder="بحث بموديل أو خطأ..."
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
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'success' | 'error')}
              className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-sm text-fg"
            >
              <option value="all">جميع الحالات</option>
              <option value="success">ناجحة</option>
              <option value="error">أخطاء</option>
            </select>
            <select
              value={featureFilter}
              onChange={(e) => setFeatureFilter(e.target.value)}
              className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-sm text-fg"
            >
              <option value="all">جميع الميزات</option>
              <option value="gift_suggestions">مكتشف الهدايا</option>
              <option value="message">مولّد الرسائل</option>
              <option value="gift_experience">تجربة الهدية</option>
              <option value="story">مولّد القصص</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardHeader>
          <CardTitle>السجل ({data?.total ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <p className="text-sm text-[var(--hd-rose)]">{error.message}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-fg-faint">مفيش سجلات.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-right py-3 text-fg-muted font-medium">الميزة</th>
                      <th className="text-center py-3 text-fg-muted font-medium">الحالة</th>
                      <th className="text-center py-3 text-fg-muted font-medium">الموديل</th>
                      <th className="text-center py-3 text-fg-muted font-medium">الرموز</th>
                      <th className="text-center py-3 text-fg-muted font-medium">الوقت</th>
                      <th className="text-center py-3 text-fg-muted font-medium">المستخدم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--card-soft)]/30">
                        <td className="py-3">
                          <Badge variant="default" className="border-[var(--border)]">
                            {row.feature || '—'}
                          </Badge>
                        </td>
                        <td className="py-3 text-center">
                          <Badge variant={row.status === 'success' ? 'default' : 'danger'}>
                            {row.status === 'success' ? 'ناجحة' : row.status === 'error' ? 'خطأ' : row.status}
                          </Badge>
                          {row.error_code && (
                            <p className="mt-1 text-xs text-[var(--hd-rose)]">{row.error_code}</p>
                          )}
                        </td>
                        <td className="py-3 text-center text-fg-muted">{row.model}</td>
                        <td className="py-3 text-center text-fg-faint">
                          {row.total_tokens ?? (row.input_tokens && row.output_tokens
                            ? row.input_tokens + row.output_tokens
                            : '—')}
                        </td>
                        <td className="py-3 text-center text-fg-faint">
                          {row.latency_ms ? `${row.latency_ms}ms` : '—'}
                        </td>
                        <td className="py-3 text-center text-fg-faint">
                          {new Date(row.created_at).toLocaleString('ar-EG', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-3 text-center text-fg-faint">
                          {row.user_email || 'زائر'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data && (
                <div className="mt-4 flex justify-between text-sm text-fg-faint">
                  <span>صفحة {data.page} · إجمالي {data.total}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => setPage(Math.max(1, page - 1))}
                    >
                      السابق
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page * 30 >= data.total || loading}
                      onClick={() => setPage(page + 1)}
                    >
                      التالي
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
