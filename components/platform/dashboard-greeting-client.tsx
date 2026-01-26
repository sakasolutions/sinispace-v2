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

  // PERFORMANCE: API-Call verzögert (nicht blockierend)
  useEffect(() => {
    // Delay für bessere initial load performance
    const delay = typeof window !== 'undefined' && window.innerWidth < 768 ? 1500 : 500;
    
    const timeoutId = setTimeout(() => {
      fetch('/api/user/display-name')
        .then(res => res.json())
        .then(data => {
          if (data.displayName) {
            setDisplayName(data.displayName);
          }
        })
        .catch(err => {
          // Fail silently - greeting works without name
        });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, []);

  const greeting = getTimeBasedGreeting();

  return (
    <div className="relative">
      {/* PERFORMANCE: Blur-Effekte nur auf Desktop (sehr teuer auf Mobile) */}
      <div className="hidden md:block absolute bg-orange-100/50 blur-[100px] w-[300px] h-[300px] rounded-full -top-24 -left-24 -z-10 pointer-events-none" />
      <div className="hidden md:block absolute bg-pink-100/50 blur-[80px] w-[250px] h-[250px] rounded-full -top-16 -right-16 -z-10 pointer-events-none" />
      
      <div className="relative z-10">
        {/* MOBILE: Kompakte Typography, Desktop: Full Size */}
        <h1
          className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 tracking-tight leading-tight mb-2 md:mb-4 lg:mb-6"
          style={{ 
            fontFamily: 'var(--font-plus-jakarta-sans), sans-serif', 
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: '1.1'
          }}
        >
          {greeting}{displayName ? `, ${displayName}` : ''}
        </h1>
        
        {/* MOBILE: Kompakte Description, Tighter Line-Height */}
        <p className="text-sm md:text-base lg:text-lg xl:text-xl text-gray-600 font-normal tracking-wide leading-tight md:leading-relaxed max-w-2xl" style={{
          fontWeight: 400,
          letterSpacing: '0.01em',
          lineHeight: '1.3'
        }}>
          Dein Business läuft. Was optimieren wir jetzt?
        </p>
      </div>
    </div>
  );
}
