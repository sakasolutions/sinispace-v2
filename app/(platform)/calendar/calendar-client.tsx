'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/ui/PageTransition';
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Dumbbell,
  CheckSquare2,
  Plus,
  Calendar,
  ChefHat,
  Briefcase,
} from 'lucide-react';
import Link from 'next/link';
import {
  getCalendarEvents,
  saveCalendarEvents,
  removeCalendarEvent,
  type CalendarEvent,
  type CustomEventType,
} from '@/actions/calendar-actions';
import { EventCreateModal } from './event-create-modal';
import { RecipePickerModal } from './recipe-picker-modal';
import { SwipeableEventItem } from './swipeable-event-item';

type ViewMode = 'month' | 'week' | 'day';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  meal: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  workout: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  task: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  custom: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  meeting: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  reminder: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  personal: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  work: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

const MEAL_SLOTS = [
  { id: 'breakfast' as const, label: 'Frühstück', time: '08:00' },
  { id: 'lunch' as const, label: 'Mittagessen', time: '12:30' },
  { id: 'dinner' as const, label: 'Abendessen', time: '19:00' },
];

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getEventColor(e: CalendarEvent): string {
  if (e.type === 'custom') return CATEGORY_COLORS[e.eventType]?.bg + ' ' + CATEGORY_COLORS[e.eventType]?.text + ' ' + CATEGORY_COLORS[e.eventType]?.border || '';
  return CATEGORY_COLORS[e.type]?.bg + ' ' + CATEGORY_COLORS[e.type]?.text + ' ' + CATEGORY_COLORS[e.type]?.border || '';
}

