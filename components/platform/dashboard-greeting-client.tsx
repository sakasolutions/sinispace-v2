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
    <div className="relative mb-8 sm:mb-10 md:mb-12 lg:mb-16">
      {/* BACKUP: Original background glow */}
      {/* <div className="absolute bg-blue-600/20 blur-[100px] w-[300px] h-[300px] rounded-full -top-20 -left-20 -z-10 pointer-events-none" /> */}
      
      {/* NEW: Enhanced multi-color glow with animation */}
      <div className="absolute bg-blue-600/15 blur-[120px] w-[400px] h-[400px] rounded-full -top-32 -left-32 -z-10 pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bg-indigo-600/10 blur-[100px] w-[300px] h-[300px] rounded-full -top-16 -right-16 -z-10 pointer-events-none animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      <div className="absolute bg-teal-600/10 blur-[80px] w-[250px] h-[250px] rounded-full top-0 left-1/2 -translate-x-1/2 -z-10 pointer-events-none animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight"
            style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif', fontWeight: 800, letterSpacing: '-0.03em' }}
          >
            {greeting}{displayName ? `, ${displayName}` : ''} 👋
          </h1>
        </div>
        
        <p className="text-base md:text-lg lg:text-xl text-zinc-400 mt-3 sm:mt-4 tracking-wide leading-relaxed group-hover:text-zinc-300 transition-colors duration-300">
          Dein Business läuft. Was optimieren wir jetzt?
        </p>
      </div>
    </div>
  );
}
