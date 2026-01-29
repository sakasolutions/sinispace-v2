'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { type ReactNode } from 'react';

const listItemVariants = {
  initial: { opacity: 0, y: -8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

const defaultTransition = { duration: 0.2, ease: 'easeOut' as const };

type AnimatedListProps = {
  children: ReactNode;
  className?: string;
  as?: 'ul' | 'div';
  mode?: 'sync' | 'wait' | 'popLayout';
};

/**
 * Liste mit AnimatePresence. Sanftes Hinzufügen/Entfernen von Items.
 * Kinder sollten AnimatedListItem sein (mit key).
 */
export function AnimatedList({
  children,
  className,
  as: As = 'div',
  mode = 'popLayout',
}: AnimatedListProps) {
  return (
    <As className={className} role={As === 'ul' ? undefined : 'list'}>
      <AnimatePresence mode={mode} initial={false}>
        {children}
      </AnimatePresence>
    </As>
  );
}

type AnimatedListItemProps = {
  children: ReactNode;
  layout?: boolean;
  className?: string;
  as?: 'li' | 'div';
};

/**
 * Einzelnes List-Item für AnimatedList. Immer mit key verwenden.
 * Enter/Exit-Animation bereits eingebaut.
 */
export function AnimatedListItem({
  children,
  layout = true,
  className,
  as: As = 'div',
}: AnimatedListItemProps) {
  const Component = As === 'li' ? motion.li : motion.div;
  return (
    <Component
      layout={layout}
      variants={listItemVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={defaultTransition}
      className={className}
    >
      {children}
    </Component>
  );
}
