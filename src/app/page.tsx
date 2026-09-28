'use client';

import { motion, useInView } from 'motion/react';
import { ArrowLeft, Gift, Sparkles, Star } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { AiGiftAssistant } from '@/components/gift/ai-gift-assistant';
import { GiftPreviewModal } from '@/components/gift/gift-preview-modal';
import { HeroGiftExperience } from '@/components/gift/hero-gift-experience';
import { Parallax } from '@/components/shared/parallax';
import { Avatar } from '@/components/shared/gift-artwork';
import { GiftCard } from '@/components/shared/gift-card';
import { PageShell } from '@/components/shared/page-shell';
import { StickerField, StickerGlyph, type StickerColor, type StickerKind, type StickerSpec } from '@/components/shared/stickers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tilt3D } from '@/components/ui/tilt-3d';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { GIFT_FORMATS, themeForCategory } from '@/lib/brand';
import { useLocale } from '@/lib/i18n';
import {
  AI_FEATURES,
  ALL_GIFTS,
  CATEGORIES,
  HOW_IT_WORKS,
  TESTIMONIALS,
  WHY_HADIYA,
} from '@/lib/mock-data';
import type { MockGift } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

/**
 * Hadiya homepage.
 *
 * Section order is intentional and mirrors how a visitor actually decides:
 *
 *   1. Hero            — what is this?
 *   2. Popular gifts   — prove it's real
 *   3. AI assistant    — help me decide
 *   4. Categories      — let me narrow
 *   5. How it works    — is it hard?
 *   6. Formats         — make me want one
 *   7. AI message      — remove the "I can't write" blocker
 *   8. Why Hadiya      — why you and not a card shop
 *   9. AI tools        — what else is in here
 *  10. Testimonials    — other people did it
 *  11. Final CTA       — go
 *
 * Three layers of depth stack up to make the page read as one 3D space:
 *
 *   • **The WebGL cosmos** (site-wide, behind everything) — nebula, orbit rings
 *     and shards that lean toward the cursor. See `CosmosBackground`.
 *   • **`ScrollDepth`** (wraps `<main>`) — leans the page's content a couple of
 *     degrees with the cursor, so the content is suspended *in* the cosmos
 *     rather than pasted on top of it.
 *   • **`Tilt3D` on every card** — each surface leans and lifts off the page
 *     plane in real 3D with a specular glare.
 *
 * The hero and final CTA add a further parallax glyph field, with a larger copy
 * of the gift scene than before. All of it defers to `prefers-reduced-motion`.
 */

