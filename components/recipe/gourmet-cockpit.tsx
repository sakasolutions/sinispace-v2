'use client';

import Link from 'next/link';
import {
  Sparkles,
  CalendarDays,
  BookOpen,
  ShoppingCart,
  Clock,
  Flame,
  ChevronRight,
} from 'lucide-react';
import { DashboardShell } from '@/components/platform/dashboard-shell';

/** Hintergrund, wenn kein Mahlzeiten-Bild (töniges Gradient, harmoniert mit CookIQ). */
const ACTIVE_WEEK_FALLBACK_BG_CLASS =
  'bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950';

/** Spotlight für die Full-Width-Karte: heutiges oder nächstes Gericht. */
export type TodayMealSpotlight = {
  dayLabel: string;
  mealTypeLabel: string;
  title: string;
  subtext: string;
  isTomorrow?: boolean;
  imageUrl?: string | null;
  displayTime?: string | null;
  displayCalories?: string | null;
};

export type GourmetCockpitProps = {
  onVorschlagGenerieren: () => void;
  onMagicWunsch?: () => void;
  onWochePlanen?: () => void;
  /** Für die Full-Width-Karte "Deine aktuelle Woche" (nur sichtbar wenn gesetzt). */
  activeWeekPlan?: unknown[] | null;
  /** Heutiges oder nächstes Gericht für Headline/Subtext (aus activeWeekPlan ermittelt). */
  todayMealSpotlight?: TodayMealSpotlight | null;
  /** Klick auf die aktive-Woche-Karte: öffnet active-view. */
  onAktiveWocheAnsehen?: () => void;
};

/** Nahtloser Übergang zum Canvas #0f0914 (unten stark ausgeblendet für Text + CTA). */
const HERO_BOTTOM_FADE_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(to top, #0f0914 0%, #0f0914 8%, rgba(15,9,20,0.9) 25%, rgba(15,9,20,0.5) 50%, rgba(15,9,20,0.15) 75%, transparent 100%)',
};

const compactCardClass =
  'col-span-1 flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3.5 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.05] md:col-span-1';

