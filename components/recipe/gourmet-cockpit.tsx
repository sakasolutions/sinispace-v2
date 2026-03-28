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
import { PageTransition } from '@/components/ui/PageTransition';

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

/**
 * CookIQ (GourmetCockpit): Tier-1 AI-Cockpit – dunkler Vault-Hero, Neon-Orb, Glass-Bento, Metrik-Karten.
 */
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
    <div className="w-full pb-32 md:pb-40">
      <PageTransition className="w-full">
        <div className="w-full">
          {/* Hero: AI Cockpit – subtile Foto-Textur, Tiefenschwarz, pulsierender Neon-Orb, CTA als Fokus */}
          <div className="relative mx-4 mt-4 h-[280px] max-w-5xl overflow-hidden rounded-[32px] border border-white/[0.08] shadow-2xl shadow-black/60 md:mx-auto md:h-[320px]">
            <img
              src="/gourmet-header.webp"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-[0.1]"
              aria-hidden
            />
            <div className="absolute inset-0 bg-black/90" aria-hidden />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage:
                  'linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div
                className="absolute -bottom-[20%] left-1/2 h-[min(140%,28rem)] w-[min(160%,36rem)] -translate-x-1/2 animate-cookiq-orb rounded-[50%] blur-2xl"
                style={{
                  background:
                    'radial-gradient(ellipse 55% 45% at 50% 75%, rgba(249,115,22,0.55) 0%, rgba(236,72,153,0.35) 32%, rgba(168,85,247,0.28) 52%, transparent 72%)',
                }}
              />
              <div
                className="absolute -bottom-[8%] left-1/2 h-[min(100%,22rem)] w-[min(120%,28rem)] -translate-x-1/2 animate-cookiq-orb-delay rounded-[50%] blur-xl"
                style={{
                  background:
                    'radial-gradient(ellipse 50% 40% at 50% 70%, rgba(249,115,22,0.4) 0%, rgba(236,72,153,0.22) 40%, rgba(168,85,247,0.18) 58%, transparent 75%)',
                }}
              />
              <div
                className="absolute inset-x-0 bottom-0 h-1/2 opacity-[0.12]"
                style={{
                  background:
                    'conic-gradient(from 200deg at 50% 100%, rgba(249,115,22,0.5), rgba(236,72,153,0.35), rgba(168,85,247,0.4), rgba(249,115,22,0.5))',
                }}
              />
            </div>
            <div className="relative z-20 flex h-full flex-col justify-end p-6 md:p-8">
              <h1 className="mb-2 text-3xl font-black tracking-tight text-white antialiased drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] md:text-5xl">
                CookIQ
              </h1>
              <p className="mb-8 text-sm font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)] md:text-base">
                Dein intelligenter KI-Küchenchef.
              </p>
              <div className="relative isolate">
                <div
                  className="pointer-events-none absolute inset-0 -m-3 rounded-2xl bg-gradient-to-t from-brand-orange/25 via-brand-pink/15 to-brand-purple/10 opacity-80 blur-xl"
                  aria-hidden
                />
                <button
                  type="button"
                  onClick={onVorschlagGenerieren}
                  className="relative z-10 inline-flex animate-glow-pulse items-center justify-center gap-2 rounded-xl border border-white/20 bg-brand-orange px-6 py-3.5 font-bold text-white shadow-[0_0_36px_rgba(249,115,22,0.45),0_0_72px_rgba(236,72,153,0.2)] ring-2 ring-brand-orange/50 transition-all hover:scale-[1.03] hover:shadow-[0_0_48px_rgba(249,115,22,0.55),0_0_96px_rgba(236,72,153,0.28)]"
                >
                  <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  Vorschlag generieren
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto mt-6 w-full max-w-5xl space-y-4 px-4 md:px-0">
            <section aria-labelledby="gourmet-actions-heading">
              <h2 id="gourmet-actions-heading" className="sr-only">
                Schnellaktionen
              </h2>

              <div role="toolbar" aria-label="CookIQ Aktionen" className="space-y-3 md:space-y-4">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <button
                    type="button"
                    onClick={() => onWochePlanen?.()}
                    className="flex h-[132px] cursor-pointer flex-col items-start justify-between rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 text-left shadow-lg shadow-black/30 backdrop-blur-xl transition-all hover:border-brand-orange/35 hover:bg-white/[0.06] md:h-[140px] md:p-5"
                  >
                    <div className="rounded-xl bg-brand-orange/15 p-2 text-brand-orange ring-1 ring-brand-orange/35">
                      <CalendarDays className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className="mt-auto flex w-full flex-col items-start">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                        Woche planen
                      </span>
                      <span className="mt-1 text-lg font-black leading-tight tracking-tight text-white md:text-xl">
                        3 von 7 Tagen geplant
                      </span>
                    </div>
                  </button>

                  <Link
                    href="/tools/shopping-list"
                    className="flex h-[132px] cursor-pointer flex-col items-start justify-between rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 text-left shadow-lg shadow-black/30 backdrop-blur-xl transition-all hover:border-brand-pink/40 hover:bg-white/[0.06] md:h-[140px] md:p-5"
                  >
                    <div className="rounded-xl bg-brand-pink/15 p-2 text-brand-pink ring-1 ring-brand-pink/40">
                      <ShoppingCart className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div className="mt-auto flex w-full flex-col items-start">
                      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                        SmartCart
                      </span>
                      <span className="mt-1 text-lg font-black leading-tight tracking-tight text-white md:text-xl">
                        5 Artikel offen
                      </span>
                    </div>
                  </Link>
                </div>

                <button
                  type="button"
                  onClick={() => onMagicWunsch?.()}
                  className="flex h-[132px] w-full cursor-pointer flex-col items-start justify-between rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 text-left shadow-lg shadow-black/30 backdrop-blur-xl transition-all hover:border-amber-400/45 hover:bg-white/[0.06] md:h-[140px] md:p-5"
                >
                  <div className="rounded-xl bg-amber-400/15 p-2 text-amber-400 ring-1 ring-amber-400/45">
                    <Sparkles className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="mt-auto flex w-full flex-col items-start">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                      Wunschgericht
                    </span>
                    <span className="mt-1 text-lg font-black leading-tight tracking-tight text-white md:text-xl">
                      KI-gesteuert
                    </span>
                  </div>
                </button>

                <Link
                  href="/tools/recipe?tab=my-recipes"
                  className="flex h-[132px] w-full cursor-pointer flex-col items-start justify-between rounded-[24px] border border-white/[0.08] bg-white/[0.03] p-4 text-left shadow-lg shadow-black/30 backdrop-blur-xl transition-all hover:border-brand-purple/40 hover:bg-white/[0.06] md:h-[140px] md:p-5"
                >
                  <div className="rounded-xl bg-brand-purple/15 p-2 text-brand-purple ring-1 ring-brand-purple/40">
                    <BookOpen className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div className="mt-auto flex w-full flex-col items-start">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                      Sammlung
                    </span>
                    <span className="mt-1 text-lg font-black leading-tight tracking-tight text-white md:text-xl">
                      124 Rezepte
                    </span>
                  </div>
                </Link>
              </div>

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
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-[88%] bg-gradient-to-t from-[#0F0914] via-[#0F0914]/95 to-transparent"
                      aria-hidden
                    />
                    <div
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/35 to-transparent"
                      aria-hidden
                    />
                    <div className="absolute left-0 right-0 top-0 z-10 flex flex-wrap items-center gap-2 p-6 md:p-8">
                      <span className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
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
                    <div className="absolute bottom-0 left-0 z-10 flex w-full flex-col justify-end p-6 md:p-8">
                      {todayMealSpotlight ? (
                        <>
                          <h2 className="mb-3 line-clamp-2 text-xl font-bold tracking-tight text-white drop-shadow-md md:text-2xl">
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
                          <h2 className="mb-3 text-xl font-bold tracking-tight text-white drop-shadow-md md:text-2xl">
                            Heute steht nichts auf dem Plan
                          </h2>
                          <p className="text-sm text-white/60">
                            Klicke hier, um deine Woche zu sehen oder einen neuen Plan zu erstellen.
                          </p>
                        </>
                      )}
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
        </div>
      </PageTransition>
    </div>
  );
}
