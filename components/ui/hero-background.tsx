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
    <div className={`absolute inset-0 pointer-events-none z-0 ${className}`} aria-hidden="true">
      {/* PREMIUM: Subtle Radial Gradient - Logo-Inspired */}
      <div className="absolute inset-0 bg-radial-gradient-white-to-brand">
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, #ffffff 0%, rgba(255, 255, 255, 0.98) 40%, rgba(254, 243, 199, 0.02) 70%, rgba(253, 242, 248, 0.02) 100%)'
          }}
        />
      </div>
      
      {/* PREMIUM: Floating Geometric Shapes - Brand Colors */}
      {showGlows && (
        <>
          {/* Floating Circle - Orange */}
          <motion.div 
            animate={!prefersReducedMotion ? { 
              y: [0, -30, 0],
              x: [0, 20, 0],
              scale: [1, 1.1, 1],
              opacity: [0.05, 0.08, 0.05]
            } : {}} 
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 left-1/4 h-64 w-64 rounded-full bg-orange-500 blur-3xl" 
          />
          
          {/* Floating Circle - Pink */}
          <motion.div 
            animate={!prefersReducedMotion ? { 
              y: [0, 40, 0],
              x: [0, -25, 0],
              scale: [1, 1.15, 1],
              opacity: [0.05, 0.08, 0.05]
            } : {}} 
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            className="absolute bottom-32 right-1/4 h-80 w-80 rounded-full bg-pink-500 blur-3xl" 
          />
          
          {/* Floating Geometric Shape - Triangle-ish */}
          <motion.div 
            animate={!prefersReducedMotion ? { 
              rotate: [0, 180, 360],
              scale: [1, 1.2, 1],
              opacity: [0.06, 0.1, 0.06]
            } : {}} 
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96"
            style={{
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.06) 0%, rgba(244, 114, 182, 0.06) 100%)',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
              filter: 'blur(60px)'
            }}
          />
          
          {/* Floating Circle - Rose (smaller accent) */}
          <motion.div 
            animate={!prefersReducedMotion ? { 
              y: [0, -20, 0],
              x: [0, 15, 0],
              opacity: [0.04, 0.07, 0.04]
            } : {}} 
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-1/3 right-1/3 h-48 w-48 rounded-full bg-rose-500 blur-2xl" 
          />
        </>
      )}
    </div>
  );
}