export default function LandingPage() {
  const { t } = useLocale();
  const [preview, setPreview] = React.useState<MockGift | null>(null);

  return (
    <PageShell>
      <Hero />

      {/* ================================================== popular gifts */}
      <Reveal className="mt-28 sm:mt-36">
        <section>
          <SectionHeading
            eyebrow="استكشف"
            title={t('explore.title')}
            subtitle={t('explore.subtitle')}
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ALL_GIFTS.slice(0, 6).map((gift, index) => (
              <Reveal key={gift.id} delay={index * 0.06}>
                <GiftCard gift={gift} onPreview={setPreview} />
              </Reveal>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button asChild magnetic variant="secondary" size="lg">
              <Link href="/gifts">
                {t('common.viewAll')}
                <ArrowLeft className="ltr:rotate-180" />
              </Link>
            </Button>
          </div>
        </section>
      </Reveal>

      {/* =================================================== ai assistant */}
      <Reveal className="mt-28 sm:mt-36">
        <AiGiftAssistant />
      </Reveal>

      {/* ===================================================== categories */}
      <Reveal className="mt-28 sm:mt-36">
        <section>
          <SectionHeading
            eyebrow="الفئات"
            title="اختار حسب المناسبة"
            subtitle="كل فئة ليها شكلها وألوانها ومزاجها الخاص."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((category, index) => {
              const theme = themeForCategory(category.slug);
              return (
                <Reveal key={category.id} delay={index * 0.05}>
                  <Tilt3D className="block h-full" surfaceClassName="h-full" glareClassName="rounded-3xl">
                    <Link
                      href={`/gifts?category=${category.slug}`}
                      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)]/70 p-5 shadow-soft backdrop-blur-sm transition-all duration-500 hover:border-[var(--primary)]/45 hover:shadow-lift"
                    >
                      {/* Theme wash behind the card */}
                      <span
                        aria-hidden
                        className="absolute inset-x-0 -top-16 h-32 opacity-30 blur-2xl transition-opacity duration-500 group-hover:opacity-55"
                        style={{
                          background: `radial-gradient(circle, ${theme.from} 0%, transparent 70%)`,
                        }}
                      />

                      <span className="relative grid size-12 place-items-center rounded-2xl text-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                        <span
                          aria-hidden
                          className="absolute inset-0 rounded-2xl opacity-20"
                          style={{
                            backgroundImage: `linear-gradient(135deg, ${theme.from}, ${theme.to})`,
                          }}
                        />
                        <span className="relative">{category.emoji}</span>
                      </span>

                      <div className="relative mt-6">
                        <h3 className="font-bold text-fg">{category.name}</h3>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                          {category.description}
                        </p>
                        <p className="mt-3 text-[11px] font-bold text-fg-faint tabular">
                          {category.count} هدية
                        </p>
                      </div>
                    </Link>
                  </Tilt3D>
                </Reveal>
              );
            })}

            {/* Formats teaser fills the grid and doubles as a differentiator */}
            <Reveal delay={0.3}>
              <Tilt3D className="block h-full" surfaceClassName="h-full" glareClassName="rounded-3xl">
                <div className="gradient-border relative flex h-full flex-col justify-between rounded-3xl bg-[var(--card-soft)] p-5">
                  <span className="grid size-12 place-items-center rounded-2xl bg-[var(--primary)]/12 text-2xl">
                    ✨
                  </span>
                  <div className="mt-6">
                    <h3 className="font-bold text-fg">١١ شكل مختلف</h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">
                      مظروف، خط زمني، صندوق مفاجآت، لعبة صغيرة… وكلهم قابلين للتخصيص.
                    </p>
                    <Link
                      href="/create"
                      className="mt-3 inline-flex items-center gap-1 text-[13px] font-bold text-[var(--hd-lavender)] hover:underline"
                    >
                      جرّب دلوقتي
                      <ArrowLeft className="size-3.5 ltr:rotate-180" />
                    </Link>
                  </div>
                </div>
              </Tilt3D>
            </Reveal>
          </div>
        </section>
      </Reveal>

      {/* ==================================================== how it works */}
      <Reveal className="mt-28 sm:mt-36">
        <section>
          <SectionHeading
            eyebrow="طريقة العمل"
            title="تلات خطوات وخلاص"
            subtitle="من الفكرة للرابط في دقايق معدودة."
          />
          <HowItWorks />
        </section>
      </Reveal>

      {/* ======================================================== formats */}
      <Reveal className="mt-28 sm:mt-36">
        <section>
          <SectionHeading
            eyebrow="أشكال الهدايا"
            title="كل هدية تجربة مختلفة"
            subtitle="اختار الشكل اللي يناسب اللي بتهديه."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GIFT_FORMATS.slice(0, 6).map((format, index) => (
              <Reveal key={format.id} delay={index * 0.05}>
                <Tilt3D className="block h-full" surfaceClassName="h-full" glareClassName="rounded-3xl">
                  <Link
                    href={`/gifts?format=${format.id}`}
                    className="group flex h-full items-start gap-4 rounded-3xl border border-[var(--border)] bg-[var(--card)]/70 p-5 shadow-soft backdrop-blur-sm transition-all duration-500 hover:border-[var(--primary)]/45 hover:shadow-lift"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--card-soft)] text-xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                      {format.emoji}
                    </span>
                    <span>
                      <span className="block font-bold text-fg">{format.label}</span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-fg-muted">
                        {format.description}
                      </span>
                    </span>
                  </Link>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ================================================== message teaser */}
      <Reveal className="mt-28 sm:mt-36">
        <section>
          <div className="grid items-center gap-10 rounded-4xl border border-[var(--border)] bg-[var(--card)]/70 p-6 shadow-soft backdrop-blur-sm sm:p-10 lg:grid-cols-2 lg:p-14">
            <div>
              <Badge variant="rose">
                <Sparkles className="size-3" aria-hidden />
                مولّد الرسائل
              </Badge>
              <h2 className="mt-5 font-display text-3xl leading-tight font-bold tracking-tight text-fg sm:text-4xl">
                سيب <span className="text-gradient">الكتابة</span> علينا
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-fg-muted">
                قول لمين بتكتب وإيه المناسبة، واختار النبرة — رومانسي، مضحك، مؤثر، أو رسمي. والذكاء
                يكتب لك رسالة تقدر تعدّلها أو تعيد توليدها.
              </p>

              <div className="mt-6 flex flex-wrap gap-2">
                {['رومانسي', 'مضحك', 'مؤثر', 'رسمي'].map((tone) => (
                  <span
                    key={tone}
                    className="rounded-full border border-[var(--border)] bg-[var(--card-soft)] px-3.5 py-1.5 text-[12px] font-semibold text-fg-muted"
                  >
                    {tone}
                  </span>
                ))}
              </div>

              <Button asChild magnetic size="lg" className="mt-7">
                <Link href="/ai-message">
                  <Sparkles />
                  اكتب رسالتي
                </Link>
              </Button>
            </div>

            {/* Live-looking letter preview — a 3D surface of its own */}
            <div className="relative">
              <div
                aria-hidden
                className="absolute -inset-4 rounded-4xl bg-gradient-to-br from-[var(--hd-pink)]/30 via-transparent to-[var(--hd-purple)]/30 blur-2xl"
              />
              <Tilt3D glareClassName="rounded-3xl">
                <div className="relative -rotate-1.5 rounded-3xl border border-[var(--border)] bg-[var(--card-soft)] p-6 shadow-lift sm:p-8">
                  <p className="text-[11px] font-bold tracking-[0.16em] text-fg-faint uppercase">
                    رسالة مقترحة
                  </p>
                  <p className="mt-4 leading-[2] text-fg">
                    «مش عارف أبدأ منين، بس خليني أقول إن وجودك في حياتي غيّر حاجات كتير. كل سنة وأنت
                    أحسن حاجة حصلت لي.»
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
                    <span className="text-[12px] text-fg-faint">نبرة: مؤثر · متوسط</span>
                    <span className="flex gap-1" aria-hidden>
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="size-1.5 rounded-full bg-[var(--primary)]"
                          style={{ animation: `hd-thinking 1.4s ease-in-out ${dot * 0.2}s infinite` }}
                        />
                      ))}
                    </span>
                  </div>
                </div>
              </Tilt3D>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ========================================================= why us */}
      <Reveal className="mt-28 sm:mt-36">
        <section>
          <SectionHeading
            eyebrow="ليه Hadiya"
            title="مش مجرد كارت"
            subtitle="تجربة كاملة، مبنية على الشخص نفسه."
          />

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_HADIYA.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 0.05}>
                <Tilt3D className="block h-full" surfaceClassName="h-full" glareClassName="rounded-3xl">
                  <div className="group h-full rounded-3xl border border-[var(--border)] bg-[var(--card)]/70 p-6 shadow-soft backdrop-blur-sm transition-all duration-500 hover:border-[var(--primary)]/45 hover:shadow-lift">
                    <span className="grid size-11 place-items-center rounded-2xl bg-[var(--card-soft)] text-xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                      {feature.emoji}
                    </span>
                    <h3 className="mt-4 font-bold text-fg">{feature.title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-fg-muted">
                      {feature.description}
                    </p>
                  </div>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ======================================================== AI tools */}
      <Reveal className="mt-28 sm:mt-36">
        <section>
          <SectionHeading
            eyebrow="أدوات ذكية"
            title="مزايا بتفرق فعلاً"
            subtitle="أدوات مبنية على الذكاء الاصطناعي تساعدك من أول فكرة لحد الإرسال."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {AI_FEATURES.map((feature, index) => (
              <Reveal key={feature.title} delay={Math.min(index * 0.05, 0.35)} className="h-full">
                <Tilt3D className="block h-full" surfaceClassName="h-full" glareClassName="rounded-3xl">
                  <Link
                    href={feature.href}
                    className="group flex h-full flex-col rounded-3xl border border-[var(--border)] bg-[var(--card)]/70 p-6 shadow-soft backdrop-blur-sm transition-all duration-500 hover:border-[var(--primary)]/45 hover:shadow-lift"
                  >
                    <span className="grid size-11 place-items-center rounded-2xl bg-[var(--card-soft)] text-xl transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
                      {feature.icon}
                    </span>
                    <h3 className="mt-4 font-bold text-fg">{feature.title}</h3>
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-fg-muted">
                      {feature.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold text-[var(--hd-lavender)]">
                      جرّبها
                      <ArrowLeft className="size-3.5 transition-transform duration-300 group-hover:-translate-x-1 ltr:rotate-180 ltr:group-hover:translate-x-1" />
                    </span>
                  </Link>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ==================================================== testimonials */}
      <Reveal className="mt-28 sm:mt-36">
        <section>
          <SectionHeading
            eyebrow="آراء"
            title="جربها ناس زيك"
            subtitle="آلاف الأشخاص عملوا هدايا يعنيها بحب."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TESTIMONIALS.map((testimonial, index) => (
              <Reveal key={testimonial.id} delay={index * 0.06}>
                <Tilt3D className="block h-full" surfaceClassName="h-full" glareClassName="rounded-3xl">
                  <figure className="flex h-full flex-col rounded-3xl border border-[var(--border)] bg-[var(--card)]/70 p-6 shadow-soft backdrop-blur-sm">
                    <div className="flex gap-0.5" aria-label={`${testimonial.rating} من 5`}>
                      {Array.from({ length: 5 }).map((_, star) => (
                        <Star
                          key={star}
                          className={cn(
                            'size-3.5',
                            star < testimonial.rating
                              ? 'fill-[var(--hd-gold)] text-[var(--hd-gold)]'
                              : 'text-[var(--border-strong)]',
                          )}
                          aria-hidden
                        />
                      ))}
                    </div>
                    <blockquote className="mt-4 flex-1 text-[13px] leading-relaxed text-fg-muted">
                      {testimonial.content}
                    </blockquote>
                    <figcaption className="mt-5 flex items-center gap-3 border-t border-[var(--border)] pt-4">
                      <Avatar name={testimonial.name} src={testimonial.avatar} size={36} />
                      <span>
                        <span className="block text-[13px] font-bold text-fg">
                          {testimonial.name}
                        </span>
                        <span className="block text-[11px] text-fg-faint">{testimonial.role}</span>
                      </span>
                    </figcaption>
                  </figure>
                </Tilt3D>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ======================================================= final CTA */}
      <Reveal className="mt-28 sm:mt-36">
        <section>
          <div className="relative overflow-hidden rounded-4xl bg-gradient-to-br from-[var(--hd-pink)] via-[var(--hd-purple)] to-[var(--hd-coral)] px-6 py-14 text-center sm:px-12 sm:py-20">
            {/* Floating depth layer — glyphs drift at different scales with the cursor */}
            <Parallax>
              <DepthGlyphField glyphs={CTA_DEPTH_GLYPHS} />
            </Parallax>

            <div className="relative z-10 mx-auto max-w-2xl">
              <h2 className="font-display text-3xl leading-tight font-bold tracking-tight text-[#160726] sm:text-4xl lg:text-5xl">
                استعد لهدية مش هتتنسى
              </h2>
              {/*
                The CTA panel is a warm gradient (pink -> purple -> coral), so its
                copy must be deep plum ink. At 75% alpha the subtitle dropped to
                3.96:1; the full-ink value measures 9.1:1.
              */}
              <p className="mt-4 text-base leading-relaxed text-[#160726]/85">
                ابدأ دلوقتي — مجانًا، ومن غير ما تحتاج بطاقة ائتمان.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild magnetic size="xl" variant="plum" className="rounded-full">
                  <Link href="/create">
                    <Gift />
                    {t('hero.cta.primary')}
                  </Link>
                </Button>
                <Button
                  asChild
                  magnetic
                  size="xl"
                  variant="secondary"
                  className="rounded-full border-[#160726]/25 bg-[#160726]/10 text-[#160726] hover:bg-[#160726]/18"
                >
                  <Link href="/gifts">{t('hero.cta.secondary')}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <GiftPreviewModal gift={preview} onClose={() => setPreview(null)} />
    </PageShell>
  );
}

/* ==========================================================================
   Hero
   ========================================================================== */

function Hero() {
  const { t } = useLocale();
  const reduceMotion = usePrefersReducedMotion();

  /*
   * A duration helper rather than swapping `initial` for `false` under reduced
   * motion — see the long note in the JSX below for why `initial={false}` leaves
   * these elements permanently invisible.
   */
  const dur = (seconds: number) => (reduceMotion ? 0 : seconds);

  return (
    <section className="relative isolate px-2 pt-4 pb-8 sm:pt-10">
      {/* Sticker layer — the reference scatters cute objects around the
          headline. Every glyph is inline SVG so nothing can 404. */}
      <StickerField stickers={HERO_STICKERS} className="-z-0" />

      {/* Depth layer — larger glyphs floating behind the copy, drifting with
          the cursor at three different scales for a real parallax feel. */}
      <Parallax className="z-0">
        <DepthGlyphField glyphs={HERO_DEPTH_GLYPHS} />
      </Parallax>

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        {/*
         * Reduced motion is applied by collapsing each duration to 0, NOT by passing
         * `initial={false}`. Motion treats `initial={false}` as "no initial state" and
         * then never animates, which leaves the element stuck on the `initial` object —
         * `opacity: 0` — permanently. `Reveal` in this file documents the same trap.
         *
         * The global `prefers-reduced-motion` block in globals.css is not enough on its
         * own here: it overrides CSS animations, but Motion drives its animations from
         * `requestAnimationFrame` and writes inline styles, which no stylesheet can beat.
         */}
        {/* ------------------------------------------------ eyebrow pill */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur(0.5) }}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)]/80 px-4 py-2 text-[12px] font-bold text-fg-muted shadow-soft backdrop-blur-md"
        >
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--primary)] opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-[var(--primary)]" />
          </span>
          {t('hero.eyebrow')}
        </motion.div>

        {/* ------------------------------------------------------ wordmark */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur(0.55), delay: 0.06 }}
          className="mt-9 font-display text-2xl font-bold tracking-[0.22em] text-fg-muted uppercase sm:text-3xl"
        >
          {t('hero.brand')}
        </motion.p>

        {/* ------------------------------------------------------- headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur(0.7), delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="mt-5 font-display text-[2.75rem] leading-[1.05] font-bold tracking-tight text-fg sm:text-6xl lg:text-[4.5rem]"
        >
          {t('hero.title1')}
          <br />
          {/*
           * `holo-text` only — do NOT also add `text-gradient` here. Both are
           * `@utility` blocks, and the later one in the stylesheet wins
           * regardless of class order in the markup, so pairing them silently
           * drops the warm ramp back to the cyan/lime one.
           */}
          <span className="holo-text">{t('hero.title2')}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur(0.6), delay: 0.2 }}
          className="mt-7 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg"
        >
          {t('hero.subtitle')}
        </motion.p>

        {/* ---------------------------------------------------------- CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur(0.6), delay: 0.28 }}
          className="mt-9 flex flex-wrap justify-center gap-3"
        >
          <Button asChild magnetic size="xl" className="rounded-full">
            <Link href="/create">
              <Gift />
              {t('hero.cta.primary')}
            </Link>
          </Button>
          <Button asChild magnetic size="xl" variant="secondary" className="rounded-full">
            <Link href="/gifts">
              <Sparkles />
              {t('hero.cta.secondary')}
            </Link>
          </Button>
        </motion.div>

        {/* ------------------------------------------------------- social */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: dur(0.6), delay: 0.36 }}
          className="mt-7 flex flex-col items-center gap-2"
        >
          <span className="flex gap-0.5" aria-label="تقييم ٥ من ٥">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="size-4 fill-[var(--hd-yellow)] text-[var(--hd-yellow)]" aria-hidden />
            ))}
          </span>
          <p className="text-[12px] font-semibold text-fg-faint">{t('hero.trust')}</p>
        </motion.div>
      </div>

      {/* ------------------------------------------------------- the visual */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: dur(0.85), delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 mx-auto mt-6 max-w-2xl py-8"
      >
        <HeroGiftExperience />
      </motion.div>
    </section>
  );
}

