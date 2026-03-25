'use client';

/**
 * Globaler Aurora Glow – SiniSpace Brand (semantic tokens).
 * Fixed, hinter Content (-z-10), weich wie Studio-Licht.
 */
export function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* Basis: Canvas → Surface */}
      <div
        className="absolute inset-0 h-full w-full"
        style={{
          background:
            'linear-gradient(180deg, hsl(var(--app-canvas)) 0%, hsl(var(--app-canvas)) 45%, hsl(var(--app-surface)) 100%)',
        }}
      />
      {/* Weiche Brand-Form – orange → pink */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[50vh] max-h-[50vh] overflow-hidden blur-[120px]">
        <div
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-sini-orange/20 to-sini-pink/20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
        />
      </div>
    </div>
  );
}
