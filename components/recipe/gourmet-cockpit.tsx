'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  BookHeart,
  Refrigerator,
  Zap,
  ChefHat,
  Loader2,
  Sparkles,
  Search,
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

/** Glossy Icon (Water Drop): Squircle + Gradient + Glanz + Shadow */
function GlossyIcon({
  icon: Icon,
  gradient,
}: {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
}) {
  return (
    <div className="relative w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center shadow-inner drop-shadow-md">
      <div className={cn('absolute inset-0', gradient)} aria-hidden />
      <div className="absolute top-0 left-0 w-full h-1/2 bg-white/30 rounded-t-2xl" aria-hidden />
      <Icon className="relative z-10 w-6 h-6 text-white" />
    </div>
  );
}

type Props = {
  onVorschlagGenerieren: () => void;
  onWochePlanen: () => void;
  onMeineGerichte: () => void;
  onAICreator: () => void;
  onResteZauber?: () => void;
  onTurboKueche?: () => void;
};

export function GourmetCockpit({
  onVorschlagGenerieren,
  onWochePlanen,
  onMeineGerichte,
  onAICreator,
  onResteZauber,
  onTurboKueche,
}: Props) {
  const router = useRouter();
  const [data, setData] = useState<GourmetDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGourmetDashboardData().then(setData).finally(() => setLoading(false));
  }, []);

  const today = getTodayStr();
  const hasMealToday = data?.nextMeal && data.nextMeal.date === today;

  return (
    <div className="w-full" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
      {/* Top Bar: Titel + Search */}
      <div className="flex items-center justify-between pt-16 px-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Gourmet Planer
        </h1>
        <button
          type="button"
          aria-label="Suchen"
          className="w-10 h-10 rounded-full bg-white/20 dark:bg-white/10 backdrop-blur flex items-center justify-center border border-white/30 dark:border-white/20 text-gray-700 dark:text-white/90 hover:bg-white/30 dark:hover:bg-white/20 transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* Smart Hero Card */}
      <div className="w-full px-4 sm:px-6 mb-6">
        <div className="w-full p-6 rounded-[32px] bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
          ) : hasMealToday && data?.nextMeal ? (
            /* Szenario B: Essen geplant – Bild links, Name rechts, Zeit-Badge */
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-900/40 dark:to-rose-900/40 flex items-center justify-center shrink-0 overflow-hidden">
                <ChefHat className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500 dark:text-orange-400" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 mb-2">
                  {formatMealLabel(data.nextMeal.date)}
                </span>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {data.nextMeal.title}
                </h2>
                {data.nextMeal.resultId && (
                  <button
                    type="button"
                    onClick={() =>
                      router.push(`/tools/recipe?open=${encodeURIComponent(data.nextMeal!.resultId!)}`)
                    }
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/30 transition-all"
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
                <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                  Was kochen wir heute?
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  Lass dich inspirieren.
                </p>
              </div>
              <button
                type="button"
                onClick={onVorschlagGenerieren}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/30 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                Vorschlag generieren
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2x2 Grid – direkt unter der Hero Card */}
      <div className="px-4 sm:px-6 mb-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onWochePlanen}
            className="group flex flex-col items-start gap-3 p-6 rounded-[32px] bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/10 relative overflow-hidden text-left hover:bg-white/50 dark:hover:bg-white/15 transition-colors"
          >
            <GlossyIcon icon={CalendarDays} gradient="bg-gradient-to-br from-violet-500 to-fuchsia-500" />
            <span className="font-semibold text-gray-900 dark:text-white">Woche planen</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Dein Essensplan</span>
            {data != null && (
              <span className="text-xs text-gray-500 dark:text-gray-500 absolute bottom-4 right-4">
                {data.plannedDays}/7 Tage
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onMeineGerichte}
            className="group flex flex-col items-start gap-3 p-6 rounded-[32px] bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/10 relative overflow-hidden text-left hover:bg-white/50 dark:hover:bg-white/15 transition-colors"
          >
            <GlossyIcon icon={BookHeart} gradient="bg-gradient-to-br from-rose-500 to-pink-500" />
            <span className="font-semibold text-gray-900 dark:text-white">Sammlung</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Deine Favoriten</span>
            {data != null && (
              <span className="text-xs text-gray-500 dark:text-gray-500 absolute bottom-4 right-4">
                {data.recipeCount} Rezepte
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onResteZauber ?? onVorschlagGenerieren}
            className="group flex flex-col items-start gap-3 p-6 rounded-[32px] bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/10 relative overflow-hidden text-left hover:bg-white/50 dark:hover:bg-white/15 transition-colors"
          >
            <GlossyIcon icon={Refrigerator} gradient="bg-gradient-to-br from-blue-500 to-cyan-500" />
            <span className="font-semibold text-gray-900 dark:text-white">Reste-Zauber</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Was ist im Kühlschrank?</span>
          </button>

          <button
            type="button"
            onClick={onTurboKueche ?? onVorschlagGenerieren}
            className="group flex flex-col items-start gap-3 p-6 rounded-[32px] bg-white/40 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/10 relative overflow-hidden text-left hover:bg-white/50 dark:hover:bg-white/15 transition-colors"
          >
            <GlossyIcon icon={Zap} gradient="bg-gradient-to-br from-amber-500 to-orange-500" />
            <span className="font-semibold text-gray-900 dark:text-white">Turbo-Küche</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Unter 20 Minuten</span>
          </button>
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
                <div className="bg-white/30 dark:bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-2 border border-white/40 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-900/40 dark:to-rose-900/40 flex items-center justify-center shrink-0 shadow-inner">
                      <ChefHat className="w-6 h-6 text-orange-500 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
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
  );
}
