'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Calendar, MessageSquare, Settings } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { cn } from '@/lib/utils';

const EASE_OUT_EXPO = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: LayoutGrid, active: pathname === '/dashboard' },
    { href: '/calendar', label: 'Kalender', icon: Calendar, active: pathname === '/calendar' },
    { href: '/chat', label: 'SiniChat', icon: MessageSquare, active: pathname?.startsWith('/chat') ?? false },
    { href: '/settings', label: 'Profil', icon: Settings, active: pathname === '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full z-[100] block md:hidden">
      <div
        className="flex justify-evenly items-stretch w-full min-h-[72px] px-4 pt-3 pb-3 gap-1 relative rounded-t-[24px]"
        style={{
          background: '#F9FAFB',
          paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        }}
      >
        {/* Top border: 2px gradient line */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[24px]"
          style={{ background: 'linear-gradient(90deg, #A855F7, #EC4899)' }}
          aria-hidden
        />
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic('medium')}
              className={cn(
                'group relative flex flex-col items-center justify-end flex-1 min-w-0 max-w-[80px] py-2 rounded-xl',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 transition-transform duration-300',
                !isActive && 'hover:bg-violet-500/5',
                isActive && 'scale-105'
              )}
              style={{ transitionTimingFunction: EASE_OUT_EXPO }}
            >
              {/* Gradient bar — rises from bottom (0.4s) */}
              <div
                className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[72px] rounded-t-[20px] pointer-events-none"
                style={{
                  height: isActive ? '100%' : '0%',
                  opacity: isActive ? 1 : 0,
                  background: 'linear-gradient(to top, #9333EA, transparent)',
                  transition: `height 0.4s ${EASE_OUT_EXPO}, opacity 0.4s ${EASE_OUT_EXPO}`,
                }}
                aria-hidden
              />

              <div className="relative z-10 flex flex-col items-center w-full">
                <span
                  className="flex items-center justify-center mb-1 transition-colors duration-200"
                  style={isActive ? { filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.5))' } : undefined}
                >
                  <Icon
                    className={cn(
                      'w-6 h-6 shrink-0',
                      isActive ? 'text-white' : 'text-[#9CA3AF]'
                    )}
                    strokeWidth={2}
                  />
                </span>
                <span
                  className={cn(
                    'whitespace-nowrap truncate w-full text-center transition-colors duration-200',
                    isActive ? 'text-white text-[14px] font-bold' : 'text-[#CBD5E1] text-[12px]'
                  )}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
