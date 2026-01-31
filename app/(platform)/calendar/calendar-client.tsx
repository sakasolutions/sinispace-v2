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

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type AgendaItem =
  | { id: string; type: 'event'; time: string; title: string; event: CalendarEvent }
  | { id: string; type: 'meal'; time: string; title: string; subtitle?: string; event: CalendarEvent; recipeLink?: string }
  | { id: string; type: 'workout'; time: string; title: string; event: CalendarEvent };

function getDayEvents(dateKey: string, events: CalendarEvent[]): AgendaItem[] {
  const dayEvents = events
    .filter((e) => e.date === dateKey)
    .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  const items: AgendaItem[] = dayEvents.map((e) => {
    if (e.type === 'meal') {
      const label = e.recipeName ? `${e.slot === 'breakfast' ? 'Frühstück' : e.slot === 'lunch' ? 'Mittagessen' : 'Abendessen'}: ${e.recipeName}` : e.slot;
      return { id: e.id, type: 'meal' as const, time: e.time || '12:00', title: label, subtitle: e.calories ? `${e.calories} kcal` : undefined, event: e, recipeLink: e.resultId ? '/tools/recipe' : undefined };
    }
    if (e.type === 'workout') return { id: e.id, type: 'workout' as const, time: e.time || '08:00', title: e.label || 'Workout', event: e };
    return { id: e.id, type: 'event' as const, time: e.time || '09:00', title: e.title, event: e };
  });
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

function looksLikeFood(text: string): boolean {
  const t = text.toLowerCase();
  const keywords = ['essen', 'pizza', 'abendessen', 'mittag', 'frühstück', 'kochen', 'rezept', 'pasta', 'salat', 'suppe', 'brunch'];
  return keywords.some((k) => t.includes(k));
}

function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseMagicInput(text: string, baseDate: Date): { date: string; time: string; title: string; isMeal: boolean } {
  const t = text.trim();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0, 0);
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
  const wdays: [number, string][] = [[0, 'sonntag'], [1, 'montag'], [2, 'dienstag'], [3, 'mittwoch'], [4, 'donnerstag'], [5, 'freitag'], [6, 'samstag']];
  if (t.includes('morgen')) resultDate.setDate(resultDate.getDate() + 1);
  else if (t.includes('übermorgen')) resultDate.setDate(resultDate.getDate() + 2);
  else {
    for (const [targetDay, name] of wdays) {
      if (t.includes(name)) {
        let diff = (targetDay - todayDay + 7) % 7;
        if (diff === 0) diff = 7;
        resultDate.setDate(resultDate.getDate() + diff);
        break;
      }
    }
  }
  title = t.replace(/\b(morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, '').replace(/\d{1,2}[:\s.]?\d{0,2}\s*uhr/gi, '').replace(/\d{1,2}[:\s.]\d{2}\b/g, '').replace(/\s+/g, ' ').trim();
  if (!title) title = t;
  return { date: toLocalDateString(resultDate), time, title: title.charAt(0).toUpperCase() + title.slice(1), isMeal: looksLikeFood(t) };
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
  const agendaRef = useRef<HTMLDivElement>(null);

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

  const handleMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicInput.trim()) return;
    const { date, time, title, isMeal } = parseMagicInput(magicInput, currentDate);
    setMagicInput('');
    if (isMeal) {
      const slot = time < '11:00' ? 'breakfast' : time < '15:00' ? 'lunch' : 'dinner';
      const newEvent: CalendarEvent = { id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, type: 'meal', slot, date, time, recipeName: title };
      setEvents((prev) => [...prev, newEvent]);
      await saveCalendarEvents([...events, newEvent]);
    } else {
      const newEvent: CalendarEvent = { id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, type: 'custom', eventType: 'reminder', title, date, time };
      setEvents((prev) => [...prev, newEvent]);
      await saveCalendarEvents([...events, newEvent]);
    }
  };

  const handleAddCustomEvent = async (data: { type: CustomEventType; title: string; date: string; time: string; endTime?: string }) => {
    const newEvent: CalendarEvent = { id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, type: 'custom', eventType: data.type, title: data.title, date: data.date, time: data.time, endTime: data.endTime };
    const next = [...events, newEvent];
    setEvents(next);
    await saveCalendarEvents(next);
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

  const eventCountForDate = (d: Date) => events.filter((e) => e.date === toDateKey(d)).length;

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
                if (!d) return <div key={`empty-${i}`} className="h-8" />;
                const dKey = toDateKey(d);
                const selected = dKey === dateKey;
                const isTodayDate = dKey === todayKey;
                const count = eventCountForDate(d);
                return (
                  <button
                    key={dKey}
                    onClick={() => selectDay(d)}
                    className={cn(
                      'h-8 w-8 mx-auto rounded-full text-sm font-medium flex items-center justify-center relative transition-colors',
                      selected ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100',
                      d.getMonth() !== viewDate.getMonth() && 'text-gray-300'
                    )}
                  >
                    {d.getDate()}
                    {isTodayDate && !selected && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />}
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
                    {isTodayDate && !active && <span className="w-1 h-1 rounded-full bg-orange-500" />}
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
                  if (!d) return <div key={`m-${i}`} className="h-8" />;
                  const dKey = toDateKey(d);
                  const selected = dKey === dateKey;
                  const isTodayDate = dKey === todayKey;
                  return (
                    <button
                      key={dKey}
                      onClick={() => selectDay(d)}
                      className={cn(
                        'h-8 w-8 mx-auto rounded-full text-sm font-medium flex items-center justify-center relative',
                        selected ? 'bg-orange-500 text-white' : 'text-gray-700 hover:bg-gray-100',
                        d.getMonth() !== viewDate.getMonth() && 'text-gray-300'
                      )}
                    >
                      {d.getDate()}
                      {isTodayDate && !selected && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-500" />}
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
          <div ref={agendaRef} className="p-4 sm:p-6 pb-36 lg:pb-40">
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
                    <SwipeableEventItem key={item.id} event={item.event} onDelete={handleDeleteEvent} colorClass="rounded-2xl overflow-hidden">
                      <div className={cn('flex items-center gap-4 p-4 border shadow-sm rounded-2xl', item.type === 'event' && 'border-blue-100', item.type === 'meal' && 'border-orange-100', item.type === 'workout' && 'border-pink-100')}>
                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', item.type === 'event' && 'bg-blue-100 text-blue-600', item.type === 'meal' && 'bg-orange-100 text-orange-600', item.type === 'workout' && 'bg-pink-100 text-pink-600')}>
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
                            <Link href={item.recipeLink} className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-orange-600 hover:text-orange-700">
                              Zum Rezept <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </SwipeableEventItem>
                  ))
                )}
              </div>
            )}

            {viewMode === 'woche' && (
              <div className="space-y-4">
                {weekDays.map((d) => {
                  const dKey = toDateKey(d);
                  const items = getDayEvents(dKey, events);
                  const isTodayDate = dKey === todayKey;
                  return (
                    <div key={dKey} className="border-b border-gray-100 pb-4 last:border-0">
                      <h3 className={cn('text-sm font-semibold mb-2', isTodayDate ? 'text-orange-600' : 'text-gray-700')}>
                        {WEEKDAYS_SHORT[d.getDay()]} {d.getDate()}. {isTodayDate && '· Heute'}
                      </h3>
                      {items.length === 0 ? (
                        <p className="text-sm text-gray-400">Keine Einträge</p>
                      ) : (
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-xl bg-gray-50">
                              <span className="text-sm font-medium text-gray-600 w-12">{item.time}</span>
                              <span className="font-medium text-gray-900">{item.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                      className={cn(
                        'min-h-[60px] p-2 rounded-xl text-left transition-colors',
                        selected ? 'bg-orange-500 text-white' : 'hover:bg-gray-50',
                        d.getMonth() !== viewDate.getMonth() && 'opacity-40'
                      )}
                    >
                      <span className={cn('text-sm font-medium', selected ? 'text-white' : 'text-gray-700')}>{d.getDate()}</span>
                      {isTodayDate && !selected && <span className="block w-1 h-1 rounded-full bg-orange-500 mt-0.5" />}
                      {items.length > 0 && <span className="block text-[10px] mt-1 opacity-75">{items.length} Einträge</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Magic Input – Schwebende Kapsel */}
      <div className="fixed bottom-24 left-0 right-0 z-40 md:bottom-6 md:left-[calc(16rem+2rem)] md:right-8 pb-[env(safe-area-inset-bottom)] pt-4 pointer-events-none">
        <div className="max-w-2xl mx-auto px-4 pointer-events-auto">
          <form onSubmit={handleMagicSubmit} className="flex gap-2 p-2 bg-white rounded-2xl border border-gray-200 shadow-xl">
            <input
              type="text"
              value={magicInput}
              onChange={(e) => setMagicInput(e.target.value)}
              placeholder='Neuer Eintrag... (z.B. "Morgen 14 Uhr Meeting")'
              className="flex-1 min-h-[48px] px-4 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-orange-200 outline-none text-base placeholder:text-gray-400"
            />
            <button type="submit" disabled={!magicInput.trim()} className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-orange-500 text-white disabled:opacity-40 hover:bg-orange-600 transition-colors" aria-label="Hinzufügen">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      <div className="fixed right-4 bottom-36 md:right-8 md:bottom-24 z-30">
        <button onClick={() => setRecipeModal({ open: true, date: dateKey, slot: 'dinner', time: '18:30' })} className="w-14 h-14 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30 flex items-center justify-center hover:bg-orange-600 transition-colors" aria-label="Rezept hinzufügen">
          <ChefHat className="w-6 h-6" />
        </button>
      </div>

      <EventCreateModal isOpen={eventModal.open} onClose={() => setEventModal({ open: false, date: '', time: undefined })} date={eventModal.date} defaultTime={eventModal.time} onSubmit={handleAddCustomEvent} />
      {recipeModal && <RecipePickerModal isOpen={recipeModal.open} onClose={() => setRecipeModal(null)} date={recipeModal.date} slot={recipeModal.slot} defaultTime={recipeModal.time} onSelect={handleAddMealFromRecipe} />}
    </PageTransition>
  );
}
