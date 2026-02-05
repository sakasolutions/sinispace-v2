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
      className="fixed left-1/2 z-50 w-[90%] max-w-[400px] -translate-x-1/2 block md:hidden"
      style={{ bottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      aria-label="Hauptnavigation"
    >
      <div
        className={cn(
          'flex justify-between items-end py-3 px-6 rounded-full h-auto',
          'bg-white/95 backdrop-blur-md border border-gray-100',
          'shadow-lg'
        )}
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
                'group flex flex-col items-center justify-end min-w-0 flex-1',
                'transition-colors duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
                'active:scale-95'
              )}
            >
              <span className="flex flex-col items-center justify-center">
                {isActive ? (
                  <span
                    className="bg-gradient-to-tr from-violet-600 to-fuchsia-500 bg-clip-text text-transparent inline-flex items-center justify-center [&_svg]:fill-current"
                    style={{
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    <Icon
                      className="w-6 h-6 shrink-0 fill-current stroke-[1.5]"
                      strokeWidth={1.5}
                      stroke="currentColor"
                    />
                  </span>
                ) : (
                  <Icon
                    className="w-6 h-6 shrink-0 text-gray-400 group-hover:text-gray-500 transition-colors duration-300"
                    strokeWidth={2}
                  />
                )}
              </span>
              <span
                className={cn(
                  'text-[10px] transition-colors duration-300 whitespace-nowrap truncate w-full text-center mt-1',
                  isActive ? 'text-gray-900 font-bold' : 'text-gray-400 group-hover:text-gray-500'
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
