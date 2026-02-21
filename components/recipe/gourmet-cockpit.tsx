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

type Props = {
  onVorschlagGenerieren: () => void;
};

const cardClass =
  'group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 p-5 cursor-pointer active:scale-[0.98] text-left block w-full';

export function GourmetCockpit({ onVorschlagGenerieren }: Props) {
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
              <Link href="/tools/recipe?tab=week-planner" className={cardClass} style={CARD_STYLE}>
                <div className="flex w-full justify-between items-start gap-2">
                  <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30">
                    <CalendarDays className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                </div>
                <div className="w-full text-left">
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Woche planen</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Dein Essensplan</p>
                </div>
              </Link>

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

              <Link href="/tools/recipe" className={cardClass} style={CARD_STYLE}>
                <div className="flex w-full justify-between items-start gap-2">
                  <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
                    <Utensils className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                </div>
                <div className="w-full text-left">
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Heute</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Koch-Modus starten</p>
                </div>
              </Link>

              <Link href="/tools/shopping-list" className={cardClass} style={CARD_STYLE}>
                <div className="flex w-full justify-between items-start gap-2">
                  <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-600 to-rose-500 shadow-lg shadow-orange-600/30">
                    <ShoppingBasket className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                </div>
                <div className="w-full text-left">
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">SmartCart</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Intelligente Einkaufsplanung</p>
                </div>
              </Link>
            </div>
          </section>
        </div>
      </DashboardShell>
    </div>
  );
}
