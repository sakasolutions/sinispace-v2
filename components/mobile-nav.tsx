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
          'shadow-[0_8px_30px_rgba(0,0,0,0.1)]'
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
                <span
                  className="flex items-center justify-center"
                  style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.6))' } : undefined}
                >
                  <Icon
                    className={cn(
                      'w-6 h-6 shrink-0 transition-colors duration-300',
                      isActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                    strokeWidth={2}
                  />
                </span>
                {isActive && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-violet-600 mb-1 mt-0.5"
                    aria-hidden
                  />
                )}
              </span>
              <span
                className={cn(
                  'text-[10px] transition-colors duration-300 whitespace-nowrap truncate w-full text-center',
                  isActive ? 'text-violet-600 font-medium' : 'text-gray-400 group-hover:text-gray-500'
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
