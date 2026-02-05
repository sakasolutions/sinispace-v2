'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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
          'flex justify-between items-end py-3 px-6 rounded-[32px] h-auto',
          'bg-white border border-gray-100',
          'shadow-[0_8px_30px_rgba(0,0,0,0.12)]'
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
              {/* Icon area: bubble when active, plain icon when inactive */}
              <span className="flex items-center justify-center w-10 h-10">
                {isActive ? (
                  <motion.span
                    layout
                    initial={false}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className={cn(
                      'rounded-full w-10 h-10 flex items-center justify-center',
                      'bg-gradient-to-br from-violet-500 to-fuchsia-500',
                      'shadow-md shadow-violet-500/20'
                    )}
                  >
                    <motion.span
                      initial={false}
                      animate={{ scale: 1.05 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <Icon className="w-5 h-5 text-white shrink-0" strokeWidth={2} />
                    </motion.span>
                  </motion.span>
                ) : (
                  <motion.span
                    layout
                    initial={false}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-center justify-center w-10 h-10 rounded-full group-hover:bg-gray-100/80 transition-colors duration-300"
                  >
                    <Icon
                      className={cn(
                        'w-6 h-6 shrink-0 transition-colors duration-300',
                        'text-gray-400 group-hover:text-gray-600'
                      )}
                      strokeWidth={2}
                    />
                  </motion.span>
                )}
              </span>
              <span
                className={cn(
                  'text-[10px] font-medium mt-1 transition-colors duration-300 whitespace-nowrap truncate w-full text-center',
                  isActive ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'
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
