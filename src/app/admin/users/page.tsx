'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Ban, Trash2, Search, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import type { AdminUserRow } from '@/types/database';

interface UsersResponse {
  users: AdminUserRow[];
  pagination: { page: number; page_size: number; total: number; has_more: boolean };
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'ADMIN'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({
    page: String(page),
    page_size: '20',
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
    ...(roleFilter !== 'ALL' ? { role: roleFilter } : {}),
    ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
  });

  const { data, loading, error, refetch } = useAsync<UsersResponse>(
    async () => {
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error('فشل تحميل المستخدمين');
      return res.json();
    },
    [debouncedSearch, roleFilter, statusFilter, page],
  );

  const handleAction = async (userId: string, action: string, value?: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        user_id: userId,
        ...(value ? { [action.includes('role') ? 'role' : 'status']: value } : {}),
      }),
    });

    if (res.ok) {
      refetch();
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
    const timer = setTimeout(() => setDebouncedSearch(e.target.value), 500);
    return () => clearTimeout(timer);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-fg">المستخدمين</h1>
        <p className="mt-1 text-sm text-fg-muted">إدارة حسابات المستخدمين والصلاحيات.</p>
      </div>

      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
              <Input
                placeholder="بحث باسم أو بريد..."
                value={search}
                onChange={handleSearchChange}
                className="border-[var(--border)] bg-[var(--card-soft)] pl-10"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'ALL' | 'USER' | 'ADMIN')}
              className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-sm text-fg"
            >
              <option value="ALL">جميع الأدوار</option>
              <option value="USER">مستخدمين</option>
              <option value="ADMIN">إداريين</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'DISABLED')}
              className="rounded-xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-sm text-fg"
            >
              <option value="ALL">جميع الحالات</option>
              <option value="ACTIVE">نشطين</option>
              <option value="DISABLED">معطلين</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardHeader>
          <CardTitle>القائمة</CardTitle>
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
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-right py-3 text-fg-muted font-medium">المستخدم</th>
                      <th className="text-center py-3 text-fg-muted font-medium">الدور</th>
                      <th className="text-center py-3 text-fg-muted font-medium">الحالة</th>
                      <th className="text-center py-3 text-fg-muted font-medium">هدايا</th>
                      <th className="text-center py-3 text-fg-muted font-medium">ذكاء</th>
                      <th className="text-center py-3 text-fg-muted font-medium">تاريخ التسجيل</th>
                      <th className="text-center py-3 text-fg-muted font-medium">#</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.users.map((user) => (
                      <tr key={user.id} className="border-b border-[var(--border)]/50 hover:bg-white/[0.02]">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--card-soft)]">
                              {user.full_name?.[0] ?? user.email?.[0] ?? '👤'}
                            </div>
                            <div>
                              <p className="font-medium text-fg">{user.full_name || 'مجهول'}</p>
                              <p className="text-xs text-fg-faint">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <Badge variant={user.role === 'ADMIN' ? 'default' : 'default'}>
                            {user.role === 'ADMIN' ? 'إداري' : 'مستخدم'}
                          </Badge>
                        </td>
                        <td className="py-3 text-center">
                          <Badge variant={user.status === 'ACTIVE' ? 'default' : 'danger'}>
                            {user.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                          </Badge>
                        </td>
                        <td className="py-3 text-center">{user.gift_count}</td>
                        <td className="py-3 text-center">{user.ai_count}</td>
                        <td className="py-3 text-center text-fg-faint">
                          {new Date(user.created_at).toLocaleDateString('ar-EG')}
                        </td>
                        <td className="py-3">
                          <div className="flex justify-center gap-1">
                            {user.role !== 'ADMIN' && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleAction(user.id, 'set_role', 'ADMIN')}
                                className="rounded p-1 text-[var(--hd-purple)] hover:bg-[var(--card-soft)]"
                                title="ترقية لإداري"
                              >
                                <Shield className="h-4 w-4" />
                              </motion.button>
                            )}
                            {user.status === 'ACTIVE' && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleAction(user.id, 'set_status', 'DISABLED')}
                                className="rounded p-1 text-[var(--hd-rose)] hover:bg-[var(--card-soft)]"
                                title="تعطيل"
                              >
                                <Ban className="h-4 w-4" />
                              </motion.button>
                            )}
                            {user.status === 'DISABLED' && (
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleAction(user.id, 'set_status', 'ACTIVE')}
                                className="rounded p-1 text-[var(--hd-pink)] hover:bg-[var(--card-soft)]"
                                title="تفعيل"
                              >
                                <Check className="h-4 w-4" />
                              </motion.button>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleAction(user.id, 'delete')}
                              className="rounded p-1 text-[var(--hd-rose)] hover:bg-[var(--card-soft)]"
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

              {data && data.pagination && (
                <div className="mt-4 flex justify-between text-sm text-fg-faint">
                  <span>
                    صفحة {data.pagination.page} · إجمالي {data.pagination.total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(Math.max(1, page - 1))}
                    >
                      السابق
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!data.pagination.has_more}
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
