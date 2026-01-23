'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, MessageSquare, Settings } from 'lucide-react';

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
      highlight: true, // Hervorgehoben!
    },
    {
      href: '/settings',
      label: 'Profil',
      icon: Settings,
      active: pathname === '/settings',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 block md:hidden bg-zinc-950/80 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.active;

          // SiniChat Button - Auf gleicher Höhe wie andere Buttons mit etwas Freiraum
          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 min-w-[60px] px-3 py-1"
              >
                <div className={`h-10 w-10 rounded-full ${
                  isActive 
                    ? 'bg-gradient-to-br from-teal-500 to-indigo-500 shadow-lg shadow-teal-500/30' 
                    : 'bg-gradient-to-br from-teal-500/60 to-indigo-500/60 shadow-lg shadow-teal-500/20'
                } flex items-center justify-center transition-all duration-300`}>
                  <Icon 
                    className={`h-5 w-5 text-white transition-all duration-300`} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                <span className={`text-[10px] font-medium ${
                  isActive ? 'text-teal-400' : 'text-zinc-500'
                } transition-colors duration-300`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          // Normale Buttons
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 min-w-[60px]"
            >
              <Icon 
                className={`w-5 h-5 ${
                  isActive ? 'text-white' : 'text-zinc-500'
                } transition-colors duration-300`} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={`text-[10px] font-medium ${
                isActive ? 'text-white' : 'text-zinc-500'
              } transition-colors duration-300`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