export function GourmetCockpit(props: GourmetCockpitProps) {
  const {
    onVorschlagGenerieren,
    onMagicWunsch,
    onWochePlanen,
    activeWeekPlan = null,
    todayMealSpotlight = null,
    onAktiveWocheAnsehen,
  } = props;

  const activeMealImageUrl =
    todayMealSpotlight?.imageUrl && String(todayMealSpotlight.imageUrl).trim().length > 0
      ? String(todayMealSpotlight.imageUrl).trim()
      : null;

  const hasActiveWeek = Boolean(
    activeWeekPlan &&
      Array.isArray(activeWeekPlan) &&
      activeWeekPlan.length > 0 &&
      onAktiveWocheAnsehen
  );

  return (
    <div className="relative w-full overflow-x-visible bg-transparent">
      <DashboardShell
        headerVariant="default"
        layer0HeightClass="h-[min(360px,48vh)] min-h-[280px]"
        headerMinHeightClass="min-h-[min(360px,48vh)]"
        headerBackground={
          <div className="relative h-full min-h-0 w-full overflow-hidden rounded-b-[40px] md:min-w-0 md:rounded-b-[28px] lg:rounded-b-[24px]">
            <div
              className="absolute inset-0 bg-cover bg-center md:bg-no-repeat"
              style={{ backgroundImage: 'url(/gourmet-header.webp)' }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={HERO_BOTTOM_FADE_STYLE}
              aria-hidden
            />
            <div className="relative z-10 flex h-full min-h-0 flex-col justify-end px-6 pb-20 pt-0 md:px-8 md:pb-24 lg:px-10 lg:pb-28">
              <h1
                className="text-2xl font-bold tracking-tight text-white md:text-3xl"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
              >
                CookIQ
              </h1>
              <p className="mt-1 text-sm text-white/70 md:text-base">Was kochen wir heute?</p>
              <button
                type="button"
                onClick={onVorschlagGenerieren}
                className="mt-4 flex w-fit items-center gap-2 rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-orange-500/20 transition-all hover:from-orange-600 hover:to-amber-600"
              >
                <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                Vorschlag generieren
              </button>
            </div>
          </div>
        }
        title={null}
        subtitle={null}
      >
        <div className="relative z-10 mb-6 md:mb-8">
          <section aria-labelledby="gourmet-actions-heading">
            <h2 id="gourmet-actions-heading" className="sr-only">
              Schnellaktionen
            </h2>

            {/* Asymmetrisches Grid: Woche planen prominent + 3 kompakte Aktionen */}
            <div
              className="-mt-3 grid grid-cols-2 gap-2.5 md:-mt-4 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:gap-3"
              role="toolbar"
              aria-label="CookIQ Aktionen"
            >
              <button
                type="button"
                onClick={() => onWochePlanen?.()}
                className="col-span-2 flex w-full cursor-pointer items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 backdrop-blur-xl transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06] md:col-span-1"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-orange-400/[0.12] bg-orange-400/[0.1]">
                  <CalendarDays className="h-[18px] w-[18px] text-orange-400/80" strokeWidth={1.75} aria-hidden />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-semibold text-white/90">Woche planen</p>
                  <p className="text-xs text-white/35">Dein Essensplan</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-white/20" aria-hidden />
              </button>

              <button type="button" onClick={() => onMagicWunsch?.()} className={`${compactCardClass} col-span-1`}>
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-amber-400/[0.08]">
                  <Sparkles className="h-4 w-4 text-amber-400/70" strokeWidth={1.75} aria-hidden />
                </div>
                <span className="text-sm text-white/70">Wunschgericht</span>
              </button>

              <Link href="/tools/recipe?tab=my-recipes" className={`${compactCardClass} col-span-1`}>
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-violet-400/[0.08]">
                  <BookOpen className="h-4 w-4 text-violet-400/70" strokeWidth={1.75} aria-hidden />
                </div>
                <span className="text-sm text-white/70">Sammlung</span>
              </Link>

              <Link href="/tools/shopping-list" className={`${compactCardClass} col-span-2 md:col-span-1`}>
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-pink-400/[0.08]">
                  <ShoppingCart className="h-4 w-4 text-pink-400/70" strokeWidth={1.75} aria-hidden />
                </div>
                <span className="text-sm text-white/70">SmartCart</span>
              </Link>
            </div>

            {/* Aktive Woche — Rezeptkarte */}
            {hasActiveWeek ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => onAktiveWocheAnsehen?.()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onAktiveWocheAnsehen?.();
                  }
                }}
                className="group mt-5 w-full cursor-pointer overflow-hidden rounded-2xl border border-white/[0.06] shadow-lg shadow-black/30 transition-transform hover:-translate-y-0.5 md:mt-6"
              >
                <div className="relative aspect-video w-full min-h-[200px] md:h-[240px] md:min-h-[240px]">
                  {activeMealImageUrl ? (
                    <img
                      src={activeMealImageUrl}
                      alt=""
                      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                      aria-hidden
                    />
                  ) : (
                    <div className={`absolute inset-0 ${ACTIVE_WEEK_FALLBACK_BG_CLASS}`} aria-hidden />
                  )}
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute inset-0 z-10 flex flex-col justify-between p-4 md:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-white/80 backdrop-blur-sm">
                        AKTIVE WOCHE
                      </span>
                      {todayMealSpotlight ? (
                        <span className="text-xs text-white/60">
                          {todayMealSpotlight.isTomorrow ? 'Morgen' : todayMealSpotlight.dayLabel} ·{' '}
                          {todayMealSpotlight.mealTypeLabel}
                        </span>
                      ) : (
                        <span className="text-xs text-white/60">Diese Woche geplant</span>
                      )}
                    </div>
                    <div className="mt-auto space-y-2">
                      {todayMealSpotlight ? (
                        <>
                          <h2 className="line-clamp-2 text-lg font-semibold tracking-tight text-white drop-shadow-md md:text-xl">
                            {todayMealSpotlight.title}
                          </h2>
                          {todayMealSpotlight.displayTime || todayMealSpotlight.displayCalories ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {todayMealSpotlight.displayTime ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                                  <Clock className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                                  {todayMealSpotlight.displayTime}
                                </span>
                              ) : null}
                              {todayMealSpotlight.displayCalories ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/35 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
                                  <Flame className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                                  {todayMealSpotlight.displayCalories}
                                </span>
                              ) : null}
                            </div>
                          ) : todayMealSpotlight.subtext ? (
                            <p className="line-clamp-2 text-sm font-medium text-white/85 drop-shadow-sm">
                              {todayMealSpotlight.subtext}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <h2 className="text-lg font-semibold tracking-tight text-white drop-shadow-md md:text-xl">
                            Heute steht nichts auf dem Plan
                          </h2>
                          <p className="text-sm text-white/60">
                            Klicke hier, um deine Woche zu sehen oder einen neuen Plan zu erstellen.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAktiveWocheAnsehen?.();
                    }}
                    className="flex flex-1 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] py-3 text-center text-sm font-medium text-white/70 transition hover:bg-white/[0.07]"
                  >
                    Jetzt kochen
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAktiveWocheAnsehen?.();
                    }}
                    className="flex shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-3 text-white/70 transition hover:bg-white/[0.07]"
                    aria-label="Details ansehen"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 md:mt-6">
                <h3 className="text-lg font-semibold text-white/80">Starte deinen Wochenplan</h3>
                <p className="mt-1 text-sm text-white/35">Plane deine Mahlzeiten für die Woche</p>
                <button
                  type="button"
                  onClick={() => onWochePlanen?.()}
                  className="mt-4 text-left text-sm text-white/30 transition-colors hover:text-white/50"
                >
                  Jetzt planen →
                </button>
              </div>
            )}
          </section>
        </div>
      </DashboardShell>
    </div>
  );
}
