'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
    <div className="flex h-[100dvh] bg-zinc-950 overflow-hidden relative">
      {/* AMBIENT GLOWS - Global für alle Seiten */}
      <div className="fixed -top-20 -left-20 w-[500px] h-[500px] bg-orange-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      <div className="fixed -bottom-20 -right-20 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full -z-10 pointer-events-none" />
      
      {/* SIDEBAR (Desktop) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/5 bg-zinc-950/50 backdrop-blur-xl md:block z-10">
        <div className="flex h-16 items-center border-b border-white/5 px-6">
          <Link href="/dashboard" className="flex items-center">
            <div className="relative h-10 w-10 rounded-xl overflow-hidden">
              <Image 
                src="/assets/logos/logo.webp" 
                alt="Sinispace" 
                fill 
                className="object-contain p-1" 
                priority 
              />
            </div>
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          <NavItem href="/dashboard" label="Übersicht" pathname={pathname} />
          <NavItem href="/chat" label="Freier Chat" pathname={pathname} />
          <div className="my-4 h-px bg-white/5" />
          <NavItem href="/settings" label="Einstellungen" pathname={pathname} />
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <form action={signOutAction}>
            <button 
              type="submit"
              className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
            >
              Abmelden
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 flex flex-col h-full overflow-hidden">
        {/* Mobile Header (nur sichtbar auf Handy) */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl px-4 md:hidden z-10">
          <Link href="/dashboard" className="flex items-center">
            <div className="relative h-8 w-8 rounded-lg overflow-hidden">
              <Image 
                src="/assets/logos/logo.webp" 
                alt="Sinispace" 
                fill 
                className="object-contain p-1" 
                priority 
              />
            </div>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md hover:bg-zinc-900 transition-colors"
            aria-label="Menü öffnen"
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5 text-zinc-400" />
            ) : (
              <Menu className="w-5 h-5 text-zinc-400" />
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
            <aside className="fixed inset-y-0 right-0 w-64 bg-zinc-950/50 backdrop-blur-xl border-l border-white/5 z-50 md:hidden transform transition-transform duration-300 ease-in-out">
              <div className="flex flex-col h-full">
                <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
                  <Link href="/dashboard" className="flex items-center">
                    <div className="relative h-8 w-8 rounded-lg overflow-hidden">
                      <Image 
                        src="/assets/logos/logo.webp" 
                        alt="Sinispace" 
                        fill 
                        className="object-contain p-1" 
                        priority 
                      />
                    </div>
                  </Link>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-md hover:bg-zinc-900 transition-colors"
                    aria-label="Menü schließen"
                  >
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
                <nav className="flex flex-col gap-1 p-4 flex-1">
                  <MobileNavItem href="/dashboard" label="Übersicht" pathname={pathname} onClick={() => setIsMobileMenuOpen(false)} />
                  <MobileNavItem href="/chat" label="Freier Chat" pathname={pathname} onClick={() => setIsMobileMenuOpen(false)} />
                  <div className="my-4 h-px bg-white/5" />
                  <MobileNavItem href="/settings" label="Einstellungen" pathname={pathname} onClick={() => setIsMobileMenuOpen(false)} />
                </nav>
                <div className="p-4 border-t border-white/5">
                  <form action={signOutAction}>
                    <button 
                      type="submit"
                      className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
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
          ? 'bg-zinc-900 text-white'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
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
          ? 'bg-zinc-900 text-white'
          : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}