/** Stickers scattered around the hero, mirroring the reference composition. */
const HERO_STICKERS: StickerSpec[] = [
  { kind: 'flower', color: 'purple', top: '2%', left: '4%', size: 'size-14', delay: 0.2, rotate: -12, parallax: 26 },
  { kind: 'sparkle', color: 'yellow', top: '14%', left: '22%', size: 'size-7', delay: 1.1, parallax: 16 },
  { kind: 'star', color: 'yellow', top: '4%', left: '78%', size: 'size-9', delay: 0.6, rotate: 14, parallax: 22 },
  { kind: 'heart', color: 'pink', top: '26%', right: '5%', size: 'size-11', delay: 1.5, rotate: 10, parallax: 30 },
  { kind: 'cake', color: 'orange', top: '52%', left: '3%', size: 'size-12', delay: 0.9, rotate: -8, parallax: 24 },
  { kind: 'balloon', color: 'coral', top: '44%', right: '3%', size: 'size-13', delay: 2, rotate: 8, parallax: 28 },
  { kind: 'star', color: 'lavender', bottom: '16%', left: '14%', size: 'size-6', delay: 1.3, parallax: 18 },
  { kind: 'flower', color: 'pink', bottom: '8%', right: '14%', size: 'size-12', delay: 0.4, rotate: 12, parallax: 26 },
  { kind: 'sparkle', color: 'orange', bottom: '26%', right: '26%', size: 'size-6', delay: 2.3, parallax: 14 },
  { kind: 'bow', color: 'purple', top: '62%', left: '26%', size: 'size-9', delay: 1.7, rotate: -14, parallax: 20 },
];

