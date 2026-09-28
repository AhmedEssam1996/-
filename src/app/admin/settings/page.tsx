'use client';

import { useState } from 'react';
import { Bot, Info } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsync } from '@/hooks/useAsync';

interface SettingsResponse {
  settings: {
    site_name: string;
    site_name_en: string;
    ai_model: string | null;
    ai_daily_limit: number | null;
    ai_monthly_limit: number | null;
    default_gift_visibility: 'public' | 'unlisted';
    maintenance_mode: boolean;
    feature_flags: Record<string, boolean>;
    source: 'database' | 'env';
  };
  defaults: {
    feature_flags: Record<string, boolean>;
    ai_model: string;
    ai_daily_limit: number;
    ai_monthly_limit: number;
    rate_limit_per_minute: number;
  };
  environment: {
    ai_provider: string;
    has_openrouter_key: boolean;
    has_service_role_key: boolean;
    has_database_url: boolean;
    has_bootstrap_token: boolean;
    initial_admin_email_set: boolean;
  };
}

const FEATURE_FLAG_LABELS: Record<string, string> = {
  ai_gift_finder: 'مكتشف الهدايا بالذكاء',
  ai_message_generator: 'مولّد الرسائل',
  ai_story_generator: 'مولّد القصص',
  video_gifts: 'هدايا فيديو',
  ai_image_generation: 'توليد صور',
  gift_analytics: 'تحليلات الهدايا',
};

