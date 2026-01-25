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
    <div className="relative mb-6 sm:mb-8 md:mb-10 lg:mb-12">
      {/* Background Glow für visuelle Tiefe */}
      <div className="absolute bg-blue-600/20 blur-[100px] w-[300px] h-[300px] rounded-full -top-20 -left-20 -z-10 pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight"
            style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
          >
            {greeting}{displayName ? `, ${displayName}` : ''} 👋
          </h1>
        </div>
        
        <p className="text-sm md:text-base lg:text-lg text-zinc-400 mt-2 sm:mt-3 tracking-wide leading-relaxed">
          Dein Business läuft. Was optimieren wir jetzt?
        </p>
      </div>
    </div>
  );
}