/* ==========================================================================
   Depth layers — floating glyphs in Z-space, driven by the window pointer.
   ========================================================================== */

interface DepthGlyph {
  kind: StickerKind;
  color: StickerColor;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  size?: string;
  depth: 'depth-1' | 'depth-2' | 'depth-3';
  delay?: number;
  duration?: number;
  rotate?: number;
  opacity?: number;
}

/**
 * Renders each glyph absolutely positioned inside a `Parallax` container.
 * The outer span owns the position + depth (composable `translate`, eased via
 * `parallax-smooth`); the inner span owns the idle float (`transform`), so
 * cursor parallax and breathing animation never fight each other.
 */
function DepthGlyphField({ glyphs }: { glyphs: DepthGlyph[] }) {
  const reduceMotion = usePrefersReducedMotion();

  return (
    <>
      {glyphs.map((glyph, index) => (
        <span
          key={index}
          className={cn('absolute block', glyph.size ?? 'size-10', glyph.depth, !reduceMotion && 'parallax-smooth')}
          style={{
            top: glyph.top,
            left: glyph.left,
            right: glyph.right,
            bottom: glyph.bottom,
            rotate: `${glyph.rotate ?? 0}deg`,
            opacity: glyph.opacity ?? 0.8,
          }}
        >
          <span
            className="block size-full"
            style={
              reduceMotion
                ? undefined
                : { animation: `hd-float ${glyph.duration ?? 6}s ease-in-out ${glyph.delay ?? 0}s infinite` }
            }
          >
            <StickerGlyph kind={glyph.kind} color={glyph.color} />
          </span>
        </span>
      ))}
    </>
  );
}

