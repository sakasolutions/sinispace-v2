'use client';

import Link from 'next/link';
import { Sparkles, CalendarDays, BookHeart, Utensils, ShoppingBasket } from 'lucide-react';
import { DashboardShell } from '@/components/platform/dashboard-shell';

/** Einfacher Glasmorphismus – stabil, keine dynamischen Daten */
const CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.16)',
  border: '1px solid rgba(255,255,255,0.22)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.08), 0 16px 48px -12px rgba(0,0,0,0.06)',
  WebkitBackdropFilter: 'blur(8px)',
  backdropFilter: 'blur(8px)',
};

export type GourmetCockpitProps = {
  onVorschlagGenerieren: () => void;
  onMagicWunsch?: () => void;
  onWochePlanen?: () => void;
  /** Für die Full-Width-Karte "Deine aktuelle Woche" (nur sichtbar wenn gesetzt). */
  activeWeekPlan?: unknown[] | null;
  /** Klick auf die aktive-Woche-Karte: öffnet active-view. */
  onAktiveWocheAnsehen?: () => void;
};

const cardClass =
  'group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 p-5 cursor-pointer active:scale-[0.98] text-left block w-full';

export function GourmetCockpit(props: GourmetCockpitProps) {
  const { onVorschlagGenerieren, onMagicWunsch, onWochePlanen, activeWeekPlan = null, onAktiveWocheAnsehen } = props;
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
                onClick={() => {
                  onWochePlanen?.();
                }}
                className="group relative overflow-hidden bg-white/60 backdrop-blur-xl border border-white/40 shadow-sm hover:shadow-md transition-all rounded-[2rem] p-6 text-left aspect-square flex flex-col items-start justify-end"
              >
                <div className="relative z-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 mb-4 transition-transform group-hover:scale-110 group-hover:rotate-3">
                    <CalendarDays className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-800 text-lg mb-1 tracking-tight leading-tight">Woche planen</h3>
                  <p className="text-gray-500 font-medium text-sm">Dein Essensplan</p>
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

            {/* MVP Cockpit: Aktiver Wochenplan (Full Width) */}
            {activeWeekPlan && Array.isArray(activeWeekPlan) && activeWeekPlan.length > 0 && onAktiveWocheAnsehen && (
              <button
                type="button"
                onClick={onAktiveWocheAnsehen}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-[2rem] p-6 text-left shadow-lg shadow-green-500/20 hover:shadow-xl hover:scale-[1.01] transition-all group relative overflow-hidden flex items-center justify-between md:max-w-3xl md:mx-auto"
              >
                <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-white/20 to-transparent skew-x-12 translate-x-10 group-hover:translate-x-20 transition-transform duration-700" aria-hidden />
                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                    <CalendarDays className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xl mb-1 tracking-tight">Deine aktuelle Woche</h3>
                    <p className="text-green-50 font-medium text-sm">
                      {activeWeekPlan.reduce((acc: number, day: { meals?: unknown[] }) => acc + (day.meals?.length ?? 0), 0)} Gerichte geplant • Klick zum Öffnen
                    </p>
                  </div>
                </div>
                <div className="relative z-10 bg-white/20 backdrop-blur-md rounded-full px-4 py-2 text-white font-bold text-sm border border-white/30 group-hover:bg-white group-hover:text-green-600 transition-colors">
                  Ansehen ›
                </div>
              </button>
            )}
          </section>
        </div>
      </DashboardShell>
    </div>
  );
}
