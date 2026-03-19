'use client';

import Link from 'next/link';
import { Sparkles, CalendarDays, BookHeart, ShoppingBasket, Clock, Flame } from 'lucide-react';
import { DashboardShell } from '@/components/platform/dashboard-shell';

/** Einfacher Glasmorphismus – stabil, keine dynamischen Daten */
const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.16)',
  border: '1px solid rgba(255,255,255,0.22)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.08), 0 16px 48px -12px rgba(0,0,0,0.06)',
  WebkitBackdropFilter: 'blur(8px)',
  backdropFilter: 'blur(8px)',
};

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

const cardClass =
  'group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 p-5 cursor-pointer active:scale-[0.98] text-left block w-full';

export function GourmetCockpit(props: GourmetCockpitProps) {
  const { onVorschlagGenerieren, onMagicWunsch, onWochePlanen, activeWeekPlan = null, todayMealSpotlight = null, onAktiveWocheAnsehen } = props;
  const activeMealImageUrl =
    todayMealSpotlight?.imageUrl && String(todayMealSpotlight.imageUrl).trim().length > 0
      ? String(todayMealSpotlight.imageUrl).trim()
      : null;

  return (
    <div className="min-h-screen w-full relative overflow-x-visible bg-white">
      <DashboardShell
        headerVariant="withCTA"
        headerBackground={
          <div className="relative w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url(/gourmet-header.webp)' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-800/60 to-gray-900/60 z-0" aria-hidden />
          </div>
        }
        title={
          <>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight mt-0 text-white" style={{ letterSpacing: '-0.3px' }}>
              CookIQ
            </h1>
            <p className="text-xl sm:text-2xl font-semibold text-white mt-2" style={{ letterSpacing: '0.1px' }}>
              Was kochen wir heute?
            </p>
          </>
        }
        subtitle={null}
        headerPrimaryCTA={
          <div className="mt-4 md:hidden">
            <button
              type="button"
              onClick={onVorschlagGenerieren}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-900/30 hover:from-orange-600 hover:to-amber-600 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Vorschlag generieren
            </button>
          </div>
        }
        headerActionsRight={
          <button
            type="button"
            onClick={onVorschlagGenerieren}
            className="hidden md:inline-flex items-center gap-2 rounded-xl px-5 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-900/30 hover:from-orange-600 hover:to-amber-600 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Vorschlag generieren
          </button>
        }
      >
        <div className="space-y-6 md:space-y-8">
          <section aria-labelledby="gourmet-quick-heading">
            <h2 id="gourmet-quick-heading" className="sr-only">Schnellzugriff</h2>
            <div className="grid grid-cols-2 gap-4 md:gap-4 md:max-w-3xl md:mx-auto">
              <button
                type="button"
                onClick={() => onWochePlanen?.()}
                className={cardClass}
                style={CARD_STYLE}
              >
                <div className="flex w-full justify-between items-start gap-2">
                  <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg shadow-orange-500/30">
                    <CalendarDays className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                </div>
                <div className="w-full text-left">
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Woche planen</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Dein Essensplan</p>
                </div>
              </button>

              <Link href="/tools/recipe?tab=my-recipes" className={cardClass} style={CARD_STYLE}>
                <div className="flex w-full justify-between items-start gap-2">
                  <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-400 to-pink-500 shadow-lg shadow-orange-500/30">
                    <BookHeart className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                </div>
                <div className="w-full text-left">
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Sammlung</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Deine Favoriten</p>
                </div>
              </Link>

              <button
                type="button"
                onClick={onMagicWunsch}
                className={cardClass}
                style={CARD_STYLE}
              >
                <div className="flex w-full justify-between items-start gap-2">
                  <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
                    <Sparkles className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                </div>
                <div className="w-full text-left">
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Wunschgericht</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Tippe, worauf du Lust hast</p>
                </div>
              </button>

              <Link href="/tools/shopping-list" className={cardClass} style={CARD_STYLE}>
                <div className="flex w-full justify-between items-start gap-2">
                  <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-600 to-rose-500 shadow-lg shadow-orange-600/30">
                    <ShoppingBasket className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                </div>
                <div className="w-full text-left">
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">SmartCart</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Einkäufe organisieren</p>
                </div>
              </Link>
            </div>

            {/* Das Full-Width MVP-Cockpit für den aktiven Wochenplan */}
            {activeWeekPlan && Array.isArray(activeWeekPlan) && activeWeekPlan.length > 0 && onAktiveWocheAnsehen && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => onAktiveWocheAnsehen()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAktiveWocheAnsehen(); } }}
                className="w-full mt-6 relative overflow-hidden rounded-[2rem] min-h-[200px] md:min-h-[228px] text-white shadow-xl shadow-black/25 mb-6 group cursor-pointer transition-transform hover:-translate-y-1"
              >
                {/* Mahlzeiten-Bild (heute/nächstes Gericht) oder dezenter Farb-Fallback */}
                {activeMealImageUrl ? (
                  <img
                    src={activeMealImageUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700 ease-out pointer-events-none select-none"
                    aria-hidden
                  />
                ) : (
                  <div className={`absolute inset-0 ${ACTIVE_WEEK_FALLBACK_BG_CLASS}`} aria-hidden />
                )}
                {/* Lesbarkeit: dunkler Verlauf von unten für weißen Text */}
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent pointer-events-none"
                  aria-hidden
                />

                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 p-6 min-h-[200px] md:min-h-[228px]">
                  {/* Linke Seite: Infos zum aktuellen Tag/Gericht */}
                  <div className="flex-1 min-w-0 flex flex-col justify-end">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className="bg-white/25 backdrop-blur-md px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest border border-white/20 text-white">
                        Aktive Woche
                      </span>
                      {todayMealSpotlight ? (
                        <span className="text-white/90 text-xs sm:text-sm font-medium drop-shadow-sm">
                          {todayMealSpotlight.isTomorrow ? 'Morgen' : todayMealSpotlight.dayLabel} · {todayMealSpotlight.mealTypeLabel}
                        </span>
                      ) : (
                        <span className="text-white/90 text-xs sm:text-sm font-medium">Diese Woche geplant</span>
                      )}
                    </div>

                    {todayMealSpotlight ? (
                      <>
                        <h2 className="font-extrabold text-2xl md:text-3xl mb-3 tracking-tight leading-snug text-white drop-shadow-md line-clamp-2">
                          {todayMealSpotlight.title}
                        </h2>
                        {(todayMealSpotlight.displayTime || todayMealSpotlight.displayCalories) ? (
                          <div className="flex flex-wrap items-center gap-2">
                            {todayMealSpotlight.displayTime ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-xs font-semibold text-white">
                                <Clock className="w-3.5 h-3.5 shrink-0 opacity-90" aria-hidden />
                                {todayMealSpotlight.displayTime}
                              </span>
                            ) : null}
                            {todayMealSpotlight.displayCalories ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md border border-white/15 text-xs font-semibold text-white">
                                <Flame className="w-3.5 h-3.5 shrink-0 text-amber-300" aria-hidden />
                                {todayMealSpotlight.displayCalories}
                              </span>
                            ) : null}
                          </div>
                        ) : todayMealSpotlight.subtext ? (
                          <p className="text-white/85 text-sm font-medium line-clamp-2 drop-shadow-sm">
                            {todayMealSpotlight.subtext}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <h2 className="font-extrabold text-2xl md:text-3xl mb-2 tracking-tight leading-tight text-white drop-shadow-md">
                          Heute steht nichts auf dem Plan
                        </h2>
                        <p className="text-white/85 text-sm font-medium">
                          Klicke hier, um deine Woche zu sehen oder einen neuen Plan zu erstellen.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Rechte Seite: Action-Buttons */}
                  <div className="flex gap-3 w-full md:w-auto shrink-0 md:pb-0">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onAktiveWocheAnsehen(); }}
                      className="flex-1 md:flex-none bg-white/20 backdrop-blur-md border border-white/30 text-white font-bold py-3.5 px-8 rounded-2xl shadow-lg shadow-black/15 hover:bg-white/30 hover:border-white/45 hover:scale-[1.02] transition-all text-sm flex items-center justify-center"
                    >
                      Jetzt kochen
                    </button>

                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onAktiveWocheAnsehen(); }}
                      className="flex-none bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white p-3.5 rounded-2xl transition-all flex items-center justify-center"
                      aria-label="Details ansehen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </DashboardShell>
    </div>
  );
}