/** Cute large glyphs floating behind the hero copy, at three depth scales. */
const HERO_DEPTH_GLYPHS: DepthGlyph[] = [
  { kind: 'gift', color: 'coral', top: '14%', left: '6%', size: 'size-16', depth: 'depth-1', delay: 0.4, rotate: -10, opacity: 0.3 },
  { kind: 'balloon', color: 'purple', top: '28%', right: '5%', size: 'size-14', depth: 'depth-2', delay: 1.2, rotate: 8, opacity: 0.32 },
  { kind: 'heart', color: 'pink', top: '46%', left: '13%', size: 'size-13', depth: 'depth-2', delay: 2, rotate: 9, opacity: 0.28 },
  { kind: 'star', color: 'yellow', top: '7%', right: '24%', size: 'size-9', depth: 'depth-3', delay: 0.8, opacity: 0.42 },
  { kind: 'cake', color: 'orange', top: '62%', right: '10%', size: 'size-13', depth: 'depth-1', delay: 1.6, rotate: -8, opacity: 0.26 },
  { kind: 'sparkle', color: 'lavender', top: '54%', left: '24%', size: 'size-8', depth: 'depth-3', delay: 2.4, opacity: 0.5 },
  { kind: 'bow', color: 'coral', bottom: '12%', left: '5%', size: 'size-10', depth: 'depth-2', delay: 0.6, rotate: 12, opacity: 0.34 },
  { kind: 'envelope', color: 'lavender', bottom: '22%', right: '7%', size: 'size-11', depth: 'depth-1', delay: 1.9, rotate: -6, opacity: 0.28 },
];

