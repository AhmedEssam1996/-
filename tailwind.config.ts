import type { Config } from 'tailwindcss';

/**
 * Hadiya design tokens.
 *
 * The canonical colour values live in `src/app/globals.css` as CSS custom
 * properties (so they can be themed / used inside gradients). These aliases
 * give Tailwind class names for the same palette.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'var(--bg)',
          soft: 'var(--bg-soft)',
        },
        card: {
          DEFAULT: 'var(--card)',
          soft: 'var(--card-soft)',
        },
        line: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        /* Cute / playful Hadiya palette on deep purple. */
        night: '#0B0614',
        pink: '#FF7BB0',
        coral: '#FF7A5C',
        rose: '#FF5C8A',
        purple: '#A97BFF',
        lavender: '#C9B6FF',
        orange: '#FFA552',
        yellow: '#FFD166',
        plum: {
          DEFAULT: '#1E0F33',
          deep: '#120820',
          soft: '#2B1547',
        },
        brand: {
          pink: '#FF7BB0',
          coral: '#FF7A5C',
          rose: '#FF5C8A',
          purple: '#A97BFF',
          plum: '#1E0F33',
          orange: '#FFA552',
          yellow: '#FFD166',
        },
        ink: {
          DEFAULT: 'var(--fg)',
          muted: 'var(--fg-muted)',
          faint: 'var(--fg-faint)',
        },
      },
      fontFamily: {
        sans: ['var(--font-arabic)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-arabic)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
        '5xl': '2.75rem',
      },
      boxShadow: {
        /* Tinted shadows — a neutral black shadow looks flat on deep purple. */
        soft: '0 2px 8px -3px rgba(11, 6, 20, 0.5), 0 12px 32px -16px rgba(11, 6, 20, 0.7)',
        lift: '0 8px 20px -8px rgba(11, 6, 20, 0.6), 0 28px 60px -24px rgba(11, 6, 20, 0.85)',
        glow: '0 0 44px -10px rgba(255, 123, 176, 0.6)',
        'glow-rose': '0 0 44px -10px rgba(255, 92, 138, 0.55)',
        'glow-lavender': '0 0 44px -10px rgba(169, 123, 255, 0.6)',
        'glow-gold': '0 0 44px -10px rgba(255, 201, 77, 0.55)',
        'glow-orange': '0 0 44px -10px rgba(255, 165, 82, 0.55)',
        premium: '0 32px 80px -36px rgba(0, 0, 0, 0.8)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-14px) rotate(4deg)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-22px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(-100%)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        aurora: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '33%': { transform: 'translate3d(4%, -6%, 0) scale(1.08)' },
          '66%': { transform: 'translate3d(-5%, 4%, 0) scale(0.96)' },
        },
        rise: {
          '0%': { transform: 'translateY(0) scale(0.6)', opacity: '0' },
          '18%': { opacity: '1' },
          '100%': { transform: 'translateY(-120px) scale(1)', opacity: '0' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        bob: {
          '0%, 100%': { transform: 'translateY(0) rotate(-1.5deg)' },
          '50%': { transform: 'translateY(-14px) rotate(1.5deg)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 9s ease-in-out infinite',
        bob: 'bob 6s ease-in-out infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        shimmer: 'shimmer 2.2s infinite',
        'pulse-glow': 'pulse-glow 3.5s ease-in-out infinite',
        aurora: 'aurora 22s ease-in-out infinite',
        rise: 'rise 6s ease-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;