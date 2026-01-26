'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signOutAction } from '@/actions/auth-actions';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { HeroBackground } from '@/components/ui/hero-background';
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
  
  // Prüfe ob wir auf einer /chat Route sind
  const isChatRoute = pathname?.startsWith('/chat') ?? false;

  // Wenn Chat-Route: Nur children rendern (Chat-Layout übernimmt)
  if (isChatRoute) {
    return <>{children}</>;
  }

  // Sonst: Normales Layout mit Sidebar und Header
  return (
    <div className="flex h-[100dvh] bg-white overflow-x-hidden relative" style={{
      minHeight: '100dvh',
      height: '100%',
    }}>
      {/* PREMIUM: Hero Background mit Radial Gradient & Floating Elements */}
      <HeroBackground showGlows={true} />
      
      {/* PREMIUM: Fine Grain Texture für Premium Feel */}
      <div 
        className="fixed inset-0 pointer-events-none -z-10 opacity-[0.15]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
          mixBlendMode: 'overlay'
        }}
      />
      
      {/* SIDEBAR (Desktop) - Glassmorphism Modern Redesign */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-white/80 backdrop-blur-xl md:block z-10 shadow-xl">
        <div className="flex h-16 items-center border-b border-gray-200/50 px-6">
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
          <NavItem href="/chat" label="SiniChat" pathname={pathname} />
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

      {/* MAIN CONTENT */}
      <main className="flex-1 md:ml-64 flex flex-col h-full overflow-x-hidden">
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
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden pb-24 md:pb-0 pt-[max(0.5rem,env(safe-area-inset-top))] md:pt-0" 
          data-scroll-container
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            overscrollBehavior: 'contain',
            paddingBottom: 'max(6rem, calc(6rem + env(safe-area-inset-bottom)))',
          } as React.CSSProperties}
        >
          <div className="min-h-full [&>*[data-no-padding]]:h-full [&>*:not([data-no-padding])]:p-3 [&>*:not([data-no-padding])]:sm:p-4 [&>*:not([data-no-padding])]:md:p-6 [&>*:not([data-no-padding])]:lg:p-8">
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

// Hilfskomponente für Desktop Links - Logo Gradient Integration
function NavItem({ href, label, pathname }: { href: string; label: string; pathname: string | null }) {
  const isActive = pathname === href;
  return (
    <Link
      href={href}
      onClick={() => triggerHaptic('light')}
      className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 ${
        isActive
          ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md shadow-orange-500/20'
          : 'text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-pink-50 hover:text-gray-900'
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

