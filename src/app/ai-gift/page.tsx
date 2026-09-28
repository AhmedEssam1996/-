'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Sparkles, RefreshCw } from 'lucide-react';

import { PageShell } from '@/components/shared/page-shell';
import { Section } from '@/components/shared/section';
import { AiThinking } from '@/components/shared/ai-thinking';
import { MockBanner } from '@/components/shared/mock-banner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { GiftSuggestion } from '@/lib/ai/schemas';
import { AI_FEATURE_LIMITS } from '@/lib/api/features';

interface AiResponse {
  data: {
    suggestions: GiftSuggestion[];
  };
  model: string;
  is_mock: boolean;
  latency_ms: number;
}

interface FormState {
  relationship: string;
  occasion: string;
  age: string;
  interests: string;
  budget: string;
  gift_type: string;
  notes: string;
  recipient_name: string;
}

const RELATIONSHIPS = ['حبيبي/حبيبتي', 'صديق/صديقة', 'زميل/زميلة', 'والد/والدة', 'أخ/أخت', 'أخرى'];
const OCCASIONS = ['عيد ميلاد', 'عيد حب', 'تخرج', 'توظيف', 'ذكرى', 'تبريك', 'أخرى'];
const GIFT_TYPES = ['رقمية', 'تفاعلية', 'رسالة', 'صورة', 'قصة', 'فيديو', 'أي نوع'];

const FORM_FIELDS = [
  { key: 'relationship', label: 'العلاقة', type: 'select', options: RELATIONSHIPS, placeholder: 'اختر...' },
  { key: 'occasion', label: 'المناسبة', type: 'select', options: OCCASIONS, placeholder: 'اختر...' },
  { key: 'age', label: 'عمر المستلم', type: 'input', placeholder: 'مثال: 25' },
  { key: 'budget', label: 'الميزانية', type: 'input', placeholder: 'مثال: 500 جنيه' },
  { key: 'recipient_name', label: 'اسم المستلم', type: 'input', placeholder: 'مثال: سارة' },
  { key: 'gift_type', label: 'نوع الهدية', type: 'select', options: GIFT_TYPES, placeholder: 'اختر...' },
];

