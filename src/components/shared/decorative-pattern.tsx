import { cn } from '@/lib/utils';

interface DecorativePatternProps {
  variant?: 'dots' | 'grid' | 'gift';
  className?: string;
  opacity?: number;
}

const DotPattern = ({ className, opacity = 0.06 }: { className?: string; opacity?: number }) => (
  <svg
    className={cn('absolute inset-0 h-full w-full', className)}
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    preserveAspectRatio="none"
  >
    <defs>
      <pattern id="dot-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
        <circle cx="4" cy="4" r="1" fill="currentColor" opacity={opacity} />
        <circle cx="20" cy="20" r="1" fill="currentColor" opacity={opacity} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#dot-pattern)" />
  </svg>
);

const GridPattern = ({ className, opacity = 0.05 }: { className?: string; opacity?: number }) => (
  <svg
    className={cn('absolute inset-0 h-full w-full', className)}
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    preserveAspectRatio="none"
  >
    <defs>
      <pattern id="grid-pattern" width="64" height="64" patternUnits="userSpaceOnUse">
        <path
          d="M 0 0 L 64 0 L 64 64 L 0 64 Z M 0 0 L 64 64 M 64 0 L 0 64"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          opacity={opacity}
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid-pattern)" />
  </svg>
);

const GiftPattern = ({ className, opacity = 0.04 }: { className?: string; opacity?: number }) => (
  <svg
    className={cn('absolute inset-0 h-full w-full', className)}
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
    preserveAspectRatio="none"
  >
    <defs>
      <pattern id="gift-pattern" width="120" height="120" patternUnits="userSpaceOnUse">
        <path
          d="M30 0 L36 20 L42 0 Z M30 120 L36 100 L42 120 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.7"
          opacity={opacity}
        />
        <rect x="34" y="20" width="2" height="100" stroke="currentColor" strokeWidth="0.5" opacity={opacity} />
        <circle cx="36" cy="70" r="3" fill="none" stroke="currentColor" strokeWidth="0.5" opacity={opacity} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#gift-pattern)" />
  </svg>
);

export function DecorativePattern({ variant = 'dots', className, opacity }: DecorativePatternProps) {
  switch (variant) {
    case 'grid':
      return <GridPattern className={className} opacity={opacity} />;
    case 'gift':
      return <GiftPattern className={className} opacity={opacity} />;
    case 'dots':
    default:
      return <DotPattern className={className} opacity={opacity} />;
  }
}
