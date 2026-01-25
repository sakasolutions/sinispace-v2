"use client";

import { motion } from 'framer-motion';
import { useReducedMotion } from 'framer-motion';

/**
 * Hero Background Component
 * 
 * Wiederverwendbarer Hintergrund aus der Hero-Section.
 * Kann einfach ein- und ausgeschaltet werden.
 * 
 * ZUM RÜCKGÄNGIGMACHEN:
 * Setze USE_HERO_BACKGROUND = false
 */

// 🎛️ EINFACH ZUM EIN/AUSSCHALTEN
const USE_HERO_BACKGROUND = true; // false = zurück zum alten Stand

interface HeroBackgroundProps {
  className?: string;
  showGlows?: boolean; // Optional: Glows ein/aus
}

export function HeroBackground({ className = "", showGlows = true }: HeroBackgroundProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  if (!USE_HERO_BACKGROUND) {
    return null; // Zurück zum alten Stand
  }

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      {/* Grid Pattern - Theme-aware */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(128,128,128,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(128,128,128,0.15)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] transition-opacity duration-500"></div>
      
      {/* Radial Gradient Glows (optional) - Theme-aware */}
      {showGlows && (
        <>
          <motion.div 
            animate={!prefersReducedMotion ? { 
              scale: [1, 1.2, 1], 
              opacity: [0.2, 0.4, 0.2], 
              x: [0, 50, 0] 
            } : {}} 
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-1/4 -translate-x-1/2 h-[500px] w-[500px] rounded-full bg-orange-400/10 dark:bg-orange-500/20 blur-[120px] transition-colors duration-500" 
          />
          <motion.div 
            animate={!prefersReducedMotion ? { 
              scale: [1, 1.3, 1], 
              opacity: [0.15, 0.3, 0.15], 
              x: [0, -50, 0] 
            } : {}} 
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute bottom-0 right-1/4 h-[600px] w-[600px] rounded-full bg-blue-400/5 dark:bg-purple-500/10 blur-[120px] transition-colors duration-500" 
          />
        </>
      )}
    </div>
  );
}
