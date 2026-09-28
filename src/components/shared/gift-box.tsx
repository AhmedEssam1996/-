'use client';

import { cn } from '@/lib/utils';

/**
 * The Hadiya gift box, drawn as inline SVG.
 *
 * Used by the hero, the gift-opening page and any empty state that needs a
 * present. Drawing it rather than shipping a PNG means:
 *   • it stays crisp at every size and DPI
 *   • it themes with the active gift palette via `--gift-from` / `--gift-to`
 *   • it can never 404, so there are no broken or empty image containers
 *
 * The lid lifts and tilts when `open` is true; the bow keeps swaying on its own
 * so a sealed box still feels alive.
 */
export function GiftBox({ open = false, className }: { open?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={cn('drop-shadow-[0_24px_48px_rgba(0,0,0,0.55)]', className)}
      role="img"
      aria-label={open ? 'صندوق هدية مفتوح' : 'صندوق هدية'}
    >
      <defs>
        <linearGradient id="hadiya-box-body" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="var(--gift-from, #FFA552)" />
          <stop offset="55%" stopColor="var(--gift-to, #FF5C8A)" />
          <stop offset="100%" stopColor="var(--gift-to, #FF5C8A)" />
        </linearGradient>
        <linearGradient id="hadiya-box-lid" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="var(--gift-from, #FFA552)" />
          <stop offset="100%" stopColor="var(--gift-to, #FF5C8A)" />
        </linearGradient>
        <linearGradient id="hadiya-box-ribbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE3A3" />
          <stop offset="100%" stopColor="#FFC94D" />
        </linearGradient>
        <linearGradient id="hadiya-box-inner" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2B1547" />
          <stop offset="100%" stopColor="#0B0614" />
        </linearGradient>
      </defs>

      {/* Inner cavity — revealed once the lid lifts. */}
      <g opacity={open ? 1 : 0} style={{ transition: 'opacity 400ms ease 220ms' }}>
        <rect x="52" y="104" width="136" height="26" rx="10" fill="url(#hadiya-box-inner)" />
        <ellipse cx="120" cy="112" rx="52" ry="14" fill="#FFC94D" opacity="0.5" />
      </g>

      {/* Box body */}
      <rect x="48" y="122" width="144" height="94" rx="18" fill="url(#hadiya-box-body)" />
      <rect x="58" y="132" width="52" height="74" rx="14" fill="#ffffff" opacity="0.16" />
      <rect x="108" y="122" width="24" height="94" fill="url(#hadiya-box-ribbon)" opacity="0.95" />

      {/* Lid — lifts and rotates slightly when opened */}
      <g
        style={{
          transform: open ? 'translateY(-34px) rotate(-7deg)' : 'translateY(0) rotate(0deg)',
          transformOrigin: '120px 112px',
          transition: 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <rect x="38" y="96" width="164" height="34" rx="14" fill="url(#hadiya-box-lid)" />
        <rect x="48" y="102" width="58" height="18" rx="9" fill="#ffffff" opacity="0.22" />
        <rect x="108" y="96" width="24" height="34" fill="url(#hadiya-box-ribbon)" opacity="0.95" />

        {/* Bow */}
        <g
          style={{
            transformOrigin: '120px 96px',
            animation: 'hd-ribbon-sway 3.4s ease-in-out infinite',
          }}
        >
          <path
            d="M120 96 C104 96 86 84 86 70 C86 60 94 54 103 58 C112 62 118 78 120 96 Z"
            fill="url(#hadiya-box-ribbon)"
          />
          <path
            d="M120 96 C136 96 154 84 154 70 C154 60 146 54 137 58 C128 62 122 78 120 96 Z"
            fill="url(#hadiya-box-ribbon)"
          />
          <circle cx="120" cy="95" r="9" fill="#FFE3A3" />
        </g>
      </g>
    </svg>
  );
}

/**
 * A sealed envelope, drawn in the same style. Used for the envelope / letter
 * presentations so both hero visuals share one drawing language.
 */
export function Envelope({ open = false, className }: { open?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className={cn('drop-shadow-[0_24px_48px_rgba(0,0,0,0.55)]', className)}
      role="img"
      aria-label="مظروف هدية"
    >
      <defs>
        <linearGradient id="hadiya-env-body" x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="var(--gift-from, #FFA552)" />
          <stop offset="100%" stopColor="var(--gift-to, #FF5C8A)" />
        </linearGradient>
      </defs>

      {/* Letter sliding out when open */}
      <g
        style={{
          transform: open ? 'translateY(-52px)' : 'translateY(0)',
          transformOrigin: '120px 130px',
          transition: 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <rect x="62" y="70" width="116" height="80" rx="10" fill="#FFF7EC" />
        <rect x="76" y="88" width="88" height="6" rx="3" fill="#D9C4E8" />
        <rect x="76" y="102" width="66" height="6" rx="3" fill="#E4D6F0" />
        <rect x="76" y="116" width="76" height="6" rx="3" fill="#E4D6F0" />
      </g>

      {/* Envelope pocket */}
      <rect x="40" y="112" width="160" height="98" rx="16" fill="url(#hadiya-env-body)" />
      <path
        d="M40 122 L120 182 L200 122"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Flap */}
      <g
        style={{
          transform: open ? 'rotateX(-165deg)' : 'rotateX(0deg)',
          transformOrigin: '120px 116px',
          transition: 'transform 620ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <path d="M40 116 L120 60 L200 116 L200 124 L120 76 L40 124 Z" fill="url(#hadiya-env-body)" />
      </g>
    </svg>
  );
}