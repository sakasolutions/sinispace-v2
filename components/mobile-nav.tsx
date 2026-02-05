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
      className="fixed bottom-0 left-0 right-0 w-full z-[100] block md:hidden"
      aria-label="Hauptnavigation"
    >
      <div
        className="flex justify-around items-center w-full py-2 px-0"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          WebkitBackdropFilter: 'blur(20px)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(168, 85, 247, 0.08)',
          boxShadow: '0 -2px 16px rgba(0, 0, 0, 0.04)',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
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
                'group flex flex-col items-center gap-1 min-w-[44px] min-h-[44px] py-1.5 px-3 pb-2',
                'transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500'
              )}
              style={{ transitionTimingFunction: EASE }}
            >
              <Icon
                className={cn(
                  'w-6 h-6 shrink-0 transition-colors duration-300',
                  isActive ? 'text-[#9333EA]' : 'text-[#CBD5E1] group-hover:text-[#D8B4FE]'
                )}
                strokeWidth={2}
              />
              <span
                className={cn(
                  'text-[13px] leading-tight whitespace-nowrap truncate max-w-full text-center transition-colors duration-300',
                  isActive
                    ? 'font-semibold text-[#9333EA]'
                    : 'font-medium text-[#94A3B8] group-hover:text-[#A78BFA]'
                )}
                style={{
                  letterSpacing: isActive ? '0.2px' : '0.1px',
                  lineHeight: 1.2,
                }}
              >
                {item.label}
              </span>
              {/* Neon underline — 32px, gradient, below label (2px gap), multi-layer glow */}
              <span
                className="mt-0.5 h-[3px] rounded-full block origin-center overflow-hidden"
                style={{
                  width: isActive ? 32 : 0,
                  opacity: isActive ? 1 : 0,
                  background: 'linear-gradient(90deg, #A855F7 0%, #EC4899 100%)',
                  boxShadow: isActive
                    ? '0 0 8px rgba(168, 85, 247, 0.6), 0 0 16px rgba(168, 85, 247, 0.4), 0 2px 8px rgba(236, 72, 153, 0.3)'
                    : 'none',
                  transition: isActive
                    ? 'width 0.3s ease-out, opacity 0.2s ease-out, box-shadow 0.2s ease-out'
                    : 'width 0.25s ease-in, opacity 0.15s ease-in',
                }}
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
