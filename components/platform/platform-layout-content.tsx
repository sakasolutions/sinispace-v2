'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { signOutAction } from '@/actions/auth-actions';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

interface PlatformLayoutContentProps {
  children: React.ReactNode;
}

export function PlatformLayoutContent({ children }: PlatformLayoutContentProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Mobile-Menü automatisch schließen wenn Route wechselt
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);
  
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
          <NavItem href="/dashboard" label="Übersicht" pathname={pathname} />
          <NavItem href="/chat" label="Freier Chat" pathname={pathname} />
          <div className="my-4 h-px bg-zinc-100" />
          <NavItem href="/settings" label="Einstellungen" pathname={pathname} />
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
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 md:hidden">
          <span className="font-bold text-zinc-900">Sinispace</span>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md hover:bg-zinc-100 transition-colors"
            aria-label="Menü öffnen"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-zinc-600" />
            ) : (
              <Menu className="w-5 h-5 text-zinc-600" />
            )}
          </button>
        </header>

        {/* Mobile Navigation Overlay */}
        {isMobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside className="fixed inset-y-0 right-0 w-64 bg-white border-l border-zinc-200 z-50 md:hidden transform transition-transform duration-300 ease-in-out">
              <div className="flex flex-col h-full">
                <div className="flex h-16 items-center justify-between border-b border-zinc-100 px-4">
                  <span className="text-lg font-bold text-zinc-900">Menü</span>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-md hover:bg-zinc-100 transition-colors"
                    aria-label="Menü schließen"
                  >
                    <X className="w-5 h-5 text-zinc-600" />
                  </button>
                </div>
                <nav className="flex flex-col gap-1 p-4 flex-1">
                  <MobileNavItem href="/dashboard" label="Übersicht" pathname={pathname} onClick={() => setIsMobileMenuOpen(false)} />
                  <MobileNavItem href="/chat" label="Freier Chat" pathname={pathname} onClick={() => setIsMobileMenuOpen(false)} />
                  <div className="my-4 h-px bg-zinc-100" />
                  <MobileNavItem href="/settings" label="Einstellungen" pathname={pathname} onClick={() => setIsMobileMenuOpen(false)} />
                </nav>
                <div className="p-4 border-t border-zinc-100">
                  <form action={signOutAction}>
                    <button 
                      type="submit"
                      className="w-full rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                    >
                      Abmelden
                    </button>
                  </form>
                </div>
              </div>
            </aside>
          </>
        )}
        
        {/* Children Container: Chat-Seite nutzt h-full direkt, andere Seiten bekommen Padding und können scrollen */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="min-h-full [&>*[data-no-padding]]:h-full [&>*:not([data-no-padding])]:p-4 [&>*:not([data-no-padding])]:md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

// Hilfskomponente für Desktop Links
function NavItem({ href, label, pathname }: { href: string; label: string; pathname: string | null }) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-zinc-100 text-zinc-900'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      {label}
    </Link>
  );
}

// Hilfskomponente für Mobile Links
function MobileNavItem({ href, label, pathname, onClick }: { href: string; label: string; pathname: string | null; onClick: () => void }) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-zinc-100 text-zinc-900'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
      }`}
    >
      {label}
    </Link>
  );
}

