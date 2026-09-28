'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';
import { themeForCategory, hashString, type GiftTheme } from '@/lib/brand';

/**
 * Generated gift artwork.
 *
 * This is the single replacement for every `<img>` in the product. Instead of
 * pointing at a remote host (which produces broken-image icons, blank cards and
 * "Image not found" states), the artwork is composed locally from the gift's
 * category theme:
 *
 *   1. a two-stop gradient background (unique per category)
 *   2. a soft light bloom whose position is derived from the gift slug, so two
 *      gifts in the same category never look identical
 *   3. a hand-drawn SVG motif (cake / heart / ring / cap / hands / flower /
 *      envelope / gift)
 *   4. optional confetti specks for a bit of life
 *
 * Everything is deterministic and pure, so server and client render identical
 * markup — no hydration mismatch, no layout shift, no network dependency.
 */

export function GiftArtwork({
  category,
  seed,
  className,
  motifOverride,
  showConfetti = true,
}: {
  category: string | null | undefined;
  seed: string;
  className?: string;
  motifOverride?: GiftTheme['motif'];
  showConfetti?: boolean;
}) {
  const theme = themeForCategory(category);
  const motif = motifOverride ?? theme.motif;
  const hash = hashString(seed || 'hadiya');
  const variant = hash % 4;
  const gradientId = React.useId();

  // Four bloom positions; the slug picks one so a grid never looks tiled.
  const blooms = [
    { cx: '24%', cy: '26%' },
    { cx: '78%', cy: '22%' },
    { cx: '30%', cy: '78%' },
    { cx: '74%', cy: '76%' },
  ];
  const bloom = blooms[variant];

  return (
    <div
      className={cn('relative isolate overflow-hidden', className)}
      role="img"
      aria-label={`رسمة هدية — ${theme.label}`}
    >
      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <defs>
          <linearGradient id={`${gradientId}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={theme.from} />
            <stop offset="100%" stopColor={theme.to} />
          </linearGradient>
          <radialGradient id={`${gradientId}-bloom`}>
            <stop offset="0%" stopColor={theme.accent} stopOpacity="0.85" />
            <stop offset="100%" stopColor={theme.accent} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${gradientId}-motif`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.98" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.82" />
          </linearGradient>
        </defs>

        <rect width="400" height="300" fill={`url(#${gradientId}-bg)`} />

        {/* Light bloom */}
        <circle cx={bloom.cx} cy={bloom.cy} r="170" fill={`url(#${gradientId}-bloom)`} />

        {/* Soft arcs so the surface reads as dimensional, not flat */}
        <circle cx="60" cy="250" r="120" fill="#ffffff" opacity="0.06" />
        <circle cx="350" cy="40" r="90" fill="#000000" opacity="0.05" />

        {/* Motif */}
        <g transform="translate(200 150)" opacity="0.95">
          <Motif kind={motif} fill={`url(#${gradientId}-motif)`} accent={theme.accent} />
        </g>

        {showConfetti ? <Confetti hash={hash} accent={theme.accent} /> : null}
      </svg>

      {/* Bottom scrim so overlaid text stays readable on every theme. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/45 via-black/10 to-transparent"
      />
    </div>
  );
}

/* --------------------------------------------------------------------------
   Motifs — each is centred on (0,0) and fits inside roughly 120x120.
   -------------------------------------------------------------------------- */

function Motif({
  kind,
  fill,
  accent,
}: {
  kind: GiftTheme['motif'];
  fill: string;
  accent: string;
}) {
  const stroke = { strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (kind) {
    case 'cake':
      return (
        <g fill={fill}>
          {/* Candles */}
          <rect x="-16" y="-58" width="5" height="20" rx="2.5" opacity="0.9" />
          <rect x="11" y="-58" width="5" height="20" rx="2.5" opacity="0.9" />
          <circle cx="-13.5" cy="-63" r="5" fill={accent} />
          <circle cx="13.5" cy="-63" r="5" fill={accent} />
          {/* Tiers */}
          <rect x="-34" y="-34" width="68" height="22" rx="7" />
          <rect x="-44" y="-14" width="88" height="26" rx="8" />
          <rect x="-52" y="12" width="104" height="30" rx="9" opacity="0.92" />
          {/* Frosting drips */}
          <g fill={accent} opacity="0.75">
            <circle cx="-30" cy="-11" r="4.5" />
            <circle cx="0" cy="-11" r="5" />
            <circle cx="30" cy="-11" r="4.5" />
          </g>
        </g>
      );

    case 'heart':
      return (
        <g fill={fill}>
          <path
            d="M0 46C-8 34-56 4-56 -24c0-18 14-32 32-32 10 0 19 5 24 13 5-8 14-13 24-13 18 0 32 14 32 32C56 4 8 34 0 46Z"
            transform="translate(0 -6)"
          />
          <g fill={accent} opacity="0.8">
            <circle cx="-58" cy="-52" r="5" />
            <circle cx="52" cy="-60" r="3.5" />
            <circle cx="62" cy="34" r="4.5" />
          </g>
        </g>
      );

    case 'ring':
      return (
        <g fill="none" stroke={fill} strokeWidth="9" {...stroke}>
          <circle cx="0" cy="14" r="42" />
          <path d="M0 -34 L-22 -58 L0 -76 L22 -58 Z" fill={fill} stroke="none" />
          <path d="M-14 -60 L0 -46 L14 -60" stroke={accent} strokeWidth="4" />
          <g stroke={accent} strokeWidth="4" opacity="0.75">
            <path d="M-62 -30 l-10 -6" />
            <path d="M62 -30 l10 -6" />
            <path d="M0 -92 l0 -10" />
          </g>
        </g>
      );

    case 'cap':
      return (
        <g fill={fill}>
          <path d="M-56 -6 L0 -42 L56 -6 L0 30 Z" />
          <path d="M28 -1 v30 a28 12 0 0 0 28 0 v-30" fill={accent} opacity="0.9" />
          <path d="M0 -42 v-14" stroke={fill} strokeWidth="6" {...stroke} />
          <circle cx="0" cy="-60" r="8" fill={accent} />
        </g>
      );

    case 'hands':
      return (
        <g fill={fill}>
          <path d="M-52 40 c-10-22-4-52 16-64 c12-8 24-4 28 8 l10 26 l8-30 c4-14 22-16 28-2 c8 18 4 44-10 62 c-10 12-24 18-40 18 c-16 0-30-6-40-18 Z" />
          <g fill={accent} opacity="0.8">
            <circle cx="-30" cy="-30" r="4" />
            <circle cx="30" cy="-30" r="4" />
          </g>
        </g>
      );

    case 'flower':
      return (
        <g fill={fill}>
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <ellipse
              key={angle}
              cx="0"
              cy="-38"
              rx="17"
              ry="26"
              transform={`rotate(${angle})`}
              opacity="0.92"
            />
          ))}
          <circle cx="0" cy="0" r="17" fill={accent} />
          <path
            d="M0 34 v54 M0 60 c-18 0-28-10-30-22 c16-2 26 6 30 22 Z M0 74 c18 0 28-10 30-22 c-16-2-26 6-30 22 Z"
            fill={fill}
            opacity="0.85"
          />
        </g>
      );

    case 'envelope':
      return (
        <g>
          <rect x="-62" y="-40" width="124" height="84" rx="12" fill={fill} />
          <path d="M-62 -34 L0 16 L62 -34" fill="none" stroke={accent} strokeWidth="8" {...stroke} />
          <circle cx="0" cy="16" r="13" fill={accent} />
        </g>
      );

    case 'gift':
    default:
      return (
        <g fill={fill}>
          <rect x="-54" y="-22" width="108" height="68" rx="10" />
          <rect x="-62" y="-42" width="124" height="24" rx="8" />
          <rect x="-9" y="-42" width="18" height="88" rx="4" fill={accent} opacity="0.95" />
          <path
            d="M0 -42 c0 0 -10 -32 -28 -32 a15 15 0 0 0 0 30 Z"
            fill={accent}
            opacity="0.95"
          />
          <path
            d="M0 -42 c0 0 10 -32 28 -32 a15 15 0 0 1 0 30 Z"
            fill={accent}
            opacity="0.95"
          />
        </g>
      );
  }
}

/* --------------------------------------------------------------------------
   Confetti — deterministic specks derived from the seed.
   -------------------------------------------------------------------------- */

function Confetti({ hash, accent }: { hash: number; accent: string }) {
  const specks = React.useMemo(() => {
    // A tiny LCG seeded by the slug: same gift → same confetti, always.
    let state = hash || 1;
    const next = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };

    return Array.from({ length: 14 }).map(() => ({
      x: next() * 400,
      y: next() * 300,
      r: next() * 3.5 + 1.5,
      o: next() * 0.35 + 0.2,
    }));
  }, [hash]);

  return (
    <g aria-hidden>
      {specks.map((speck, index) => (
        <circle
          key={index}
          cx={speck.x}
          cy={speck.y}
          r={speck.r}
          fill={index % 3 === 0 ? accent : '#ffffff'}
          opacity={speck.o}
        />
      ))}
    </g>
  );
}

/**
 * Avatar with a generated fallback.
 *
 * Never renders a broken image: if `src` is missing or fails to load, a warm
 * gradient disc with the person's initial is shown instead.
 */
export function Avatar({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const initial = React.useMemo(() => {
    const trimmed = name.trim();
    return trimmed ? trimmed.slice(0, 1) : '؟';
  }, [name]);

  const palette = React.useMemo(() => {
    const palettes = [
      ['#FFA552', '#FF5C8A'],
      ['#C9B6FF', '#7C4DDB'],
      ['#FF7BB0', '#FF5C8A'],
      ['#FFD166', '#FFA552'],
      ['#7BE8C4', '#3FB98C'],
    ];
    return palettes[hashString(name || 'hadiya') % palettes.length];
  }, [name]);

  const style = { width: size, height: size };

  if (!src || failed) {
    /*
     * Deep ink, not white.
     *
     * Every palette above is a LIGHT gradient (orange, pink, lavender, yellow,
     * teal), so a white initial landed at 2.4:1 — under the AA floor and,
     * against yellow and teal, genuinely hard to read. All five palettes are
     * bright enough that a deep plum ink clears 4.5:1 on every one of them, and
     * it keeps the initials legible instead of decorative.
     */
    return (
      <span
        className={cn(
          'inline-grid shrink-0 place-items-center rounded-full font-bold text-[#160726]',
          className,
        )}
        style={{
          ...style,
          fontSize: Math.max(11, size * 0.42),
          backgroundImage: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
        }}
        aria-hidden
      >
        {initial}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className={cn('shrink-0 rounded-full object-cover', className)}
      style={style}
    />
  );
}