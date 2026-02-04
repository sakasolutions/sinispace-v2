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
      {/* Tinted frosted glass — hard surface, content behind clearly visible */}
      <div
        className="relative w-full rounded-[26px] overflow-hidden h-14"
        style={{
          WebkitBackdropFilter: 'blur(10px)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(170, 130, 255, 0.14)',
          border: '1px solid rgba(255,255,255,0.22)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.18), 0 3px 8px rgba(0,0,0,0.12)',
        }}
      >
        {/* Top edge highlight + soft reflection (~15%) */}
        <div
          className="absolute inset-x-0 top-0 h-[15%] pointer-events-none rounded-t-[26px]"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.45)',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)',
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
                      className="w-5 h-5 text-white transition-all duration-300 group-hover:text-white"
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
                    'text-[10px] font-medium transition-all duration-300 text-white',
                    isActive && 'font-semibold'
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
