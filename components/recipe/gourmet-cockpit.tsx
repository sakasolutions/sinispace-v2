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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGourmetDashboardData, type GourmetDashboardData } from '@/actions/gourmet-dashboard-actions';

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

/** App-Icon: Emoji auf weichem weißen Kreis, skaliert bei group-hover */
function AppIcon({ emoji }: { emoji: string }) {
  return (
    <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-white shadow-sm flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shrink-0">
      <span className="text-xl md:text-2xl leading-none" aria-hidden>{emoji}</span>
    </div>
  );
}

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

  const heroImageUrl = 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&q=85';

  return (
    <div className="relative w-full min-h-screen min-h-[100dvh] bg-orange-50/30" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
      {/* Hintergrund: Creme + Blobs (z-0), liegt unter dem Hero */}
      <div className="absolute inset-0 z-0 min-h-full overflow-hidden pointer-events-none bg-orange-50/30" aria-hidden>
        <div className="absolute top-0 left-0 w-[80vw] max-w-[500px] h-[400px] rounded-full bg-orange-400/30 blur-3xl -translate-x-1/4 -translate-y-1/4" aria-hidden />
        <div className="absolute bottom-0 right-0 w-[70vw] max-w-[450px] h-[350px] rounded-full bg-amber-300/30 blur-3xl translate-x-1/4 translate-y-1/4" aria-hidden />
      </div>

      {/* Hero Header (Dashboard-Stil): Full Width, absolute, rounded-b-[50px], Bild + Gradient, über Creme */}
      <div
        className="absolute top-0 left-0 w-full h-[420px] md:h-[500px] z-[1] rounded-b-[50px] overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImageUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/90 to-amber-600/80" aria-hidden />
      </div>

      {/* Header Content: Titel, Icons, Hero-Text, CTA (weiß auf Orange) */}
      <div className="relative z-10 pt-[80px] md:pt-20 px-4 sm:px-6 text-white">
        {/* Top Row: Gourmet Planer + Info + Suche (Glas-Optik) */}
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">Gourmet Planer</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Info"
              onClick={() => setInfoOpen(true)}
              className="w-8 h-8 rounded-full border border-white/40 flex items-center justify-center text-white hover:bg-white/20 transition-colors shrink-0"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Suchen"
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center border border-white/40 text-white hover:bg-white/30 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Text + CTA (im Header, unter dem Titel) */}
        <div className="mt-10 max-w-xl">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-white" />
            </div>
          ) : hasMealToday && data?.nextMeal ? (
            <>
              <h2 className="text-2xl font-semibold">Was kochen wir heute?</h2>
              <p className="text-orange-100 mt-1">Geplant: {data.nextMeal.title}</p>
              <button
                type="button"
                onClick={() =>
                  data.nextMeal?.resultId &&
                  router.push(`/tools/recipe?open=${encodeURIComponent(data.nextMeal.resultId)}`)
                }
                className="w-full py-4 rounded-xl mt-6 bg-white text-orange-600 font-bold shadow-lg shadow-orange-900/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <ChefHat className="w-5 h-5" />
                Jetzt kochen
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold">Was kochen wir heute?</h2>
              <p className="text-orange-100 mt-1">Lass dich inspirieren.</p>
              <button
                type="button"
                onClick={onVorschlagGenerieren}
                className="w-full py-4 rounded-xl mt-6 bg-white text-orange-600 font-bold shadow-lg shadow-orange-900/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5 text-orange-600" />
                Vorschlag generieren
              </button>
            </>
          )}
        </div>
      </div>

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

      {/* Grid: Overlap-Effekt (ragt in den Header), z-20, Image+Overlay-Karten */}
      <div className="relative z-20 px-4 sm:px-6 -mt-16 mb-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 grid-rows-2 gap-3 md:gap-4 items-stretch h-[240px] md:h-[260px]">
          <button
            type="button"
            onClick={onWochePlanen}
            className="group flex flex-col items-start gap-2 md:gap-3 p-3 md:p-6 rounded-[24px] md:rounded-[32px] h-full min-h-0 relative overflow-hidden text-left bg-cover bg-center transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg hover:shadow-orange-500/15 cursor-pointer border border-white/20 shadow-md"
            style={{ backgroundImage: `url(${heroImageUrl})` }}
          >
            <div className="absolute inset-0 z-0 opacity-90 bg-gradient-to-br from-orange-600 to-amber-600" aria-hidden />
            <div className="relative z-10 flex flex-col items-start gap-2 md:gap-3 h-full w-full">
              <AppIcon emoji="📅" />
              <span className="font-semibold text-sm md:text-lg text-white">Woche planen</span>
              <span className="text-sm text-white/90 hidden md:block">Dein Essensplan</span>
              {data != null && (
                <span className="text-xs text-white/80 mt-auto absolute bottom-3 right-3 md:bottom-4 md:right-4">
                  {data.plannedDays}/7
                </span>
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={onMeineGerichte}
            className="group flex flex-col items-start gap-2 md:gap-3 p-3 md:p-6 rounded-[24px] md:rounded-[32px] h-full min-h-0 relative overflow-hidden text-left bg-cover bg-center transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg hover:shadow-amber-500/15 cursor-pointer border border-white/20 shadow-md"
            style={{ backgroundImage: `url(${heroImageUrl})` }}
          >
            <div className="absolute inset-0 z-0 opacity-90 bg-gradient-to-br from-amber-600 to-yellow-600" aria-hidden />
            <div className="relative z-10 flex flex-col items-start gap-2 md:gap-3 h-full w-full">
              <AppIcon emoji="📖" />
              <span className="font-semibold text-sm md:text-lg text-white">Sammlung</span>
              <span className="text-sm text-white/90 hidden md:block">Deine Favoriten</span>
              {data != null && (
                <span className="text-xs text-white/80 mt-auto absolute bottom-3 right-3 md:bottom-4 md:right-4">
                  {data.recipeCount} Rezepte
                </span>
              )}
            </div>
          </button>

          {/* Karte 3: Heute */}
          <div
            className="group flex flex-col items-start gap-2 md:gap-3 p-3 md:p-6 rounded-[24px] md:rounded-[32px] h-full min-h-0 relative overflow-hidden text-left bg-cover bg-center transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg hover:shadow-rose-500/15 cursor-default border border-white/20 shadow-md"
            style={{ backgroundImage: `url(${heroImageUrl})` }}
          >
            <div className="absolute inset-0 z-0 opacity-90 bg-gradient-to-br from-rose-600 to-red-600" aria-hidden />
            <div className="relative z-10 flex flex-col items-start gap-2 md:gap-3 h-full w-full">
              <AppIcon emoji="🍝" />
              <span className="font-semibold text-sm md:text-lg text-white">Heute</span>
              {loading ? (
                <span className="text-sm text-white/90">…</span>
              ) : hasMealToday && data?.nextMeal ? (
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{data.nextMeal.title}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-white/90 font-medium">
                    {formatMealLabel(data.nextMeal.date)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-white/90">Noch nichts geplant</p>
              )}
            </div>
          </div>

          {/* Karte 4: Einkauf */}
          <Link
            href="/tools/shopping-list"
            className="group flex flex-col items-start gap-2 md:gap-3 p-3 md:p-6 rounded-[24px] md:rounded-[32px] h-full min-h-0 relative overflow-hidden text-left bg-cover bg-center transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg hover:shadow-emerald-500/15 cursor-pointer border border-white/20 shadow-md"
            style={{ backgroundImage: `url(${heroImageUrl})` }}
          >
            <div className="absolute inset-0 z-0 opacity-90 bg-gradient-to-br from-emerald-600 to-teal-600" aria-hidden />
            <div className="relative z-10 flex flex-col items-start gap-2 md:gap-3 h-full w-full">
              <AppIcon emoji="🛒" />
              <span className="font-semibold text-sm md:text-lg text-white">Einkaufsliste</span>
              {data == null ? (
                <span className="text-sm text-white/90">…</span>
              ) : data.shoppingCount > 0 ? (
                <p className="text-sm font-medium text-white">
                  {data.shoppingCount} {data.shoppingCount === 1 ? 'Zutat fehlt' : 'Zutaten fehlen'}
                </p>
              ) : (
                <p className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" />
                  Alles da
                </p>
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Restlicher Content: Abstand nach Grid, Footer-Gap */}
      <div className="relative z-10 pb-32">

      {/* Footer: Zuletzt angesehen */}
      {data && data.recentRecipes.length > 0 && (
        <div className="px-4 sm:px-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Zuletzt angesehen</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1">
            {data.recentRecipes.map((r) => (
              <Link
                key={r.id}
                href={`/tools/recipe?open=${encodeURIComponent(r.id)}`}
                className="flex-shrink-0 w-[160px] rounded-xl overflow-hidden group"
              >
                <div className="bg-white/60 dark:bg-white/20 backdrop-blur-xl rounded-[32px] p-3 mb-2 border border-white/80 dark:border-white/30 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-900/40 dark:to-rose-900/40 flex items-center justify-center shrink-0 shadow-inner">
                      <ChefHat className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {r.recipeName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">— kcal</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="h-12" />
      </div>
    </div>
  );
}
