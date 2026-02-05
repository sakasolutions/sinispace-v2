'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/ui/PageTransition';
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Dumbbell,
  Calendar,
  Send,
  ExternalLink,
  Plus,
  Repeat,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { rrulestr } from 'rrule';
import confetti from 'canvas-confetti';
import {
  getCalendarEvents,
  saveCalendarEvents,
  removeCalendarEvent,
  type CalendarEvent,
} from '@/actions/calendar-actions';
import { parseNaturalLanguage, getSmartTags, type ParsedEvent, type SmartTag } from '@/lib/parse-natural-language';
import { EventDetailSheet } from './event-detail-sheet';
import { RecipePickerModal } from './recipe-picker-modal';
import { SwipeableEventItem } from './swipeable-event-item';

const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WEEKDAYS_HEADER = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const BRAND_GRADIENT = 'bg-gradient-to-r from-violet-600 to-pink-500';
const BRAND_GRADIENT_HOVER = 'hover:from-violet-700 hover:to-pink-600';
const BRAND_GRADIENT_TEXT = 'bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent';

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type AgendaItem =
  | { id: string; type: 'event'; time: string; title: string; subtitle?: string; isRecurring?: boolean; event: CalendarEvent }
  | { id: string; type: 'meal'; time: string; title: string; subtitle?: string; event: CalendarEvent; recipeLink?: string; mealIcon?: string }
  | { id: string; type: 'workout'; time: string; title: string; event: CalendarEvent };

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍝',
  snack: '🍎',
};

function eventOccursOnDate(e: CalendarEvent, dateKey: string): boolean {
  if (e.date === dateKey) return true;
  if (e.type !== 'custom' || !('rrule' in e) || !e.rrule) return false;
  try {
    const rule = rrulestr(e.rrule);
    const [y, m, d] = dateKey.split('-').map(Number);
    const dayStart = new Date(y, m - 1, d, 0, 0, 0);
    const dayEnd = new Date(y, m - 1, d, 23, 59, 59);
    const occurrences = rule.between(dayStart, dayEnd, true);
    return occurrences.length > 0;
  } catch {
    return false;
  }
}

