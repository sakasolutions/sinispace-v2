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
      <div
        className="flex justify-evenly items-center w-full py-4 px-6 gap-2"
        style={{
          background: 'rgba(255, 255, 255, 0.7)',
          WebkitBackdropFilter: 'blur(20px)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(168, 85, 247, 0.1)',
          borderRadius: '28px 28px 0 0',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => triggerHaptic('medium')}
              className={cn(
                'group flex flex-col items-center justify-center flex-1 min-w-0 max-w-[88px] py-2',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500'
              )}
            >
              <div className="flex flex-col items-center w-full">
                <Icon
                  className={cn(
                    'w-6 h-6 shrink-0 mb-1.5 transition-colors duration-200',
                    isActive ? 'text-[#9333EA]' : 'text-[#CBD5E1] group-hover:text-[#D8B4FE]'
                  )}
                  strokeWidth={2}
                />
                <span
                  className={cn(
                    'text-[14px] font-semibold whitespace-nowrap truncate max-w-full text-center transition-colors duration-200',
                    isActive ? 'text-[#9333EA]' : 'text-[#CBD5E1] group-hover:text-[#D8B4FE]'
                  )}
                >
                  {item.label}
                </span>
                {/* Neon underline — slides in from left (0.3s ease-out) */}
                <span
                  className="mt-1.5 h-[3px] rounded-[2px] origin-left transition-all duration-300 ease-out block min-w-0"
                  style={{
                    width: isActive ? '100%' : '0%',
                    background: 'linear-gradient(90deg, #A855F7, #EC4899)',
                    boxShadow: isActive ? '0 0 12px rgba(168, 85, 247, 0.8)' : '0 0 12px rgba(168, 85, 247, 0)',
                  }}
                  aria-hidden
                />
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