export default function AiGiftFinderPage() {
  const [form, setForm] = useState<FormState>({
    relationship: '',
    occasion: '',
    age: '',
    interests: '',
    budget: '',
    gift_type: '',
    notes: '',
    recipient_name: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiResponse['data'] | null>(null);
  const [usedMock, setUsedMock] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setResult(null);
    setUsedMock(false);

    try {
      const res = await fetch('/api/ai/gift-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'فشل توليد الاقتراحات');
      }

      const data: AiResponse = await res.json();
      setResult(data.data);
      setUsedMock(data.is_mock);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTryAgain = () => {
    setResult(null);
    setError(null);
  };

  const handleUseGift = (gift: GiftSuggestion) => {
    const params = new URLSearchParams({
      title: gift.title,
      type: gift.type,
      description: gift.description,
      personalization: gift.personalization,
      reason: gift.reason,
    });
    return `/create-gift?from=ai&${params.toString()}`;
  };

  return (
    <PageShell>
      {/* Hero */}
      <Section className="text-center" delay={0.1}>
        <motion.h1
          className="font-display text-3xl font-bold text-fg sm:text-4xl"
          initial={{ opacity: 0, y: -20 }}
        >
          مكتشف الهدايا بالذكاء الاصطناعي
        </motion.h1>
        <motion.p
          className="mt-3 max-w-2xl text-fg-muted"
          initial={{ opacity: 0, y: -20 }}
          transition={{ delay: 0.1 }}
        >
          قول لنا عن الحد اللي بتحبه والمناسبة، والذكاء الاصطناعي يقترح 5 هدايا مختلفة.
        </motion.p>
      </Section>

      {/* Form */}
      <Section delay={0.2} className="mt-12">
        <Card className="border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl">
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
              {FORM_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-fg-muted mb-1.5">{field.label}</label>
                  {field.type === 'select' && field.options ? (
                    <select
                      name={field.key}
                      value={form[field.key as keyof FormState]}
                      onChange={handleChange}
                      className={cn(
                        'w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5',
                        'text-sm text-fg focus:border-[var(--primary)]/55 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30',
                        'transition-colors',
                      )}
                    >
                      <option value="">{field.placeholder}</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type === 'input' ? (field.key === 'age' ? 'number' : 'text') : 'text'}
                      name={field.key}
                      placeholder={field.placeholder}
                      value={form[field.key as keyof FormState]}
                      onChange={handleChange}
                      className={cn(
                        'w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5',
                        'text-sm text-fg placeholder:text-fg-faint focus:border-[var(--primary)]/55 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30',
                        'transition-colors',
                      )}
                    />
                  )}
                </div>
              ))}

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-fg-muted mb-1.5">الاهتمامات</label>
                <textarea
                  name="interests"
                  placeholder="مثال: تحب القراءة والمطبخ العالمي"
                  value={form.interests}
                  onChange={handleChange}
                  rows={2}
                  maxLength={AI_FEATURE_LIMITS.giftFinderInterests}
                  className={cn(
                    'w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5',
                    'text-sm text-fg placeholder:text-fg-faint focus:border-[var(--primary)]/55 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30',
                  )}
                />
                <p className="mt-1 text-xs text-fg-faint">
                  أقصى {AI_FEATURE_LIMITS.giftFinderInterests} حرفًا ({form.interests.length}/{AI_FEATURE_LIMITS.giftFinderInterests})
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-fg-muted mb-1.5">ملاحظات إضافية</label>
                <textarea
                  name="notes"
                  placeholder="أي تفاصيل مهمة؟"
                  value={form.notes}
                  onChange={handleChange}
                  rows={2}
                  maxLength={AI_FEATURE_LIMITS.giftFinderNotes}
                  className={cn(
                    'w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5',
                    'text-sm text-fg placeholder:text-fg-faint focus:border-[var(--primary)]/55 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30',
                  )}
                />
                <p className="mt-1 text-xs text-fg-faint">
                  أقصى {AI_FEATURE_LIMITS.giftFinderNotes} حرفًا ({form.notes.length}/{AI_FEATURE_LIMITS.giftFinderNotes})
                </p>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="sm:col-span-2 text-sm text-[var(--hd-rose)]"
                >
                  {error}
                </motion.p>
              )}
            </form>
          </div>

          <div className="border-t border-[var(--border)] px-6 py-4 sm:px-8 sm:py-6">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isGenerating || !form.relationship || !form.occasion}
              size="lg"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                  جارٍ التفكير...
                </>
              ) : (
                <>
                  <Sparkles className="ml-2 h-4 w-4" />
                  ابحث عن هدايا
                </>
              )}
            </Button>
          </div>
        </Card>
      </Section>

      {/* Results */}
      <Section delay={0.3} className="mt-12">
        <AnimatePresence mode="wait">
          {isGenerating && (
            <motion.div
              key="thinking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8"
            >
              <AiThinking
                messages={[
                  'أدخل بياناتك...',
                  'أفكار هدايا ملائمة...',
                  'أفضل اقتراحات شخصية...',
                ]}
              />
              <MockBanner className="mt-3" />
            </motion.div>
          )}

          {result && !isGenerating && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-fg">اقتراحات الذكاء الاصطناعي</h2>
                <Button variant="ghost" size="sm" onClick={handleTryAgain}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {usedMock && <MockBanner />}

              <motion.div
                className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                initial="hide"
                animate="show"
                variants={{
                  show: { transition: { staggerChildren: 0.1 } },
                }}
              >
                {result.suggestions.map((gift, i) => (
                  <motion.div
                    key={i}
                    variants={{ show: { opacity: 1, y: 0 }, hide: { opacity: 0, y: 20 } }}
                    className={cn(
                      'group relative rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-6 backdrop-blur-md',
                      'transition-all duration-500 hover:-translate-y-1 hover:border-[var(--primary)]/45 hover:shadow-lift',
                    )}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <h3 className="font-semibold text-fg group-hover:text-[var(--hd-pink-soft)]">{gift.title}</h3>
                      <Badge variant="default" className="border-[var(--border)] text-xs">
                        {gift.type}
                      </Badge>
                    </div>

                    <p className="text-sm text-fg-muted mb-3 leading-relaxed">{gift.description}</p>

                    <div className="mb-3">
                      <Badge variant="primary" className="text-xs">
                        لماذا؟ {gift.reason}
                      </Badge>
                    </div>

                    <p className="mb-4 text-xs text-fg-faint leading-relaxed line-clamp-2">
                      {gift.personalization}
                    </p>

                    <Button asChild size="sm" className="w-full">
                      <a href={handleUseGift(gift)}>
                        <Gift className="ml-2 h-4 w-4" />
                        استخدام هذه الفكرة
                      </a>
                    </Button>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>
    </PageShell>
  );
}
