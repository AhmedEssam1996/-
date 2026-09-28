import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  className?: string;
}

const directionOffset = {
  up: { y: 32, x: 0 },
  down: { y: -32, x: 0 },
  left: { x: 32, y: 0 },
  right: { x: -32, y: 0 },
};

export function ScrollReveal({ children, delay = 0, direction = 'up', className }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const { x, y } = directionOffset[direction];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, x, y }}
      animate={{
        opacity: isInView ? 1 : 0,
        x: isInView ? 0 : x,
        y: isInView ? 0 : y,
        transition: { duration: 0.6, delay, ease: 'easeOut' },
      }}
    >
      {children}
    </motion.div>
  );
}