export default function AdminSettingsPage() {
  const { data: response, loading, error, refetch } = useAsync<SettingsResponse>(
    async () => {
      const res = await fetch('/api/admin/settings');
      if (!res.ok) throw new Error('فشل تحميل الإعدادات');
      return res.json();
    },
    [],
  );

  const [saving, setSaving] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const settings = response?.settings;
  const defaults = response?.defaults;
  const environment = response?.environment;

  const handleFlagChange = async (key: string, value: boolean) => {
    setSaving(key);
    setSaveError(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature_flags: { [key]: value } }),
      });
      if (!res.ok) throw new Error('فشل حفظ الإعداد');
      await refetch();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const handleFieldChange = async (key: string, value: unknown) => {
    setSaving(key);
    setSaveError(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error('فشل حفظ الإعداد');
      await refetch();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (error || !response) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[var(--hd-rose)]">{error?.message || 'خطأ في تحميل الإعدادات'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg">الإعدادات</h1>
          <p className="mt-1 text-sm text-fg-muted">إدارة إعدادات الموقع والخوادم والميزات.</p>
        </div>
        <Badge variant={settings?.source === 'database' ? 'default' : 'default'}>
          المصدر: {settings?.source}
        </Badge>
      </div>

      {saveSuccess && (
        <Badge variant="default" className="border-[var(--primary)]/35 text-[var(--hd-pink-soft)] bg-[var(--primary)]/12">
          تم الحفظ ✓
        </Badge>
      )}
      {saveError && (
        <Badge variant="default" className="border-[var(--hd-rose)]/35 text-[var(--hd-pink-soft)] bg-[var(--hd-rose)]/12">
          {saveError}
        </Badge>
      )}

      {/* General Settings */}
      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardHeader>
          <CardTitle>الإعدادات العامة</CardTitle>
          <CardDescription>اسم الموقع والإعدادات العامة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-fg-muted">اسم الموقع (عربي)</label>
              <input
                type="text"
                value={settings?.site_name || ''}
                onChange={(e) => handleFieldChange('site_name', e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-sm text-fg"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-fg-muted">اسم الموقع (إنجليزي)</label>
              <input
                type="text"
                value={settings?.site_name_en || ''}
                onChange={(e) => handleFieldChange('site_name_en', e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-sm text-fg"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-fg-muted">رؤية الهدايا الافتراضية</label>
              <select
                value={settings?.default_gift_visibility || 'unlisted'}
                onChange={(e) => handleFieldChange('default_gift_visibility', e.target.value)}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-sm text-fg"
              >
                <option value="unlisted">خاصة (لينك خاص)</option>
                <option value="public">عامة</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.maintenance_mode || false}
                  onChange={(e) => handleFieldChange('maintenance_mode', e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border)] bg-[var(--card-soft)] text-[var(--hd-pink)]"
                />
                <span className="text-sm font-medium text-fg-muted">وضع الصيانة</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardHeader>
          <CardTitle>إعدادات الذكاء الاصطناعي</CardTitle>
          <CardDescription>الموديل وحدود الاستخدام.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-fg-muted">الموديل</label>
              <input
                type="text"
                value={settings?.ai_model || defaults?.ai_model || ''}
                onChange={(e) => handleFieldChange('ai_model', e.target.value || null)}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-sm text-fg"
                placeholder="استماع افتراضي"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-fg-muted">الحد اليومي</label>
              <input
                type="number"
                value={settings?.ai_daily_limit ?? defaults?.ai_daily_limit ?? ''}
                onChange={(e) => handleFieldChange('ai_daily_limit', Number(e.target.value))}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-sm text-fg"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-fg-muted">الحد الشهري</label>
              <input
                type="number"
                value={settings?.ai_monthly_limit ?? defaults?.ai_monthly_limit ?? ''}
                onChange={(e) => handleFieldChange('ai_monthly_limit', Number(e.target.value))}
                className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-2 text-sm text-fg"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardHeader>
          <CardTitle>ميزات المنصة</CardTitle>
          <CardDescription>تفعيل أو إيقاف ميزات الذكاء والمنصة.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(settings?.feature_flags || {}).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-fg-faint" />
                <span className="text-sm text-fg-muted">
                  {FEATURE_FLAG_LABELS[key] || key}
                </span>
              </div>
              <label className="relative inline-flex h-5 w-9 items-center rounded-full">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleFlagChange(key, e.target.checked)}
                  className="h-5 w-9 cursor-pointer rounded-full border-[var(--border)] bg-[var(--card-soft)] text-[var(--hd-pink)] focus:ring-emerald-400"
                  disabled={saving === key}
                />
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Environment */}
      <Card className="border-[var(--border)] bg-[var(--card)]/40">
        <CardHeader>
          <CardTitle>بيئة التشغيل</CardTitle>
          <CardDescription>حالة المتغيرات البيئية — لا تُظهر الأسرار.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <EnvItem label="مزوّد الذكاء" value={environment?.ai_provider || '—'} />
            <EnvItem label="مفتاح OpenRouter" value={environment?.has_openrouter_key ? '✅ مُعد' : '❌ غير مُعد'} />
            <EnvItem label="مفتاح Service Role" value={environment?.has_service_role_key ? '✅ مُعد' : '❌ غير مُعد'} />
            <EnvItem label="قاعدة البيانات" value={environment?.has_database_url ? '✅ مُعد' : '❌ غير مُعد'} />
            <EnvItem label="رمز التشغيل الأول" value={environment?.has_bootstrap_token ? '✅ مُعد' : '❌ غير مُعد'} />
            <EnvItem label="إيميل الأدمن الأول" value={environment?.initial_admin_email_set ? '✅ مُعد' : '❌ غير مُعد'} />
            <EnvItem label="معدل الحد من الطلبات" value={String(defaults?.rate_limit_per_minute ?? '—')} />
          </div>

          {!environment?.has_database_url && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              <Info className="mt-0.25 h-4 w-4 flex-shrink-0" />
              <span>
                قاعدة البيانات غير متصلة. بعض الميزات ستعمل في وضع العرض فقط.
                أضف{' '}
                <code className="rounded bg-[var(--card-soft)] px-1.5 py-0.25">DATABASE_URL</code>
                {' '} في ملف البيئة.
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EnvItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between rounded-2xl border border-[var(--border)] bg-[var(--card)]/40 px-3 py-2">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="text-sm text-fg-muted">{value}</span>
    </div>
  );
}
