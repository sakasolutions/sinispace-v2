'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { LayoutGrid, Calendar, MessageSquare, Settings } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { cn } from '@/lib/utils';

/** Day (06:00–18:00) = sunrise, Night (18:00–06:00) = night – gleiche Logik wie Dashboard-Header */
function getTimeOfDay(): 'sunrise' | 'night' {
  if (typeof window === 'undefined') return 'sunrise';
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? 'sunrise' : 'night';
}

export function MobileNav() {
  const pathname = usePathname();
  const [timeOfDay, setTimeOfDay] = useState<'sunrise' | 'night'>(() => getTimeOfDay());

  useEffect(() => {
    setTimeOfDay(getTimeOfDay());
    const interval = setInterval(() => setTimeOfDay(getTimeOfDay()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: LayoutGrid, active: pathname === '/dashboard' },
    { href: '/calendar', label: 'Kalender', icon: Calendar, active: pathname === '/calendar' },
    { href: '/chat', label: 'SiniChat', icon: MessageSquare, active: pathname?.startsWith('/chat') ?? false },
    { href: '/settings', label: 'Profil', icon: Settings, active: pathname === '/settings' },
  ];

  const isNight = timeOfDay === 'night';

  return (
    <nav
      className="fixed left-1/2 z-50 w-[90%] max-w-[400px] -translate-x-1/2 block md:hidden"
      style={{ bottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
      aria-label="Hauptnavigation"
    >
      <div
        className={cn(
          'flex justify-between items-center py-3 px-4 rounded-full h-auto transition-colors duration-500',
          isNight
            ? 'bg-slate-900/80 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]'
            : 'bg-white/90 border border-gray-200/50 shadow-[0_8px_30px_rgba(0,0,0,0.1)]'
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
              aria-label={item.label}
              className={cn(
                'group relative flex flex-1 flex-col items-center justify-center min-h-[52px] min-w-0 gap-0.5',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
                'active:scale-95 transition-transform'
              )}
            >
              {/* Active Pill (Wassertropfen) – Night: etwas mehr Glow */}
              {isActive && (
                <motion.div
                  layoutId="active-nav-pill"
                  className={cn(
                    'absolute inset-1 rounded-[20px] bg-gradient-to-tr from-violet-600 to-fuchsia-500 z-0',
                    isNight ? 'shadow-lg shadow-violet-500/50' : 'shadow-lg shadow-violet-500/40'
                  )}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  'relative z-10 w-6 h-6 shrink-0 transition-colors duration-300',
                  isActive ? 'text-white' : isNight ? 'text-white/50 group-hover:text-white/70' : 'text-gray-400 group-hover:text-gray-500'
                )}
                strokeWidth={2}
              />
              <span
                className={cn(
                  'relative z-10 text-[10px] font-medium transition-colors duration-300 whitespace-nowrap truncate max-w-full',
                  isActive ? 'text-white' : isNight ? 'text-white/50 group-hover:text-white/70' : 'text-gray-400 group-hover:text-gray-500'
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
