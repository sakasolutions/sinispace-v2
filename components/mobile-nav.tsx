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
      className="fixed bottom-0 left-0 right-0 z-[100] block md:hidden px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
    >
      {/* Floating Dock – Kapsel über dem Inhalt */}
      <div
        className={cn(
          'mx-auto max-w-[90%] md:max-w-md rounded-[32px]',
          'bg-white/80 backdrop-blur-xl border border-white/40',
          'shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)]'
        )}
        style={{ WebkitBackdropFilter: 'blur(24px)' }}
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
                  <div className="h-9 w-9 flex items-center justify-center transition-all duration-300 ease-out">
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-all duration-300',
                        isActive ? 'text-violet-600' : 'text-slate-500 group-hover:text-slate-700'
                      )}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  {/* Leuchtender Punkt unter dem Icon bei aktivem Tab */}
                  {isActive && (
                    <span
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                      aria-hidden
                    />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-medium transition-all duration-300',
                    isActive ? 'text-violet-600 font-semibold' : 'text-slate-500 group-hover:text-slate-700'
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