function getDayEvents(dateKey: string, events: CalendarEvent[]): AgendaItem[] {
  const dayEvents = events
    .filter((e) => eventOccursOnDate(e, dateKey))
    .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  const items: AgendaItem[] = dayEvents.map((e) => {
    if (e.type === 'meal') {
      const label = e.recipeName ? `${e.slot === 'breakfast' ? 'Frühstück' : e.slot === 'lunch' ? 'Mittagessen' : e.slot === 'dinner' ? 'Abendessen' : 'Snack'}: ${e.recipeName}` : e.slot;
      const cal = e.calories ? (String(e.calories).toLowerCase().includes('kcal') ? e.calories : `${e.calories} kcal`) : undefined;
      const servings = 'servings' in e ? e.servings : undefined;
      const subtitleParts: string[] = [];
      if (servings != null) subtitleParts.push(`${servings} Portionen`);
      if (cal) subtitleParts.push(cal);
      const subtitle = subtitleParts.length > 0 ? subtitleParts.join(' • ') : cal;
      const hasRecipe = !!(e.recipeId || e.resultId);
      const mealIcon = hasRecipe ? (MEAL_ICONS[e.slot] ?? '🍽️') : undefined;
      const recipeLink = e.resultId ? `/tools/recipe?open=${encodeURIComponent(e.resultId)}` : undefined;
      return { id: e.id, type: 'meal' as const, time: e.time || '12:00', title: label, subtitle, event: e, recipeLink, mealIcon };
    }
    if (e.type === 'workout') return { id: e.id, type: 'workout' as const, time: e.time || '08:00', title: e.label || 'Workout', event: e };
    const isRecurring = !!(e.type === 'custom' && 'rrule' in e && e.rrule);
    return { id: e.id, type: 'event' as const, time: e.time || '09:00', title: e.title, event: e, isRecurring };
  });
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

/** Kategorien pro Datum (max 4, Reihenfolge: Gesundheit, Termin, Essen, Sport) */
type CategoryColor = 'blue' | 'orange' | 'pink' | 'emerald';

function getCategoryDotsForDate(dateKey: string, events: CalendarEvent[]): CategoryColor[] {
  const dayEvents = events.filter((e) => eventOccursOnDate(e, dateKey));
  const categories = new Set<CategoryColor>();
  for (const e of dayEvents) {
    if (e.type === 'custom') {
      categories.add('eventType' in e && e.eventType === 'health' ? 'emerald' : 'blue');
    } else if (e.type === 'meal') categories.add('orange');
    else if (e.type === 'workout') categories.add('pink');
  }
  const order: CategoryColor[] = ['emerald', 'blue', 'orange', 'pink'];
  return order.filter((c) => categories.has(c)).slice(0, 4);
}

function CategoryDots({
  dateKey,
  events,
  size = 'sm',
  selected,
}: {
  dateKey: string;
  events: CalendarEvent[];
  size?: 'sm' | 'md';
  selected?: boolean;
}) {
  const dots = getCategoryDotsForDate(dateKey, events);
  if (dots.length === 0) return null;
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';
  const colors: Record<CategoryColor, string> = {
    blue: selected ? 'bg-white' : 'bg-blue-500',
    orange: selected ? 'bg-white' : 'bg-orange-500',
    pink: selected ? 'bg-white' : 'bg-pink-500',
    emerald: selected ? 'bg-white' : 'bg-emerald-500',
  };
  return (
    <div className={cn('flex gap-0.5 justify-center mt-1', size === 'md' && 'gap-1 mt-1.5')}>
      {dots.map((c, i) => (
        <span key={i} className={cn('rounded-full', dotSize, colors[c])} />
      ))}
    </div>
  );
}

/** Monats-Grid für Mini-Kalender (7x5/6) */
function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7;
  const daysInMonth = last.getDate();
  const total = startPad + daysInMonth;
  const rows = Math.ceil(total / 7);
  const days: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  while (days.length < rows * 7) days.push(null);
  const grid: (Date | null)[][] = [];
  for (let i = 0; i < rows; i++) grid.push(days.slice(i * 7, (i + 1) * 7));
  return grid;
}

type ViewMode = 'agenda' | 'woche' | 'monat';

