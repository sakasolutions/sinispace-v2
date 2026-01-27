'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, MessageSquare, Settings } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { cn } from '@/lib/utils';

export function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      label: 'Home',
      icon: LayoutGrid,
      active: pathname === '/dashboard',
    },
    {
      href: '/chat',
      label: 'SiniChat',
      icon: MessageSquare,
      active: pathname?.startsWith('/chat') ?? false,
      highlight: true, // Hervorgehoben mit Logo-Gradient!
    },
    {
      href: '/settings',
      label: 'Profil',
      icon: Settings,
      active: pathname === '/settings',
    },
  ];

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 block md:hidden"
      style={{
        paddingBottom: `max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom)))`,
        marginBottom: `max(0.75rem, calc(0.75rem + env(safe-area-inset-bottom)))`,
      }}
    >
      {/* Brand Gradient Glass – schwebende SiniSpace-Insel */}
      <div className="mx-auto max-w-md px-4">
        <div 
          className="rounded-2xl bg-gradient-to-r from-orange-500/85 to-pink-500/85 backdrop-blur-2xl backdrop-saturate-150 border border-white/20 shadow-[0_8px_32px_rgba(251,146,60,0.25)]"
          style={{ WebkitBackdropFilter: 'saturate(180%) blur(24px)' }}
        >
          <div className="flex justify-evenly items-center h-16 px-2" style={{
            paddingBottom: `max(0.5rem, env(safe-area-inset-bottom))`,
          }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.active;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => triggerHaptic('light')}
                  className="flex flex-col items-center justify-center gap-1 min-w-[60px] px-3 py-2 relative group"
                >
                  <div className="h-10 w-10 flex items-center justify-center transition-all duration-300 ease-out">
                    {isActive ? (
                      <Icon 
                        className="w-5 h-5 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.9)] transition-all duration-300"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Icon 
                        className="w-5 h-5 text-white/80 transition-all duration-300 group-hover:text-white"
                        strokeWidth={2}
                      />
                    )}
                  </div>
                  <span className={cn(
                    'text-[11px] font-medium transition-all duration-300 text-white',
                    isActive ? 'font-semibold drop-shadow-[0_0_4px_rgba(255,255,255,0.6)]' : 'text-white/80 group-hover:text-white'
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
