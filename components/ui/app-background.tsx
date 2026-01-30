'use client';

/**
 * App Background - Variante 1+3: Warmverlauf + Ambient Brand Blobs
 * 
 * Wird INNERHALB des Platform-Layouts gerendert, damit keine
 * Stacking-Context-Probleme mit dem Root-Layout entstehen.
 * Fixed, z-0, sitzt hinter Sidebar (z-10) und Main (z-10).
 */
export function AppBackground() {
  return (
    <div 
      className="fixed inset-0 z-0 pointer-events-none" 
      aria-hidden="true"
    >
      {/* Layer 1: Warmverlauf */}
      <div 
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'linear-gradient(180deg, #fffefc 0%, #fcfaf8 50%, #f9f7f5 100%)',
        }}
      />
      {/* Aurora Glow - weicher Lichtschein von oben */}
      <div 
        className="absolute w-[800px] h-[800px] -top-[400px] left-1/2 -translate-x-1/2 rounded-full blur-3xl pointer-events-none"
        style={{ backgroundColor: 'rgba(254, 215, 170, 0.4)' }}
      />
      
      {/* Layer 2: Ambient Brand Blobs - DEUTLICH sichtbar (12-18% opacity) */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Orange - Oben Links */}
        <div 
          className="absolute -top-24 -left-24 w-[550px] h-[550px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0) 65%)',
            filter: 'blur(70px)',
          }}
        />
        {/* Pink - Unten Rechts */}
        <div 
          className="absolute -bottom-32 -right-32 w-[650px] h-[650px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(244, 114, 182, 0.35) 0%, rgba(244, 114, 182, 0) 65%)',
            filter: 'blur(90px)',
          }}
        />
        {/* Orange Akzent - Mitte Rechts */}
        <div 
          className="absolute top-1/2 -right-16 w-[450px] h-[450px] rounded-full -translate-y-1/2"
          style={{
            background: 'radial-gradient(circle, rgba(251, 146, 60, 0.25) 0%, rgba(251, 146, 60, 0) 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>
    </div>
  );
}
