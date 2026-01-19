'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signOutAction } from '@/actions/auth-actions';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { HeroBackground } from '@/components/ui/hero-background';
import { MobileNav } from '@/components/mobile-nav';

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

  // Auto-Logout: Prüfe regelmäßig ob Session noch gültig ist
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let isChecking = false;

    const checkSession = async () => {
      // Verhindere parallele Checks
      if (isChecking) return;
      isChecking = true;

      try {
        const response = await fetch('/api/auth/check-session', {
          method: 'GET',
          credentials: 'include', // WICHTIG: Cookies mitsenden
        });

        if (!response.ok) {
          // Bei Fehlern: Session als ungültig behandeln
          throw new Error('Session check failed');
        }

        const data = await response.json();

        // Wenn Session ungültig → automatisch ausloggen
        if (!data.valid) {
          // Stoppe das Polling
          if (intervalId) {
            clearInterval(intervalId);
          }
          
          // Automatisch zur Login-Seite weiterleiten
          // Die Middleware erkennt die ungültige Session und löscht die Cookies automatisch
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // Bei Fehlern: Weiter prüfen (nicht sofort ausloggen)
      } finally {
        isChecking = false;
      }
    };

    // Erste Prüfung nach 2 Sekunden (gibt Zeit für initiales Laden)
    const timeoutId = setTimeout(() => {
      checkSession();
      // Dann alle 5 Sekunden prüfen
      intervalId = setInterval(checkSession, 5000);
    }, 2000);

    // Cleanup beim Unmount
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []); // Nur einmal beim Mount ausführen
  
  // Prüfe ob wir auf einer /chat Route sind
  const isChatRoute = pathname?.startsWith('/chat') ?? false;

  // Wenn Chat-Route: Nur children rendern (Chat-Layout übernimmt)
  if (isChatRoute) {
    return <>{children}</>;
  }

  // Sonst: Normales Layout mit Sidebar und Header
  return (
    <div className="flex h-[100dvh] bg-zinc-950 overflow-hidden relative">
      {/* Hero Background (Grid + Glows) */}
      <HeroBackground showGlows={true} />
      
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
          <NavItem href="/chat" label="SiniChat" pathname={pathname} />
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
        {/* Mobile Header - AUSGEBLENDET (ersetzt durch Bottom Nav) */}
        {/* <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl px-4 md:hidden z-10">
          ...
        </header> */}

        {/* Mobile Navigation Overlay - AUSGEBLENDET (ersetzt durch Bottom Nav) */}
        {/* {isMobileMenuOpen && (
          ...
        )} */}
        
        {/* Children Container: Chat-Seite nutzt h-full direkt, andere Seiten bekommen Padding und können scrollen */}
        {/* Mobile: Padding-bottom für Bottom Nav */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20 md:pb-0">
          <div className="min-h-full [&>*[data-no-padding]]:h-full [&>*:not([data-no-padding])]:p-3 [&>*:not([data-no-padding])]:sm:p-4 [&>*:not([data-no-padding])]:md:p-6 [&>*:not([data-no-padding])]:lg:p-8">
            {children}
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
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

