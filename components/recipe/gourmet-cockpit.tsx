'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChefHat,
  Loader2,
  Sparkles,
  Search,
  Check,
  HelpCircle,
  CalendarDays,
  BookHeart,
  Utensils,
  ShoppingBasket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGourmetDashboardData, type GourmetDashboardData } from '@/actions/gourmet-dashboard-actions';
import { PageTransition } from '@/components/ui/PageTransition';

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatMealLabel(dateStr: string): string {
  const today = getTodayStr();
  if (dateStr === today) {
    const h = new Date().getHours();
    if (h < 11) return 'Heute Früh';
    if (h < 15) return 'Heute Mittag';
    if (h < 18) return 'Heute Nachmittag';
    return 'Heute Abend';
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'short' });
}

/** Gleiche Glass-Karten-Styles wie Dashboard (1:1) */
const DASHBOARD_CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.16)',
  border: '1px solid rgba(255,255,255,0.22)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.08), 0 16px 48px -12px rgba(0,0,0,0.06)',
  WebkitBackdropFilter: 'blur(8px)',
  backdropFilter: 'blur(8px)',
};

type Props = {
  onVorschlagGenerieren: () => void;
  onWochePlanen: () => void;
  onMeineGerichte: () => void;
  onAICreator: () => void;
};

