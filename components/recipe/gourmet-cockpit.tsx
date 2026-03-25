'use client';

import Link from 'next/link';
import { Sparkles, CalendarDays, BookHeart, ShoppingBasket, Clock, Flame } from 'lucide-react';
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

const quickCardClass =
  'group relative flex h-full min-h-[148px] w-full flex-col items-start rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 text-left shadow-none backdrop-blur-xl transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.05] active:scale-[0.98] md:min-h-[152px] md:p-6';

const heroTitleShadow: React.CSSProperties = { textShadow: '0 2px 12px rgba(0,0,0,0.5)' };

export function GourmetCockpit(props: GourmetCockpitProps) {
  const { onVorschlagGenerieren, onMagicWunsch, onWochePlanen, activeWeekPlan = null, todayMealSpotlight = null, onAktiveWocheAnsehen } = props;
  const activeMealImageUrl =
    todayMealSpotlight?.imageUrl && String(todayMealSpotlight.imageUrl).trim().length > 0
      ? String(todayMealSpotlight.imageUrl).trim()
      : null;

  return (
    <div className="relative min-h-screen w-full overflow-x-visible bg-transparent">
      <DashboardShell
        headerVariant="default"
        layer0HeightClass="h-[min(320px,44vh)] min-h-[260px]"
        headerMinHeightClass="min-h-[min(320px,44vh)]"
        headerBackground={
          <div className="relative h-full w-full overflow-hidden rounded-b-[40px]">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: 'url(/gourmet-header.webp)' }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[60%] bg-gradient-to-t from-[#0f0914] via-[#0f0914]/60 to-transparent"
              aria-hidden
            />
            <div className="relative z-10 flex h-full min-h-0 flex-col justify-end px-4 pb-6 pt-8 md:px-6 md:pb-8">
              <h1
                className="text-2xl font-bold tracking-tight text-white md:text-3xl"
                style={heroTitleShadow}
              >
                CookIQ
              </h1>
              <p className="mt-1 text-base text-white/80 md:text-lg">Was kochen wir heute?</p>
              <button
                type="button"
                onClick={onVorschlagGenerieren}
                className="mt-4 inline-flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-orange-900/30 transition-all hover:from-orange-600 hover:to-amber-600 sm:w-auto"
              >
                <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
                Vorschlag generieren
              </button>
            </div>
          </div>
        }
        title={null}
        subtitle={null}
      >
        <div className="mb-6 space-y-6 md:mb-8 md:space-y-8">
          <section aria-labelledby="gourmet-quick-heading">
            <h2 id="gourmet-quick-heading" className="sr-only">
              Schnellzugriff
            </h2>
            <div className="mt-0 grid grid-cols-2 gap-3 md:mx-auto md:mt-2 md:max-w-3xl md:gap-4">
              <button type="button" onClick={() => onWochePlanen?.()} className={`${quickCardClass} cursor-pointer gap-3`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/10 bg-orange-400/[0.08] md:h-11 md:w-11">
                  <CalendarDays className="h-5 w-5 shrink-0 text-orange-400/70 md:h-[22px] md:w-[22px]" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="w-full min-w-0 text-left">
                  <h3 className="line-clamp-2 text-base font-semibold leading-tight text-white/90">Woche planen</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-white/40">Dein Essensplan</p>
                </div>
              </button>

              <Link href="/tools/recipe?tab=my-recipes" className={`${quickCardClass} block cursor-pointer gap-3`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-400/[0.08] md:h-11 md:w-11">
                  <BookHeart className="h-5 w-5 shrink-0 text-violet-400/70 md:h-[22px] md:w-[22px]" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="w-full min-w-0 text-left">
                  <h3 className="line-clamp-2 text-base font-semibold leading-tight text-white/90">Sammlung</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-white/40">Deine Favoriten</p>
                </div>
              </Link>

              <button type="button" onClick={onMagicWunsch} className={`${quickCardClass} cursor-pointer gap-3`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/10 bg-amber-400/[0.08] md:h-11 md:w-11">
                  <Sparkles className="h-5 w-5 shrink-0 text-amber-400/70 md:h-[22px] md:w-[22px]" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="w-full min-w-0 text-left">
                  <h3 className="line-clamp-2 text-base font-semibold leading-tight text-white/90">Wunschgericht</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-white/40">Tippe, worauf du Lust hast</p>
                </div>
              </button>

              <Link href="/tools/shopping-list" className={`${quickCardClass} block cursor-pointer gap-3`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-pink-400/10 bg-pink-400/[0.08] md:h-11 md:w-11">
                  <ShoppingBasket className="h-5 w-5 shrink-0 text-pink-400/70 md:h-[22px] md:w-[22px]" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="w-full min-w-0 text-left">
                  <h3 className="line-clamp-2 text-base font-semibold leading-tight text-white/90">SmartCart</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-white/40">Einkäufe organisieren</p>
                </div>
              </Link>
            </div>

            {activeWeekPlan && Array.isArray(activeWeekPlan) && activeWeekPlan.length > 0 && onAktiveWocheAnsehen && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => onAktiveWocheAnsehen()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onAktiveWocheAnsehen();
                  }
                }}
                className="group relative mt-6 mb-6 w-full cursor-pointer overflow-hidden rounded-2xl shadow-xl shadow-black/25 transition-transform hover:-translate-y-0.5"
              >
                <div className="relative aspect-video w-full min-h-[200px] md:min-h-[240px] md:h-[240px]">
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
                          {todayMealSpotlight.isTomorrow ? 'Morgen' : todayMealSpotlight.dayLabel} · {todayMealSpotlight.mealTypeLabel}
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
                          {(todayMealSpotlight.displayTime || todayMealSpotlight.displayCalories) ? (
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
                            <p className="line-clamp-2 text-sm font-medium text-white/85 drop-shadow-sm">{todayMealSpotlight.subtext}</p>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <h2 className="text-lg font-semibold tracking-tight text-white drop-shadow-md md:text-xl">
                            Heute steht nichts auf dem Plan
                          </h2>
                          <p className="text-sm text-white/60">Klicke hier, um deine Woche zu sehen oder einen neuen Plan zu erstellen.</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 border-t border-white/[0.06] bg-transparent p-3 md:p-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAktiveWocheAnsehen();
                    }}
                    className="flex flex-1 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] py-3 text-center text-sm font-medium text-white/80 transition hover:bg-white/[0.1]"
                  >
                    Jetzt kochen
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAktiveWocheAnsehen();
                    }}
                    className="flex shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-3 text-white/50 transition hover:bg-white/[0.08]"
                    aria-label="Details ansehen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </DashboardShell>
    </div>
  );
}
