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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getGourmetDashboardData, type GourmetDashboardData } from '@/actions/gourmet-dashboard-actions';

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'Guten Morgen';
  if (hour >= 11 && hour < 18) return 'Guten Tag';
  if (hour >= 18 && hour < 22) return 'Guten Abend';
  return 'Gute Nacht';
}

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

/** Day (06:00–18:00) = sunrise, Night (18:00–06:00) = night – Sync mit Main-Dashboard */
function getTimeOfDay(): 'sunrise' | 'night' {
  if (typeof window === 'undefined') return 'sunrise';
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? 'sunrise' : 'night';
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
  const [displayName, setDisplayName] = useState('');
  const [data, setData] = useState<GourmetDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState<'sunrise' | 'night'>(() => getTimeOfDay());

  useEffect(() => {
    Promise.all([
      fetch('/api/user/display-name').then((r) => r.json()),
      getGourmetDashboardData(),
    ]).then(([nameRes, dashboardData]) => {
      if (nameRes?.displayName) setDisplayName(nameRes.displayName);
      setData(dashboardData);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    setTimeOfDay(getTimeOfDay());
    const interval = setInterval(() => setTimeOfDay(getTimeOfDay()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const greeting = getTimeBasedGreeting();
  const today = getTodayStr();
  const hasMealToday = data?.nextMeal && data.nextMeal.date === today;
  const isNight = timeOfDay === 'night';

  return (
    <div className="relative -mx-4 sm:-mx-6 md:-mx-8" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
      {/* 1. Day/Night Header – fixe h-[400px], nur Farbe wechselt */}
      <header className="relative z-[1] h-[400px] w-[calc(100%+2rem)] sm:w-[calc(100%+3rem)] md:w-[calc(100%+4rem)] -mx-4 sm:-mx-6 md:-mx-8 -mt-4">
        <div
          className={cn(
            'absolute top-0 left-0 w-full h-[400px] rounded-b-[50px] z-0 overflow-hidden transition-all duration-1000',
            isNight
              ? 'bg-gradient-to-b from-slate-900 via-[#1e1b4b] to-slate-900 backdrop-blur-xl border-b border-white/5'
              : 'bg-gradient-to-br from-orange-200 via-rose-200 to-violet-200'
          )}
          aria-hidden
        >
          {isNight ? (
            <>
              <div className="absolute top-0 left-0 w-[80%] h-[300px] rounded-full bg-blue-500/20 blur-[100px] pointer-events-none" aria-hidden />
              <div className="absolute bottom-0 right-0 w-[60%] h-[300px] rounded-full bg-violet-500/20 blur-[100px] pointer-events-none" aria-hidden />
            </>
          ) : (
            <>
              <div className="absolute top-0 left-0 w-[80%] h-[300px] rounded-full bg-orange-200/60 blur-[100px] pointer-events-none" aria-hidden />
              <div className="absolute bottom-0 right-0 w-[60%] h-[300px] rounded-full bg-purple-200/60 blur-[100px] pointer-events-none" aria-hidden />
            </>
          )}
        </div>

        {/* Hero Content – Greeting + Meal Card oder Inspire Me */}
        <div className="relative z-10 h-[400px] pt-[max(5rem,calc(4rem+env(safe-area-inset-top)))] px-4 sm:px-6 md:px-8 flex flex-col">
          <p className={cn('text-sm font-medium mb-2', isNight ? 'text-white/90' : 'text-gray-700')}>
            {greeting}{displayName ? `, ${displayName}` : ''}
          </p>
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <Loader2 className={cn('w-8 h-8 animate-spin', isNight ? 'text-violet-400' : 'text-orange-500')} />
            </div>
          ) : hasMealToday && data?.nextMeal ? (
            /* Heute geplant: große Meal Card im Header */
            <div className="flex-1 flex flex-col justify-between max-w-lg">
              <div>
                <p className={cn('text-sm font-medium mb-1', isNight ? 'text-white/80' : 'text-gray-600')}>
                  {formatMealLabel(data.nextMeal.date)}
                </p>
                <h2 className={cn('text-xl sm:text-2xl font-bold tracking-tight', isNight ? 'text-white' : 'text-gray-900')}>
                  {data.nextMeal.title}
                </h2>
              </div>
              {data.nextMeal.resultId && (
                <button
                  type="button"
                  onClick={() => router.push(`/tools/recipe?open=${encodeURIComponent(data.nextMeal!.resultId!)}`)}
                  className="w-fit inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white font-semibold transition-all shadow-lg mt-4"
                >
                  <ChefHat className="w-5 h-5" />
                  Jetzt kochen
                </button>
              )}
            </div>
          ) : (
            /* Nichts geplant: großer Inspire-Me Button */
            <div className="flex-1 flex flex-col justify-center max-w-lg">
              <button
                type="button"
                onClick={onVorschlagGenerieren}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-bold text-lg shadow-xl shadow-violet-500/30 hover:shadow-violet-500/40 transition-all"
              >
                <Sparkles className="w-6 h-6" />
                Lass dir ein Gericht vorschlagen
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Kommandozentrale – 2x2 Grid mit Glass-Karten */}
      <div className="relative z-10 px-4 sm:px-6 md:px-8 -mt-24">
        <div className="max-w-4xl mx-auto grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={onWochePlanen}
            className="group flex flex-col items-start gap-3 p-6 rounded-[32px] bg-white/40 backdrop-blur-md border border-white/40 relative overflow-hidden text-left hover:bg-white/50 transition-colors"
          >
            <GlossyIcon icon={CalendarDays} gradient="bg-gradient-to-br from-violet-500 to-fuchsia-500" />
            <span className="font-semibold text-gray-900">Woche planen</span>
            <span className="text-sm text-gray-600">Dein Essensplan</span>
            {data != null && (
              <span className="text-xs text-gray-500 absolute bottom-4 right-4">{data.plannedDays}/7 Tage</span>
            )}
          </button>

          <button
            type="button"
            onClick={onMeineGerichte}
            className="group flex flex-col items-start gap-3 p-6 rounded-[32px] bg-white/40 backdrop-blur-md border border-white/40 relative overflow-hidden text-left hover:bg-white/50 transition-colors"
          >
            <GlossyIcon icon={BookHeart} gradient="bg-gradient-to-br from-rose-500 to-pink-500" />
            <span className="font-semibold text-gray-900">Sammlung</span>
            <span className="text-sm text-gray-600">Deine Favoriten</span>
            {data != null && (
              <span className="text-xs text-gray-500 absolute bottom-4 right-4">{data.recipeCount} Rezepte</span>
            )}
          </button>

          <button
            type="button"
            onClick={onResteZauber ?? onVorschlagGenerieren}
            className="group flex flex-col items-start gap-3 p-6 rounded-[32px] bg-white/40 backdrop-blur-md border border-white/40 relative overflow-hidden text-left hover:bg-white/50 transition-colors"
          >
            <GlossyIcon icon={Refrigerator} gradient="bg-gradient-to-br from-blue-500 to-cyan-500" />
            <span className="font-semibold text-gray-900">Reste-Zauber</span>
            <span className="text-sm text-gray-600">Was ist im Kühlschrank?</span>
          </button>

          <button
            type="button"
            onClick={onTurboKueche ?? onVorschlagGenerieren}
            className="group flex flex-col items-start gap-3 p-6 rounded-[32px] bg-white/40 backdrop-blur-md border border-white/40 relative overflow-hidden text-left hover:bg-white/50 transition-colors"
          >
            <GlossyIcon icon={Zap} gradient="bg-gradient-to-br from-amber-500 to-orange-500" />
            <span className="font-semibold text-gray-900">Turbo-Küche</span>
            <span className="text-sm text-gray-600">Unter 20 Minuten</span>
          </button>
        </div>

        {/* 3. Zuletzt angesehen – Mini-Squircles + Glass-Row */}
        {data && data.recentRecipes.length > 0 && (
          <div className="max-w-4xl mx-auto mt-8 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Zuletzt angesehen</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1">
              {data.recentRecipes.map((r) => (
                <Link
                  key={r.id}
                  href={`/tools/recipe?open=${encodeURIComponent(r.id)}`}
                  className="flex-shrink-0 w-[160px] rounded-xl overflow-hidden group"
                >
                  <div className="bg-white/30 backdrop-blur-sm rounded-xl p-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center shrink-0 shadow-inner">
                        <ChefHat className="w-6 h-6 text-orange-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-violet-600 transition-colors">
                          {r.recipeName}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">— kcal</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-12" />
    </div>
  );
}