export function GourmetCockpit({
  onVorschlagGenerieren,
  onWochePlanen,
  onMeineGerichte,
  onAICreator,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState<GourmetDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    getGourmetDashboardData().then(setData).finally(() => setLoading(false));
  }, []);

  const today = getTodayStr();
  const hasMealToday = data?.nextMeal && data.nextMeal.date === today;

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-white">
      {/* Header: Höherer Bereich (420/460px), Button hat Platz; ohne .dashboard-header-pt */}
      <header
        className={cn(
          'relative z-[1] min-h-[420px] md:min-h-[460px]',
          'w-full max-w-[100vw] -mx-0 sm:-mx-4 md:w-[calc(100%+3rem)] md:-mx-6 lg:w-[calc(100%+4rem)] lg:-mx-8',
          '-mt-[max(0.5rem,env(safe-area-inset-top))] md:-mt-6 lg:-mt-8'
        )}
      >
        {/* Layer 0: Hintergrund – höher für Button-Luft (420/460px) */}
        <div
          className="absolute top-0 left-0 w-full h-[420px] md:h-[460px] z-0 overflow-hidden rounded-b-[40px] bg-cover bg-center"
          style={{ backgroundImage: 'url(/gourmet-header.webp)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-orange-900/50 to-amber-800/40 z-0" aria-hidden />
        </div>

        {/* Layer 1: Mobile First pt (Safe Area + 2rem), Desktop md:pt-24; kein .dashboard-header-pt */}
        <div className="pt-[max(5rem,calc(env(safe-area-inset-top)+2rem))] md:pt-24 relative z-10 w-full px-3 sm:px-6 md:px-8 pb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-2xl min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight mt-0 text-white" style={{ letterSpacing: '-0.3px' }}>
                Gourmet Planer
              </h1>
              <p className="text-xl sm:text-2xl font-semibold text-white mt-2" style={{ letterSpacing: '0.1px' }}>
                Was kochen wir heute?
              </p>
              <p className="text-sm sm:text-base mt-1 font-normal text-white/80" style={{ letterSpacing: '0.1px' }}>
                Lass dich inspirieren.
              </p>
              <button
                type="button"
                onClick={onVorschlagGenerieren}
                className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-900/30 hover:from-orange-600 hover:to-amber-600 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                Vorschlag generieren
              </button>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                aria-label="Info"
                onClick={() => setInfoOpen(true)}
                className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center text-white bg-white/20 hover:bg-white/30 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Suchen"
                className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center text-white bg-white/20 hover:bg-white/30 transition-colors"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Info-Modal */}
      {infoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setInfoOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl max-w-sm w-full shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Hier planst du deine Woche, verwaltest Rezepte und erstellst Einkaufslisten.
            </p>
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              className="mt-4 w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 transition-colors"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* Main: Grid -mt-20 schneidet unter dem Button; Header höher → Button frei sichtbar */}
      <PageTransition className="relative z-10 mx-auto max-w-7xl w-full px-3 sm:px-4 md:px-6 lg:px-8 pb-32 md:pb-32 -mt-20">
        <section className="mb-8 md:mb-10">
          <div className="grid grid-cols-2 gap-4 md:gap-4">
            {/* Karte 1: Woche planen */}
            <button
              type="button"
              onClick={onWochePlanen}
              className="group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 p-5 cursor-pointer active:scale-[0.98] text-left block w-full"
              style={DASHBOARD_CARD_STYLE}
            >
              <div className="absolute top-4 right-4">
                <span className="bg-gray-50/90 text-gray-700 text-[10px] uppercase font-semibold px-2 py-1 rounded shadow-sm" style={{ letterSpacing: '0.6px' }}>
                  {data != null ? `${data.plannedDays}/7` : '—'}
                </span>
              </div>
              <div className="flex w-full justify-between items-start gap-2">
                <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30">
                  <CalendarDays className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                </div>
              </div>
              <div className="w-full text-left">
                <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Woche planen</h3>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Dein Essensplan</p>
              </div>
            </button>

            {/* Karte 2: Sammlung */}
            <button
              type="button"
              onClick={onMeineGerichte}
              className="group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 p-5 cursor-pointer active:scale-[0.98] text-left block w-full"
              style={DASHBOARD_CARD_STYLE}
            >
              <div className="absolute top-4 right-4">
                <span className="bg-gray-50/90 text-gray-700 text-[10px] uppercase font-semibold px-2 py-1 rounded shadow-sm" style={{ letterSpacing: '0.6px' }}>
                  {data != null ? `${data.recipeCount} Rezepte` : '—'}
                </span>
              </div>
              <div className="flex w-full justify-between items-start gap-2">
                <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-400 to-pink-500 shadow-lg shadow-orange-500/30">
                  <BookHeart className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                </div>
              </div>
              <div className="w-full text-left">
                <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Sammlung</h3>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Deine Favoriten</p>
              </div>
            </button>

            {/* Karte 3: Heute */}
            <div
              className="group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden p-5 text-left w-full cursor-default"
              style={DASHBOARD_CARD_STYLE}
            >
              <div className="flex w-full justify-between items-start gap-2">
                <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
                  <Utensils className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                </div>
              </div>
              <div className="w-full text-left">
                <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Heute</h3>
                {loading ? (
                  <p className="text-sm text-gray-500 mt-0.5">…</p>
                ) : hasMealToday && data?.nextMeal ? (
                  <p className="text-sm text-gray-700 mt-0.5 line-clamp-1">{data.nextMeal.title}</p>
                ) : (
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Noch nichts geplant</p>
                )}
              </div>
            </div>

            {/* Karte 4: Einkaufsliste */}
            <Link
              href="/tools/shopping-list"
              className="group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 p-5 cursor-pointer active:scale-[0.98] text-left block w-full"
              style={DASHBOARD_CARD_STYLE}
            >
              <div className="absolute top-4 right-4">
                <span className="bg-gray-50/90 text-gray-700 text-[10px] uppercase font-semibold px-2 py-1 rounded shadow-sm" style={{ letterSpacing: '0.6px' }}>
                  {data != null ? (data.shoppingCount > 0 ? `${data.shoppingCount} offen` : 'Alles da') : '—'}
                </span>
              </div>
              <div className="flex w-full justify-between items-start gap-2">
                <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-400 to-pink-500 shadow-lg shadow-orange-500/30">
                  <ShoppingBasket className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                </div>
              </div>
              <div className="w-full text-left">
                <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Einkaufsliste</h3>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Smarte Listen</p>
              </div>
            </Link>
          </div>
        </section>

        {/* Zuletzt angesehen – wie Dashboard Sektion */}
        {data && data.recentRecipes.length > 0 && (
          <section className="mb-8 md:mb-10">
            <h2 className="text-sm font-bold text-gray-600 mb-4">Zuletzt angesehen</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1">
              {data.recentRecipes.map((r) => (
                <Link
                  key={r.id}
                  href={`/tools/recipe?open=${encodeURIComponent(r.id)}`}
                  className="flex-shrink-0 w-[160px] rounded-xl overflow-hidden"
                >
                  <div className="rounded-xl p-3 hover:opacity-90 transition-opacity" style={DASHBOARD_CARD_STYLE}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-500 to-amber-500 shadow-sm">
                        <ChefHat className="w-5 h-5 text-white" strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 truncate">{r.recipeName}</p>
                        <p className="text-xs text-gray-500">— kcal</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </PageTransition>
    </div>
  );
}
