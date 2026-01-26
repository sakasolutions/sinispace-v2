'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, MessageSquare, Settings } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: LayoutGrid,
      active: pathname === '/dashboard',
    },
    {
      href: '/chat',
      label: 'SiniChat',
      icon: MessageSquare,
      active: pathname?.startsWith('/chat') ?? false,
      highlight: true, // Hervorgehoben mit Logo-Gradient!
    },
    {
      href: '/settings',
      label: 'Profil',
      icon: Settings,
      active: pathname === '/settings',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block md:hidden" style={{
      paddingBottom: `max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom)))`,
      marginBottom: `max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom)))`,
    }}>
      {/* FLOATING ISLAND: Glassmorphism / Frosted Glass Look */}
      <div className="mx-auto max-w-md px-4">
        <div 
          className="bg-white/80 backdrop-blur-lg border-t border-white/50 rounded-2xl shadow-2xl"
          style={{
            // Glassmorphism: Verstärkter Schatten für Schwebe-Effekt
            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08), 0 -2px 10px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* SVG Gradient Definition (einmalig für alle Icons) */}
          <svg className="absolute w-0 h-0">
            <defs>
              <linearGradient id="nav-gradient-active" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(249, 115, 22)" />
                <stop offset="100%" stopColor="rgb(244, 114, 182)" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="flex justify-evenly items-center h-16 px-2" style={{
            paddingBottom: `max(0.5rem, env(safe-area-inset-bottom))`,
          }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.active;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => triggerHaptic('light')}
                  className="flex flex-col items-center justify-center gap-1 min-w-[60px] px-3 py-2 relative group"
                >
                  {/* Icon Container - GLEICHE GRÖSSE für alle Icons (kein Protruding) */}
                  <div className="h-10 w-10 flex items-center justify-center transition-all duration-300 ease-out">
                    {isActive ? (
                      // AKTIV: Icon mit Orange/Pink Gradient
                      <Icon 
                        className="w-5 h-5 transition-all duration-300"
                        style={{
                          stroke: 'url(#nav-gradient-active)',
                        }}
                        strokeWidth={2.5}
                      />
                    ) : (
                      // INAKTIV: Dunkles Grau für besseren Kontrast
                      <Icon 
                        className="w-5 h-5 text-gray-600 transition-all duration-300 group-hover:text-gray-700"
                        strokeWidth={2}
                      />
                    )}
                  </div>
                  
                  {/* Text Label */}
                  <span className={cn(
                    'text-[11px] font-medium transition-all duration-300',
                    isActive 
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent font-semibold'
                      : 'text-gray-600 group-hover:text-gray-700'
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
