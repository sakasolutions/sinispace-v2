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
      className="fixed bottom-0 left-0 right-0 z-[100] block md:hidden pb-[env(safe-area-inset-bottom)]"
    >
      {/* Sichtbare Navbar - höherer Kontrast für mobile Sichtbarkeit */}
      <div className="mx-auto max-w-md px-4 pb-2">
        <div 
          className="rounded-2xl bg-white/95 backdrop-blur-xl border border-gray-200/60 shadow-[0_-4px_24px_rgba(0,0,0,0.08),0_0_40px_rgba(249,115,22,0.12),0_0_80px_rgba(244,114,182,0.08)]"
          style={{ WebkitBackdropFilter: 'blur(20px)' }}
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
                  className="flex flex-col items-center justify-center gap-1 min-w-[60px] px-3 py-2 relative group"
                >
                  <div className="h-10 w-10 flex items-center justify-center transition-all duration-300 ease-out">
                    {isActive ? (
                      <Icon 
                        className="w-5 h-5 text-orange-500 drop-shadow-[0_2px_6px_rgba(249,115,22,0.4)] transition-all duration-300"
                        strokeWidth={2.5}
                      />
                    ) : (
                      <Icon 
                        className="w-5 h-5 text-slate-600 transition-all duration-300 group-hover:text-slate-700"
                        strokeWidth={2}
                      />
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium transition-all duration-300',
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent font-semibold'
                      : 'text-slate-600 group-hover:text-slate-700'
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
