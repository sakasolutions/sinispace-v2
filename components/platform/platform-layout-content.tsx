'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signOutAction } from '@/actions/auth-actions';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { AppBackground } from '@/components/ui/app-background';
import { MobileNav } from '@/components/mobile-nav';
import { AnalyticsTracker } from '@/components/platform/analytics-tracker';
import { triggerHaptic } from '@/lib/haptic-feedback';

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

  // Auto-Logout: TEMPORÄR DEAKTIVIERT
  // Problem: "Failed to find Server Action" Fehler nach Deployments verursacht Redirects/Flackern
  // TODO: Session-Polling reaktivieren wenn Server Action Cache-Problem gelöst ist
  // useEffect(() => {
  //   let intervalId: NodeJS.Timeout;
  //   let isChecking = false;
  //   let isTabVisible = true;
  //
  //   const handleVisibilityChange = () => {
  //     isTabVisible = !document.hidden;
  //     if (isTabVisible) {
  //       checkSession();
  //     }
  //   };
  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //
  //   const checkSession = async () => {
  //     if (isChecking) return;
  //     if (!isTabVisible) return;
  //     isChecking = true;
  //
  //     try {
  //       const response = await fetch('/api/auth/check-session', {
  //         method: 'GET',
  //         credentials: 'include',
  //         signal: AbortSignal.timeout(5000),
  //       });
  //
  //       if (!response.ok) {
  //         throw new Error('Session check failed');
  //       }
  //
  //       const data = await response.json();
  //
  //       if (!data.valid) {
  //         if (intervalId) {
  //           clearInterval(intervalId);
  //         }
  //         window.location.href = '/login';
  //       }
  //     } catch (error) {
  //       if (error instanceof Error && error.name !== 'AbortError') {
  //         console.error('Error checking session:', error);
  //       }
  //     } finally {
  //       isChecking = false;
  //     }
  //   };
  //
  //   const timeoutId = setTimeout(() => {
  //     checkSession();
  //     intervalId = setInterval(checkSession, 30000);
  //   }, 5000);
  //
  //   return () => {
  //     document.removeEventListener('visibilitychange', handleVisibilityChange);
  //     clearTimeout(timeoutId);
  //     if (intervalId) {
  //       clearInterval(intervalId);
  //     }
  //   };
  // }, []);
  
  // Chat-Route nutzt jetzt eigenes Layout mit Sidebar
  // Keine spezielle Behandlung mehr nötig

  // Sonst: Normales Layout mit Sidebar und Header
  return (
    <div className="flex h-[100dvh] overflow-x-hidden relative">
      {/* App Background: Warmverlauf + Ambient Brand Blobs (Variante 1+3) */}
      <AppBackground />
      {/* Globale Ambient-Blobs: Lila/Orange – unten auf Mobile aus, sonst orangener Streifen unter Nav */}
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-purple-400/20 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-orange-300/20 blur-[120px] hidden md:block" />
      </div>
      {/* Mobile: fester weißer Streifen unten (Safe-Area), deckt Rest ab */}
      <div className="fixed bottom-0 left-0 right-0 h-[env(safe-area-inset-bottom)] bg-white -z-[1] pointer-events-none md:hidden" aria-hidden />

      {/* SIDEBAR (Desktop) – Crystal Glass über dem Ambient */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 md:block z-20 bg-white/60 backdrop-blur-xl border-r border-white/40">
        <div className="flex h-16 items-center border-b border-white/40 px-6">
          <Link href="/dashboard" className="flex items-center group">
            <div className="relative h-10 w-10 rounded-xl overflow-hidden ring-2 ring-transparent group-hover:ring-orange-200 transition-all duration-300">
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
        <nav className="flex flex-col gap-1 p-4 pt-6">
          <NavItem href="/dashboard" label="Übersicht" pathname={pathname} />
          <NavItem href="/calendar" label="Kalender" pathname={pathname} />
          <NavItem href="/chat" label="SiniChat" pathname={pathname} isChat />
          <div className="my-4 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          <NavItem href="/settings" label="Einstellungen" pathname={pathname} />
        </nav>
        
        <div className="absolute bottom-4 left-4 right-4">
          <form action={signOutAction}>
            <button 
              type="submit"
              className="w-full rounded-lg border border-gray-200 bg-white/50 backdrop-blur-sm px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 hover:border-orange-200 hover:text-gray-900 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              Abmelden
            </button>
          </form>
        </div>
      </aside>

      {/* MAIN CONTENT – relative z-10 damit über HeroBackground (z-0), kein Schleier */}
      <main className="relative z-10 flex-1 md:ml-64 flex flex-col overflow-hidden" style={{ height: '100%', maxHeight: '100dvh', overflowY: 'hidden', overflowX: 'hidden' } as React.CSSProperties}>
        {/* Mobile Header - AUSGEBLENDET (ersetzt durch Bottom Nav) */}
        {/* <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 bg-zinc-950/50 backdrop-blur-xl px-4 md:hidden z-10">
          ...
        </header> */}

        {/* Mobile Navigation Overlay - AUSGEBLENDET (ersetzt durch Bottom Nav) */}
        {/* {isMobileMenuOpen && (
          ...
        )} */}
        
        {/* Children Container: Chat-Seite nutzt h-full direkt, andere Seiten bekommen Padding und können scrollen */}
        {/* MOBILE: More breathing room um bottom navigation + Safe Area */}
        {/* WICHTIG: data-no-padding Seiten (Chat) haben eigenen Scroll-Container, hier NICHT scrollbar! */}
        <div 
          className="flex-1 overflow-hidden [&>*[data-no-padding]]:h-full [&>*[data-no-padding]]:overflow-hidden [&>*:not([data-no-padding])]:overflow-y-auto [&>*:not([data-no-padding])]:overflow-x-hidden [&>*:not([data-no-padding])]:pb-32 [&>*:not([data-no-padding])]:md:pb-0 [&>*:not([data-no-padding])]:md:pt-0 [&>*:not([data-no-padding])]:scrollbar-hide" 
          data-scroll-container
          style={{
            minHeight: 0,
          } as React.CSSProperties}
        >
          <div className="h-full [&>*[data-no-padding]]:h-full [&>*:not([data-no-padding])]:min-h-full [&>*:not([data-no-padding])]:py-3 [&>*:not([data-no-padding])]:px-0 [&>*:not([data-no-padding])]:sm:p-4 [&>*:not([data-no-padding])]:md:p-6 [&>*:not([data-no-padding])]:lg:p-8 ">
            {children}
          </div>
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
      
      {/* Analytics Tracker */}
      <AnalyticsTracker />
    </div>
  );
}

// Hilfskomponente für Desktop Links – Active = Squircle/Gradient, Inactive = Kontrast auf Glas
function NavItem({ href, label, pathname, isChat }: { href: string; label: string; pathname: string | null; isChat?: boolean }) {
  const isActive = isChat ? (pathname?.startsWith('/chat') ?? false) : pathname === href;
  return (
    <Link
      href={href}
      onClick={() => triggerHaptic('light')}
      className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
        isActive
          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30'
          : 'text-gray-600 hover:text-violet-600'
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