export function CalendarClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [magicInput, setMagicInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const agendaRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const parsedLive = useMemo(() => {
    if (!magicInput.trim()) return null;
    try {
      return parseNaturalLanguage(magicInput, new Date());
    } catch {
      return null;
    }
  }, [magicInput]);

  const smartTags = useMemo((): SmartTag[] => {
    if (!parsedLive) return [];
    return getSmartTags(parsedLive, new Date());
  }, [parsedLive]);

  const [eventModal, setEventModal] = useState<{ open: boolean; date: string; time?: string; editEvent?: CalendarEvent }>({ open: false, date: '', time: undefined });
  const [recipeModal, setRecipeModal] = useState<{ open: boolean; date: string; slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'; time: string } | null>(null);

  const loadEvents = useCallback(async () => {
    const res = await getCalendarEvents();
    if (res.success && res.events) setEvents(res.events);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (searchParams.get('plan') !== 'success') return;
    const fire = () => {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 200);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 400);
    };
    fire();
    setSuccessMessage('Wochenplan erstellt! 🎉');
    loadEvents();
    router.replace('/calendar', { scroll: false });
    const t = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(t);
  }, [searchParams, router, loadEvents]);

  const dateKey = toDateKey(currentDate);
  const todayKey = toDateKey(new Date());
  const isToday = dateKey === todayKey;

  const monthGrid = useMemo(() => getMonthGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
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

  const goPrevMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    setViewDate(d);
  };

  const goNextMonth = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    setViewDate(d);
  };

  const selectDay = (d: Date | null) => {
    if (!d) return;
    setCurrentDate(d);
    agendaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleMagicSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.querySelector<HTMLInputElement>('input[type="text"]');
    const text = (input?.value ?? magicInput).trim();
    if (!text) return;
    setMagicInput('');

    const parsed = parseNaturalLanguage(text, new Date());
    if (typeof console !== 'undefined' && console.log) {
      console.log('[Calendar Event]', { text, parsed, creating: parsed.isMeal ? 'meal' : 'event' });
    }
    if (parsed.isMeal) {
      const slot = parsed.time < '11:00' ? 'breakfast' : parsed.time < '15:00' ? 'lunch' : parsed.time < '17:00' ? 'snack' : 'dinner';
      const newEvent: CalendarEvent = { id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, type: 'meal', slot, date: parsed.date, time: parsed.time, recipeName: parsed.title };
      const next = [...events, newEvent];
      setEvents(next);
      await saveCalendarEvents(next);
      const [, mon, day] = parsed.date.split('-').map(Number);
      setSuccessMessage(`${parsed.title} am ${day}. ${MONTHS[mon - 1]} um ${parsed.time}`);
    } else {
      let endTime = parsed.endTime;
      if (!endTime && parsed.durationMinutes) {
        const [h, m] = parsed.time.split(':').map(Number);
        const endM = h * 60 + m + parsed.durationMinutes;
        endTime = `${String(Math.floor(endM / 60) % 24).padStart(2, '0')}:${String(endM % 60).padStart(2, '0')}`;
      }
      const newEvent: CalendarEvent = {
        id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'custom',
        eventType: 'reminder',
        title: parsed.title,
        date: parsed.date,
        time: parsed.time,
        endTime,
        rrule: parsed.rrule,
        until: parsed.until,
        durationMinutes: parsed.durationMinutes,
        location: parsed.location,
        withPerson: parsed.withPerson,
      };
      const next = [...events, newEvent];
      setEvents(next);
      await saveCalendarEvents(next);
      const [, mon, day] = parsed.date.split('-').map(Number);
      const recur = parsed.recurrenceLabel ? ' (wiederkehrend)' : '';
      setSuccessMessage(`${parsed.title} am ${day}. ${MONTHS[mon - 1]} um ${parsed.time}${recur}`);
    }
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleEventSheetSubmit = async (event: CalendarEvent) => {
    const existing = events.find((e) => e.id === event.id);
    const next = existing ? events.map((e) => (e.id === event.id ? event : e)) : [...events, event];
    setEvents(next as CalendarEvent[]);
    await saveCalendarEvents(next as CalendarEvent[]);
    setEventModal({ open: false, date: '', time: undefined });
  };

  const handleAddMealFromRecipe = async (recipe: { id: string; resultId: string; recipeName: string; stats?: { time?: string; calories?: string } }, slot: 'breakfast' | 'lunch' | 'dinner' | 'snack', date: string, time: string) => {
    const newEvent: CalendarEvent = { id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, type: 'meal', slot, date, time, resultId: recipe.resultId, recipeId: recipe.id, recipeName: recipe.recipeName, calories: recipe.stats?.calories, prepTime: recipe.stats?.time };
    const next = [...events, newEvent];
    setEvents(next);
    await saveCalendarEvents(next);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const prev = events;
    setEvents((e) => e.filter((ev) => ev.id !== eventId));
    const result = await removeCalendarEvent(eventId);
    if (!result.success) {
      setEvents(prev);
      console.error('[Calendar] Delete failed:', result.error);
    }
  };

  const eventCountForDate = (d: Date) => events.filter((e) => eventOccursOnDate(e, toDateKey(d))).length;

  return (
    <PageTransition className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-6xl mx-auto">
      {/* LINKS: Mini-Monats-Kalender (Desktop) / Mobile Week + Accordion */}
      <aside className="shrink-0 lg:w-64">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 lg:p-4">
          <div className="flex items-center justify-between mb-2 lg:mb-3">
            <button onClick={goPrevMonth} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Vorheriger Monat">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-900">{MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button onClick={goNextMonth} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Nächster Monat">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Desktop: Monats-Grid */}
          <div className="hidden lg:block">
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS_HEADER.map((w) => (
                <div key={w} className="text-[10px] font-medium text-gray-400 py-1">{w}</div>
              ))}
              {monthGrid.flat().map((d, i) => {
                if (!d) return <div key={`empty-${i}`} className="min-h-[2.5rem]" />;
                const dKey = toDateKey(d);
                const selected = dKey === dateKey;
                const isTodayDate = dKey === todayKey;
                return (
                  <button
                    key={dKey}
                    onClick={() => selectDay(d)}
                    className={cn(
                      'min-h-[2.5rem] py-1 w-full rounded-full text-sm font-medium flex flex-col items-center justify-center transition-colors group',
                      selected ? `${BRAND_GRADIENT} text-white` : 'text-gray-700 hover:bg-gray-100',
                      d.getMonth() !== viewDate.getMonth() && 'text-gray-300'
                    )}
                  >
                    <span>{d.getDate()}</span>
                    {isTodayDate && !selected && events.filter((e) => eventOccursOnDate(e, dKey)).length === 0 && (
                      <span className="mt-0.5 w-1 h-1 rounded-full bg-violet-500" />
                    )}
                    <CategoryDots dateKey={dKey} events={events} size="sm" selected={selected} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile: Kompakte Monatsansicht (immer sichtbar) */}
          <div className="lg:hidden">
            <div className="grid grid-cols-7 gap-0.5 text-center">
              {WEEKDAYS_HEADER.map((w) => (
                <div key={w} className="text-[10px] font-medium text-gray-400 py-0.5">{w}</div>
              ))}
              {monthGrid.flat().map((d, i) => {
                if (!d) return <div key={`m-${i}`} className="min-h-[2rem]" />;
                const dKey = toDateKey(d);
                const selected = dKey === dateKey;
                const isTodayDate = dKey === todayKey;
                return (
                  <button
                    key={dKey}
                    onClick={() => selectDay(d)}
                    className={cn(
                      'min-h-[2rem] py-0.5 w-full rounded-lg text-xs font-medium flex flex-col items-center justify-center transition-colors',
                      selected ? `${BRAND_GRADIENT} text-white` : 'text-gray-700 hover:bg-gray-50',
                      d.getMonth() !== viewDate.getMonth() && 'text-gray-300'
                    )}
                  >
                    <span>{d.getDate()}</span>
                    {isTodayDate && !selected && events.filter((e) => eventOccursOnDate(e, dKey)).length === 0 && (
                      <span className="mt-0.5 w-1 h-1 rounded-full bg-violet-500" />
                    )}
                    <CategoryDots dateKey={dKey} events={events} size="sm" selected={selected} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* RECHTS: Hauptbereich – Gourmet-Style Karte */}
      <main className="flex-1 min-w-0">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header + View-Switcher Pills */}
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  {isToday ? 'Heute' : WEEKDAYS_LONG[currentDate.getDay()]}, {currentDate.getDate()}. {MONTHS[currentDate.getMonth()]}
                </h1>
                {summary && <p className="text-gray-500 text-sm mt-0.5">{summary}</p>}
              </div>
              {/* Daily Summary Attrappe */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                  🔥 1200 kcal
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-600">
                  💧 1.2L
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {(['agenda', 'woche', 'monat'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    viewMode === m ? `${BRAND_GRADIENT} text-white shadow-md` : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                  )}
                >
                  {m === 'agenda' ? 'Agenda' : m === 'woche' ? 'Woche' : 'Monat'}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div ref={agendaRef} className="p-4 sm:p-6 pb-44 md:pb-36">
            {viewMode === 'agenda' && (
              <div className="space-y-3">
                {agendaItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <span className="text-4xl mb-3">☀️</span>
                    <p className="text-lg font-medium text-gray-900">Der Tag gehört dir!</p>
                    <p className="text-gray-500 text-sm text-center">Tippe unten einen neuen Eintrag ein.</p>
                  </div>
                ) : (
                  agendaItems.map((item) => (
                    <SwipeableEventItem
                      key={item.id}
                      event={item.event}
                      onDelete={handleDeleteEvent}
                      onEdit={(e) => setEventModal({ open: true, date: e.date, time: e.time ?? '09:00', editEvent: e })}
                      enableSwipe={isMobile}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setEventModal({ open: true, date: item.event.date, time: item.event.time ?? '09:00', editEvent: item.event })}
                        onKeyDown={(k) => k.key === 'Enter' && setEventModal({ open: true, date: item.event.date, time: item.event.time ?? '09:00', editEvent: item.event })}
                        className={cn(
                          'bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all pr-12 cursor-pointer',
                          item.type === 'meal' && item.recipeLink && 'border-l-4 border-l-orange-500'
                        )}
                      >
                        {/* Spalte 1: Zeit + Repeat-Icon */}
                        <div className="min-w-[60px] text-right border-r border-gray-100 pr-4 shrink-0 flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-base font-bold text-gray-800">{item.time}</span>
                            {item.type === 'event' && 'isRecurring' in item && item.isRecurring && (
                              <Repeat className="w-4 h-4 text-violet-500 shrink-0" aria-label="Wiederkehrend" />
                            )}
                          </div>
                          {'endTime' in item.event && item.event.endTime && (
                            <div className="text-xs text-gray-400">{item.event.endTime}</div>
                          )}
                        </div>
                        {/* Spalte 2: Icon (Meal = Emoji oder UtensilsCrossed, Orange) */}
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xl',
                          item.type === 'event' && ('eventType' in item.event && item.event.eventType === 'health' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'),
                          item.type === 'meal' && 'bg-orange-50 text-orange-500',
                          item.type === 'workout' && 'bg-pink-100 text-pink-600'
                        )}>
                          {item.type === 'event' && <Calendar className="w-5 h-5" />}
                          {item.type === 'meal' && ('mealIcon' in item && item.mealIcon ? <span aria-hidden>{item.mealIcon}</span> : <UtensilsCrossed className="w-5 h-5" />)}
                          {item.type === 'workout' && <Dumbbell className="w-5 h-5" />}
                        </div>
                        {/* Spalte 3: Inhalt */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 truncate">{item.title}</div>
                          {item.type === 'meal' && 'subtitle' in item && item.subtitle && <div className="text-sm text-gray-400 truncate">{item.subtitle}</div>}
                          {item.type === 'meal' && 'recipeLink' in item && item.recipeLink && (
                            <Link href={item.recipeLink} className="inline-flex items-center gap-1 mt-0.5 text-xs font-medium text-orange-600 hover:text-orange-700" onClick={(e) => e.stopPropagation()}>
                              Zum Rezept <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                          {item.type === 'event' && 'location' in item.event && item.event.location && (
                            <div className="text-xs text-gray-400 truncate">📍 {item.event.location}</div>
                          )}
                        </div>
                      </div>
                    </SwipeableEventItem>
                  ))
                )}
              </div>
            )}

            {viewMode === 'woche' && (
              <div className="relative border-l-2 border-gray-200 pl-4 md:pl-6 -ml-4 md:-ml-6 space-y-0">
                {weekDays.map((d) => {
                  const dKey = toDateKey(d);
                  const items = getDayEvents(dKey, events);
                  const isTodayDate = dKey === todayKey;
                  const isEmpty = items.length === 0;
                  const headerLabel = `${isTodayDate ? 'Heute, ' : ''}${d.getDate()}. ${MONTHS[d.getMonth()].slice(0, 3)}`;
                  return (
                    <section key={dKey} className="relative">
                      {/* Timeline-Knoten auf der vertikalen Linie */}
                      <span className={cn('absolute -left-4 top-2.5 w-2.5 h-2.5 rounded-full border-2 md:-left-6 md:top-3', isEmpty ? 'bg-gray-100 border-gray-200' : 'bg-white border-violet-400 shadow-sm')} />
                      <h3
                        className={cn(
                          'sticky top-16 z-10 py-2.5 -mx-4 md:-mx-6 px-4 md:px-6 -mt-2 mb-1 text-sm font-semibold bg-white/95 backdrop-blur-sm border-b border-transparent',
                          isTodayDate ? 'text-violet-600' : 'text-gray-700'
                        )}
                      >
                        {WEEKDAYS_SHORT[d.getDay()]} {headerLabel}
                      </h3>
                      {isEmpty ? (
                        <div className="py-1 mb-2 opacity-50">
                          <span className="text-xs text-gray-400">
                            {WEEKDAYS_SHORT[d.getDay()]} {d.getDate()}.
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2 pb-6">
                          {items.map((item) => (
                            <SwipeableEventItem
                              key={item.id}
                              event={item.event}
                              onDelete={handleDeleteEvent}
                              onEdit={(e) => setEventModal({ open: true, date: e.date, time: e.time ?? '09:00', editEvent: e })}
                              enableSwipe={isMobile}
                            >
                              <div
                                role="button"
                                tabIndex={0}
                                onClick={() => setEventModal({ open: true, date: item.event.date, time: item.event.time ?? '09:00', editEvent: item.event })}
                                onKeyDown={(k) => k.key === 'Enter' && setEventModal({ open: true, date: item.event.date, time: item.event.time ?? '09:00', editEvent: item.event })}
                                className={cn(
                                  'bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all pr-12 cursor-pointer',
                                  item.type === 'meal' && item.recipeLink && 'border-l-4 border-l-orange-500'
                                )}
                              >
                                <div className="min-w-[48px] text-right border-r border-gray-100 pr-3 shrink-0 flex flex-col items-end gap-0.5">
                                  <div className="flex items-center gap-1 justify-end">
                                    <span className="text-sm font-bold text-gray-800">{item.time}</span>
                                    {item.type === 'event' && 'isRecurring' in item && item.isRecurring && (
                                      <Repeat className="w-3.5 h-3.5 text-violet-500 shrink-0" aria-label="Wiederkehrend" />
                                    )}
                                  </div>
                                </div>
                                <div className={cn(
                                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-lg',
                                  item.type === 'event' && ('eventType' in item.event && item.event.eventType === 'health' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'),
                                  item.type === 'meal' && 'bg-orange-50 text-orange-500',
                                  item.type === 'workout' && 'bg-pink-100 text-pink-600'
                                )}>
                                  {item.type === 'event' && <Calendar className="w-4 h-4" />}
                                  {item.type === 'meal' && ('mealIcon' in item && item.mealIcon ? <span aria-hidden>{item.mealIcon}</span> : <UtensilsCrossed className="w-4 h-4" />)}
                                  {item.type === 'workout' && <Dumbbell className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-800 truncate text-sm md:text-base">{item.title}</div>
                                  {item.type === 'meal' && 'subtitle' in item && item.subtitle && <div className="text-xs text-gray-400 truncate">{item.subtitle}</div>}
                                  {item.type === 'meal' && 'recipeLink' in item && item.recipeLink && (
                                    <Link href={item.recipeLink} className="text-xs font-medium text-orange-600 hover:text-orange-700" onClick={(e) => e.stopPropagation()}>
                                      Zum Rezept <ExternalLink className="w-3 h-3 inline" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            </SwipeableEventItem>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}

            {viewMode === 'monat' && (
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS_HEADER.map((w) => (
                  <div key={w} className="text-center text-xs font-medium text-gray-400 py-2">{w}</div>
                ))}
                {monthGrid.flat().map((d, i) => {
                  if (!d) return <div key={`mon-${i}`} className="min-h-[60px]" />;
                  const dKey = toDateKey(d);
                  const items = getDayEvents(dKey, events);
                  const selected = dKey === dateKey;
                  const isTodayDate = dKey === todayKey;
                  return (
                    <button
                      key={dKey}
                      onClick={() => selectDay(d)}
                      title={items.length > 0 ? `${items.length} Einträge` : undefined}
                      className={cn(
                        'min-h-[60px] p-2 rounded-xl text-left transition-all group',
                        selected ? `${BRAND_GRADIENT} text-white` : 'hover:bg-gray-50',
                        d.getMonth() !== viewDate.getMonth() && 'opacity-40'
                      )}
                    >
                      <span className={cn('text-sm font-medium', selected ? 'text-white' : 'text-gray-700')}>{d.getDate()}</span>
                      {isTodayDate && !selected && items.length === 0 && <span className="block w-1 h-1 rounded-full bg-violet-500 mt-0.5" />}
                      {getCategoryDotsForDate(dKey, events).length > 0 ? (
                        <div className="mt-1 group-hover:scale-110 transition-transform origin-center">
                          <CategoryDots dateKey={dKey} events={events} size="md" selected={selected} />
                        </div>
                      ) : (
                        <div className="mt-1 min-h-[0.5rem]" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Command Bar – Mobile: zentriert über Navbar, Desktop: im Content-Bereich (rechts der Sidebar) */}
      <motion.div
        className="fixed left-0 right-0 px-4 md:bottom-8 md:left-64 md:right-0 md:px-6 z-[60] pb-[env(safe-area-inset-bottom)] pointer-events-none bottom-[calc(100px+env(safe-area-inset-bottom))] md:bottom-8"
        initial={false}
        animate={{
          y: eventModal.open ? '100%' : 0,
          opacity: eventModal.open ? 0 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className={cn('space-y-2 max-w-2xl mx-auto', eventModal.open ? 'pointer-events-none' : 'pointer-events-auto')}>
          {successMessage && (
            <p className="text-sm text-green-600 font-medium animate-in fade-in duration-200 text-center bg-green-50 rounded-full py-2 px-4 border border-green-100">
              ✓ {successMessage}
            </p>
          )}
          {parsedLive?.recurrenceLabel && !successMessage && (
            <p className="text-sm text-violet-600 font-medium animate-in fade-in duration-200 text-center">
              🔄 {parsedLive.recurrenceLabel}
            </p>
          )}
          {smartTags.length > 0 && !successMessage && (
            <div className="flex flex-wrap gap-2 justify-center animate-in fade-in duration-200">
              {smartTags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
          <form
            onSubmit={handleMagicSubmit}
            className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-md shadow-xl border border-gray-100 rounded-full min-w-0 w-full"
          >
            <button
              type="button"
              onClick={() => setEventModal({ open: true, date: dateKey, time: '09:00' })}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Termin hinzufügen"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={magicInput}
              onChange={(e) => setMagicInput(e.target.value)}
              placeholder='z.B. "Jeden Freitag 18 Uhr Fußball" oder "Morgen 14 Uhr Meeting"'
              className="flex-1 min-w-0 min-h-[44px] px-4 rounded-full bg-transparent border-none focus:ring-0 outline-none text-base placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!magicInput.trim()}
              className={cn('shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-colors', BRAND_GRADIENT, BRAND_GRADIENT_HOVER)}
              aria-label="Hinzufügen"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </motion.div>

      <EventDetailSheet
        isOpen={eventModal.open}
        onClose={() => setEventModal({ open: false, date: '', time: undefined })}
        date={eventModal.editEvent?.date ?? eventModal.date}
        defaultTime={eventModal.editEvent?.time ?? eventModal.time ?? '09:00'}
        editEvent={eventModal.editEvent}
        events={events}
        onSubmit={handleEventSheetSubmit}
      />
      {recipeModal && <RecipePickerModal isOpen={recipeModal.open} onClose={() => setRecipeModal(null)} date={recipeModal.date} slot={recipeModal.slot} defaultTime={recipeModal.time} onSelect={handleAddMealFromRecipe} />}
    </PageTransition>
  );
}
