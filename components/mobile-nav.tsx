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
    <nav className="fixed bottom-0 left-0 right-0 z-50 block md:hidden px-4 mb-2" style={{
      paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      marginBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
    }}>
      {/* BENTO BOX: Logo Gradient Navbar mit Glassmorphism */}
      <div className="mx-auto max-w-md mb-3">
        <div className="bg-gradient-to-r from-pink-500 via-orange-500 to-pink-500/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-[0_4px_12px_rgba(249,115,22,0.15),0_8px_24px_rgba(244,114,182,0.1)]">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.active;

              // SiniChat Button - Highlighted on Gradient Background
              if (item.highlight) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => triggerHaptic('light')}
                    className="flex flex-col items-center justify-center gap-1 min-w-[60px] px-3 py-2 relative"
                  >
                    <div className={cn(
                      'h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-200 ease-out',
                      isActive 
                        ? 'bg-white/20 backdrop-blur-md shadow-lg shadow-white/20 ring-2 ring-white/30 scale-105' 
                        : 'bg-white/10 backdrop-blur-sm shadow-sm'
                    )}>
                      <Icon 
                        className={cn(
                          'h-6 w-6 transition-all duration-200',
                          isActive ? 'text-white' : 'text-white/90'
                        )} 
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                    </div>
                    <span className={cn(
                      'text-[11px] font-medium transition-colors duration-200',
                      isActive ? 'text-white font-semibold' : 'text-white/80'
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              }

              // Normale Buttons - White/Light Colors für Contrast auf Gradient
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => triggerHaptic('light')}
                  className="flex flex-col items-center justify-center gap-1 min-w-[60px] px-3 py-2 relative group"
                >
                  {/* Active Indicator - White Dot */}
                  {isActive && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />
                  )}
                  
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 ease-out',
                    isActive 
                      ? 'bg-white/20 backdrop-blur-md ring-1 ring-white/30' 
                      : 'bg-white/10 backdrop-blur-sm group-hover:bg-white/15'
                  )}>
                    <Icon 
                      className={cn(
                        'w-5 h-5 transition-colors duration-200',
                        isActive ? 'text-white' : 'text-white/80 group-hover:text-white/90'
                      )} 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span className={cn(
                    'text-[11px] font-medium transition-colors duration-200',
                    isActive ? 'text-white font-semibold' : 'text-white/80'
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
