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

  return (
    <nav
      className="fixed bottom-6 left-6 right-6 z-[100] block md:hidden max-w-md mx-auto pb-[env(safe-area-inset-bottom)]"
    >
      {/* Colored Glass – lila Plexiglas über der App (transparent, Blur, Lichtkante) */}
      <div
        className={cn(
          'w-full rounded-full',
          'bg-violet-600/60 backdrop-blur-xl backdrop-saturate-150',
          'border border-white/20',
          'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2),0_10px_15px_-3px_rgba(76,29,149,0.3),0_4px_6px_-2px_rgba(76,29,149,0.2)]'
        )}
        style={{ WebkitBackdropFilter: 'blur(24px) saturate(150%)' }}
      >
        <div className="flex justify-evenly items-center h-14 px-2">
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
                      isActive ? 'rounded-full p-2 bg-white/20' : 'h-9 w-9'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-all duration-300',
                        isActive ? 'text-white' : 'text-white/80 group-hover:text-white'
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  {/* Weißer Punkt unter dem Icon bei aktivem Tab */}
                  {isActive && (
                    <span
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white"
                      aria-hidden
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium transition-all duration-300',
                    isActive ? 'text-white font-semibold' : 'text-white/80 group-hover:text-white'
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
