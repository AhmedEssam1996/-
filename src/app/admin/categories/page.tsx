'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Edit2, Trash2, Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';
import type { GiftTemplate } from '@/types/database';

interface TemplatesResponse {
  templates: GiftTemplate[];
  total: number;
}

export default function AdminCategoriesPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<GiftTemplate | null>(null);

  const { data, loading, error, refetch } = useAsync<TemplatesResponse>(
    async () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('category', debouncedSearch);
      const res = await fetch(`/api/public/templates?${params.toString()}`);
      if (!res.ok) throw new Error('فشل تحميل القوالب');
      return res.json();
    },
    [debouncedSearch],
  );

  const templates = data?.templates ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">القوالب</h1>
          <p className="mt-1 text-sm text-fg-muted">إدارة قوالب الهدايا والفئات.</p>
        </div>
        <Button onClick={() => { setEditingTemplate(null); setShowEditModal(true); }}>
          <Plus className="ml-2 h-4 w-4" />
          قالب جديد
        </Button>
      </div>

      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardContent className="pt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-faint" />
            <Input
              placeholder="بحث بفئة أو عنوان..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                const timer = setTimeout(() => setDebouncedSearch(e.target.value), 500);
                return () => clearTimeout(timer);
              }}
              className="border-[var(--border)] bg-[var(--card-soft)] pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardHeader>
          <CardTitle>القائمة ({templates.length})</CardTitle>
          <CardDescription>
            {templates.length} قالب نشط. الفئات مُجمعة تلقائيًّا.
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
          ) : templates.length === 0 ? (
            <p className="text-sm text-fg-faint">مفيش قوالب نشطة.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-right py-3 text-fg-muted font-medium">العنوان</th>
                    <th className="text-center py-3 text-fg-muted font-medium">الفئة</th>
                    <th className="text-center py-3 text-fg-muted font-medium">الإيموجي</th>
                    <th className="text-center py-3 text-fg-muted font-medium">معاينة</th>
                    <th className="text-center py-3 text-fg-muted font-medium">عينة</th>
                    <th className="text-center py-3 text-fg-muted font-medium">#</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-b border-[var(--border)]/50 hover:bg-white/[0.02]">
                      <td className="py-3">
                        <p className="font-medium text-fg">{template.title_ar}</p>
                        {template.title_en && (
                          <p className="text-xs text-fg-faint">{template.title_en}</p>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant="default" className="border-[var(--border)]">
                          {template.category}
                        </Badge>
                      </td>
                      <td className="py-3 text-center text-xl">{template.emoji || '🎁'}</td>
                      <td className="py-3 text-center">
                        <div className="mx-auto h-8 w-16 rounded"
                          style={{ background: template.gradient || 'linear-gradient(45deg, #00D6A3, #8B5CF6)' }}
                        />
                      </td>
                      <td className="py-3 text-center">
                        <Badge variant={template.is_demo ? 'default' : 'default'} className="text-xs">
                          {template.is_demo ? 'نعم' : 'لا'}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <div className="flex justify-center gap-1">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => { setEditingTemplate(template); setShowEditModal(true); }}
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

      {showEditModal && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { refetch(); setShowEditModal(false); }}
        />
      )}
    </div>
  );
}

function TemplateEditorModal({
  template,
  onClose,
  onSaved,
}: {
  template: GiftTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [titleAr, setTitleAr] = useState(template?.title_ar || '');
  const [category, setCategory] = useState(template?.category || '');
  const [emoji, setEmoji] = useState(template?.emoji || '');
  const [gradient, setGradient] = useState(template?.gradient || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--card)] p-6"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <h3 className="mb-4 text-lg font-semibold text-fg">
          {template ? 'تعديل القالب' : 'قالب جديد'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-fg-muted">العنوان (عربي)</label>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="mt-1 border-[var(--border)]" />
          </div>
          <div>
            <label className="text-sm font-medium text-fg-muted">الفئة</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 border-[var(--border)]" />
          </div>
          <div>
            <label className="text-sm font-medium text-fg-muted">الإيموجي</label>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="mt-1 border-[var(--border)]" />
          </div>
          <div>
            <label className="text-sm font-medium text-fg-muted">التدرج اللوني</label>
            <Input value={gradient} onChange={(e) => setGradient(e.target.value)} className="mt-1 border-[var(--border)]" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>إلغاء</Button>
          <Button size="sm" onClick={onSaved}>حفظ</Button>
        </div>
      </motion.div>
    </div>
  );
}
