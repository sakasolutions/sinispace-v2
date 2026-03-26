'use client';

import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/ui/PageTransition';

export type DashboardHeaderVariant = 'default' | 'withCTA';

export type DashboardShellProps = {
  /** Header bottom padding: default = pb-6, withCTA = pb-12. No custom or pb-24. */
  headerVariant: DashboardHeaderVariant;
  /** Layer 0: background (gradient, image+overlay, or custom). Rendered inside rounded-b-[40px] wrapper; height via layer0HeightClass (default 280px). */
  headerBackground: React.ReactNode;
  /** Tailwind height classes for layer 0 (e.g. recipe hero ~35vh). Default: h-[280px]. */
  layer0HeightClass?: string;
  /** Border-radius classes for layer 0 wrapper. */
  layer0RoundedClass?: string;
  /** Mindesthöhe des Headers, damit ein hohes Layer-0 (z. B. Rezept-Hero) nicht abgeschnitten wird. Default: min-h-[280px]. */
  headerMinHeightClass?: string;
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
  /** Opt-in full-bleed mode: disables shell max-width + horizontal paddings. */
  disablePadding?: boolean;
  /** Content below the overlap. Overlap (-mt-20 + h-5 mb-4) is applied once inside the shell. */
  children: React.ReactNode;
};

const HEADER_WRAPPER_BASE = cn(
  'relative z-[1]',
  'w-full max-w-[100vw] -mx-0 sm:-mx-4 md:w-[calc(100%+3rem)] md:-mx-6 lg:w-[calc(100%+4rem)] lg:-mx-8',
  '-mt-[max(0.5rem,env(safe-area-inset-top))] md:-mt-6 lg:-mt-8'
);

const LAYER0_WRAPPER_BASE =
  'absolute top-0 left-0 w-full z-0 overflow-hidden';

/**
 * Canonical dashboard layout: header (safe-area, consistent padding, optional CTA/actions)
 * and main area with fixed overlap (-mt-20), then pt-9 so content/cards start at Main+36px (immer gleich weit in den Hero).
 * Use this so all dashboard-like pages share the same header height and overlap behavior.
 */
export function DashboardShell({
  headerVariant,
  headerBackground,
  layer0HeightClass = 'h-[280px]',
  layer0RoundedClass = 'rounded-b-[40px]',
  headerMinHeightClass = 'min-h-[280px]',
  title,
  subtitle,
  headerExtra,
  headerPrimaryCTA,
  headerActionsRight,
  disablePadding = false,
  children,
}: DashboardShellProps) {
  const layer1Pb = headerVariant === 'withCTA' ? 'pb-12' : 'pb-6';

  const hasTitleRow =
    title != null ||
    subtitle != null ||
    headerExtra != null ||
    headerPrimaryCTA != null ||
    headerActionsRight != null;

  return (
    <>
      <header className={cn(HEADER_WRAPPER_BASE, headerMinHeightClass)}>
        <div className={cn(LAYER0_WRAPPER_BASE, layer0HeightClass, layer0RoundedClass)} aria-hidden>
          {headerBackground}
        </div>
        {hasTitleRow ? (
          <div
            className={cn(
              'dashboard-header-pt relative z-10 w-full md:pt-12',
              layer1Pb
            )}
          >
            <div
              className={cn(
                'w-full',
                disablePadding ? '' : 'mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8'
              )}
            >
              {headerActionsRight != null ? (
                <div className="mx-auto flex max-w-3xl items-start justify-between gap-4">
                  <div className="min-w-0 max-w-2xl">
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
          </div>
        ) : null}
      </header>

      <PageTransition
        className={cn(
          'relative z-10 w-full pb-32 md:pb-32 -mt-20 pt-9',
          disablePadding ? '' : 'mx-auto max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8'
        )}
      >
        {children}
      </PageTransition>
    </>
  );
}
