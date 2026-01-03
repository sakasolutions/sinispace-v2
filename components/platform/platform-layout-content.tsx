'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOutAction } from '@/actions/auth-actions';

interface PlatformLayoutContentProps {
  children: React.ReactNode;
}

export function PlatformLayoutContent({ children }: PlatformLayoutContentProps) {
  const pathname = usePathname();
  
  // Prüfe ob wir auf einer /chat Route sind
  const isChatRoute = pathname?.startsWith('/chat') ?? false;

  // Wenn Chat-Route: Nur children rendern (Chat-Layout übernimmt)
  if (isChatRoute) {
    return <>{children}</>;
  }

  // Sonst: Normales Layout mit Sidebar und Header
  return (
    <div className="flex h-[100dvh] bg-zinc-50 overflow-hidden">
      {/* SIDEBAR (Desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-zinc-200 bg-white md:block">
        <div className="flex h-16 items-center border-b border-zinc-100 px-6">
          <span className="text-lg font-bold tracking-tight text-zinc-900">
            Sinispace
          </span>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          <NavItem href="/dashboard" label="Übersicht" />
          <NavItem href="/chat" label="Freier Chat" />
          <div className="my-4 h-px bg-zinc-100" />
          <NavItem href="/settings" label="Einstellungen" />
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <form action={signOutAction}>
            <button 
              type="submit"
              className="w-full rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Abmelden
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 flex flex-col h-full overflow-hidden">
        {/* Mobile Header (nur sichtbar auf Handy) */}
        <header className="flex h-16 shrink-0 items-center border-b border-zinc-200 bg-white px-4 md:hidden">
          <span className="font-bold">Sinispace</span>
        </header>
        
        {/* Children Container: Chat-Seite nutzt h-full direkt, andere Seiten bekommen Padding */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full [&>*]:h-full [&>*:not([data-no-padding])]:p-4 [&>*:not([data-no-padding])]:md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

// Hilfskomponente für Links
function NavItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
    >
      {label}
    </Link>
  );
}

