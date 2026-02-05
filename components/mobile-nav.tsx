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
      className="fixed bottom-6 left-6 right-6 z-[100] block md:hidden max-w-md mx-auto pb-[env(safe-area-inset-bottom)]"
    >
      {/* Premium floating tab bar — frosted glass container */}
      <div
        className="relative w-full rounded-[28px] py-2 px-3 flex items-center justify-center gap-2 sm:gap-3 min-h-[56px]"
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          WebkitBackdropFilter: 'blur(20px)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
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
              className={cn(
                'group flex items-center justify-center gap-2 rounded-full',
                'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
                isActive
                  ? 'px-5 py-3 rounded-[20px] hover:scale-[1.05] active:scale-[0.98]'
                  : 'p-3 hover:scale-110 hover:bg-violet-500/10 active:scale-95'
              )}
              style={
                isActive
                  ? {
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #C084FC 100%)',
                      boxShadow: '0 0 20px rgba(139, 92, 246, 0.4), 0 0 40px rgba(139, 92, 246, 0.2), 0 4px 12px rgba(139, 92, 246, 0.3)',
                      color: 'white',
                    }
                  : undefined
              }
            >
              <Icon
                className={cn(
                  'w-6 h-6 shrink-0 transition-colors duration-300',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-violet-500'
                )}
                strokeWidth={2}
              />
              {isActive && (
                <span className="font-semibold text-sm text-white whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
