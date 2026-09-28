'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, RefreshCw, Copy, Sparkles } from 'lucide-react';

import { PageShell } from '@/components/shared/page-shell';
import { Section } from '@/components/shared/section';
import { AiThinking } from '@/components/shared/ai-thinking';
import { MockBanner } from '@/components/shared/mock-banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MessagePayload } from '@/lib/ai/schemas';

interface AiResponse {
  data: MessagePayload;
  model: string;
  is_mock: boolean;
  latency_ms: number;
}

interface FormState {
  relationship: string;
  tone: string;
  length: 'short' | 'medium' | 'long';
  recipient_name: string;
  context: string;
}

const RELATIONSHIPS = ['حبيبي/حبيبتي', 'صديق/صديقة', 'زميل/زميلة', 'والد/والدة', 'أخ/أخت', 'أخرى'];
const TONES = ['رومانسي', 'ودي', 'مهذب', 'صديقي', 'مضحك', 'مكتبية', 'ملهم'];

const LENGTH_OPTIONS: { value: 'short' | 'medium' | 'long'; label: string }[] = [
  { value: 'short', label: 'قصير' },
  { value: 'medium', label: 'متوسط' },
  { value: 'long', label: 'طويل' },
];

export default function AiMessagePage() {
  const [form, setForm] = useState<FormState>({
    relationship: '',
    tone: '',
    length: 'medium',
    recipient_name: '',
    context: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiResponse | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? 'فشل توليد الرسالة');
      }

      const data: AiResponse = await res.json();
      setResult(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <PageShell>
      {/* Hero */}
      <Section className="text-center" delay={0.1}>
        <motion.h1
          className="text-3xl font-bold text-fg sm:text-4xl"
          initial={{ opacity: 0, y: -20 }}
        >
          مولّد الرسائل
        </motion.h1>
        <motion.p
          className="mt-3 max-w-2xl text-fg-muted"
          initial={{ opacity: 0, y: -20 }}
          transition={{ delay: 0.1 }}
        >
          اكتب رسالة شخصية بنبرة وطول يختارهما أنت، مع نسخ بديلة.
        </motion.p>
      </Section>

      {/* Form */}
      <Section delay={0.2} className="mt-12">
        <Card className="border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-xl">
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-fg-muted mb-1.5">العلاقة</label>
                <select
                  name="relationship"
                  value={form.relationship}
                  onChange={handleChange}
                  className={cn(
                    'w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5',
                    'text-sm text-fg focus:border-[var(--primary)]/55 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30',
                  )}
                  required
                >
                  <option value="">اختر العلاقة</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-muted mb-1.5">النغمة</label>
                <select
                  name="tone"
                  value={form.tone}
                  onChange={handleChange}
                  className={cn(
                    'w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5',
                    'text-sm text-fg focus:border-[var(--primary)]/55 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30',
                  )}
                  required
                >
                  <option value="">اختر النغمة</option>
                  {TONES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-fg-muted mb-1.5">الطول</label>
                <div className="flex gap-2">
                  {LENGTH_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={form.length === opt.value ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => setForm((p) => ({ ...p, length: opt.value }))}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-fg-muted mb-1.5">اسم المستلم</label>
                <input
                  type="text"
                  name="recipient_name"
                  placeholder="مثال: يارا"
                  value={form.recipient_name}
                  onChange={handleChange}
                  className={cn(
                    'w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5',
                    'text-sm text-fg placeholder:text-fg-faint focus:border-[var(--primary)]/55 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30',
                  )}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-fg-muted mb-1.5">السياق</label>
                <textarea
                  name="context"
                  placeholder="مثال: عيد ميلاده الاثنين الجاي، بيحب القراءة..."
                  value={form.context}
                  onChange={handleChange}
                  rows={3}
                  maxLength={600}
                  className={cn(
                    'w-full resize-y rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5',
                    'text-sm text-fg placeholder:text-fg-faint focus:border-[var(--primary)]/55 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30',
                  )}
                  required
                />
                <p className="mt-1 text-xs text-fg-faint">
                  أقصى 600 حرفًا ({form.context.length}/600)
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
              disabled={isGenerating || !form.relationship || !form.tone || !form.context}
              size="lg"
              className="w-full shadow-lg shadow-[0_12px_30px_-12px_rgba(255,123,176,0.8)]"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                  جارٍ الكتابة...
                </>
              ) : (
                <>
                  <Send className="ml-2 h-4 w-4" />
                  ولّد الرسالة
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
                  'التفكير في النبرة...',
                  'صياغة العبارات...',
                  'الكتابة بلهجة مناسبة...',
                ]}
              />
              <MockBanner className="mt-3" />
            </motion.div>
          )}

          {result && !isGenerating && (
            <motion.div
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {result.is_mock && <MockBanner />}

              <Card className="border-[var(--border)] bg-[var(--card)]/50">
                <div className="p-6 sm:p-8">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-fg flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--hd-pink)]" />
                      الرسالة الرئيسية
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.data.message)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  {result.data.tone_note && (
                    <p className="mb-3 text-sm text-fg-faint">ملاحظة: {result.data.tone_note}</p>
                  )}

                  <p className="whitespace-pre-wrap text-fg-muted leading-relaxed">{result.data.message}</p>
                </div>
              </Card>

              {result.data.variants && result.data.variants.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-fg">نسخ بديلة</h3>
                  {result.data.variants.map((variant, i) => (
                    <Card
                      key={i}
                      className="border-[var(--border)] bg-[var(--card)]/30"
                    >
                      <div className="p-4 sm:p-6">
                        <p className="whitespace-pre-wrap text-sm text-fg-muted leading-relaxed">{variant}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-3"
                          onClick={() => copyToClipboard(variant)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Section>
    </PageShell>
  );
}
