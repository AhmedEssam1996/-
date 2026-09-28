'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Heart, Pause, Play, Maximize2, Minimize2, ExternalLink, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn, formatDate } from '@/lib/utils';
import { SafeImage } from '@/components/shared/safe-image';
import type { PublicGiftBundle, GiftOpenStats } from '@/lib/gifts/queries';

interface GiftViewerProps {
  gift: PublicGiftBundle;
  stats: GiftOpenStats | null;
}

interface GiftSection {
  id: string;
  type: string;
  position: number;
  title?: string;
  content: Record<string, unknown>;
}

export function GiftViewer({ gift: bundle, stats }: GiftViewerProps) {
  const gift = bundle.gift;
  const sections: GiftSection[] = (bundle.sections ?? []).map((s) => ({
    id: s.id,
    type: s.type,
    position: s.position,
    content: (s as { content_json?: Record<string, unknown> }).content_json ?? {},
  }));
  const reducedMotion = usePrefersReducedMotion();

  const [currentSection, setCurrentSection] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const theme = gift.theme_json as { accent?: string; background?: string } | undefined;

  const totalSections = sections.length;

  useEffect(() => {
    fetch('/api/gift-open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: gift.slug }),
    }).catch(() => undefined);
  }, [gift.slug]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      fetch('/api/gift-duration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: gift.slug, seconds: 10 }),
      }).catch(() => undefined);
    }, 60_000);
    return () => clearInterval(timer);
  }, [isPlaying, gift.slug]);

  const handleConfetti = () => {
    if (!reducedMotion) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 9999,
        colors: ['#00D6A3', '#8B5CF6', '#FF4D8D', '#F5C451'],
      });
    }
  };

  const nextSection = () => {
    if (currentSection < totalSections - 1) {
      setCurrentSection(currentSection + 1);
    } else {
      handleConfetti();
    }
  };

  const prevSection = () => {
    if (currentSection > 0) setCurrentSection(currentSection - 1);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: gift.title, url });
    } else {
      await navigator.clipboard.writeText(url);
    }
    setShowShare(false);
  };

  const toggleFullscreen = () => {
    if (!document) return;
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const currentContent = sections[currentSection];

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-20',
        'transition-all duration-500',
        (theme?.background as string) || 'bg-gradient-to-b from-[#07090D] via-[#0a0e14] to-[#07090D]',
      )}
    >
      {!reducedMotion && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 h-[600px] w-[600px] rounded-full bg-[var(--primary)]/8 blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 h-[600px] w-[600px] rounded-full bg-pink-500/5 blur-3xl" />
        </div>
      )}

      <motion.header
        className="absolute top-0 w-full p-4 sm:p-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-xs text-fg-faint">هدية تفاعلية</span>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowShare(true)}
            className="rounded-full p-2 text-fg-muted hover:bg-[var(--card-soft)]/50 hover:text-[var(--hd-pink)]"
            aria-label="شارك"
          >
            <Share2 className="h-5 w-5" />
          </motion.button>
        </div>
      </motion.header>

      {totalSections > 1 && (
        <motion.nav
          className="absolute top-16 w-full px-4 sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-between text-xs text-fg-faint">
              <span>القسم {currentSection + 1} من {totalSections}</span>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="rounded-full p-1 text-fg-muted hover:bg-[var(--card-soft)]/50 hover:text-[var(--hd-pink)]"
                aria-label={isPlaying ? 'إيقاف' : 'تشغيل'}
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              </button>
            </div>
            <div className="mt-1 h-1 rounded-full bg-[var(--card-soft)]/50 overflow-hidden">
              <motion.div
                className="h-full bg-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${((currentSection + 1) / totalSections) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.nav>
      )}

      <AnimatePresence mode="wait">
        <motion.section
          key={currentSection}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative w-full max-w-3xl"
        >
          <SectionRenderer section={currentContent} gift={gift} />
        </motion.section>
      </AnimatePresence>

      <motion.nav
        className="absolute bottom-0 w-full p-4 sm:p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={prevSection}
            disabled={currentSection === 0}
            className={cn(
              'rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium',
              'hover:border-[var(--primary)]/55 hover:bg-emerald-400/10',
              'disabled:cursor-not-allowed disabled:opacity-40',
            )}
          >
            السابق
          </motion.button>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleFullscreen}
              className="rounded-full p-2 text-fg-muted hover:bg-[var(--card-soft)]/50 hover:text-[var(--hd-pink)]"
              aria-label={isFullscreen ? 'إنهاء الشاشة الكاملة' : 'الشاشة الكاملة'}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleConfetti}
              className="rounded-full p-2 text-fg-muted hover:bg-[var(--card-soft)]/50 hover:text-[var(--hd-pink)]"
              aria-label="احتفل"
            >
              <Heart className="h-5 w-5" />
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={nextSection}
            className={cn(
              'rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium',
              'hover:border-[var(--primary)]/55 hover:bg-emerald-400/10',
              currentSection === totalSections - 1 && 'border-pink-400/50 bg-pink-400/10 text-pink-300 hover:bg-pink-400/20',
            )}
          >
            {currentSection === totalSections - 1 ? '🎉 افتحها' : 'التالي'}
          </motion.button>
        </div>

          {stats && (
            <div className="mt-2 text-center text-xs text-fg-faint">
              {stats.uniqueOpens} فتحة · آخر كات يفتحها: {stats.lastOpenedAt ? formatDate(new Date(stats.lastOpenedAt)) : '—'}
            </div>
          )}
      </motion.nav>

      <AnimatePresence>
        {showShare && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShare(false)}
          >
            <motion.div
              className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-center text-lg font-semibold text-fg">شارك الهدية</h3>
              <div className="space-y-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={handleShare}
                  className="w-full rounded-lg bg-emerald-400 px-4 py-2 text-sm font-medium text-[#07090D]"
                >
                  <Share2 className="ml-2 h-4 w-4" />
                  مشاركة
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setShowShare(false);
                  }}
                  className="w-full rounded-2xl border border-[var(--border)] px-4 py-2 text-sm font-medium text-fg-muted hover:bg-[var(--card-soft)]"
                >
                  <Copy className="ml-2 h-4 w-4" />
                  نسخ الرابط
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionRenderer({
  section,
  gift,
}: {
  section: GiftSection | undefined;
  gift: PublicGiftBundle['gift'];
}) {
  if (!section) {
    return (
      <motion.div className="text-center py-12">
        <p className="text-fg-muted">لا توجد محتوى.</p>
      </motion.div>
    );
  }

  const content = section.content || {};
  const title = (section.title || (content.title as string) || '') as string;

  switch (section.type) {
    case 'cover':
      return <CoverSection gift={gift} />;
    case 'story':
      return <StorySection title={title} content={(content.content as string) || (content.text as string) || ''} />;
    case 'memory':
      return <MemorySection content={content} />;
    case 'message':
      return <MessageSection title={title} content={(content.content as string) || (content.text as string) || ''} />;
    case 'quote':
      return <QuoteSection text={(content.content as string) || (content.text as string) || ''} />;
    case 'image':
      return <ImageSection content={content} />;
    case 'countdown':
      return <CountdownSection content={content} />;
    case 'quiz':
      return <QuizSection content={content} />;
    case 'final':
      return <FinalSection content={content} />;
    default:
      return <StorySection title={title} content={(content.content as string) || (content.text as string) || ''} />;
  }
}

