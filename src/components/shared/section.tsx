import { motion, useInView } from 'motion/react';
import { useRef } from 'react';

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
}

export function Section({ children, className, id, delay = 0 }: SectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      initial={{ opacity: 0, y: isInView ? 0 : 32 }}
      animate={{
        opacity: isInView ? 1 : 0,
        y: isInView ? 0 : 32,
        transition: { duration: 0.6, delay, ease: 'easeOut' },
      }}
    >
      {children}
    </motion.section>
  );
}
