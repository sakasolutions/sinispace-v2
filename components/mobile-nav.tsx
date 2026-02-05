'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Calendar, MessageSquare, Settings } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { cn } from '@/lib/utils';

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: LayoutGrid, active: pathname === '/dashboard' },
    { href: '/calendar', label: 'Kalender', icon: Calendar, active: pathname === '/calendar' },
    { href: '/chat', label: 'SiniChat', icon: MessageSquare, active: pathname?.startsWith('/chat') ?? false },
    { href: '/settings', label: 'Profil', icon: Settings, active: pathname === '/settings' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] flex justify-center mx-5 mb-4 block md:hidden"
      aria-label="Hauptnavigation"
    >
      <div
        className="flex justify-between items-center w-full max-w-[90%] py-4 px-6 rounded-[32px] bg-white"
        style={{
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic('light')}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'group flex flex-col items-center justify-center gap-2 py-3 px-4 rounded-[24px] min-w-0 flex-1',
                'transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
                'active:scale-95',
                isActive
                  ? 'scale-[1.02]'
                  : 'hover:bg-violet-500/[0.08]'
              )}
              style={{
                transitionDuration: isActive ? '0.4s' : '0.3s',
                transitionTimingFunction: EASE,
                ...(isActive
                  ? {
                      background: 'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)',
                      boxShadow: '0 2px 8px rgba(147, 51, 234, 0.3)',
                    }
                  : {}),
              }}
            >
              <Icon
                className={cn(
                  'w-6 h-6 shrink-0 transition-colors duration-300',
                  isActive ? 'text-white' : 'text-[#6B7280] group-hover:text-[#A855F7]'
                )}
                strokeWidth={2}
              />
              <span
                className={cn(
                  'text-[13px] whitespace-nowrap truncate w-full text-center transition-colors duration-300',
                  isActive ? 'text-white font-semibold' : 'text-[#6B7280] font-medium group-hover:text-[#A855F7]'
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
