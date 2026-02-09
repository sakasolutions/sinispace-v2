'use client';

/**
 * Globaler Aurora Glow - Ultra-weich, keine harten Kanten.
 * Clip-path + Blur + niedrige Opazität. SiniSpace-Farben.
 * Zentral im Platform-Layout, sitzt hinter allem (-z-10).
 */
export function AppBackground() {
  return (
    <div 
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" 
      aria-hidden="true"
    >
      {/* Basis: Slate-50/Gray für Kontrast zu weißen Karten (Card-First) */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 40%, #ffffff 70%, #ffffff 100%)',
        }}
      />
      {/* ULTRA-SOFT ATMOSPHERE – nur obere Hälfte, damit unten kein Rosa durchscheint */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[50vh] max-h-[50vh] overflow-hidden blur-3xl"
      >
        <div
          style={{
            clipPath:
              'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
          }}
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-orange-200 to-pink-300 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
        />
      </div>
    </div>
  );
}
