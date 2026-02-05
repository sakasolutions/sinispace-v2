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
    <nav className="fixed bottom-0 left-0 right-0 w-full z-[100] block md:hidden">
      {/* Docked bar — full width, rounded top only, shadow on top */}
      <div
        className="flex justify-evenly items-center w-full bg-white pt-4 pr-6 pl-6"
        style={{
          borderRadius: '24px 24px 0 0',
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
                'group flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] rounded-[16px]',
                'transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
                isActive
                  ? 'px-6 py-3.5 rounded-[20px] hover:scale-[1.02] active:scale-[0.98]'
                  : 'px-4 py-3.5 hover:scale-105 hover:bg-violet-500/[0.08] active:scale-95'
              )}
              style={
                isActive
                  ? {
                      background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                      boxShadow: '0 0 24px rgba(139, 92, 246, 0.5), 0 0 48px rgba(139, 92, 246, 0.25), 0 6px 16px rgba(139, 92, 246, 0.35)',
                      color: '#FFFFFF',
                      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }
                  : undefined
              }
            >
              <Icon
                className={cn(
                  'w-[22px] h-[22px] shrink-0 transition-colors duration-200',
                  isActive ? 'text-white' : 'text-gray-300 group-hover:text-gray-400'
                )}
                strokeWidth={2}
              />
              {isActive && (
                <span className="font-semibold text-base text-white whitespace-nowrap">
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
