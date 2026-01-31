'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/ui/PageTransition';
import { ChevronLeft, ChevronRight, UtensilsCrossed, Dumbbell, CheckSquare2 } from 'lucide-react';
import Link from 'next/link';

type ViewMode = 'month' | 'week' | 'day';

/** Kategorie-Farben für Integration Hooks */
const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  meal: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  workout: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  task: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
};

/** Placeholder-Items für spätere Integration */
type CalendarItem = {
  id: string;
  type: 'meal' | 'workout' | 'task';
  label: string;
  time?: string;
  date: string; // YYYY-MM-DD
};

// Demo-Daten für heute
function getDemoItems(date: Date): CalendarItem[] {
  const today = date.toISOString().slice(0, 10);
  return [
    { id: '1', type: 'meal', label: 'Frühstück', time: '08:00', date: today },
    { id: '2', type: 'meal', label: 'Mittagessen', time: '12:30', date: today },
    { id: '3', type: 'meal', label: 'Abendessen', time: '19:00', date: today },
    { id: '4', type: 'workout', label: 'Workout', time: '07:00', date: today },
    { id: '5', type: 'task', label: 'Einkaufen', date: today },
  ];
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export function CalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  const { monthStart, monthEnd, weeks } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const startDay = (start.getDay() + 6) % 7;
    const daysInMonth = end.getDate();
    const prevMonthDays = startDay;
    const totalCells = Math.ceil((prevMonthDays + daysInMonth) / 7) * 7;
    const days: (Date | null)[] = [];
    for (let i = 0; i < prevMonthDays; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    while (days.length < totalCells) days.push(null);
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return { monthStart: start, monthEnd: end, weeks };
  }, [currentDate]);

  const goPrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1));
    setCurrentDate(d);
  };

  const goNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1));
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const demoItems = getDemoItems(currentDate);

  return (
    <PageTransition className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>

        {/* View Toggle + Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-gray-100 p-1">
            {(['week', 'month', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'min-h-[44px] px-4 rounded-lg text-sm font-medium transition-all',
                  viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {mode === 'week' ? 'Woche' : mode === 'month' ? 'Monat' : 'Tag'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors" aria-label="Zurück">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={goToday} className="min-h-[44px] px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
              Heute
            </button>
            <button onClick={goNext} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors" aria-label="Weiter">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <span className="text-lg font-semibold text-gray-900 ml-auto">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {viewMode === 'month' && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-px bg-gray-100">
              {WEEKDAYS.map((d) => (
                <div key={d} className="bg-white py-2 text-center text-xs font-medium text-gray-500">
                  {d}
                </div>
              ))}
              {weeks.flat().map((day, i) => {
                const isCurrentMonth = day && day.getMonth() === currentDate.getMonth();
                const isToday = day && day.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    className={cn(
                      'min-h-[80px] p-2 bg-white',
                      !isCurrentMonth && 'opacity-40'
                    )}
                  >
                    {day && (
                      <span className={cn(
                        'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                        isToday ? 'bg-orange-500 text-white' : 'text-gray-700'
                      )}>
                        {day.getDate()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'week' && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-6">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(currentDate);
                const weekStart = d.getDate() - (d.getDay() + 6) % 7;
                d.setDate(weekStart + i);
                const isToday = d.toDateString() === new Date().toDateString();
                return (
                  <div key={i} className="text-center">
                    <div className="text-xs font-medium text-gray-500 mb-1">{WEEKDAYS[i]}</div>
                    <div className={cn(
                      'w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-semibold',
                      isToday ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-700'
                    )}>
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Diese Woche</h3>
              <div className="space-y-2">
                {demoItems.map((item) => {
                  const c = CATEGORY_COLORS[item.type];
                  const Icon = item.type === 'meal' ? UtensilsCrossed : item.type === 'workout' ? Dumbbell : CheckSquare2;
                  return (
                    <Link
                      key={item.id}
                      href={item.type === 'meal' ? '/tools/recipe' : item.type === 'workout' ? '/tools/fitness' : '/dashboard'}
                      className={cn(
                        'block p-3 rounded-xl border text-sm font-medium transition-colors',
                        c.bg, c.text, c.border,
                        'hover:shadow-sm'
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4 shrink-0" />
                        {item.label}
                        {item.time && <span className="text-xs opacity-75">· {item.time}</span>}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-6">
              <div className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold',
                currentDate.toDateString() === new Date().toDateString() ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
              )}>
                {currentDate.getDate()}
              </div>
              <div>
                <div className="text-sm text-gray-500">{WEEKDAYS[(currentDate.getDay() + 6) % 7]}</div>
                <div className="font-semibold text-gray-900">{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
              </div>
            </div>

            {/* Integration Slots */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                Mahlzeiten
              </h3>
              <div className="grid gap-2">
                {['Frühstück', 'Mittagessen', 'Abendessen'].map((meal, i) => (
                  <Link
                    key={meal}
                    href="/tools/recipe"
                    className="flex items-center gap-3 p-4 rounded-xl border border-orange-100 bg-orange-50/50 hover:bg-orange-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-orange-700">{meal}</span>
                    <span className="text-xs text-orange-500">+ Planen</span>
                  </Link>
                ))}
              </div>

              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mt-6">
                <Dumbbell className="w-4 h-4 text-emerald-500" />
                Aktivität
              </h3>
              <Link
                href="/tools/fitness"
                className="flex items-center gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 transition-colors"
              >
                <span className="text-sm font-medium text-emerald-700">Workout planen</span>
              </Link>

              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mt-6">
                <CheckSquare2 className="w-4 h-4 text-blue-500" />
                Aufgaben
              </h3>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors"
              >
                <span className="text-sm font-medium text-blue-700">Aufgabe hinzufügen</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/tools/recipe" className="px-4 py-2 rounded-xl bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 transition-colors">
          Gourmet-Planer
        </Link>
        <Link href="/tools/fitness" className="px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors">
          Fit-Coach
        </Link>
        <Link href="/tools/shopping-list" className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 transition-colors">
          Einkaufsliste
        </Link>
      </div>
    </PageTransition>
  );
}
