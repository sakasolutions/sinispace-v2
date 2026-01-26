'use client';

import { useEffect, useState } from 'react';

// Dynamische Begrüßung nach Tageszeit
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 11) {
    return 'Guten Morgen';
  } else if (hour >= 11 && hour < 18) {
    return 'Guten Tag';
  } else if (hour >= 18 && hour < 22) {
    return 'Guten Abend';
  } else {
    return 'Nachtschicht?';
  }
}

export function DashboardGreetingClient() {
  const [displayName, setDisplayName] = useState<string>('');

  // Hydration-Fix: Nur nach Mount rendern
  useEffect(() => {
    // User-Daten per API holen
    fetch('/api/user/display-name')
      .then(res => res.json())
      .then(data => {
        if (data.displayName) {
          setDisplayName(data.displayName);
        }
      })
      .catch(err => {
        console.error('Fehler beim Laden des Display-Namens:', err);
      });
  }, []);

  const greeting = getTimeBasedGreeting();

  return (
    <div className="relative">
      {/* BRAND: Logo-Farben als ambient glow */}
      <div className="absolute bg-orange-500/5 blur-[120px] w-[400px] h-[400px] rounded-full -top-32 -left-32 -z-10 pointer-events-none" />
      <div className="absolute bg-pink-500/5 blur-[100px] w-[300px] h-[300px] rounded-full -top-20 -right-20 -z-10 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Premium Typography mit Brand Touch */}
        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-tight mb-4 md:mb-6"
          style={{ 
            fontFamily: 'var(--font-plus-jakarta-sans), sans-serif', 
            fontWeight: 800,
            letterSpacing: '-0.03em'
          }}
        >
          {greeting}{displayName ? `, ${displayName}` : ''}
        </h1>
        
        {/* Description mit Brand Gradient Touch */}
        <p className="text-base md:text-lg lg:text-xl text-zinc-500 font-light tracking-wide leading-relaxed max-w-2xl">
          Dein Business läuft. Was optimieren wir jetzt?
        </p>
      </div>
    </div>
  );
}
