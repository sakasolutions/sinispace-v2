'use client';

import { createElement, type CSSProperties } from 'react';

type LordIconProps = {
  src: string;
  trigger?: string;
  colors?: string;
  style?: CSSProperties;
  className?: string;
};

/** Lordicon (Lottie) – animiertes Icon per Custom Element */
export function LordIcon({ src, trigger = 'hover', colors, style, className }: LordIconProps) {
  return createElement('lord-icon', {
    src,
    trigger,
    colors,
    style: { width: 60, height: 60, ...style },
    className,
  });
}