/** Glyph field on the final CTA: grounded colors that sit well on the gradient. */
const CTA_DEPTH_GLYPHS: DepthGlyph[] = [
  { kind: 'gift', color: 'yellow', top: '12%', left: '6%', size: 'size-12', depth: 'depth-1', delay: 0.2, rotate: -8, opacity: 0.5 },
  { kind: 'sparkle', color: 'pink', top: '24%', right: '12%', size: 'size-7', depth: 'depth-3', delay: 1.1, opacity: 0.7 },
  { kind: 'heart', color: 'coral', top: '44%', left: '9%', size: 'size-10', depth: 'depth-2', delay: 1.6, rotate: 10, opacity: 0.5 },
  { kind: 'star', color: 'yellow', bottom: '24%', right: '7%', size: 'size-9', depth: 'depth-2', delay: 0.7, rotate: 14, opacity: 0.6 },
  { kind: 'balloon', color: 'purple', bottom: '10%', left: '18%', size: 'size-11', depth: 'depth-1', delay: 2.2, rotate: 6, opacity: 0.45 },
  { kind: 'cake', color: 'orange', top: '72%', right: '26%', size: 'size-10', depth: 'depth-3', delay: 1.4, opacity: 0.5 },
];

/* ==========================================================================
   How it works — three steps with an animated connector.
   ========================================================================== */

