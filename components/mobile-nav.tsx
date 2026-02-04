'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Calendar, MessageSquare, Settings } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: LayoutGrid, active: pathname === '/dashboard' },
    { href: '/calendar', label: 'Kalender', icon: Calendar, active: pathname === '/calendar' },
    { href: '/chat', label: 'SiniChat', icon: MessageSquare, active: pathname?.startsWith('/chat') ?? false, highlight: true },
    { href: '/settings', label: 'Profil', icon: Settings, active: pathname === '/settings' },
  ];

  return (
    <nav
      className="fixed bottom-6 left-6 right-6 z-[100] block md:hidden max-w-md mx-auto pb-[env(safe-area-inset-bottom)]"
    >
      {/* iOS 2025 Colored Glass – translucent tinted glass, real blur + saturation */}
      <div
        className="relative w-full rounded-[26px] overflow-hidden border border-white/[0.35] h-14"
        style={{
          background: 'rgba(126, 87, 255, 0.16)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.2)',
          WebkitBackdropFilter: 'blur(10px) saturate(150%)',
          backdropFilter: 'blur(10px) saturate(150%)',
        }}
      >
        {/* Top reflection: white → transparent, ~18% height */}
        <div
          className="absolute inset-x-0 top-0 h-[18%] pointer-events-none rounded-t-[26px]"
          style={{
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.35), transparent)',
          }}
          aria-hidden
        />
        <div className="relative flex justify-evenly items-center h-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.active;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => triggerHaptic('light')}
                className="flex flex-col items-center justify-center gap-1 min-w-[56px] px-2 py-2.5 relative group"
              >
                <div className="relative flex flex-col items-center">
                  <div
                    className={cn(
                      'flex items-center justify-center transition-all duration-300 ease-out',
                      isActive ? 'rounded-full p-2 bg-white/20' : 'h-9 w-9'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-all duration-300',
                        isActive ? 'text-white' : 'text-white/70 group-hover:text-white/90'
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  {isActive && (
                    <span
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                      aria-hidden
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium transition-all duration-300',
                    isActive ? 'text-white font-semibold' : 'text-white/70 group-hover:text-white/90'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
