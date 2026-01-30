'use client';

/**
 * Globaler Aurora Glow - Konsistent auf allen Platform-Seiten.
 * Zentral im Platform-Layout, sitzt hinter allem (z-[-10]).
 */
export function AppBackground() {
  return (
    <div 
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden" 
      aria-hidden="true"
    >
      {/* Basis: Warmes Weiß */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #fffefc 30%, #fcfaf8 100%)',
        }}
      />
      {/* Aurora Glow - dezenter Morgensonne-Schimmer */}
      <div 
        className="absolute w-[1000px] h-[1000px] top-[-20vh] left-1/2 -translate-x-1/2 rounded-full blur-3xl"
        style={{ backgroundColor: 'rgba(255, 250, 240, 0.5)' }}
      />
    </div>
  );
}