function HowItWorks() {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduceMotion = usePrefersReducedMotion();

  return (
    <div ref={ref} className="relative mt-12">
      {/* Connector line — draws itself once the section is in view. */}
      <div
        aria-hidden
        className="absolute top-[3.25rem] hidden h-0.5 overflow-hidden bg-[var(--border)] lg:block lg:inset-x-[16%]"
      >
        <motion.span
          initial={{ scaleX: 0 }}
          animate={{ scaleX: inView ? 1 : 0 }}
          transition={{ duration: 1.1, ease: 'easeInOut', delay: reduceMotion ? 0 : 0.2 }}
          className="block h-full origin-left bg-gradient-to-r from-[var(--hd-coral)] via-[var(--hd-rose)] to-[var(--hd-lavender-deep)] rtl:origin-right"
        />
      </div>

      <ol className="relative grid gap-8 lg:grid-cols-3 lg:gap-10">
        {HOW_IT_WORKS.map((item, index) => (
          <motion.li
            key={item.step}
            initial={reduceMotion ? undefined : { opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.55, delay: index * 0.16 }}
            className="text-center"
          >
            <Tilt3D className="mx-auto" glareClassName="rounded-3xl">
              <span className="relative mx-auto grid size-[6.5rem] place-items-center rounded-3xl border border-[var(--border)] bg-[var(--card)] text-3xl shadow-soft">
                <span aria-hidden>{item.emoji}</span>
                <span className="absolute -top-2 -end-2 grid size-8 place-items-center rounded-full bg-[var(--primary)] text-[11px] font-extrabold text-[var(--primary-ink)] tabular">
                  {item.step}
                </span>
              </span>
            </Tilt3D>
            <h3 className="mt-6 text-xl font-extrabold text-fg">{item.title}</h3>
            <p className="mx-auto mt-2.5 max-w-xs text-[13px] leading-relaxed text-fg-muted">
              {item.description}
            </p>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/* ==========================================================================
   Shared bits
   ========================================================================== */

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex items-center gap-2 text-[11px] font-extrabold tracking-[0.18em] text-[var(--primary)] uppercase">
        <Sparkles className="size-3 animate-twinkle text-[var(--primary)]" aria-hidden />
        {eyebrow}
      </span>
      <h2 className="mt-3 font-display text-3xl leading-tight font-bold tracking-tight text-fg sm:text-4xl">
        {title}
      </h2>
      {subtitle ? (
        <div className="mt-4 flex items-center justify-center gap-1.5">
          <p className="leading-relaxed text-fg-muted">{subtitle}</p>
        </div>
      ) : null}
      {/* Animated gradient rule — glows gently under every section heading. */}
      <span
        aria-hidden
        className="mx-auto mt-4 block h-1 w-40 rounded-full bg-gradient-to-r from-[var(--hd-coral)] via-[var(--hd-purple)] to-[var(--hd-pink)] opacity-75 shadow-[0_0_14px_rgba(169,123,255,0.45)] animate-pulse-glow"
      />
    </div>
  );
}

/** Scroll-triggered fade + rise. Skipped entirely under reduced motion. */
function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const reduceMotion = usePrefersReducedMotion();

  /*
   * `animate` always resolves to a visible target — never `undefined`.
   *
   * Passing `undefined` left the element pinned at its `initial` opacity of 0
   * with nothing to animate it out of that state, so any section whose
   * IntersectionObserver had not yet fired (or could not fire) stayed invisible
   * permanently. Here the only thing the observer controls is the *delay*: the
   * content is visible by default and merely animates in when scrolled to.
   */
  const shouldAnimate = !reduceMotion && inView;

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? false : { opacity: 0, y: 30 }}
      animate={shouldAnimate ? { opacity: 1, y: 0 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: inView ? delay : 0, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}