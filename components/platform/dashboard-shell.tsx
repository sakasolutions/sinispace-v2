'use client';

import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/ui/PageTransition';

export type DashboardHeaderVariant = 'default' | 'withCTA';

export type DashboardShellProps = {
  /** Header bottom padding: default = pb-6, withCTA = pb-12. No custom or pb-24. */
  headerVariant: DashboardHeaderVariant;
  /** Layer 0: background (gradient, image+overlay, or custom). Rendered inside canonical h-[280px] rounded-b-[40px] wrapper. */
  headerBackground: React.ReactNode;
  /** Main title (e.g. h1). */
  title: React.ReactNode;
  /** Subtitle (e.g. p below title). */
  subtitle: React.ReactNode;
  /** Optional content between subtitle and CTA (e.g. chips). */
  headerExtra?: React.ReactNode;
  /** Optional primary CTA in header (e.g. "Vorschlag generieren"). */
  headerPrimaryCTA?: React.ReactNode;
  /** Optional right-side actions (e.g. icon buttons). */
  headerActionsRight?: React.ReactNode;
  /** Content below the overlap. Overlap (-mt-20 + h-5 mb-4) is applied once inside the shell. */
  children: React.ReactNode;
};

const HEADER_WRAPPER_CLASS = cn(
  'relative z-[1] min-h-[280px]',
  'w-full max-w-[100vw] -mx-0 sm:-mx-4 md:w-[calc(100%+3rem)] md:-mx-6 lg:w-[calc(100%+4rem)] lg:-mx-8',
  '-mt-[max(0.5rem,env(safe-area-inset-top))] md:-mt-6 lg:-mt-8'
);

const LAYER0_WRAPPER_CLASS =
  'absolute top-0 left-0 w-full h-[280px] z-0 overflow-hidden rounded-b-[40px]';

/**
 * Canonical dashboard layout: header (safe-area, consistent padding, optional CTA/actions)
 * and main area with fixed overlap (-mt-20), then pt-9 so content/cards start at Main+36px (immer gleich weit in den Hero).
 * Use this so all dashboard-like pages share the same header height and overlap behavior.
 */
export function DashboardShell({
  headerVariant,
  headerBackground,
  title,
  subtitle,
  headerExtra,
  headerPrimaryCTA,
  headerActionsRight,
  children,
}: DashboardShellProps) {
  const layer1Pb = headerVariant === 'withCTA' ? 'pb-12' : 'pb-6';

  return (
    <>
      <header className={HEADER_WRAPPER_CLASS}>
        <div className={LAYER0_WRAPPER_CLASS} aria-hidden>
          {headerBackground}
        </div>
        <div
          className={cn(
            'dashboard-header-pt md:pt-12 relative z-10 w-full px-3 sm:px-6 md:px-8',
            layer1Pb
          )}
        >
          {headerActionsRight != null ? (
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-2xl min-w-0">
                {title}
                {subtitle}
                {headerExtra}
                {headerPrimaryCTA}
              </div>
              <div className="shrink-0">{headerActionsRight}</div>
            </div>
          ) : (
            <div className="max-w-2xl">
              {title}
              {subtitle}
              {headerExtra}
              {headerPrimaryCTA}
            </div>
          )}
        </div>
      </header>

      <PageTransition className="relative z-10 mx-auto max-w-7xl w-full px-3 sm:px-4 md:px-6 lg:px-8 pb-32 md:pb-32 -mt-20 pt-9">
        {children}
      </PageTransition>
    </>
  );
}
