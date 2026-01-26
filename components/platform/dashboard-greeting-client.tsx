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
      {/* Minimal Luxury: Subtle ambient glow */}
      <div className="absolute bg-emerald-500/3 blur-[120px] w-[500px] h-[500px] rounded-full -top-40 -left-40 -z-10 pointer-events-none" />
      <div className="absolute bg-blue-500/2 blur-[100px] w-[400px] h-[400px] rounded-full -top-20 -right-20 -z-10 pointer-events-none" />
      
      <div className="relative z-10">
        {/* Ultra Premium Typography - Apple-level sophistication */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white tracking-tight leading-[0.95] mb-6 md:mb-8"
          style={{ 
            fontFamily: 'var(--font-plus-jakarta-sans), sans-serif', 
            fontWeight: 900,
            letterSpacing: '-0.04em'
          }}
        >
          {greeting}{displayName ? `, ${displayName}` : ''}
        </h1>
        
        {/* Ultra-thin description */}
        <p className="text-lg md:text-xl lg:text-2xl text-zinc-500 font-light tracking-wide leading-relaxed max-w-2xl">
          Dein Business läuft. Was optimieren wir jetzt?
        </p>
      </div>
    </div>
  );
}
