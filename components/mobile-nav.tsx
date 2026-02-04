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

  const activeIndex = navItems.findIndex((i) => i.active);
  const indicatorLeft = activeIndex >= 0 ? `${12.5 + activeIndex * 25}%` : '50%';

  return (
    <nav
      className="fixed bottom-6 left-6 right-6 z-[100] block md:hidden max-w-md mx-auto pb-[env(safe-area-inset-bottom)]"
    >
      {/* Neutral glass pill — no purple fill */}
      <div
        className="relative w-full rounded-[28px] overflow-hidden h-14"
        style={{
          background: 'rgba(255,255,255,0.05)',
          WebkitBackdropFilter: 'blur(8px)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
        }}
      >
        {/* Active tab: light cap (glow only, behind active icon at top edge) */}
        {activeIndex >= 0 && (
          <div
            className="absolute top-0 rounded-[12px] pointer-events-none transition-all duration-300 ease-out"
            style={{
              left: indicatorLeft,
              transform: 'translate(-50%, 0)',
              width: 80,
              height: 18,
              background: 'linear-gradient(90deg, rgba(124,58,237,0.75), rgba(217,70,239,0.75))',
              boxShadow: '0 0 26px rgba(170,120,255,0.45), 0 0 48px rgba(217,70,239,0.25)',
            }}
            aria-hidden
          />
        )}

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
                      isActive ? 'rounded-full p-2' : 'h-9 w-9'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-all duration-300',
                        isActive
                          ? 'text-violet-500'
                          : 'text-gray-600 opacity-60 group-hover:opacity-80'
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium transition-all duration-300',
                    isActive ? 'text-violet-500 font-semibold' : 'text-gray-600 opacity-60 group-hover:opacity-80'
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
