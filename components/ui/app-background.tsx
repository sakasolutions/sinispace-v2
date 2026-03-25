'use client';

import { MARKETING_PAGE_AURORA_BACKGROUND } from '@/lib/marketing-aurora';

/**
 * Gleiche mehrschichtige Aurora wie die Landing Page (MARKETING_PAGE_AURORA_BACKGROUND),
 * darüber ein sehr leichter Canvas-/Surface-Verlauf — fixed, scrollt nicht mit.
 */
export function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* 1) Aurora: identische Radials + Basis-Verlauf wie LP (violett/plum, Ecken/Oben/Unten) */}
      <div
        className="absolute inset-0 min-h-full min-w-full"
        style={{ background: MARKETING_PAGE_AURORA_BACKGROUND }}
      />
      {/* 2) Sanfter Überblend: bündelt mit App-Tokens, dämpft ohne die Aurora zu „verkleistern“ */}
      <div
        className="absolute inset-0 min-h-full min-w-full"
        style={{
          background:
            'linear-gradient(180deg, hsl(var(--app-canvas) / 0.2) 0%, transparent 42%, hsl(var(--app-surface) / 0.12) 100%)',
        }}
      />
    </div>
  );
}
