'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  ChevronDown,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { rrulestr } from 'rrule';
import {
  getCalendarEvents,
  saveCalendarEvents,
  removeCalendarEvent,
  updateCalendarEvent,
  type CalendarEvent,
  type CustomEventType,
} from '@/actions/calendar-actions';
import { parseNaturalLanguage, getSmartTags, type ParsedEvent, type SmartTag } from '@/lib/parse-natural-language';
import { EventCreateModal } from './event-create-modal';
import { RecipePickerModal } from './recipe-picker-modal';
import { SwipeableEventItem } from './swipeable-event-item';

const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type AgendaItem =
  | { id: string; type: 'event'; time: string; title: string; subtitle?: string; event: CalendarEvent }
  | { id: string; type: 'meal'; time: string; title: string; subtitle?: string; event: CalendarEvent; recipeLink?: string }
  | { id: string; type: 'workout'; time: string; title: string; event: CalendarEvent };

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
      const label = e.recipeName ? `${e.slot === 'breakfast' ? 'Frühstück' : e.slot === 'lunch' ? 'Mittagessen' : 'Abendessen'}: ${e.recipeName}` : e.slot;
      const cal = e.calories ? (String(e.calories).toLowerCase().includes('kcal') ? e.calories : `${e.calories} kcal`) : undefined;
      return { id: e.id, type: 'meal' as const, time: e.time || '12:00', title: label, subtitle: cal, event: e, recipeLink: e.resultId ? '/tools/recipe' : undefined };
    }
    if (e.type === 'workout') return { id: e.id, type: 'workout' as const, time: e.time || '08:00', title: e.label || 'Workout', event: e };
    const subtitle = ('rrule' in e && e.rrule) ? '🔄 Wiederkehrend' : undefined;
    return { id: e.id, type: 'event' as const, time: e.time || '09:00', title: e.title, event: e, subtitle };
  });
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

/** Kategorien pro Datum (max 4, Reihenfolge: Termin, Essen, Sport) */
type CategoryColor = 'blue' | 'orange' | 'pink';

