'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, GripVertical, Save, Sparkles, Wand2 } from 'lucide-react';

import { PageShell } from '@/components/shared/page-shell';
import { Section } from '@/components/shared/section';
import { AiThinking } from '@/components/shared/ai-thinking';
import { MockBanner } from '@/components/shared/mock-banner';
import { FormField } from '@/components/shared/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks';
import { CATEGORIES } from '@/lib/mock-data';
import type { GiftExperiencePayload, ExperienceSection } from '@/lib/ai/schemas';

type SectionType =
  | 'cover'
  | 'story'
  | 'memory'
  | 'message'
  | 'quote'
  | 'image'
  | 'countdown'
  | 'quiz'
  | 'final';

interface GiftSection {
  id: string;
  type: SectionType;
  title: string;
  content: string;
  image_url?: string;
  target_date?: string;
  question?: string;
  options: string[];
  answerIndex: number;
  button_label?: string;
  button_href?: string;
}

interface GiftForm {
  title: string;
  category: string;
  recipient_name: string;
  occasion: string;
  visibility: 'public' | 'unlisted';
  cover_image: string;
  sections: GiftSection[];
  intro: string;
}

const SECTION_TEMPLATES: { type: SectionType; label: string; icon: string; defaultTitle: string }[] = [
  { type: 'cover', label: 'الغلاف', icon: '🎁', defaultTitle: 'هدية خاصة' },
  { type: 'story', label: 'قصة', icon: '📖', defaultTitle: 'القصة' },
  { type: 'memory', label: 'ذكرى', icon: '📸', defaultTitle: 'ذكرى مشتركة' },
  { type: 'message', label: 'رسالة', icon: '💌', defaultTitle: 'رسالة من القلب' },
  { type: 'quote', label: 'اقتباس', icon: '💬', defaultTitle: 'كلمة ملهمة' },
  { type: 'image', label: 'صورة', icon: '🖼️', defaultTitle: 'لحظة تصويرية' },
  { type: 'countdown', label: 'عداد تنازلي', icon: '⏳', defaultTitle: 'الوقت الحبيب' },
  { type: 'quiz', label: 'اختبار', icon: '❓', defaultTitle: 'سؤال سريع' },
  { type: 'final', label: 'الخاتمة', icon: '🎉', defaultTitle: 'تهانينا!' },
];

function CreateGiftPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const aiSuggestion = searchParams.get('title');

  const [form, setForm] = useState<GiftForm>({
    title: aiSuggestion || 'هدية خاصة',
    category: 'birthday',
    recipient_name: '',
    occasion: '',
    visibility: 'unlisted',
    cover_image: '',
    intro: '',
    sections: [
      {
        id: Date.now().toString(),
        type: 'cover',
        title: 'هدية خاصة',
        content: '',
        options: [],
        answerIndex: 0,
      },
    ],
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const handleUpdateField = (field: keyof GiftForm, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addSection = (type: SectionType) => {
    const template = SECTION_TEMPLATES.find((t) => t.type === type);
    if (!template) return;

    const newSection: GiftSection = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title: template.defaultTitle,
      content: '',
      options: type === 'quiz' ? ['', ''] : [],
      answerIndex: 0,
    };

    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  };

  const updateSection = (sectionId: string, field: keyof GiftSection, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, [field]: value } : s)),
    }));
  };

  const removeSection = (sectionId: string) => {
    if (form.sections.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const handleGenerateAI = async () => {
    if (!form.title.trim()) return;
    setIsGenerating(true);
    setAiError(null);

    try {
      const res = await fetch('/api/ai/gift-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `${form.title} ${form.recipient_name ? `لـ ${form.recipient_name}` : ''} ${form.occasion || 'مناسبة'} ${form.intro}`,
          recipient_name: form.recipient_name || undefined,
          occasion: form.occasion || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'فشل توليد التجربة');
      }

      const result: { data: GiftExperiencePayload; is_mock: boolean } = await res.json();
      const { title, intro, sections: aiSections, final_message } = result.data;

      const mappedSections: GiftSection[] = (aiSections || []).map((sec: ExperienceSection, i: number) => ({
        id: `${Date.now()}-${i}`,
        type: sec.type as SectionType,
        title: sec.title,
        content: sec.content,
        options: [],
        answerIndex: 0,
      }));

      // Ensure first section is cover, last is final
      const hasCover = mappedSections.some((s) => s.type === 'cover');
      const hasFinal = mappedSections.some((s) => s.type === 'final');

      const orderedSections = [
        ...(hasCover
          ? []
          : [{ id: `${Date.now()}-cover`, type: 'cover' as SectionType, title: form.title, content: '', options: [], answerIndex: 0 }]),
        ...mappedSections,
        ...(hasFinal
          ? []
          : [{ id: `${Date.now()}-final`, type: 'final' as SectionType, title: '🎉', content: final_message || '', options: [], answerIndex: 0 }]),
      ];

      setForm((prev) => ({
        ...prev,
        title: title || prev.title,
        intro: intro || prev.intro,
        sections: orderedSections.length > 0 ? orderedSections : prev.sections,
      }));
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const handlePublish = async () => {
    if (!user) {
      window.location.href = '/login?redirect=/create-gift';
      return;
    }

    const sectionsPayload = form.sections.map((s) => ({
      type: s.type,
      title: s.title,
      content: s.content,
      ...(s.image_url ? { image: s.image_url } : {}),
      ...(s.target_date ? { target_date: s.target_date } : {}),
      ...(s.question ? { question: s.question } : {}),
      ...(s.options?.length ? { options: s.options } : {}),
      ...(s.button_label ? { button_label: s.button_label } : {}),
      ...(s.button_href ? { button_href: s.button_href } : {}),
    }));

    try {
      const res = await fetch('/api/gifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: form.title,
          category: form.category,
          type: 'experience',
          recipient_name: form.recipient_name || undefined,
          occasion: form.occasion || undefined,
          content: { intro: form.intro },
          theme: form.cover_image ? { background: form.cover_image } : {},
          cover_image: form.cover_image || undefined,
          visibility: form.visibility,
          source: 'builder',
          sections: sectionsPayload,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'فشل حفظ الهدية');
      }

      const result = await res.json();
      const slug = result.gift?.slug || result.slug;
      window.location.href = `/gift/${slug}`;
    } catch (err) {
      console.error(err);
    }
  };

  const canGenerateAI = !!form.title && !!form.recipient_name && !!form.occasion;
  const hasContent = form.sections.some((s) => s.content.trim().length > 0 || s.title.trim().length > 0);

  return (
    <PageShell>
      <Section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg">أنشئ هدية جديدة</h1>
          <p className="mt-1 text-sm text-fg-muted">صمم تجربة تفاعلية مخصصة بالذكاء الاصطناعي أو يدوياً.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSaveDraft}>
            <Save className="ml-2 h-4 w-4" />
            حفظ المسودة
          </Button>
          {draftSaved && <Badge className="bg-[var(--primary)]/12 text-[var(--hd-pink-soft)] border-[var(--primary)]/35">تم الحفظ</Badge>}
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Form */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="border-[var(--border)] bg-[var(--card)]/40">
              <CardHeader>
                <CardTitle>الإعدادات الأساسية</CardTitle>
                <CardDescription>عنوان الهدية والمستلم والمناسبة.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  label="عنوان الهدية"
                  name="title"
                  placeholder="مثال: تذكار عيد ميلاد مميز"
                  value={form.title}
                  onChange={(e) => handleUpdateField('title', e.target.value)}
                  required
                />

                <FormField
                  label="الفئة"
                  name="category"
                  placeholder="اختر..."
                  value={form.category}
                  as="textarea"
                  helper={
                    <select
                      name="category"
                      value={form.category}
                      onChange={(e) => handleUpdateField('category', e.target.value)}
                      className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-2 py-1.5 text-sm text-fg"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.slug}>{cat.name} {cat.emoji}</option>
                      ))}
                    </select>
                  }
                />

                <FormField
                  label="اسم المستلم"
                  name="recipient_name"
                  placeholder="مثال: فاطمة"
                  value={form.recipient_name}
                  onChange={(e) => handleUpdateField('recipient_name', e.target.value)}
                />

                <FormField
                  label="المناسبة"
                  name="occasion"
                  placeholder="مثال: عيد ميلاد"
                  value={form.occasion}
                  onChange={(e) => handleUpdateField('occasion', e.target.value)}
                />

                <FormField
                  label="الرؤية"
                  name="visibility"
                  value={form.visibility}
                  as="textarea"
                  helper={
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="visibility"
                        value="unlisted"
                        checked={form.visibility === 'unlisted'}
                        onChange={(e) => handleUpdateField('visibility', e.target.value)}
                        className="h-4 w-4 text-[var(--hd-pink)]"
                      />
                      غير منشور (رابط خاص)
                    </label>
                  }
                />
                <FormField
                  name="visibility"
                  label="الرؤية"
                  value={form.visibility}
                  as="textarea"
                  helper={
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="visibility"
                        value="public"
                        checked={form.visibility === 'public'}
                        onChange={(e) => handleUpdateField('visibility', e.target.value)}
                        className="h-4 w-4 text-[var(--hd-pink)]"
                      />
                      نشر علني
                    </label>
                  }
                />
              </CardContent>
            </Card>

            {/* AI Generator */}
            <Card className="border-[var(--border)] bg-[var(--card)]/40">
              <CardHeader>
                <CardTitle>توليد بالذكاء الاصطناعي</CardTitle>
                <CardDescription>استخدم الذكاء عشان يبني لك التجربة كلها.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !canGenerateAI}
                  className="w-full"
                  variant={canGenerateAI ? 'secondary' : 'outline'}
                >
                  {isGenerating ? (
                    <AiThinking messages={['التفكير...', 'بناء الأقسام...', 'الكتابة...']} />
                  ) : (
                    <>
                      <Wand2 className="ml-2 h-4 w-4" />
                      ولّد التجربة بالـ AI
                    </>
                  )}
                </Button>
                {!canGenerateAI && !isGenerating && (
                  <p className="mt-2 text-xs text-fg-faint">أدخل العنوان + اسم المستلم + المناسبة أولًا.</p>
                )}
                {aiError && <p className="mt-2 text-sm text-[var(--hd-rose)]">{aiError}</p>}
                <MockBanner className="mt-3" />
              </CardContent>
            </Card>
          </div>

          {/* Right: Sections Editor */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {form.sections.map((section, index) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  index={index}
                  total={form.sections.length}
                  onUpdate={(field, value) => updateSection(section.id, field, value)}
                  onRemove={() => removeSection(section.id)}
                />
              ))}
            </AnimatePresence>

            <div className="flex flex-wrap gap-2">
              <p className="text-sm text-fg-muted">إضافة قسم:</p>
              {SECTION_TEMPLATES.filter((t) => t.type !== 'cover' && t.type !== 'final').map((t) => (
                <Button
                  key={t.type}
                  variant="outline"
                  size="sm"
                  onClick={() => addSection(t.type)}
                >
                  <Plus className="ml-1 h-3 w-3" />
                  {t.icon} {t.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section>
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/gift/${form.sections[0]?.content || ''}`}>معاينة</Link>
            </Button>
          </div>
          <Button
            onClick={handlePublish}
            disabled={!hasContent}
            size="lg"
            className="shadow-lg shadow-[0_12px_30px_-12px_rgba(255,123,176,0.8)]"
          >
            <Sparkles className="ml-2 h-4 w-4" />
            نشر الهدية
          </Button>
        </div>
      </Section>
    </PageShell>
  );
}

function SectionEditor({
  section,
  index,
  total: _total,
  onUpdate,
  onRemove,
}: {
  section: GiftSection;
  index: number;
  total: number;
  onUpdate: (field: keyof GiftSection, value: unknown) => void;
  onRemove: () => void;
}) {
  const isCover = section.type === 'cover';
  const isFinal = section.type === 'final';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="rounded-xl border border-[var(--border)] bg-[var(--card)]/40 p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <GripVertical className="h-4 w-4 cursor-grab text-fg-faint" />
        <Badge variant="default" className="border-[var(--border)]">
          #{index + 1}
        </Badge>
        <Badge variant="default" className="border-[var(--border)]">
          {SECTION_TEMPLATES.find((t) => t.type === section.type)?.icon} {SECTION_TEMPLATES.find((t) => t.type === section.type)?.label}
        </Badge>
        <span className="flex-1" />
        {!isCover && !isFinal && (
          <Button variant="ghost" size="sm" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-[var(--hd-rose)]" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <FormField
          label="العنوان"
          name="title"
          placeholder="عنوان القسم"
          value={section.title}
          onChange={(e) => onUpdate('title', e.target.value)}
        />

        {!isCover && !isFinal && (
          <FormField
            label="المحتوى"
            name="content"
            placeholder="ما تكتب هنا..."
            value={section.content}
            onChange={(e) => onUpdate('content', e.target.value)}
            as="textarea"
            rows={3}
          />
        )}

        {section.type === 'image' && (
          <FormField
            label="رابط الصورة"
            name="image_url"
            placeholder="https://..."
            value={section.image_url || ''}
            onChange={(e) => onUpdate('image_url', e.target.value)}
          />
        )}

        {section.type === 'countdown' && (
          <FormField
            label="التاريخ الهدف"
            name="target_date"
            type="date"
            value={section.target_date || ''}
            onChange={(e) => onUpdate('target_date', e.target.value)}
          />
        )}

        {section.type === 'quiz' && (
          <>
            <FormField
              label="السؤال"
              name="question"
              placeholder="سؤالك؟"
              value={section.question || ''}
              onChange={(e) => onUpdate('question', e.target.value)}
            />
            <div className="space-y-2">
              <Label className="text-sm font-medium text-fg-muted">الخيارات ({section.options.length})</Label>
              {section.options.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...section.options];
                      newOptions[i] = e.target.value;
                      onUpdate('options', newOptions);
                    }}
                    className="flex-1 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-3 py-1.5 text-sm text-fg"
                    placeholder={`خيار ${i + 1}`}
                  />
                  <input
                    type="radio"
                    name={`answer-${section.id}`}
                    checked={section.answerIndex === i}
                    onChange={() => onUpdate('answerIndex', i)}
                    className="h-4 w-4 text-[var(--hd-pink)]"
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {section.type === 'final' && (
          <>
            <FormField
              label="الرسالة الختامية"
              name="content"
              placeholder="تهانينا..."
              value={section.content}
              onChange={(e) => onUpdate('content', e.target.value)}
              as="textarea"
              rows={2}
            />
            <FormField
              label="زر المشاركة"
              name="button_label"
              placeholder="شاركها"
              value={section.button_label || ''}
              onChange={(e) => onUpdate('button_label', e.target.value)}
            />
            <FormField
              label="رابط الزر"
              name="button_href"
              placeholder="https://..."
              value={section.button_href || ''}
              onChange={(e) => onUpdate('button_href', e.target.value)}
            />
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function CreateGiftPage() {
  return (
    <Suspense fallback={null}>
      <CreateGiftPageInner />
    </Suspense>
  );
}

