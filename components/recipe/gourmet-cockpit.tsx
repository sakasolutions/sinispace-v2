'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  ShoppingCart,
  BookOpen,
  Wand2,
  ChefHat,
  Loader2,
  Sparkles,
  Check,
} from 'lucide-react';
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
  const [displayName, setDisplayName] = useState('');
  const [data, setData] = useState<GourmetDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const greeting = getTimeBasedGreeting();
  const today = getTodayStr();
  const hasMealToday = data?.nextMeal && data.nextMeal.date === today;

  return (
    <div className="space-y-8 pb-12" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          {greeting}{displayName ? `, ${displayName}` : ''}
        </h1>
        <p className="text-gray-600 font-medium">Dein kulinarischer Assistent</p>
      </div>

      {/* Hero Card – Heute / Nächstes Meal */}
      <div className="rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] bg-white border border-gray-100/80">
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px] sm:min-h-[240px]">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : hasMealToday && data?.nextMeal ? (
          /* Geplant für heute: Rezept-Karte */
          <div className="relative min-h-[200px] sm:min-h-[240px] flex">
            <div
              className="absolute inset-0 bg-gradient-to-r from-orange-500/95 via-rose-500/90 to-orange-600/95"
              aria-hidden
            />
            <div className="relative z-10 flex-1 flex flex-col justify-between p-6 sm:p-8 text-white">
              <div>
                <p className="text-white/90 text-sm font-medium mb-1">
                  {formatMealLabel(data.nextMeal.date)}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {data.nextMeal.title}
                </h2>
              </div>
              {data.nextMeal.resultId && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/tools/recipe?open=${encodeURIComponent(data.nextMeal!.resultId!)}`)
                  }
                  className="mt-4 w-fit inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold transition-all shadow-lg"
                >
                  <ChefHat className="w-5 h-5" />
                  Jetzt kochen
                </button>
              )}
            </div>
          </div>
        ) : data?.nextMeal ? (
          /* Nächstes Meal in der Zukunft (nicht heute): kleiner Hinweis */
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-br from-violet-50 to-fuchsia-50/60 border-b border-gray-100/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Nächstes geplantes Gericht</p>
                <p className="font-bold text-gray-900">{formatMealLabel(data.nextMeal.date)}: {data.nextMeal.title}</p>
              </div>
            </div>
            {data.nextMeal.resultId && (
              <button
                type="button"
                onClick={() =>
                  router.push(`/tools/recipe?open=${encodeURIComponent(data.nextMeal!.resultId!)}`)
                }
                className="shrink-0 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-semibold shadow-md"
              >
                Rezept öffnen
              </button>
            )}
          </div>
        ) : (
          /* Nicht geplant: Inspirations-Karte */
          <div className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 bg-gradient-to-br from-violet-50 to-fuchsia-50/60 border-b border-gray-100/50">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Noch nichts geplant?</h2>
                <p className="text-sm text-gray-600 mt-0.5">Lass dir ein Gericht vorschlagen.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onVorschlagGenerieren}
              className="shrink-0 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/30 transition-all flex items-center gap-2"
            >
              <Wand2 className="w-5 h-5" />
              Vorschlag generieren
            </button>
          </div>
        )}
      </div>

      {/* Action-Grid (Smart Tiles) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Wochenplaner */}
        <button
          type="button"
          onClick={onWochePlanen}
          className="group flex flex-col items-start gap-3 p-5 sm:p-6 rounded-3xl bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(124,58,237,0.12)] hover:border-violet-200/60 transition-all text-left"
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105 ${
              data && data.plannedDays >= 7
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-violet-500/20'
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-violet-500/20'
            }`}
          >
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <span className="font-semibold text-gray-900">Woche planen</span>
          <span className="text-sm text-gray-500">
            {data ? `${data.plannedDays}/7 Tage geplant` : '…'}
          </span>
        </button>

        {/* Einkaufsliste */}
        <Link
          href="/tools/shopping-list"
          className={`group flex flex-col items-start gap-3 p-5 sm:p-6 rounded-3xl bg-white border shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all text-left ${
            data && data.shoppingCount > 0
              ? 'border-orange-200/60 hover:shadow-[0_8px_32px_rgba(249,115,22,0.12)]'
              : 'border-gray-100 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-gray-200'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-105 ${
              data && data.shoppingCount > 0
                ? 'bg-orange-50 text-orange-600 shadow-orange-500/20'
                : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-orange-500/20'
            }`}
          >
            <ShoppingCart className="w-6 h-6" />
          </div>
          <span className="font-semibold text-gray-900">Zutaten checken</span>
          {data ? (
            data.shoppingCount > 0 ? (
              <span className="text-sm font-medium text-orange-600">
                🛒 {data.shoppingCount} {data.shoppingCount === 1 ? 'Zutat fehlt' : 'Zutaten fehlen'}
              </span>
            ) : (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                <Check className="w-4 h-4" /> Alles erledigt
              </span>
            )
          ) : (
            <span className="text-sm text-gray-500">…</span>
          )}
        </Link>

        {/* Meine Gerichte */}
        <button
          type="button"
          onClick={onMeineGerichte}
          className="group flex flex-col items-start gap-3 p-5 sm:p-6 rounded-3xl bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-gray-200 transition-all text-left"
        >
          <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
            <BookOpen className="w-6 h-6 text-gray-700" />
          </div>
          <span className="font-semibold text-gray-900">Meine Gerichte</span>
          {data != null && (
            <span className="text-sm text-gray-500">{data.recipeCount} Rezepte</span>
          )}
        </button>

        {/* AI Creator */}
        <button
          type="button"
          onClick={onAICreator}
          className="group flex flex-col items-start gap-3 p-5 sm:p-6 rounded-3xl bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(124,58,237,0.12)] hover:border-violet-200/60 transition-all text-left"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <Wand2 className="w-6 h-6 text-white" />
          </div>
          <span className="font-semibold text-gray-900">AI Creator</span>
        </button>
      </div>

      {/* Quick Access – Zuletzt angesehen */}
      {data && data.recentRecipes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Zuletzt angesehen</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1">
            {data.recentRecipes.map((r) => (
              <Link
                key={r.id}
                href={`/tools/recipe?open=${encodeURIComponent(r.id)}`}
                className="flex-shrink-0 w-[160px] sm:w-[180px] rounded-2xl bg-white border border-gray-100 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-md hover:border-orange-200/60 transition-all overflow-hidden group"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-orange-50 to-rose-50 flex items-center justify-center">
                  <ChefHat className="w-10 h-10 text-orange-300 group-hover:text-orange-400 transition-colors" />
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {r.recipeName}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
