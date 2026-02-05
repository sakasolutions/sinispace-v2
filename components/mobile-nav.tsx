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
      {/* Docked bar — fluid pill morph */}
      <div
        className="flex justify-evenly items-center w-full bg-white pt-4 pr-6 pl-6 gap-2"
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
                'group flex items-center justify-center gap-2 shrink-0',
                'transition-all duration-500 ease-in-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500',
                isActive
                  ? 'rounded-[28px] py-4 px-7 hover:scale-[1.02] active:scale-[0.98]'
                  : 'w-12 h-12 rounded-full bg-[rgba(168,85,247,0.06)] hover:scale-110 hover:bg-[rgba(168,85,247,0.12)] active:scale-95'
              )}
              style={
                isActive
                  ? {
                      background: 'linear-gradient(135deg, #A855F7 0%, #C084FC 100%)',
                      boxShadow: '0 0 32px rgba(168, 85, 247, 0.6), 0 8px 24px rgba(168, 85, 247, 0.4)',
                      color: '#FFFFFF',
                    }
                  : undefined
              }
            >
              <Icon
                className={cn(
                  'w-6 h-6 shrink-0 transition-colors duration-300',
                  isActive ? 'text-white' : 'text-[#D8B4FE] group-hover:text-[#D8B4FE]'
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