function getCategoryDotsForDate(dateKey: string, events: CalendarEvent[]): CategoryColor[] {
  const dayEvents = events.filter((e) => eventOccursOnDate(e, dateKey));
  const categories = new Set<CategoryColor>();
  for (const e of dayEvents) {
    if (e.type === 'custom') categories.add('blue');
    else if (e.type === 'meal') categories.add('orange');
    else if (e.type === 'workout') categories.add('pink');
  }
  const order: CategoryColor[] = ['blue', 'orange', 'pink'];
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
  const startPad = (first.getDay() + 7) % 7;
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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [magicInput, setMagicInput] = useState('');
  const [mobileMonthOpen, setMobileMonthOpen] = useState(false);
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
  const [recipeModal, setRecipeModal] = useState<{ open: boolean; date: string; slot: 'breakfast' | 'lunch' | 'dinner'; time: string } | null>(null);

  const loadEvents = useCallback(async () => {
    const res = await getCalendarEvents();
    if (res.success && res.events) setEvents(res.events);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

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
    setMobileMonthOpen(false);
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
    if (parsed.isMeal) {
      const slot = parsed.time < '11:00' ? 'breakfast' : parsed.time < '15:00' ? 'lunch' : 'dinner';
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

  const handleAddCustomEvent = async (data: { type: CustomEventType; title: string; date: string; time: string; endTime?: string; id?: string }) => {
    if (data.id) {
      await updateCalendarEvent(data.id, { eventType: data.type, title: data.title, date: data.date, time: data.time, endTime: data.endTime });
      setEvents((prev) => prev.map((e) => (e.id === data.id ? { ...e, eventType: data.type, title: data.title, date: data.date, time: data.time, endTime: data.endTime } : e)) as CalendarEvent[]);
      setEventModal({ open: false, date: '', time: undefined });
    } else {
      const newEvent: CalendarEvent = { id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, type: 'custom', eventType: data.type, title: data.title, date: data.date, time: data.time, endTime: data.endTime };
      const next = [...events, newEvent];
      setEvents(next);
      await saveCalendarEvents(next);
    }
  };

  const handleAddMealFromRecipe = async (recipe: { id: string; resultId: string; recipeName: string; stats?: { time?: string; calories?: string } }, slot: 'breakfast' | 'lunch' | 'dinner', date: string, time: string) => {
    const newEvent: CalendarEvent = { id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, type: 'meal', slot, date, time, resultId: recipe.resultId, recipeId: recipe.id, recipeName: recipe.recipeName, calories: recipe.stats?.calories, prepTime: recipe.stats?.time };
    const next = [...events, newEvent];
    setEvents(next);
    await saveCalendarEvents(next);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const next = events.filter((e) => e.id !== eventId);
    setEvents(next);
    await saveCalendarEvents(next);
  };

  const eventCountForDate = (d: Date) => events.filter((e) => eventOccursOnDate(e, toDateKey(d))).length;

  return (
    <PageTransition className="flex flex-col lg:flex-row gap-6 lg:gap-8 max-w-6xl mx-auto">
      {/* LINKS: Mini-Monats-Kalender (Desktop) / Mobile Week + Accordion */}
      <aside className="shrink-0 lg:w-64">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
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
              {WEEKDAYS_SHORT.map((w) => (
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
                      selected ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100',
                      d.getMonth() !== viewDate.getMonth() && 'text-gray-300'
                    )}
                  >
                    <span>{d.getDate()}</span>
                    {isTodayDate && !selected && events.filter((e) => eventOccursOnDate(e, dKey)).length === 0 && (
                      <span className="mt-0.5 w-1 h-1 rounded-full bg-orange-500" />
                    )}
                    <CategoryDots dateKey={dKey} events={events} size="sm" selected={selected} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile: Week Slider + Accordion */}
          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {weekDays.map((d) => {
                const dKey = toDateKey(d);
                const active = dKey === dateKey;
                const isTodayDate = dKey === todayKey;
                return (
                  <button
                    key={dKey}
                    onClick={() => selectDay(d)}
                    className={cn(
                      'shrink-0 w-12 py-2.5 rounded-xl flex flex-col items-center gap-0.5 transition-colors',
                      active ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-50 text-gray-700 border border-gray-100'
                    )}
                  >
                    <span className="text-[10px] font-medium opacity-80">{WEEKDAYS_SHORT[d.getDay()]}</span>
                    <span className="text-sm font-bold">{d.getDate()}</span>
                    {isTodayDate && !active && events.filter((e) => eventOccursOnDate(e, dKey)).length === 0 && (
                      <span className="w-1 h-1 rounded-full bg-orange-500" />
                    )}
                    <CategoryDots dateKey={dKey} events={events} size="sm" selected={active} />
                  </button>
                );
              })}
            </div>
            <button onClick={() => setMobileMonthOpen(!mobileMonthOpen)} className="w-full mt-2 flex items-center justify-center gap-1 py-2 text-sm text-gray-500 hover:text-gray-700">
              <span>Monatsansicht</span>
              <ChevronDown className={cn('w-4 h-4 transition-transform', mobileMonthOpen && 'rotate-180')} />
            </button>
            {mobileMonthOpen && (
              <div className="mt-2 pt-3 border-t border-gray-100 grid grid-cols-7 gap-0.5 text-center">
                {WEEKDAYS_SHORT.map((w) => (
                  <div key={w} className="text-[10px] font-medium text-gray-400 py-1">{w}</div>
                ))}
                {monthGrid.flat().map((d, i) => {
                  if (!d) return <div key={`m-${i}`} className="min-h-[2.5rem]" />;
                  const dKey = toDateKey(d);
                  const selected = dKey === dateKey;
                  const isTodayDate = dKey === todayKey;
                  return (
                    <button
                      key={dKey}
                      onClick={() => selectDay(d)}
                      className={cn(
                        'min-h-[2.5rem] py-1 w-full rounded-full text-sm font-medium flex flex-col items-center justify-center',
                        selected ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100',
                        d.getMonth() !== viewDate.getMonth() && 'text-gray-300'
                      )}
                    >
                      <span>{d.getDate()}</span>
                      {isTodayDate && !selected && events.filter((e) => eventOccursOnDate(e, dKey)).length === 0 && (
                        <span className="mt-0.5 w-1 h-1 rounded-full bg-orange-500" />
                      )}
                      <CategoryDots dateKey={dKey} events={events} size="sm" selected={selected} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* RECHTS: Hauptbereich – Gourmet-Style Karte */}
      <main className="flex-1 min-w-0">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header + View-Switcher Pills */}
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
              {isToday ? 'Heute' : WEEKDAYS_LONG[currentDate.getDay()]}, {currentDate.getDate()}. {MONTHS[currentDate.getMonth()]}
            </h1>
            {summary && <p className="text-gray-500 text-sm">{summary}</p>}
            <div className="flex gap-2 mt-4">
              {(['agenda', 'woche', 'monat'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setViewMode(m)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-medium transition-all',
                    viewMode === m ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
                  )}
                >
                  {m === 'agenda' ? 'Agenda' : m === 'woche' ? 'Woche' : 'Monat'}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div ref={agendaRef} className="p-4 sm:p-6 pb-40 md:pb-32">
            {viewMode === 'agenda' && (
              <div className="space-y-3">
                {agendaItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4">
                    <span className="text-5xl mb-4">☀️</span>
                    <p className="text-xl font-semibold text-gray-900">Der Tag gehört dir!</p>
                    <p className="text-gray-500 mt-1 text-center">Füge Termine, Mahlzeiten oder Workouts hinzu.</p>
                    <button onClick={() => setEventModal({ open: true, date: dateKey, time: '09:00' })} className="mt-6 px-6 py-3 rounded-full bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors">
                      Ersten Eintrag hinzufügen
                    </button>
                  </div>
                ) : (
                  agendaItems.map((item) => (
                    <SwipeableEventItem
                      key={item.id}
                      event={item.event}
                      onDelete={handleDeleteEvent}
                      onEdit={(e) => e.type === 'custom' && setEventModal({ open: true, date: e.date, time: e.time, editEvent: e })}
                      enableSwipe={isMobile}
                    >
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all pr-12">
                        {/* Spalte 1: Zeit */}
                        <div className="min-w-[60px] text-right border-r border-gray-100 pr-4 shrink-0">
                          <div className="text-base font-bold text-gray-800">{item.time}</div>
                          {'endTime' in item.event && item.event.endTime && (
                            <div className="text-xs text-gray-400 mt-0.5">{item.event.endTime}</div>
                          )}
                        </div>
                        {/* Spalte 2: Icon */}
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', item.type === 'event' && 'bg-blue-100 text-blue-600', item.type === 'meal' && 'bg-orange-100 text-orange-600', item.type === 'workout' && 'bg-pink-100 text-pink-600')}>
                          {item.type === 'event' && <Calendar className="w-5 h-5" />}
                          {item.type === 'meal' && <UtensilsCrossed className="w-5 h-5" />}
                          {item.type === 'workout' && <Dumbbell className="w-5 h-5" />}
                        </div>
                        {/* Spalte 3: Inhalt */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-gray-800 truncate">{item.title}</div>
                          {('subtitle' in item && item.subtitle) && <div className="text-sm text-gray-400 truncate">{item.subtitle}</div>}
                          {item.type === 'meal' && 'recipeLink' in item && item.recipeLink && (
                            <Link href={item.recipeLink} className="inline-flex items-center gap-1 mt-0.5 text-xs font-medium text-orange-600 hover:text-orange-700">
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
                      <span className={cn('absolute -left-4 top-2.5 w-2.5 h-2.5 rounded-full border-2 md:-left-6 md:top-3', isEmpty ? 'bg-gray-100 border-gray-200' : 'bg-white border-orange-400 shadow-sm')} />
                      <h3
                        className={cn(
                          'sticky top-16 z-10 py-2.5 -mx-4 md:-mx-6 px-4 md:px-6 -mt-2 mb-1 text-sm font-semibold bg-white/95 backdrop-blur-sm border-b border-transparent',
                          isTodayDate ? 'text-orange-600' : 'text-gray-700'
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
                              onEdit={(e) => e.type === 'custom' && setEventModal({ open: true, date: e.date, time: e.time, editEvent: e })}
                              enableSwipe={isMobile}
                            >
                              <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-all pr-12">
                                <div className="min-w-[48px] text-right border-r border-gray-100 pr-3 shrink-0">
                                  <div className="text-sm font-bold text-gray-800">{item.time}</div>
                                </div>
                                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', item.type === 'event' && 'bg-blue-100 text-blue-600', item.type === 'meal' && 'bg-orange-100 text-orange-600', item.type === 'workout' && 'bg-pink-100 text-pink-600')}>
                                  {item.type === 'event' && <Calendar className="w-4 h-4" />}
                                  {item.type === 'meal' && <UtensilsCrossed className="w-4 h-4" />}
                                  {item.type === 'workout' && <Dumbbell className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-gray-800 truncate text-sm md:text-base">{item.title}</div>
                                  {item.type === 'meal' && 'recipeLink' in item && item.recipeLink && (
                                    <Link href={item.recipeLink} className="text-xs text-orange-600 hover:text-orange-700" onClick={(e) => e.stopPropagation()}>
                                      Zum Rezept →
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
                {WEEKDAYS_SHORT.map((w) => (
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
                        selected ? 'bg-orange-500 text-white' : 'hover:bg-gray-50',
                        d.getMonth() !== viewDate.getMonth() && 'opacity-40'
                      )}
                    >
                      <span className={cn('text-sm font-medium', selected ? 'text-white' : 'text-gray-700')}>{d.getDate()}</span>
                      {isTodayDate && !selected && items.length === 0 && <span className="block w-1 h-1 rounded-full bg-orange-500 mt-0.5" />}
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

      {/* Floating Command Bar – Milchglas + Smart Tags */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 md:bottom-8 z-[110] pb-[env(safe-area-inset-bottom)] pointer-events-none">
        <div className="pointer-events-auto space-y-2">
          {successMessage && (
            <p className="text-sm text-green-600 font-medium animate-in fade-in duration-200 text-center bg-green-50 rounded-full py-2 px-4 border border-green-100">
              ✓ {successMessage}
            </p>
          )}
          {parsedLive?.recurrenceLabel && !successMessage && (
            <p className="text-sm text-orange-600 font-medium animate-in fade-in duration-200 text-center">
              🔄 {parsedLive.recurrenceLabel}
            </p>
          )}
          {smartTags.length > 0 && !successMessage && (
            <div className="flex flex-wrap gap-2 justify-center animate-in fade-in duration-200">
              {smartTags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
          <form
            onSubmit={handleMagicSubmit}
            className="flex items-center gap-2 p-2 bg-white/90 backdrop-blur-xl shadow-2xl border border-white/50 rounded-full"
          >
            <input
              type="text"
              value={magicInput}
              onChange={(e) => setMagicInput(e.target.value)}
              placeholder='z.B. "Jeden Freitag 18 Uhr Fußball" oder "Morgen 14 Uhr Meeting im Vapiano"'
              className="flex-1 min-h-[44px] px-5 rounded-full bg-transparent border-none focus:ring-0 outline-none text-base placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!magicInput.trim()}
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-orange-500 text-white disabled:opacity-40 hover:bg-orange-600 transition-colors"
              aria-label="Hinzufügen"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      <div className="fixed right-4 bottom-[7.5rem] md:right-8 md:bottom-24 z-[105] flex flex-col-reverse gap-3">
        <button onClick={() => setRecipeModal({ open: true, date: dateKey, slot: 'dinner', time: '18:30' })} className="w-14 h-14 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30 flex items-center justify-center hover:bg-orange-600 transition-colors" aria-label="Rezept hinzufügen">
          <ChefHat className="w-6 h-6" />
        </button>
        <button onClick={() => setEventModal({ open: true, date: dateKey, time: '09:00' })} className="w-14 h-14 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 flex items-center justify-center hover:bg-orange-600 transition-colors" aria-label="Termin hinzufügen">
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <EventCreateModal
        isOpen={eventModal.open}
        onClose={() => setEventModal({ open: false, date: '', time: undefined })}
        date={eventModal.editEvent?.date ?? eventModal.date}
        defaultTime={eventModal.editEvent?.time ?? eventModal.time}
        editEvent={eventModal.editEvent && eventModal.editEvent.type === 'custom' ? { id: eventModal.editEvent.id, eventType: eventModal.editEvent.eventType, title: eventModal.editEvent.title, date: eventModal.editEvent.date, time: eventModal.editEvent.time, endTime: ('endTime' in eventModal.editEvent ? eventModal.editEvent.endTime : undefined) } : undefined}
        onSubmit={handleAddCustomEvent}
      />
      {recipeModal && <RecipePickerModal isOpen={recipeModal.open} onClose={() => setRecipeModal(null)} date={recipeModal.date} slot={recipeModal.slot} defaultTime={recipeModal.time} onSelect={handleAddMealFromRecipe} />}
    </PageTransition>
  );
}
