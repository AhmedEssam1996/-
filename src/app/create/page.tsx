'use client';

import { motion } from 'motion/react';
import { Check, Copy, ImagePlus, Music, Palette, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import * as React from 'react';

import { GiftArtwork } from '@/components/shared/gift-artwork';
import { PageShell } from '@/components/shared/page-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { GIFT_FORMATS, GIFT_THEMES, themeForCategory } from '@/lib/brand';
import { useLocale } from '@/lib/i18n';
import { OCCASIONS } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

/**
 * Create Gift — a two-pane creative studio.
 *
 * LEFT  : controls (recipient, occasion, theme, format, message, media, AI)
 * RIGHT : a live preview that re-renders on every keystroke
 *
 * The preview is the point of the page: it must feel like Canva, not a form.
 * Every control writes into one `draft` object and the preview derives entirely
 * from it, so there is exactly one source of truth and no sync bugs.
 *
 * The AI message generator posts to the existing `/api/ai/message` route, which
 * owns the feature flag, the rate limit and the response schema.
 */

type Tone = 'romantic' | 'emotional' | 'funny' | 'sweet' | 'formal';
type Length = 'short' | 'medium' | 'long';

const TONES: Array<{ id: Tone; label: string; emoji: string }> = [
  { id: 'romantic', label: 'رومانسي', emoji: '🌹' },
  { id: 'emotional', label: 'مؤثر', emoji: '🥹' },
  { id: 'funny', label: 'مضحك', emoji: '😂' },
  { id: 'sweet', label: 'لطيف', emoji: '🧸' },
  { id: 'formal', label: 'رسمي', emoji: '🎩' },
];

const LENGTHS: Array<{ id: Length; label: string }> = [
  { id: 'short', label: 'قصير' },
  { id: 'medium', label: 'متوسط' },
  { id: 'long', label: 'طويل' },
];

interface Draft {
  recipient: string;
  occasion: string;
  category: string;
  format: string;
  message: string;
  sender: string;
  music: string | null;
}

export default function CreatePage() {
  const { t } = useLocale();
  const reduceMotion = usePrefersReducedMotion();

  const [draft, setDraft] = React.useState<Draft>({
    recipient: '',
    occasion: 'birthday',
    category: 'birthday',
    format: 'envelope',
    message: '',
    sender: '',
    music: null,
  });

  const [tone, setTone] = React.useState<Tone>('emotional');
  const [length, setLength] = React.useState<Length>('medium');
  const [generating, setGenerating] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const patch = (next: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...next }));

  /* ------------------------------------------------------------- generate */
  const generate = async (regenerate = false) => {
    setGenerating(true);
    setAiError(null);

    try {
      const response = await fetch('/api/ai/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationship: undefined,
          tone,
          length,
          recipient_name: draft.recipient || undefined,
          context: [
            OCCASIONS.find((entry) => entry.id === draft.occasion)?.label,
            draft.message.trim(),
          ]
            .filter(Boolean)
            .join(' — ')
            .slice(0, 600),
          previous_message: regenerate ? draft.message.slice(0, 1200) : undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(payload?.error?.message ?? t('ai.error'));
      }

      const payload = (await response.json()) as { data?: { message?: string } };
      const message = payload.data?.message?.trim();
      if (message) patch({ message });
    } catch (caught) {
      setAiError((caught as Error).message || t('ai.error'));
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(draft.message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked — the text is still selectable in the textarea.
    }
  };

  return (
    <PageShell>
      {/* ============================================================ header */}
      <header className="mx-auto max-w-2xl text-center">
        <span className="text-[11px] font-extrabold tracking-[0.18em] text-[var(--primary)] uppercase">
          استوديو الإبداع
        </span>
        <h1 className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight text-fg sm:text-4xl">
          اصنع هدية <span className="text-gradient">بإحساسك</span>
        </h1>
        <p className="mt-4 leading-relaxed text-fg-muted">
          عدّل على الشمال، وشوف النتيجة بتتغيّر على اليمين في نفس اللحظة.
        </p>
      </header>

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
        {/* ======================================================= controls */}
        <div className="space-y-6">
          <Panel title="المستلم" emoji="👤">
            <Field label="اسم الشخص">
              <input
                value={draft.recipient}
                onChange={(event) => patch({ recipient: event.target.value })}
                placeholder="مثال: سارة"
                maxLength={60}
                className={inputClass}
              />
            </Field>
            <Field label="اسمك (اختياري)">
              <input
                value={draft.sender}
                onChange={(event) => patch({ sender: event.target.value })}
                placeholder="مثال: أحمد"
                maxLength={60}
                className={inputClass}
              />
            </Field>
          </Panel>

          <Panel title="المناسبة" emoji="🎉">
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((entry) => (
                <Chip
                  key={entry.id}
                  active={draft.occasion === entry.id}
                  onClick={() => patch({ occasion: entry.id, category: entry.id })}
                >
                  <span aria-hidden>{entry.emoji}</span>
                  {entry.label}
                </Chip>
              ))}
            </div>
          </Panel>

          <Panel title="الثيم والألوان" emoji="🎨">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GIFT_THEMES.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => patch({ category: theme.id })}
                  aria-pressed={draft.category === theme.id}
                  className={cn(
                    'group relative overflow-hidden rounded-2xl border p-3 text-start transition-all duration-300',
                    draft.category === theme.id
                      ? 'border-[var(--primary)] shadow-lift'
                      : 'border-[var(--border)] hover:-translate-y-0.5 hover:shadow-soft',
                  )}
                >
                  <span
                    aria-hidden
                    className="block h-10 w-full rounded-xl"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                    }}
                  />
                  <span className="mt-2 block text-[11px] font-bold text-fg">{theme.label}</span>
                  {draft.category === theme.id ? (
                    <span className="absolute end-2 top-2 grid size-4 place-items-center rounded-full bg-[var(--primary)] text-[var(--primary-ink)]">
                      <Check className="size-2.5" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="شكل الهدية" emoji="🎁">
            <div className="flex flex-wrap gap-2">
              {GIFT_FORMATS.map((entry) => (
                <Chip
                  key={entry.id}
                  active={draft.format === entry.id}
                  onClick={() => patch({ format: entry.id })}
                >
                  <span aria-hidden>{entry.emoji}</span>
                  {entry.label}
                </Chip>
              ))}
            </div>
          </Panel>

          {/* ==================================================== message */}
          <Panel title="الرسالة" emoji="💌">
            <Field label="اكتب رسالتك">
              <textarea
                value={draft.message}
                onChange={(event) => patch({ message: event.target.value })}
                rows={5}
                maxLength={1200}
                placeholder="اكتب اللي في قلبك… أو خلّي الذكاء يساعدك."
                className={cn(inputClass, 'resize-y')}
              />
            </Field>

            <div className="mt-1 flex items-center justify-between text-[11px] text-fg-faint">
              <span>{draft.message.length} / 1200</span>
              {draft.message ? (
                <button
                  type="button"
                  onClick={copy}
                  className="inline-flex items-center gap-1 font-bold text-[var(--primary)] hover:underline"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? t('gift.copied') : 'انسخ'}
                </button>
              ) : null}
            </div>

            {/* ------------------------------------------ AI message writer */}
            <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-4">
              <p className="flex items-center gap-1.5 text-[13px] font-bold text-fg">
                <Sparkles className="size-3.5 text-[var(--primary)]" aria-hidden />
                خلّي الذكاء يكتبها لك
              </p>

              <div className="mt-3 space-y-3">
                <div>
                  <span className="text-[10px] font-bold tracking-[0.12em] text-fg-faint uppercase">
                    النبرة
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {TONES.map((entry) => (
                      <Chip
                        key={entry.id}
                        size="sm"
                        active={tone === entry.id}
                        onClick={() => setTone(entry.id)}
                      >
                        <span aria-hidden>{entry.emoji}</span>
                        {entry.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold tracking-[0.12em] text-fg-faint uppercase">
                    الطول
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {LENGTHS.map((entry) => (
                      <Chip
                        key={entry.id}
                        size="sm"
                        active={length === entry.id}
                        onClick={() => setLength(entry.id)}
                      >
                        {entry.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => generate(false)} loading={generating} disabled={generating}>
                  {generating ? null : <Wand2 />}
                  {generating ? t('ai.thinking') : 'اكتب الرسالة'}
                </Button>
                {draft.message ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => generate(true)}
                    disabled={generating}
                  >
                    <RefreshCw />
                    أعد التوليد
                  </Button>
                ) : null}
              </div>

              {aiError ? (
                <p className="mt-3 text-[12px] text-[var(--hd-rose)]" role="alert">
                  {aiError}
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel title="الصور والموسيقى" emoji="🖼️">
            <div className="grid gap-3 sm:grid-cols-2">
              <MediaSlot
                icon={<ImagePlus className="size-4" />}
                title="أضف صور"
                hint="ارفع من جهازك أو الصق رابط"
                disabled
              />
              <MediaSlot
                icon={<Music className="size-4" />}
                title="أضف موسيقى"
                hint="اختار مقطع هادي يشتغل مع الفتح"
                disabled
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-fg-faint">
              رفع الملفات محتاج تسجيل دخول. لحد ما تسجّل، الهدية بتشتغل بالرسمة والألوان المولّدة
              تلقائيًا.
            </p>
          </Panel>
        </div>

        {/* ======================================================== preview */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="mb-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.14em] text-fg-faint uppercase">
              <Palette className="size-3.5" aria-hidden />
              معاينة مباشرة
            </span>
            <Badge variant="primary">
              {GIFT_FORMATS.find((entry) => entry.id === draft.format)?.label}
            </Badge>
          </div>

          <motion.div
            layout
            className="relative overflow-hidden rounded-4xl border border-[var(--border)] bg-[var(--card)]/85 shadow-premium backdrop-blur-md"
          >
            <GiftArtwork
              category={draft.category}
              seed={`${draft.recipient}-${draft.category}-${draft.format}`}
              motifOverride={themeForCategory(draft.category).motif}
              className="aspect-[4/3] w-full"
            />

            <div className="p-6">
              <p className="text-[11px] font-bold tracking-[0.14em] text-fg-faint uppercase">
                {OCCASIONS.find((entry) => entry.id === draft.occasion)?.label}
              </p>

              <h2 className="mt-2 font-display text-2xl leading-tight font-bold text-fg">
                {draft.recipient ? `إلى ${draft.recipient}` : 'إلى شخص غالي'}
              </h2>

              {/* The message — the part that actually matters */}
              <div className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] p-5">
                {generating ? (
                  <div className="space-y-2" aria-hidden>
                    {[100, 92, 78, 60].map((width, index) => (
                      <div
                        key={index}
                        className="h-3 animate-pulse rounded-full bg-[color-mix(in_oklab,var(--fg)_10%,transparent)]"
                        style={{ width: `${width}%` }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="min-h-[5rem] leading-[2] whitespace-pre-wrap text-fg">
                    {draft.message ||
                      'رسالتك هتظهر هنا… اكتبها بنفسك أو خلّي الذكاء يساعدك.'}
                  </p>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
                <span className="text-[12px] text-fg-faint">
                  {draft.sender ? `من ${draft.sender}` : 'من مجهول'}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--primary)]">
                  <Sparkles className="size-3.5" aria-hidden />
                  Hadiya
                </span>
              </div>
            </div>

            {/* Subtle sheen that sweeps once when the message changes */}
            {!reduceMotion && draft.message ? (
              <motion.span
                key={draft.message.length}
                aria-hidden
                initial={{ opacity: 0.5, x: '-120%' }}
                animate={{ opacity: 0, x: '120%' }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
                className="pointer-events-none absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent"
              />
            ) : null}
          </motion.div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button size="lg" className="flex-1" disabled={!draft.message.trim() && !draft.recipient.trim()}>
              <Sparkles />
              توليد الهدية
            </Button>
            <Button size="lg" variant="secondary">
              حفظ كمسودة
            </Button>
          </div>

          <p className="mt-3 text-center text-[11px] text-fg-faint">
            النشر النهائي ومشاركة الرابط محتاجين تسجيل دخول.
          </p>
        </div>
      </div>
    </PageShell>
  );
}

/* ==========================================================================
   Primitives
   ========================================================================== */

const inputClass =
  'w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)] px-4 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-[var(--primary)]/55';

function Panel({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)]/80 p-5 shadow-soft backdrop-blur-md">
      <h2 className="mb-4 flex items-center gap-2 text-[13px] font-extrabold text-fg">
        <span className="grid size-7 place-items-center rounded-xl bg-[var(--card-soft)] text-sm" aria-hidden>
          {emoji}
        </span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-fg-muted">{label}</span>
      {children}
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
  size = 'md',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold transition-all duration-200',
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-[12px]',
        active
          ? 'border-transparent bg-[var(--primary)] text-[#160726] shadow-[0_8px_20px_-10px_rgba(255,123,176,0.9)]'
          : 'border-[var(--border)] bg-[var(--card-soft)] text-fg-muted hover:border-[var(--border-strong)] hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}

function MediaSlot({
  icon,
  title,
  hint,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-6 text-center',
        disabled
          ? 'border-[var(--border)] bg-[var(--card-soft)] opacity-70'
          : 'border-[var(--border-strong)] hover:border-[var(--primary)]/50',
      )}
    >
      <span className="grid size-9 place-items-center rounded-full bg-[var(--card-soft)] text-fg-muted">
        {icon}
      </span>
      <span className="mt-2.5 text-[13px] font-bold text-fg">{title}</span>
      <span className="mt-1 text-[11px] text-fg-faint">{hint}</span>
    </div>
  );
}