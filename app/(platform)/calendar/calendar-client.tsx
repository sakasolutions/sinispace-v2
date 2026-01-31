'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/ui/PageTransition';
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Dumbbell,
  Calendar,
  ChefHat,
  Send,
  ExternalLink,
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

const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Aggregierte Agenda-Items für die Timeline (Termin, Meal, Workout) */
type AgendaItem =
  | { id: string; type: 'event'; time: string; title: string; event: CalendarEvent }
  | { id: string; type: 'meal'; time: string; title: string; subtitle?: string; event: CalendarEvent; recipeLink?: string }
  | { id: string; type: 'workout'; time: string; title: string; event: CalendarEvent };

/** Mock + Real: aggregiert alle Events für einen Tag */
function getDayEvents(dateKey: string, events: CalendarEvent[]): AgendaItem[] {
  const dayEvents = events
    .filter((e) => e.date === dateKey)
    .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

  const items: AgendaItem[] = dayEvents.map((e) => {
    if (e.type === 'meal') {
      const label = e.recipeName ? `${e.slot === 'breakfast' ? 'Frühstück' : e.slot === 'lunch' ? 'Mittagessen' : 'Abendessen'}: ${e.recipeName}` : e.slot;
      return {
        id: e.id,
        type: 'meal' as const,
        time: e.time || '12:00',
        title: label,
        subtitle: e.calories ? `${e.calories} kcal` : undefined,
        event: e,
        recipeLink: e.resultId ? `/tools/recipe` : undefined,
      };
    }
    if (e.type === 'workout') {
      return {
        id: e.id,
        type: 'workout' as const,
        time: e.time || '08:00',
        title: e.label || 'Workout',
        event: e,
      };
    }
    return {
      id: e.id,
      type: 'event' as const,
      time: e.time || '09:00',
      title: e.title,
      event: e,
    };
  });

  return items.sort((a, b) => a.time.localeCompare(b.time));
}

/** Prüft ob Input nach Essen klingt */
function looksLikeFood(text: string): boolean {
  const t = text.toLowerCase();
  const keywords = ['essen', 'pizza', 'abendessen', 'mittag', 'frühstück', 'kochen', 'rezept', 'pasta', 'salat', 'suppe', 'brunch'];
  return keywords.some((k) => t.includes(k));
}

/** Datum als YYYY-MM-DD in Lokalzeit (vermeidet UTC-Verschiebung durch toISOString) */
function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parsing für Magic Input – robust für Zeitzonen, nächster Wochentag */
function parseMagicInput(text: string, baseDate: Date): { date: string; time: string; title: string; isMeal: boolean } {
  const t = text.trim();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0, 0); // Mittag = keine UTC-Verschiebung
  let resultDate = new Date(today);
  let time = '18:00';
  let title = t;

  const timeMatch = t.match(/(\d{1,2})[:\s.]*(\d{2})?\s*uhr/i) || t.match(/(\d{1,2})[:\s.](\d{2})\b/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    time = `${pad(h)}:${pad(m)}`;
  }

  const todayDay = today.getDay();
  const wdays: [number, string][] = [
    [0, 'sonntag'],
    [1, 'montag'],
    [2, 'dienstag'],
    [3, 'mittwoch'],
    [4, 'donnerstag'],
    [5, 'freitag'],
    [6, 'samstag'],
  ];

  if (t.includes('morgen')) {
    resultDate.setDate(resultDate.getDate() + 1);
  } else if (t.includes('übermorgen')) {
    resultDate.setDate(resultDate.getDate() + 2);
  } else {
    for (const [targetDay, name] of wdays) {
      if (t.includes(name)) {
        let diff = (targetDay - todayDay + 7) % 7;
        if (diff === 0) diff = 7;
        resultDate.setDate(resultDate.getDate() + diff);
        break;
      }
    }
  }

  title = t
    .replace(/\b(morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, '')
    .replace(/\d{1,2}[:\s.]?\d{0,2}\s*uhr/gi, '')
    .replace(/\d{1,2}[:\s.]\d{2}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) title = t;
  return {
    date: toLocalDateString(resultDate),
    time,
    title: title.charAt(0).toUpperCase() + title.slice(1),
    isMeal: looksLikeFood(t),
  };
}

