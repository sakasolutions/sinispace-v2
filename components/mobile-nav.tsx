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
    <nav className="fixed bottom-0 left-0 right-0 z-50 block md:hidden px-4" style={{
      paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
    }}>
      {/* PREMIUM: Floating Navigation mit Glassmorphism */}
      <div className="mx-auto max-w-md mb-3">
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-[0_4px_12px_rgba(0,0,0,0.08),0_8px_24px_rgba(0,0,0,0.04)]">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.active;

              // SiniChat Button - Logo-Gradient für Brand Integration
              if (item.highlight) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => triggerHaptic('light')}
                    className="flex flex-col items-center justify-center gap-1 min-w-[60px] px-3 py-2 relative"
                  >
                    <div className={cn(
                      'h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300',
                      isActive 
                        ? 'bg-gradient-to-br from-orange-500 to-pink-500 shadow-lg shadow-orange-500/30 ring-2 ring-orange-200/50 scale-105' 
                        : 'bg-gradient-to-br from-orange-100 to-pink-100 shadow-sm'
                    )}>
                      <Icon 
                        className={cn(
                          'h-6 w-6 transition-all duration-300',
                          isActive ? 'text-white' : 'text-orange-600'
                        )} 
                        strokeWidth={isActive ? 2.5 : 2}
                      />
                    </div>
                    <span className={cn(
                      'text-[11px] font-medium transition-colors duration-300',
                      isActive ? 'text-orange-600 font-semibold' : 'text-gray-600'
                    )}>
                      {item.label}
                    </span>
                  </Link>
                );
              }

              // Normale Buttons - Clean Light Design
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => triggerHaptic('light')}
                  className="flex flex-col items-center justify-center gap-1 min-w-[60px] px-3 py-2 relative group"
                >
                  {/* Active Indicator - Logo Gradient */}
                  {isActive && (
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500" />
                  )}
                  
                  <div className={cn(
                    'h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300',
                    isActive 
                      ? 'bg-gradient-to-br from-orange-50 to-pink-50 ring-1 ring-orange-200/50' 
                      : 'bg-gray-50 group-hover:bg-gray-100'
                  )}>
                    <Icon 
                      className={cn(
                        'w-5 h-5 transition-colors duration-300',
                        isActive ? 'text-orange-600' : 'text-gray-500 group-hover:text-gray-700'
                      )} 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span className={cn(
                    'text-[11px] font-medium transition-colors duration-300',
                    isActive ? 'text-orange-600 font-semibold' : 'text-gray-600'
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