function CoverSection({ gift }: { gift: PublicGiftBundle['gift'] }) {
  const intro = (gift.content_json.intro as string) || '';

  return (
    <motion.div className="text-center py-12 sm:py-16">
      <motion.h2
        className="text-3xl font-bold text-fg sm:text-4xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {gift.title}
      </motion.h2>

      {gift.recipient_name && (
        <motion.p
          className="mt-4 text-xl text-fg-muted"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          لـ <span className="font-medium">{gift.recipient_name}</span>
        </motion.p>
      )}

      {gift.occasion && (
        <motion.p
          className="mt-2 text-sm text-fg-faint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          بمناسبة {gift.occasion}
        </motion.p>
      )}

      {intro && (
        <motion.p
          className="mt-6 max-w-2xl text-center text-fg-muted"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {intro}
        </motion.p>
      )}
    </motion.div>
  );
}

function StorySection({ title, content }: { title: string; content: string }) {
  return (
    <motion.div className="space-y-4">
      {title && <h3 className="text-xl font-semibold text-fg">{title}</h3>}
      <p className="text-fg-muted leading-relaxed whitespace-pre-wrap">{content}</p>
    </motion.div>
  );
}

function MemorySection({ content }: { content: Record<string, unknown> }) {
  const image = content.image as string | undefined;
  const text = (content.content as string) || (content.text as string) || '';

  return (
    <motion.div className="space-y-4">
      {image && (
        <SafeImage
          src={image}
          alt="ذكرى"
          aspect="aspect-[16/9]"
          className="rounded-lg shadow-2xl"
        />
      )}
      <p className="text-fg-muted leading-relaxed whitespace-pre-wrap">{text}</p>
    </motion.div>
  );
}

