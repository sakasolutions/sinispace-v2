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
} from 'lucide-react';
import { getCalendarEvents } from '@/actions/calendar-actions';
import type { CalendarEvent } from '@/actions/calendar-actions';

function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'Guten Morgen';
  if (hour >= 11 && hour < 18) return 'Guten Tag';
  if (hour >= 18 && hour < 22) return 'Guten Abend';
  return 'Gute Nacht';
}

function getTodayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
  const [todayMeal, setTodayMeal] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = getTodayDateStr();
    Promise.all([
      fetch('/api/user/display-name').then((r) => r.json()),
      getCalendarEvents(),
    ]).then(([nameRes, eventsRes]) => {
      if (nameRes?.displayName) setDisplayName(nameRes.displayName);
      if (eventsRes.success && eventsRes.events?.length) {
        const meal = eventsRes.events.find(
          (e): e is CalendarEvent & { type: 'meal' } =>
            e.type === 'meal' && e.date === today
        );
        setTodayMeal(meal ?? null);
      }
      setLoading(false);
    });
  }, []);

  const greeting = getTimeBasedGreeting();

  return (
    <div className="space-y-8 pb-12" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          {greeting}{displayName ? `, ${displayName}` : ''}
        </h1>
        <p className="text-gray-600 font-medium">Dein kulinarischer Assistent</p>
      </div>

      {/* Hero Card – Heute */}
      <div className="rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] bg-white border border-gray-100/80">
        {loading ? (
          <div className="flex items-center justify-center min-h-[200px] sm:min-h-[240px]">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : todayMeal && todayMeal.type === 'meal' ? (
          /* Geplant: Rezept-Karte */
          <div className="relative min-h-[200px] sm:min-h-[240px] flex">
            <div
              className="absolute inset-0 bg-gradient-to-r from-orange-500/95 via-rose-500/90 to-orange-600/95"
              aria-hidden
            />
            <div className="relative z-10 flex-1 flex flex-col justify-between p-6 sm:p-8 text-white">
              <div>
                <p className="text-white/90 text-sm font-medium mb-1">
                  {todayMeal.slot === 'breakfast'
                    ? 'Dein Frühstück'
                    : todayMeal.slot === 'lunch'
                      ? 'Dein Mittagessen'
                      : todayMeal.slot === 'dinner'
                        ? 'Dein Abendessen'
                        : 'Dein Snack'}
                </p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {todayMeal.recipeName || 'Geplantes Gericht'}
                </h2>
              </div>
              {(todayMeal as { resultId?: string }).resultId && (
                <button
                  type="button"
                  onClick={() => {
                    const resultId = (todayMeal as { resultId?: string }).resultId;
                    if (resultId) router.push(`/tools/recipe?open=${encodeURIComponent(resultId)}`);
                  }}
                  className="mt-4 w-fit inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold transition-all shadow-lg"
                >
                  <ChefHat className="w-5 h-5" />
                  Jetzt kochen
                </button>
              )}
            </div>
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

      {/* Action-Grid (Bento) */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onWochePlanen}
          className="group flex flex-col items-start gap-3 p-5 sm:p-6 rounded-3xl bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(124,58,237,0.12)] hover:border-violet-200/60 transition-all text-left"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <span className="font-semibold text-gray-900">Woche planen</span>
        </button>

        <Link
          href="/tools/shopping-list"
          className="group flex flex-col items-start gap-3 p-5 sm:p-6 rounded-3xl bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(249,115,22,0.12)] hover:border-orange-200/60 transition-all text-left"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 flex items-center justify-center shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <span className="font-semibold text-gray-900">Zutaten checken</span>
        </Link>

        <button
          type="button"
          onClick={onMeineGerichte}
          className="group flex flex-col items-start gap-3 p-5 sm:p-6 rounded-3xl bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:border-gray-200 transition-all text-left"
        >
          <div className="w-12 h-12 rounded-2xl bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
            <BookOpen className="w-6 h-6 text-gray-700" />
          </div>
          <span className="font-semibold text-gray-900">Meine Gerichte</span>
        </button>

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
    </div>
  );
}
