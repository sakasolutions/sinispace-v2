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
    { href: '/chat', label: 'SiniChat', icon: MessageSquare, active: pathname?.startsWith('/chat') ?? false },
    { href: '/settings', label: 'Profil', icon: Settings, active: pathname === '/settings' },
  ];

  return (
    <nav
      className="fixed left-1/2 z-50 block w-[90%] max-w-[400px] -translate-x-1/2 md:hidden"
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      aria-label="Hauptnavigation"
    >
      <div className="flex h-auto items-center justify-between rounded-full border border-white/10 bg-black/40 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic('light')}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              className={cn(
                'group relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5',
                'transition-transform active:scale-95',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple/60'
              )}
            >
              {isActive && (
                <span
                  className="absolute bottom-0.5 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-pink to-brand-orange"
                  aria-hidden
                />
              )}
              <Icon
                className={cn(
                  'relative z-10 h-6 w-6 shrink-0 transition-colors duration-200',
                  isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'
                )}
                strokeWidth={2}
              />
              <span
                className={cn(
                  'relative z-10 max-w-full truncate whitespace-nowrap text-[10px] font-medium transition-colors duration-200',
                  isActive ? 'text-white' : 'text-white/40 group-hover:text-white/70'
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
