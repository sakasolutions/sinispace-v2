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

  return (
    <div className="relative w-full min-h-screen" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
      {/* Hintergrund an Content gebunden (nicht fixed): geht bis ganz unten mit, kein Verziehen beim Scrollen */}
      <div className="absolute inset-0 z-0 min-h-full overflow-hidden pointer-events-none bg-orange-50/30" aria-hidden>
        <div className="absolute top-0 left-0 w-[80vw] max-w-[500px] h-[400px] rounded-full bg-orange-400/30 blur-3xl -translate-x-1/4 -translate-y-1/4" aria-hidden />
        <div className="absolute bottom-0 right-0 w-[70vw] max-w-[450px] h-[350px] rounded-full bg-amber-300/30 blur-3xl translate-x-1/4 translate-y-1/4" aria-hidden />
      </div>

      {/* Content über dem Hintergrund: Notch-Fix + Footer-Gap */}
      <div className="relative z-10 min-h-screen pt-[80px] md:pt-24 pb-32">
      {/* Top Bar: Titel + Info + Search */}
      <div className="flex items-center justify-between gap-3 px-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mt-1">
          Deine Küche
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Info"
            onClick={() => setInfoOpen(true)}
            className="w-8 h-8 rounded-full border border-gray-300/50 flex items-center justify-center text-gray-500 hover:bg-white/50 transition-colors shrink-0"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="Suchen"
            className="w-10 h-10 rounded-full bg-orange-50/50 backdrop-blur flex items-center justify-center border border-orange-200/50 text-orange-500 hover:bg-orange-50/70 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
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

      {/* Smart Hero Card – Tasty: Textur-Bild + Orange-Overlay */}
      <div className="w-full px-4 sm:px-6 mb-6">
        <div
          className="relative w-full p-6 rounded-[32px] overflow-hidden border border-white/80 dark:border-white/30 shadow-sm shadow-orange-500/5"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-orange-500/80 dark:bg-orange-600/85" aria-hidden />
          <div className="relative z-10">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            ) : hasMealToday && data?.nextMeal ? (
              /* Szenario B: Essen geplant */
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0 overflow-hidden border border-white/30">
                  <ChefHat className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-white/25 text-white border border-white/30 mb-2">
                    {formatMealLabel(data.nextMeal.date)}
                  </span>
                  <h2 className="text-lg font-bold text-white truncate">
                    {data.nextMeal.title}
                  </h2>
                  {data.nextMeal.resultId && (
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/tools/recipe?open=${encodeURIComponent(data.nextMeal!.resultId!)}`)
                      }
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-orange-600 font-semibold text-sm shadow-lg hover:bg-white/90 transition-all"
                    >
                      <ChefHat className="w-4 h-4" />
                      Jetzt kochen
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Szenario A: Nichts geplant */
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="font-bold text-lg text-white">
                    Was kochen wir heute?
                  </h2>
                  <p className="text-sm text-white/90 mt-0.5">
                    Lass dich inspirieren.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onVorschlagGenerieren}
                  className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white text-orange-600 font-semibold shadow-lg hover:bg-white/90 transition-all"
                >
                  <Sparkles className="w-5 h-5" />
                  Vorschlag generieren
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2x2 Grid – Mobile-kompakt, Desktop luftig; App-Icons mit Emojis */}
      <div className="px-4 sm:px-6 mb-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-3 md:gap-4">
          <button
            type="button"
            onClick={onWochePlanen}
            className="group flex flex-col items-start gap-2 md:gap-3 p-3 md:p-6 rounded-[24px] md:rounded-[32px] bg-white/70 dark:bg-white/25 backdrop-blur-xl border border-white dark:border-white/30 shadow-sm shadow-orange-500/5 transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer relative overflow-hidden text-left"
          >
            <AppIcon emoji="📅" />
            <span className="font-semibold text-sm md:text-lg text-gray-900 dark:text-white">Woche planen</span>
            <span className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">Dein Essensplan</span>
            {data != null && (
              <span className="text-xs text-gray-500 dark:text-gray-500 absolute bottom-3 right-3 md:bottom-4 md:right-4">
                {data.plannedDays}/7
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onMeineGerichte}
            className="group flex flex-col items-start gap-2 md:gap-3 p-3 md:p-6 rounded-[24px] md:rounded-[32px] bg-white/70 dark:bg-white/25 backdrop-blur-xl border border-white dark:border-white/30 shadow-sm shadow-orange-500/5 transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer relative overflow-hidden text-left"
          >
            <AppIcon emoji="📖" />
            <span className="font-semibold text-sm md:text-lg text-gray-900 dark:text-white">Sammlung</span>
            <span className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">Deine Favoriten</span>
            {data != null && (
              <span className="text-xs text-gray-500 dark:text-gray-500 absolute bottom-3 right-3 md:bottom-4 md:right-4">
                {data.recipeCount} Rezepte
              </span>
            )}
          </button>

          {/* Karte 3: Heute */}
          <div className="group flex flex-col items-start gap-2 md:gap-3 p-3 md:p-6 rounded-[24px] md:rounded-[32px] bg-white/70 dark:bg-white/25 backdrop-blur-xl border border-white dark:border-white/30 shadow-sm shadow-orange-500/5 transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg hover:shadow-orange-500/10 cursor-default relative overflow-hidden text-left">
            <AppIcon emoji="🍝" />
            <span className="font-semibold text-sm md:text-lg text-gray-900 dark:text-white">Heute</span>
            {loading ? (
              <span className="text-sm text-gray-500 dark:text-gray-500">…</span>
            ) : hasMealToday && data?.nextMeal ? (
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {data.nextMeal.title}
                </p>
                <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 font-medium">
                  {formatMealLabel(data.nextMeal.date)}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">Noch nichts geplant</p>
            )}
          </div>

          {/* Karte 4: Einkauf */}
          <Link
            href="/tools/shopping-list"
            className="group flex flex-col items-start gap-2 md:gap-3 p-3 md:p-6 rounded-[24px] md:rounded-[32px] bg-white/70 dark:bg-white/25 backdrop-blur-xl border border-white dark:border-white/30 shadow-sm shadow-orange-500/5 transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-lg hover:shadow-orange-500/10 cursor-pointer relative overflow-hidden text-left"
          >
            <AppIcon emoji="🛒" />
            <span className="font-semibold text-sm md:text-lg text-gray-900 dark:text-white">Einkaufsliste</span>
            {data == null ? (
              <span className="text-sm text-gray-500 dark:text-gray-500">…</span>
            ) : data.shoppingCount > 0 ? (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                {data.shoppingCount} {data.shoppingCount === 1 ? 'Zutat fehlt' : 'Zutaten fehlen'}
              </p>
            ) : (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4 shrink-0" />
                Alles da
              </p>
            )}
          </Link>
        </div>
      </div>

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
