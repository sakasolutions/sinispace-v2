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
    <nav className="fixed bottom-0 left-0 right-0 z-50 block md:hidden px-4" style={{
      paddingBottom: `max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom)))`,
      marginBottom: `max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom)))`,
    }}>
      {/* PREMIUM: Native-Style Navbar mit Premium Depth & Spacing */}
      <div className="mx-auto max-w-md">
        <div 
          className="bg-gradient-to-r from-pink-500 via-orange-500 to-pink-500/80 backdrop-blur-xl border border-white/20 rounded-2xl"
          style={{
            // Premium Depth: Soft, high-quality shadow with large blur radius
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(249, 115, 22, 0.15), 0 2px 8px rgba(244, 114, 182, 0.1)',
          }}
        >
          <div className="flex justify-evenly items-center h-16 px-2" style={{
            paddingBottom: `max(0.5rem, env(safe-area-inset-bottom))`,
          }}>
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
                    {/* Subtle Active State - Soft Glow instead of klobig square */}
                    <div className="relative">
                      {isActive && (
                        <div 
                          className="absolute inset-0 rounded-xl blur-md"
                          style={{
                            background: 'rgba(255, 255, 255, 0.3)',
                            transform: 'scale(1.2)',
                            opacity: 0.6,
                          }}
                        />
                      )}
                      <div className={cn(
                        'h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-200 ease-out relative',
                        isActive 
                          ? 'bg-white/15 backdrop-blur-md' 
                          : 'bg-white/10 backdrop-blur-sm'
                      )}>
                        <Icon 
                          className={cn(
                            'h-6 w-6 transition-all duration-200 relative z-10',
                            isActive ? 'text-white drop-shadow-lg' : 'text-white/90'
                          )} 
                          strokeWidth={isActive ? 3 : 2}
                          style={isActive ? {
                            filter: 'drop-shadow(0 2px 4px rgba(255, 255, 255, 0.3))',
                          } : {}}
                        />
                      </div>
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

              // Normale Buttons - Subtle Active State mit Soft Glow
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => triggerHaptic('light')}
                  className="flex flex-col items-center justify-center gap-1 min-w-[60px] px-3 py-2 relative group"
                >
                  {/* Subtle Active State - Soft Glow instead of klobig background */}
                  <div className="relative">
                    {isActive && (
                      <div 
                        className="absolute inset-0 rounded-xl blur-md"
                        style={{
                          background: 'rgba(255, 255, 255, 0.25)',
                          transform: 'scale(1.3)',
                          opacity: 0.5,
                        }}
                      />
                    )}
                    <div className={cn(
                      'h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-200 ease-out relative',
                      isActive 
                        ? 'bg-white/12 backdrop-blur-md' 
                        : 'bg-white/10 backdrop-blur-sm group-hover:bg-white/15'
                    )}>
                      <Icon 
                        className={cn(
                          'w-5 h-5 transition-all duration-200 relative z-10',
                          isActive ? 'text-white drop-shadow-md' : 'text-white/80 group-hover:text-white/90'
                        )} 
                        strokeWidth={isActive ? 3 : 2}
                        style={isActive ? {
                          filter: 'drop-shadow(0 1px 3px rgba(255, 255, 255, 0.4))',
                        } : {}}
                      />
                    </div>
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
