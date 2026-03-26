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
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-[#0F0914]/88 backdrop-blur-md supports-[backdrop-filter]:bg-[#0F0914]/75 md:hidden"
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingTop: '0.5rem',
      }}
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2">
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
              <Icon
                className={cn(
                  'relative z-10 h-5 w-5 shrink-0 transition-colors duration-200',
                  isActive ? 'text-white/90' : 'text-white/30 group-hover:text-white/50'
                )}
                strokeWidth={1.5}
                aria-hidden
              />
              <span
                className={cn(
                  'relative z-10 max-w-full truncate whitespace-nowrap text-[10px] font-medium transition-colors duration-200',
                  isActive ? 'text-white/90' : 'text-white/30 group-hover:text-white/45'
                )}
              >
                {item.label}
              </span>
              <span
                className={cn(
                  'mt-0.5 h-1 w-1 shrink-0 rounded-full',
                  isActive ? 'opacity-100' : 'opacity-0'
                )}
                style={
                  isActive
                    ? { background: 'linear-gradient(90deg, #ec4899, #f97316)' }
                    : undefined
                }
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