export function CalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [magicInput, setMagicInput] = useState('');

  const [eventModal, setEventModal] = useState<{ open: boolean; date: string; time?: string }>({ open: false, date: '', time: undefined });
  const [recipeModal, setRecipeModal] = useState<{ open: boolean; date: string; slot: 'breakfast' | 'lunch' | 'dinner'; time: string } | null>(null);

  const loadEvents = useCallback(async () => {
    const res = await getCalendarEvents();
    if (res.success && res.events) setEvents(res.events);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const dateKey = toDateKey(currentDate);
  const isToday = dateKey === toDateKey(new Date());

  const agendaItems = useMemo(() => getDayEvents(dateKey, events), [dateKey, events]);

  const summary = useMemo(() => {
    const terms = agendaItems.filter((i) => i.type === 'event').length;
    const meals = agendaItems.filter((i) => i.type === 'meal').length;
    const workouts = agendaItems.filter((i) => i.type === 'workout').length;
    const parts: string[] = [];
    if (terms > 0) parts.push(terms === 1 ? '1 Termin' : `${terms} Termine`);
    if (meals > 0) parts.push(meals === 1 ? 'ein leckeres Essen' : `${meals} Mahlzeiten`);
    if (workouts > 0) parts.push(workouts === 1 ? 'ein Workout' : `${workouts} Workouts`);
    if (parts.length === 0) return null;
    return `Du hast ${parts.join(' und ')} geplant.`;
  }, [agendaItems]);

  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const start = d.getDate() - ((d.getDay() + 6) % 7);
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(d);
      x.setDate(start + i);
      return x;
    });
  }, [currentDate]);

  const goPrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const goNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handleMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicInput.trim()) return;
    const { date, time, title, isMeal } = parseMagicInput(magicInput, currentDate);
    setMagicInput('');

    if (isMeal) {
      const id = `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const slot = time < '11:00' ? 'breakfast' : time < '15:00' ? 'lunch' : 'dinner';
      const newEvent: CalendarEvent = {
        id,
        type: 'meal',
        slot,
        date,
        time,
        recipeName: title,
      };
      const next = [...events, newEvent];
      setEvents(next);
      await saveCalendarEvents(next);
    } else {
      const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const newEvent: CalendarEvent = {
        id,
        type: 'custom',
        eventType: 'reminder',
        title,
        date,
        time,
      };
      const next = [...events, newEvent];
      setEvents(next);
      await saveCalendarEvents(next);
    }
  };

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

  const openRecipeModal = (slot: 'breakfast' | 'lunch' | 'dinner', time: string) => {
    setRecipeModal({ open: true, date: dateKey, slot, time });
  };

  return (
    <PageTransition className="h-full flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* LINKS: Wochen-Slider (Desktop) / Oben (Mobile) */}
      <aside className="shrink-0 lg:w-48">
        <div className="flex items-center justify-between mb-3">
          <button onClick={goPrevWeek} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Vorherige Woche">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-500">{MONTHS[currentDate.getMonth()].slice(0, 3)}</span>
          <button onClick={goNextWeek} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Nächste Woche">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <div className="flex lg:flex-col gap-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
          {weekDays.map((d) => {
            const dKey = toDateKey(d);
            const active = dKey === dateKey;
            return (
              <button
                key={dKey}
                onClick={() => setCurrentDate(d)}
                className={cn(
                  'shrink-0 w-12 h-12 lg:w-full lg:py-3 rounded-full lg:rounded-xl flex flex-col lg:flex-row items-center justify-center gap-0.5 lg:gap-2 transition-colors',
                  active ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                )}
              >
                <span className="text-[10px] lg:text-xs font-medium opacity-80">{WEEKDAYS_SHORT[d.getDay()]}</span>
                <span className="text-sm font-bold">{d.getDate()}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* RECHTS: Agenda Timeline */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header: Heute, Datum + Summary */}
        <div className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            {isToday ? 'Heute' : WEEKDAYS_LONG[currentDate.getDay()]}, {currentDate.getDate()}. {MONTHS[currentDate.getMonth()]}
          </h1>
          {summary && <p className="text-gray-500 mt-1">{summary}</p>}
        </div>

        {/* Bento Timeline */}
        <div className="flex-1 space-y-3 pb-32 lg:pb-36">
          {agendaItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <span className="text-5xl mb-4">☀️</span>
              <p className="text-xl font-semibold text-gray-900">Der Tag gehört dir!</p>
              <p className="text-gray-500 mt-1 text-center">Füge Termine, Mahlzeiten oder Workouts hinzu.</p>
              <button
                onClick={() => setEventModal({ open: true, date: dateKey, time: '09:00' })}
                className="mt-6 px-6 py-3 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
              >
                Ersten Eintrag hinzufügen
              </button>
            </div>
          ) : (
            agendaItems.map((item) => (
              <SwipeableEventItem
                key={item.id}
                event={item.event}
                onDelete={handleDeleteEvent}
                colorClass="rounded-2xl overflow-hidden"
              >
                <div
                  className={cn(
                    'flex items-center gap-4 p-4 bg-white border shadow-sm rounded-2xl',
                    item.type === 'event' && 'border-blue-100',
                    item.type === 'meal' && 'border-orange-100',
                    item.type === 'workout' && 'border-pink-100'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                      item.type === 'event' && 'bg-blue-100 text-blue-600',
                      item.type === 'meal' && 'bg-orange-100 text-orange-600',
                      item.type === 'workout' && 'bg-pink-100 text-pink-600'
                    )}
                  >
                    {item.type === 'event' && <Calendar className="w-6 h-6" />}
                    {item.type === 'meal' && <UtensilsCrossed className="w-6 h-6" />}
                    {item.type === 'workout' && <Dumbbell className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900">{item.title}</div>
                    {'subtitle' in item && item.subtitle && <div className="text-sm text-gray-500">{item.subtitle}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-medium text-gray-600">{item.time}</div>
                    {item.type === 'meal' && 'recipeLink' in item && item.recipeLink && (
                      <Link
                        href={item.recipeLink}
                        className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-orange-600 hover:text-orange-700"
                      >
                        Zum Rezept <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </SwipeableEventItem>
            ))
          )}
        </div>
      </main>

      {/* MAGIC INPUT BAR – Sticky unten (über Mobile-Nav) */}
      <div className="fixed bottom-24 left-0 right-0 z-40 md:bottom-4 md:left-64 pb-[env(safe-area-inset-bottom)] md:pb-4 pt-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
        <div className="max-w-2xl mx-auto px-4 pointer-events-auto">
          <form onSubmit={handleMagicSubmit} className="flex gap-2">
            <input
              type="text"
              value={magicInput}
              onChange={(e) => setMagicInput(e.target.value)}
              placeholder='Neuer Eintrag... (z.B. "Morgen 14 Uhr Meeting" oder "Samstag Abend Pizza essen")'
              className="flex-1 min-h-[52px] px-4 rounded-2xl border border-gray-200 bg-white shadow-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-base placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!magicInput.trim()}
              className="min-h-[52px] min-w-[52px] flex items-center justify-center rounded-2xl bg-gray-900 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
              aria-label="Hinzufügen"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* FAB: Mahlzeit aus Rezepten (Schnellzugriff) */}
      <div className="fixed right-4 bottom-36 md:right-8 md:bottom-24 z-30">
        <button
          onClick={() => openRecipeModal('dinner', '18:30')}
          className="w-14 h-14 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30 flex items-center justify-center hover:bg-orange-600 transition-colors"
          aria-label="Rezept hinzufügen"
        >
          <ChefHat className="w-6 h-6" />
        </button>
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
