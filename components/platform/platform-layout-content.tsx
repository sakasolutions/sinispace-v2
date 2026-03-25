'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { signOutAction } from '@/actions/auth-actions';
import { AnalyticsTracker } from '@/components/platform/analytics-tracker';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { cn } from '@/lib/utils';
import { AppBackground } from '@/components/ui/app-background';
import { MobileNav } from '@/components/mobile-nav';

interface PlatformLayoutContentProps {
  children: React.ReactNode;
}

export function PlatformLayoutContent({ children }: PlatformLayoutContentProps) {
  const pathname = usePathname();

  return (
    <div className="relative flex h-[100dvh] overflow-x-hidden">
      <AppBackground />
      <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
        <div className="absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-sini-purple/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 hidden h-[600px] w-[600px] rounded-full bg-sini-orange/15 blur-[120px] md:block" />
      </div>
      <div
        className="pointer-events-none fixed bottom-0 left-0 right-0 -z-[1] h-[env(safe-area-inset-bottom)] bg-canvas md:hidden"
        aria-hidden
      />

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-white/10 bg-white/5 backdrop-blur-xl md:block">
        <div className="flex h-16 items-center border-b border-white/10 px-6">
          <Link href="/dashboard" className="group flex items-center">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl ring-2 ring-transparent transition-all duration-300 group-hover:ring-white/20">
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
          <div className="my-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <NavItem href="/settings" label="Einstellungen" pathname={pathname} />
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:text-white"
            >
              Abmelden
            </button>
          </form>
        </div>
      </aside>

      <main
        className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas md:ml-64"
        style={
          {
            height: '100%',
            maxHeight: '100dvh',
            overflowY: 'hidden',
            overflowX: 'hidden',
          } as React.CSSProperties
        }
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-scroll-container>
          <div
            className={cn(
              'min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden bg-canvas pb-24 scrollbar-hide md:pb-6',
              'has-[>[data-no-padding]]:overflow-hidden',
              '[&>[data-no-padding]]:flex [&>[data-no-padding]]:h-full [&>[data-no-padding]]:min-h-0 [&>[data-no-padding]]:flex-1',
              '[&>*:not([data-no-padding])]:min-h-full [&>*:not([data-no-padding])]:px-0 [&>*:not([data-no-padding])]:py-3 [&>*:not([data-no-padding])]:sm:p-4 [&>*:not([data-no-padding])]:md:p-6 [&>*:not([data-no-padding])]:lg:p-8',
              '[&>*:not([data-header-full-bleed])]:overflow-x-hidden'
            )}
          >
            {children}
          </div>
        </div>
      </main>

      <MobileNav />

      <AnalyticsTracker />
    </div>
  );
}

function NavItem({
  href,
  label,
  pathname,
  isChat,
}: {
  href: string;
  label: string;
  pathname: string | null;
  isChat?: boolean;
}) {
  const isActive = isChat ? (pathname?.startsWith('/chat') ?? false) : pathname === href;
  return (
    <Link
      href={href}
      onClick={() => triggerHaptic('light')}
      className={cn(
        'relative block rounded-lg px-3 py-2.5 text-sm transition-all duration-300',
        isActive ? 'bg-white/10 pl-4 font-medium text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
      )}
    >
      {isActive && (
        <span
          className="absolute left-1 top-1/2 h-7 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-brand-pink to-brand-orange"
          aria-hidden
        />
      )}
      {label}
    </Link>
  );
}
