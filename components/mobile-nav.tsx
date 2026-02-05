'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Calendar, MessageSquare, Settings } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { cn } from '@/lib/utils';

const SPRING = 'cubic-bezier(0.68, -0.55, 0.27, 1.55)';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Home', icon: LayoutGrid, active: pathname === '/dashboard' },
    { href: '/calendar', label: 'Kalender', icon: Calendar, active: pathname === '/calendar' },
    { href: '/chat', label: 'SiniChat', icon: MessageSquare, active: pathname?.startsWith('/chat') ?? false },
    { href: '/settings', label: 'Profil', icon: Settings, active: pathname === '/settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full z-[100] block md:hidden overflow-visible">
      <div
        className="flex justify-evenly items-end w-full bg-white pt-6 pr-6 pl-6 gap-1"
        style={{
          borderRadius: '28px 28px 0 0',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.08)',
          paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
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
                'group flex flex-col items-center justify-end flex-1 min-w-0 max-w-[80px]',
                'transition-transform duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
                !isActive && 'hover:-translate-y-0.5 active:scale-95'
              )}
              style={{ transitionTimingFunction: SPRING }}
            >
              {isActive ? (
                <>
                  {/* Floating orb — 64px, radial gradient, 3D shadows */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center -translate-y-3 shrink-0 mb-1.5 transition-transform duration-300"
                    style={{
                      background: 'radial-gradient(circle at 50% 50%, #9333EA 0%, #A855F7 100%)',
                      boxShadow: '0 12px 24px rgba(147, 51, 234, 0.5), 0 4px 12px rgba(147, 51, 234, 0.3), 0 -2px 8px rgba(168, 85, 247, 0.2)',
                      transitionTimingFunction: SPRING,
                    }}
                  >
                    <Icon className="w-7 h-7 text-white shrink-0" strokeWidth={2} />
                  </div>
                  <span className="text-xs font-semibold text-gray-900 whitespace-nowrap truncate w-full text-center">
                    {item.label}
                  </span>
                </>
              ) : (
                <>
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 mb-1 transition-colors duration-200">
                    <Icon className="w-6 h-6 text-[#9CA3AF] group-hover:text-violet-400 shrink-0" strokeWidth={2} />
                  </div>
                  <span className="text-[12px] text-gray-500 opacity-50 whitespace-nowrap truncate w-full text-center">
                    {item.label}
                  </span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
