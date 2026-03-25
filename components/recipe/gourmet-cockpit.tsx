'use client';

import Link from 'next/link';
import {
  Sparkles,
  CalendarDays,
  BookOpen,
  ShoppingCart,
  Clock,
  Flame,
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

const heroTitleShadow: React.CSSProperties = { textShadow: '0 2px 12px rgba(0,0,0,0.5)' };

/** Nahtloser Übergang zum Canvas #0f0914 (unten dunkel → oben klar). */
const HERO_BOTTOM_FADE_STYLE: React.CSSProperties = {
  background:
    'linear-gradient(to top, #0f0914 0%, #0f0914 5%, rgba(15, 9, 20, 0.85) 30%, rgba(15, 9, 20, 0.4) 60%, transparent 100%)',
};

const chipBaseClass =
  'flex shrink-0 cursor-pointer snap-start items-center gap-2.5 whitespace-nowrap rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 backdrop-blur-xl transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.07]';

const chipIconClass = 'h-[15px] w-[15px] shrink-0';

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
    <div className="relative min-h-screen w-full overflow-x-visible bg-transparent">
      <DashboardShell
        headerVariant="default"
        layer0HeightClass="h-[min(320px,44vh)] min-h-[260px]"
        headerMinHeightClass="min-h-[min(320px,44vh)]"
        headerBackground={
          <div className="relative h-full min-h-0 w-full overflow-hidden rounded-b-[40px]">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: 'url(/gourmet-header.webp)' }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={HERO_BOTTOM_FADE_STYLE}
              aria-hidden
            />
            <div className="relative z-10 flex h-full min-h-0 flex-col justify-end px-4 pb-6 pt-0 md:px-6 md:pb-8">
              <h1
                className="text-2xl font-bold tracking-tight text-white md:text-3xl"
                style={heroTitleShadow}
              >
                CookIQ
              </h1>
              <p className="mt-1 text-base text-white/80 md:text-lg">Was kochen wir heute?</p>
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

            {/* Horizontale Aktions-Leiste (5 Chips) */}
            <div
              className="-mt-5 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-4 scrollbar-hide md:-mt-6 md:flex-wrap md:items-center md:justify-center md:overflow-visible md:px-0"
              role="toolbar"
              aria-label="CookIQ Aktionen"
            >
              <button
                type="button"
                onClick={onVorschlagGenerieren}
                className="flex shrink-0 snap-start items-center gap-2.5 whitespace-nowrap rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 text-sm font-medium text-white transition-all duration-200 hover:from-orange-600 hover:to-amber-600"
              >
                <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                Vorschlag generieren
              </button>

              <button type="button" onClick={() => onWochePlanen?.()} className={chipBaseClass}>
                <CalendarDays className={`${chipIconClass} text-orange-400/70`} strokeWidth={1.75} aria-hidden />
                <span className="text-sm text-white/70">Woche planen</span>
              </button>

              <button type="button" onClick={() => onMagicWunsch?.()} className={chipBaseClass}>
                <Sparkles className={`${chipIconClass} text-amber-400/70`} strokeWidth={1.75} aria-hidden />
                <span className="text-sm text-white/70">Wunschgericht</span>
              </button>

              <Link href="/tools/recipe?tab=my-recipes" className={chipBaseClass}>
                <BookOpen className={`${chipIconClass} text-violet-400/70`} strokeWidth={1.75} aria-hidden />
                <span className="text-sm text-white/70">Sammlung</span>
              </Link>

              <Link href="/tools/shopping-list" className={chipBaseClass}>
                <ShoppingCart className={`${chipIconClass} text-pink-400/70`} strokeWidth={1.75} aria-hidden />
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
                className="group mt-5 w-full cursor-pointer overflow-hidden rounded-2xl shadow-xl shadow-black/25 transition-transform hover:-translate-y-0.5 md:mt-6"
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
                    className="flex flex-1 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] py-3 text-center text-sm font-medium text-white/80 transition hover:bg-white/[0.07]"
                  >
                    Jetzt kochen
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAktiveWocheAnsehen?.();
                    }}
                    className="flex shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-3 text-white/50 transition hover:bg-white/[0.07]"
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
