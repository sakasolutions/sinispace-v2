'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const MESSAGES = [
  'SiniSpace optimiert Gebindegrößen…',
  'Fasse Zutaten intelligent zusammen…',
];

/**
 * Vollflächiger „AI Cockpit“-Zustand während Smart-Merge / ChatGPT-Gebinde-Optimierung.
 */
export function SmartMergeAiLoader({ className }: { className?: string }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="SiniSpace optimiert deine Einkaufsliste"
      className={cn('mt-4', className)}
    >
      <div
        className={cn(
          'rounded-3xl border border-fuchsia-400/30 bg-white/[0.02] p-5 sm:p-6',
          'shadow-[0_0_36px_rgba(236,72,153,0.18),0_0_72px_rgba(168,85,247,0.12),inset_0_0_0_1px_rgba(255,255,255,0.04)]',
          'motion-safe:animate-pulse backdrop-blur-md'
        )}
      >
        <div className="flex flex-col items-center justify-center gap-3 pb-8 pt-2 text-center">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Sparkles
              className="h-5 w-5 shrink-0 text-pink-400 motion-safe:[animation:spin_2.8s_linear_infinite]"
              aria-hidden
            />
            <p className="max-w-[min(100%,22rem)] bg-gradient-to-r from-pink-500 to-orange-400 bg-clip-text text-base font-semibold text-transparent motion-safe:animate-pulse sm:text-lg">
              {MESSAGES[msgIndex]}
            </p>
          </div>
        </div>

        <div className="flex flex-col border-t border-white/[0.06] pt-1">
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex w-full items-center gap-4 px-2 py-4"
            >
              <div
                className="h-6 w-6 shrink-0 rounded-full bg-white/[0.05] motion-safe:animate-pulse"
                aria-hidden
              />
              <div
                className="h-8 w-16 shrink-0 rounded-lg bg-white/[0.05] motion-safe:animate-pulse"
                aria-hidden
              />
              <div className="flex min-w-0 flex-1 flex-col justify-center">
                <div
                  className="h-5 max-w-[50%] rounded-md bg-white/[0.05] motion-safe:animate-pulse"
                  aria-hidden
                />
                <div
                  className="mt-2 h-3 max-w-[33%] rounded-md bg-white/[0.02] motion-safe:animate-pulse"
                  aria-hidden
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