function MessageSection({ title, content }: { title: string; content: string }) {
  return (
    <motion.div className="relative rounded-2xl border border-slate-800/50 bg-slate-900/30 p-6 sm:p-8">
      {title && (
        <h3 className="mb-4 text-center text-lg font-semibold text-fg">{title}</h3>
      )}
      <p className="text-center text-fg leading-relaxed whitespace-pre-wrap text-lg">
        {content}
      </p>
    </motion.div>
  );
}

function QuoteSection({ text }: { text: string }) {
  return (
    <motion.div className="text-center py-8">
      <p className="text-2xl font-light italic text-fg-muted sm:text-3xl">"{text}"</p>
    </motion.div>
  );
}

function ImageSection({ content }: { content: Record<string, unknown> }) {
  const src = content.url as string | undefined;
  const alt = (content.alt as string) || 'صورة';

  if (!src) return null;

  return (
    <motion.div className="flex justify-center">
      <motion.img
        src={src}
        alt={alt}
        className="max-w-full rounded-xl shadow-2xl"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      />
    </motion.div>
  );
}

function CountdownSection({ content }: { content: Record<string, unknown> }) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const targetDate = content.target_date as string | undefined;

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();
    if (isNaN(target)) return;

    const update = () => {
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTime({ days, hours, minutes, seconds });
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate) return null;

  const isExpired = time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0;

  if (isExpired) {
    return (
      <motion.div className="text-center py-8">
        <p className="text-2xl font-bold text-[var(--hd-pink)]">🎉 الوقت منتهى!</p>
        <p className="mt-2 text-sm text-fg-muted">اللحظة اتصبحت الآن.</p>
      </motion.div>
    );
  }

  const units = [
    { label: 'يوم', value: time.days },
    { label: 'ساعة', value: time.hours },
    { label: 'دقيقة', value: time.minutes },
    { label: 'ثانية', value: time.seconds },
  ];

  return (
    <motion.div className="flex justify-center gap-4 py-8">
      {units.map((unit, i) => (
        <motion.div
          key={unit.label}
          className="flex flex-col items-center"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="text-3xl font-bold text-[var(--hd-pink)] tabular-nums">
            {String(unit.value).padStart(2, '0')}
          </div>
          <span className="text-xs text-fg-faint">{unit.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

function QuizSection({ content }: { content: Record<string, unknown> }) {
  const question = (content.question as string) || '';
  const options = (content.options as string[]) || [];

  return (
    <motion.div className="space-y-4 max-w-xl mx-auto">
      <h3 className="text-lg font-semibold text-fg">{question}</h3>
      <div className="space-y-2">
        {options.map((option, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i }}
            whileHover={{ scale: 1.02 }}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-soft)]/30 p-3 text-right text-fg-muted hover:border-[var(--primary)]/55 hover:bg-[var(--card-soft)]"
          >
            {option}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function FinalSection({ content }: { content: Record<string, unknown> }) {
  const title = (content.title as string) || '';
  const message = (content.message as string) || '';
  const buttonLabel = (content.button_label as string) || 'شاركها';
  const buttonHref = (content.button_href as string) || '#';
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      confetti({
        particleCount: 80,
        spread: 80,
        origin: { y: 0.5 },
        zIndex: 9999,
        colors: ['#00D6A3', '#8B5CF6', '#FF4D8D', '#F5C451'],
      });
    }
  }, [reducedMotion]);

  return (
    <motion.div className="text-center py-12">
      {title && <h2 className="text-2xl font-bold text-fg mb-4">{title}</h2>}
      {message && <p className="text-fg-muted leading-relaxed mb-6">{message}</p>}

      {buttonHref && (
        <motion.a
          href={buttonHref}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium bg-gradient-to-r from-[var(--hd-pink)] to-[var(--hd-purple)] text-[#07090D]"
        >
          {buttonLabel}
          <ExternalLink className="h-4 w-4" />
        </motion.a>
      )}
    </motion.div>
  );
}
