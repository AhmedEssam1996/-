import { formatNumber } from '@/lib/utils';
import type { GiftStatus } from '@/types/database';

/**
 * Turns raw open counters into advice the author can act on.
 *
 * Every message is derived from a rule that is stated here, and every rule is
 * deliberately conservative: this module never invents a number, and it says
 * "مفيش بيانات كفاية" instead of guessing when a sample is too small to mean
 * anything. Nothing here claims causation — only correlation with a suggested
 * next experiment.
 */

export interface GiftPerformanceInput {
  opens: number;
  uniqueOpens: number;
  avgDurationSeconds: number;
  sectionCount: number;
  status: GiftStatus;
}

export interface GiftPerformanceInsight {
  /** Estimated share of readers who reached the end, 0–100. */
  completionRate: number;
  /** Arabic, user-facing observations. Empty when there is nothing to say. */
  messages: string[];
}

/** Below this many opens, any percentage would be noise. */
const MIN_SAMPLE = 5;

/** Seconds we assume a reader needs per section before they have moved on. */
const SECONDS_PER_SECTION = 12;

export function analyzeGiftPerformance(input: GiftPerformanceInput): GiftPerformanceInsight {
  const messages: string[] = [];

  const expectedSeconds = Math.max(1, input.sectionCount * SECONDS_PER_SECTION);
  // Clamp instead of extrapolating: a 40-second dwell on a 20-section gift means
  // "they paused", not "they read 300% of it".
  const rawCompletion = (input.avgDurationSeconds / expectedSeconds) * 100;
  const completionRate = input.opens === 0 ? 0 : Math.min(100, Math.round(rawCompletion));

  if (input.opens === 0) {
    messages.push(
      input.status === 'PUBLISHED'
        ? 'لسه محدش فتح الهدية. جرّب تبعتها تاني واكتب في الرسالة إنها مخصوصة ليه — ده بيرفع نسبة الفتح.'
        : 'الهدية لسه مسودة. انشرها الأول عشان تقدر تتابع فتحها.',
    );
    return { completionRate, messages };
  }

  if (input.opens < MIN_SAMPLE) {
    messages.push(
      `البيانات لسه قليلة (${formatNumber(input.opens)} فتحة). استنى لما توصل ${formatNumber(MIN_SAMPLE)} فتحات على الأقل عشان الأرقام تبقى معبرة.`,
    );
    return { completionRate, messages };
  }

  if (input.uniqueOpens > 0 && input.opens / input.uniqueOpens >= 2.5) {
    messages.push('ناس كتير رجعت تفتحها تاني — ده معناه إن المحتوى عاجبهم فعلًا.');
  }

  if (completionRate >= 75) {
    messages.push('معظم الناس بتكمّلوا الهدية لآخرها. السرد ماشي صح، متغيّرش الترتيب كتير.');
  } else if (completionRate < 35) {
    messages.push(
      'نسبة كبيرة بتسيب الهدية في النص. جرّب تقصّر النص شوية أو تنقل أقوى جملة لأول سيكشن.',
    );
  }

  if (input.sectionCount > 8 && input.avgDurationSeconds < input.sectionCount * SECONDS_PER_SECTION) {
    messages.push('عدد السيكشنات كبير بالنسبة لوقت القراءة. دمج سيكشنين ممكن يخليها أسهل في المتابعة.');
  }

  if (input.avgDurationSeconds > 0 && input.avgDurationSeconds < 20) {
    messages.push('متوسط وقت القراءة قصير جدًا — يمكن العنوان مش شدهم إنهم يكمّلوا.');
  }

  return { completionRate, messages };
}