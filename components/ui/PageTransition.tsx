'use client';

import { motion } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
};

const pageTransition = { duration: 0.25, ease: 'easeOut' as const };

type PageTransitionProps = {
  children: React.ReactNode;
  className?: string;
} & Omit<React.ComponentProps<typeof motion.div>, 'initial' | 'animate' | 'transition'>;

/**
 * Wrapper für jede Seite (/dashboard, /tools/…).
 * Sanftes Einblenden beim Seitenwechsel: opacity 0→1, y 10→0.
 * Einfach um den Seiten-Content legen.
 */
export function PageTransition({ children, className, ...rest }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