export function CalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [eventModal, setEventModal] = useState<{ open: boolean; date: string; time?: string }>({ open: false, date: '', time: undefined });
  const [recipeModal, setRecipeModal] = useState<{ open: boolean; date: string; slot: 'breakfast' | 'lunch' | 'dinner'; time: string } | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const loadEvents = useCallback(async () => {
    const res = await getCalendarEvents();
    if (res.success && res.events) setEvents(res.events);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const { weeks } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const start = new Date(year, month, 1);
    const startDay = (start.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    const totalCells = Math.ceil(days.length / 7) * 7;
    while (days.length < totalCells) days.push(null);
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return { weeks };
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

  const dateKey = toDateKey(currentDate);

  const dayEvents = useMemo(() => {
    return events.filter((e) => e.date === dateKey).sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  }, [events, dateKey]);

  const weekDateKeys = useMemo(() => {
    const d = new Date(currentDate);
    const wStart = d.getDate() - (d.getDay() + 6) % 7;
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(d);
      x.setDate(wStart + i);
      return toDateKey(x);
    });
  }, [currentDate]);

  const weekEvents = useMemo(() => {
    const byDate: Record<string, CalendarEvent[]> = {};
    weekDateKeys.forEach((k) => (byDate[k] = []));
    events.forEach((e) => {
      if (weekDateKeys.includes(e.date)) byDate[e.date].push(e);
    });
    Object.keys(byDate).forEach((k) => byDate[k].sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00')));
    return byDate;
  }, [events, weekDateKeys]);

  const handleAddCustomEvent = async (data: { type: CustomEventType; title: string; date: string; time: string; endTime?: string }) => {
    const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newEvent: CalendarEvent = {
      id,
      type: 'custom',
      eventType: data.type,
      title: data.title,
      date: data.date,
      time: data.time,
      endTime: data.endTime,
    };
    const next = [...events, newEvent];
    setEvents(next);
    await saveCalendarEvents(next);
  };

  const handleAddMealFromRecipe = async (
    recipe: { id: string; resultId: string; recipeName: string; stats?: { time?: string; calories?: string } },
    slot: 'breakfast' | 'lunch' | 'dinner',
    date: string,
    time: string
  ) => {
    const id = `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newEvent: CalendarEvent = {
      id,
      type: 'meal',
      slot,
      date,
      time,
      resultId: recipe.resultId,
      recipeId: recipe.id,
      recipeName: recipe.recipeName,
      calories: recipe.stats?.calories,
      prepTime: recipe.stats?.time,
    };
    const next = [...events, newEvent];
    setEvents(next);
    await saveCalendarEvents(next);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const next = events.filter((e) => e.id !== eventId);
    setEvents(next);
    await saveCalendarEvents(next);
  };

  const openEventModal = (date: string, time?: string) => {
    setEventModal({ open: true, date, time: time || '09:00' });
    setQuickAddOpen(false);
  };

  const openRecipeModal = (slot: 'breakfast' | 'lunch' | 'dinner', time: string) => {
    setRecipeModal({ open: true, date: dateKey, slot, time });
    setQuickAddOpen(false);
  };

  const timeSlots = Array.from({ length: 17 }, (_, i) => `${(6 + i).toString().padStart(2, '0')}:00`); // 06:00 - 22:00

  return (
    <PageTransition className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
          <div className="relative">
            <button
              onClick={() => setQuickAddOpen(!quickAddOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-medium shadow-md shadow-orange-500/25 hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Hinzufügen
            </button>
            {quickAddOpen && (
              <>
                <div className="absolute inset-0 -z-10" onClick={() => setQuickAddOpen(false)} aria-hidden />
                <div className="absolute right-0 top-full mt-1 py-1 bg-white rounded-xl border border-gray-100 shadow-lg z-10 min-w-[180px]">
                  <button
                    onClick={() => openEventModal(dateKey)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 rounded-lg"
                  >
                    <Calendar className="w-4 h-4 text-blue-500" />
                    Termin
                  </button>
                  <button
                    onClick={() => openRecipeModal('lunch', '12:30')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 rounded-lg"
                  >
                    <ChefHat className="w-4 h-4 text-orange-500" />
                    Mahlzeit
                  </button>
                  <Link
                    href="/tools/fitness"
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50 rounded-lg"
                  >
                    <Dumbbell className="w-4 h-4 text-emerald-500" />
                    Workout
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

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
            <button onClick={goPrev} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100" aria-label="Zurück">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={goToday} className="min-h-[44px] px-4 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900">
              Heute
            </button>
            <button onClick={goNext} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100" aria-label="Weiter">
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
                const dKey = day ? toDateKey(day) : '';
                const count = events.filter((e) => e.date === dKey).length;
                return (
                  <div
                    key={i}
                    onClick={() => day && (setCurrentDate(day), setViewMode('day'))}
                    className={cn(
                      'min-h-[80px] p-2 bg-white cursor-pointer hover:bg-gray-50 transition-colors',
                      !isCurrentMonth && 'opacity-40'
                    )}
                  >
                    {day && (
                      <>
                        <span
                          className={cn(
                            'inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                            isToday ? 'bg-orange-500 text-white' : 'text-gray-700'
                          )}
                        >
                          {day.getDate()}
                        </span>
                        {count > 0 && (
                          <div className="mt-1 flex justify-center gap-0.5">
                            {Array.from({ length: Math.min(3, count) }).map((_, j) => (
                              <span key={j} className="w-1 h-1 rounded-full bg-orange-400" />
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'week' && (
          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 mb-4">
              {weekDateKeys.map((dKey, i) => {
                const d = new Date(dKey + 'T12:00');
                const isToday = dKey === toDateKey(new Date());
                return (
                  <div key={dKey} className="text-center">
                    <div className="text-xs font-medium text-gray-500">{WEEKDAYS[i]}</div>
                    <button
                      onClick={() => (setCurrentDate(d), setViewMode('day'))}
                      className={cn(
                        'w-10 h-10 mx-auto rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                        isToday ? 'bg-orange-500 text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      {d.getDate()}
                    </button>
                    {weekEvents[dKey]?.length > 0 && (
                      <div className="mt-1 text-[10px] text-gray-400">{weekEvents[dKey].length} Termine</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Diese Woche</h3>
              <div className="space-y-2">
                {dayEvents.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center">Keine Termine. Klicke auf „Hinzufügen“.</p>
                ) : (
                  dayEvents.map((e) => (
                    <SwipeableEventItem key={e.id} event={e} onDelete={handleDeleteEvent} colorClass={cn('p-3 rounded-xl border', getEventColor(e))}>
                      <span className="flex items-center gap-2">
                        {e.type === 'custom' && <Briefcase className="w-4 h-4 shrink-0" />}
                        {e.type === 'meal' && <UtensilsCrossed className="w-4 h-4 shrink-0" />}
                        {e.type === 'workout' && <Dumbbell className="w-4 h-4 shrink-0" />}
                        <span className="font-medium truncate">
                          {e.type === 'custom' ? e.title : e.type === 'meal' ? (e.recipeName || e.slot) : e.label || 'Workout'}
                        </span>
                        {e.time && <span className="text-xs opacity-75">· {e.time}</span>}
                      </span>
                    </SwipeableEventItem>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="p-4">
            <div className="flex items-center gap-3 mb-6">
              <div
                className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold',
                  dateKey === toDateKey(new Date()) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-700'
                )}
              >
                {currentDate.getDate()}
              </div>
              <div>
                <div className="text-sm text-gray-500">{WEEKDAYS[(currentDate.getDay() + 6) % 7]}</div>
                <div className="font-semibold text-gray-900">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </div>
              </div>
            </div>

            {/* Zeit-Slots klickbar für Custom Events */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Termin hinzufügen</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {timeSlots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => openEventModal(dateKey, slot)}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-gray-200 hover:border-orange-200 hover:bg-orange-50/30 transition-colors text-left"
                  >
                    <span className="text-sm font-medium text-gray-600">{slot}</span>
                    <Plus className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Mahlzeiten mit Recipe Picker */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-orange-500" />
                Mahlzeiten
              </h3>
              <div className="grid gap-2">
                {MEAL_SLOTS.map((slot) => {
                  const assigned = dayEvents.find((e) => e.type === 'meal' && e.slot === slot.id);
                  const content = (
                    <button
                      onClick={() => openRecipeModal(slot.id, slot.time)}
                      className={cn(
                        'w-full flex items-center justify-between gap-3 p-4 rounded-xl border text-left transition-colors',
                        assigned ? 'border-orange-200 bg-orange-50' : 'border-orange-100 bg-orange-50/50 hover:bg-orange-50'
                      )}
                    >
                      <div>
                        <span className="text-sm font-medium text-orange-700">{slot.label}</span>
                        {assigned && assigned.type === 'meal' && assigned.recipeName && (
                          <div className="text-xs text-orange-600 mt-0.5 truncate">
                            {assigned.recipeName}
                            {assigned.calories && ` · ${assigned.calories}`}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-orange-500 shrink-0">{assigned ? 'Ändern' : 'Aus Rezepten'}</span>
                    </button>
                  );
                  return assigned ? (
                    <SwipeableEventItem key={slot.id} event={assigned} onDelete={handleDeleteEvent} colorClass="rounded-xl overflow-hidden">
                      {content}
                    </SwipeableEventItem>
                  ) : (
                    <div key={slot.id}>{content}</div>
                  );
                })}
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

              {/* Geplante Termine (Custom + Workout, Mahlzeiten sind oben) */}
              {dayEvents.filter((e) => e.type !== 'meal').length > 0 && (
                <>
                  <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mt-6">
                    <CheckSquare2 className="w-4 h-4 text-blue-500" />
                    Geplante Termine
                  </h3>
                  <div className="space-y-2">
                    {dayEvents
                      .filter((e) => e.type !== 'meal')
                      .map((e) => (
                        <SwipeableEventItem key={e.id} event={e} onDelete={handleDeleteEvent} colorClass={cn('p-3 rounded-xl border', getEventColor(e))}>
                          <span className="flex items-center gap-2">
                            {e.type === 'custom' && <Briefcase className="w-4 h-4 shrink-0" />}
                            {e.type === 'workout' && <Dumbbell className="w-4 h-4 shrink-0" />}
                            <span className="font-medium">{e.type === 'custom' ? e.title : e.label || 'Workout'}</span>
                            {e.time && <span className="text-xs opacity-75">· {e.time}</span>}
                          </span>
                        </SwipeableEventItem>
                      ))}
                  </div>
                </>
              )}
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

      {/* Modals */}
      <EventCreateModal
        isOpen={eventModal.open}
        onClose={() => setEventModal({ open: false, date: '', time: undefined })}
        date={eventModal.date}
        defaultTime={eventModal.time}
        onSubmit={handleAddCustomEvent}
      />
      {recipeModal && (
        <RecipePickerModal
          isOpen={recipeModal.open}
          onClose={() => setRecipeModal(null)}
          date={recipeModal.date}
          slot={recipeModal.slot}
          defaultTime={recipeModal.time}
          onSelect={handleAddMealFromRecipe}
        />
      )}
    </PageTransition>
  );
}
