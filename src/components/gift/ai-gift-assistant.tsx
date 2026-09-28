'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { GiftArtwork } from '@/components/shared/gift-artwork';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { BUDGETS, MOODS, OCCASIONS, RELATIONSHIPS } from '@/lib/mock-data';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { GiftSuggestionsPayload } from '@/lib/ai/schemas';

/**
 * AI Gift Assistant.
 *
 * Renders on the deep-plum surface so it reads as a distinct "stage" in the
 * page — this is the moment the product shows off.
 *
 * IMPORTANT: this component owns presentation only. It posts to the existing
 * `/api/ai/gift-finder` route, which enforces the feature flag, the rate limit
 * and the Zod schema. No API key or provider detail is referenced here, and the
 * response is consumed through the already-validated `GiftSuggestionsPayload`
 * type — the client never re-implements server-side validation.
 */

interface AssistantSuggestion {
  title: string;
  description: string;
  reason: string;
  type: string;
  personalization: string;
}

export function AiGiftAssistant({ className }: { className?: string }) {
  const { t } = useLocale();
  const reduceMotion = usePrefersReducedMotion();

  const [relationship, setRelationship] = React.useState<string>('friend');
  const [occasion, setOccasion] = React.useState<string>('birthday');
  const [budget, setBudget] = React.useState<string>('medium');
  const [mood, setMood] = React.useState<string>('emotional');
  const [interests, setInterests] = React.useState('');

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [suggestions, setSuggestions] = React.useState<AssistantSuggestion[]>([]);
  const [isMock, setIsMock] = React.useState(false);

  const run = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/gift-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationship: RELATIONSHIPS.find((r) => r.id === relationship)?.label,
          occasion: OCCASIONS.find((o) => o.id === occasion)?.label,
          budget: BUDGETS.find((b) => b.id === budget)?.label,
          interests: [MOODS.find((m) => m.id === mood)?.label, interests.trim()]
            .filter(Boolean)
            .join(' — '),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        throw new Error(payload?.error?.message ?? t('ai.error'));
      }

      const payload = (await response.json()) as {
        data: GiftSuggestionsPayload;
        is_mock?: boolean;
      };

      setSuggestions(payload.data.suggestions ?? []);
      setIsMock(Boolean(payload.is_mock));
    } catch (caught) {
      setError((caught as Error).message || t('ai.error'));
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="ai-assistant"
      className={cn(
        'dark relative overflow-hidden rounded-4xl bg-[var(--bg)] px-5 py-12 text-fg sm:px-8 sm:py-16 lg:px-12',
        className,
      )}
    >
      {/* Ambient warm glows inside the dark stage */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 start-1/4 size-[30rem] rounded-full opacity-40 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #FF7BB0 0%, transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 end-0 size-[28rem] rounded-full opacity-35 blur-[120px]"
        style={{ background: 'radial-gradient(circle, #A97BFF 0%, transparent 65%)' }}
      />

      <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
        {/* ------------------------------------------------------ intro copy */}
        <div className="lg:pt-4">
          <Badge variant="gold" className="border-white/20 bg-white/10 text-[var(--hd-gold-soft)]">
            <Sparkles className="size-3" aria-hidden />
            {t('ai.eyebrow')}
          </Badge>

          <h2 className="mt-5 font-display text-3xl leading-[1.15] font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]">
            <span className="text-gradient-on-dark">{t('ai.title')}</span>
          </h2>

          <p className="mt-4 max-w-md leading-relaxed text-fg-muted">{t('ai.subtitle')}</p>

          {/* Decorative floating gift cards behind the copy */}
          {!reduceMotion ? (
            <div aria-hidden className="relative mt-10 hidden h-40 lg:block">
              {[
                { emoji: '🎂', top: '0%', start: '0%', delay: 0 },
                { emoji: '💌', top: '30%', start: '26%', delay: 0.8 },
                { emoji: '✨', top: '8%', start: '54%', delay: 1.6 },
              ].map((chip) => (
                <span
                  key={chip.emoji}
                  className="absolute grid size-16 place-items-center rounded-2xl border border-white/12 bg-[var(--card)]/60 text-2xl backdrop-blur-md"
                  style={{
                    top: chip.top,
                    insetInlineStart: chip.start,
                    animation: `hd-float ${6 + chip.delay}s ease-in-out ${chip.delay}s infinite`,
                  }}
                >
                  {chip.emoji}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {/* --------------------------------------------------------- the form */}
        <div className="rounded-3xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_72%,transparent)] p-5 backdrop-blur-xl sm:p-7">
          <fieldset className="space-y-5" disabled={loading}>
            <legend className="sr-only">{t('ai.eyebrow')}</legend>

            <Choice
              label={t('ai.relationship')}
              options={RELATIONSHIPS.map((r) => ({ id: r.id, label: r.label, emoji: r.emoji }))}
              value={relationship}
              onChange={setRelationship}
            />

            <Choice
              label={t('ai.occasion')}
              options={OCCASIONS.map((o) => ({ id: o.id, label: o.label, emoji: o.emoji }))}
              value={occasion}
              onChange={setOccasion}
            />

            <Choice
              label={t('ai.mood')}
              options={MOODS.map((m) => ({ id: m.id, label: m.label, emoji: m.emoji }))}
              value={mood}
              onChange={setMood}
            />

            <Choice
              label={t('ai.budget')}
              options={BUDGETS.map((b) => ({ id: b.id, label: b.label }))}
              value={budget}
              onChange={setBudget}
            />

            <div>
              <label
                htmlFor="ai-interests"
                className="text-[11px] font-bold tracking-[0.12em] text-fg-faint uppercase"
              >
                {t('ai.interests')}
              </label>
              <input
                id="ai-interests"
                value={interests}
                onChange={(event) => setInterests(event.target.value)}
                placeholder={t('ai.interestsPlaceholder')}
                maxLength={400}
                className="mt-2.5 w-full rounded-2xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--bg-soft)_70%,transparent)] px-4 py-3 text-sm text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-[var(--primary)]/55"
              />
            </div>
          </fieldset>

          <Button
            size="lg"
            className="mt-6 w-full"
            onClick={run}
            loading={loading}
            disabled={loading}
          >
            {loading ? null : <Wand2 />}
            {loading ? t('ai.thinking') : t('ai.submit')}
          </Button>

          {error ? (
            <p className="mt-3 text-center text-sm text-[var(--hd-rose)]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      {/* --------------------------------------------------------- results */}
      <div className="relative mt-12" aria-live="polite">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-44 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--card)]/50"
                />
              ))}
            </motion.div>
          ) : suggestions.length > 0 ? (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-fg">{t('ai.results')}</h3>
                <div className="flex items-center gap-2">
                  {isMock ? (
                    <Badge variant="gold" className="border-white/20 bg-white/10 text-[var(--hd-gold-soft)]">
                      {t('common.loading') === 'Loading…' ? 'demo' : 'وضع تجريبي'}
                    </Badge>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={run}>
                    <RefreshCw />
                    {t('ai.retry')}
                  </Button>
                </div>
              </div>

              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map((suggestion, index) => (
                  <motion.li
                    key={`${suggestion.title}-${index}`}
                    initial={reduceMotion ? undefined : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.07, duration: 0.4 }}
                    className="flex flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--card)_80%,transparent)] backdrop-blur-md"
                  >
                    <GiftArtwork
                      category={occasion}
                      seed={`${suggestion.title}-${index}`}
                      className="aspect-[16/9] w-full"
                      showConfetti={false}
                    />
                    <div className="flex flex-1 flex-col p-5">
                      <h4 className="font-bold text-fg">{suggestion.title}</h4>
                      <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-fg-muted">
                        {suggestion.description}
                      </p>

                      <p className="mt-3 line-clamp-2 text-[12px] leading-relaxed text-[var(--hd-lavender)]">                        {suggestion.reason}
                      </p>

                      <Button asChild size="sm" className="mt-4 w-full">
                        <Link
                          href={`/create?title=${encodeURIComponent(suggestion.title)}&category=${occasion}`}
                        >
                          {t('hero.createYours')}
                          <ArrowLeft className="rtl:rotate-0 ltr:rotate-180" />
                        </Link>
                      </Button>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-3xl border border-dashed border-[var(--border-strong)] py-12 text-center text-sm text-fg-faint"
            >
              {t('ai.empty')}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

/* ==========================================================================
   Pill-group chooser. Radio semantics, but styled as chips.
   ========================================================================== */

function Choice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: string; label: string; emoji?: string }>;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div>
      <span className="text-[11px] font-bold tracking-[0.12em] text-fg-faint uppercase">
        {label}
      </span>
      <div role="radiogroup" aria-label={label} className="mt-2.5 flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-all duration-200',
                selected
                  ? 'border-transparent bg-[var(--primary)] text-[#160726] shadow-[0_8px_22px_-10px_rgba(255,123,176,0.9)]'
                  : 'border-[var(--border)] bg-white/[0.05] text-fg-muted hover:border-[var(--border-strong)] hover:text-fg',
              )}
            >
              {option.emoji ? <span aria-hidden>{option.emoji}</span> : null}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}