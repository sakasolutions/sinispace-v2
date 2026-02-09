'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Send, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { rrulestr } from 'rrule';
import {
  getCalendarEvents,
  saveCalendarEvents,
  removeCalendarEvent,
  type CalendarEvent,
} from '@/actions/calendar-actions';
import { parseNaturalLanguage } from '@/lib/parse-natural-language';
import { EventDetailSheet } from './event-detail-sheet';
import { SwipeableEventItem } from './swipeable-event-item';
import { DashboardShell } from '@/components/platform/dashboard-shell';

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
  | { id: string; type: 'event'; time: string; title: string; subtitle?: string; isRecurring?: boolean; event: CalendarEvent }
  | { id: string; type: 'meal'; time: string; title: string; subtitle?: string; event: CalendarEvent; recipeLink?: string; imageUrl?: string | null }
  | { id: string; type: 'workout'; time: string; title: string; event: CalendarEvent };

/** Blau = Arbeit/Termin, Orange = Essen, Pink = Privat (wie Spec) */
function getAccentForItem(item: AgendaItem): { border: string; bar: string; text: string } {
  if (item.type === 'meal') return { border: 'border-l-orange-500', bar: 'bg-orange-500', text: 'text-orange-600' };
  if (item.type === 'workout') return { border: 'border-l-pink-500', bar: 'bg-pink-500', text: 'text-pink-600' };
  const eventType = item.type === 'event' && 'eventType' in item.event ? item.event.eventType : 'reminder';
  if (eventType === 'work' || eventType === 'meeting') return { border: 'border-l-blue-500', bar: 'bg-blue-500', text: 'text-blue-600' };
  return { border: 'border-l-pink-500', bar: 'bg-pink-500', text: 'text-pink-600' };
}

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
      const recipeLink = e.resultId ? `/tools/recipe?open=${encodeURIComponent(e.resultId)}` : undefined;
      const imageUrl = 'imageUrl' in e ? e.imageUrl : undefined;
      return { id: e.id, type: 'meal' as const, time: e.time || '12:00', title: label, subtitle, event: e, recipeLink, imageUrl };
    }
    if (e.type === 'workout') return { id: e.id, type: 'workout' as const, time: e.time || '08:00', title: e.label || 'Workout', event: e };
    const isRecurring = !!(e.type === 'custom' && 'rrule' in e && e.rrule);
    return { id: e.id, type: 'event' as const, time: e.time || '09:00', title: e.title, event: e, isRecurring };
  });
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

/** Datum formatieren: "Montag, 9. Februar" */
function formatHeaderDate(d: Date): string {
  return `${WEEKDAYS_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;
}

/** Monats-Grid (7 Spalten, Mo–So); leere Zellen am Anfang = null */
function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = (first.getDay() + 6) % 7; // Mo = 0
  const daysInMonth = last.getDate();
  const days: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
  const total = days.length;
  const rows = Math.ceil(total / 7);
  while (days.length < rows * 7) days.push(null);
  const grid: (Date | null)[][] = [];
  for (let i = 0; i < rows; i++) grid.push(days.slice(i * 7, (i + 1) * 7));
  return grid;
}

function hasEventOnDate(dateKey: string, events: CalendarEvent[]): boolean {
  return events.some((e) => eventOccursOnDate(e, dateKey));
}

export function CalendarClient() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewDate, setViewDate] = useState(() => new Date()); // für Monats-Ansicht (welcher Monat)
  const [view, setView] = useState<'day' | 'week' | 'month'>('day');
  const [magicInput, setMagicInput] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [eventModal, setEventModal] = useState<{ open: boolean; date: string; time?: string; editEvent?: CalendarEvent }>({ open: false, date: '', time: undefined });

  const dateKey = toDateKey(currentDate);
  const todayKey = toDateKey(new Date());
  const agendaItems = useMemo(() => getDayEvents(dateKey, events), [dateKey, events]);

  const weekDays = useMemo(() => {
    const d = new Date(currentDate);
    const start = d.getDate() - ((d.getDay() + 6) % 7);
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(d);
      x.setDate(start + i);
      return x;
    });
  }, [currentDate]);

  const monthGrid = useMemo(
    () => getMonthGrid(viewDate.getFullYear(), viewDate.getMonth()),
    [viewDate]
  );

  const goPrevMonth = useCallback(() => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  }, []);

  const goNextMonth = useCallback(() => {
    setViewDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  }, []);

  useEffect(() => {
    getCalendarEvents().then((r) => r.success && r.events && setEvents(r.events));
  }, []);

  const selectDay = useCallback((d: Date) => {
    setCurrentDate(d);
  }, []);

  const handleMagicSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const text = magicInput.trim();
    if (!text) return;
    setMagicInput('');

    const parsed = parseNaturalLanguage(text, new Date());
    if (parsed.isMeal) {
      const slot = parsed.time < '11:00' ? 'breakfast' : parsed.time < '15:00' ? 'lunch' : parsed.time < '17:00' ? 'snack' : 'dinner';
      const newEvent: CalendarEvent = {
        id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'meal',
        slot,
        date: parsed.date,
        time: parsed.time,
        recipeName: parsed.title,
      };
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

  const handleDeleteEvent = async (eventId: string) => {
    const prev = events;
    setEvents((e) => e.filter((ev) => ev.id !== eventId));
    const result = await removeCalendarEvent(eventId);
    if (!result.success) {
      setEvents(prev);
    }
  };

  const termCountToday = agendaItems.length;
  const headerDateLabel = formatHeaderDate(currentDate);

  return (
    <div data-header-full-bleed className="min-h-full w-full relative">
      <DashboardShell
        headerVariant="default"
        headerBackground={
          <div className="relative w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url(/assets/images/dashboard-header.webp)' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-800/60 to-gray-900/60 z-0" aria-hidden />
          </div>
        }
        title={
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight mt-0 text-white" style={{ letterSpacing: '-0.3px' }}>
            Dein Kalender
          </h1>
        }
        subtitle={
          <p className="text-sm sm:text-base mt-1 font-normal text-white/80" style={{ letterSpacing: '0.1px' }}>
            {headerDateLabel}
          </p>
        }
        headerExtra={
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="backdrop-blur-md rounded-lg px-3 py-1.5 text-xs font-medium flex items-center shrink-0 bg-white/10 border border-white/20 text-white/80">
              <CalendarIcon className="w-3 h-3 mr-1.5 opacity-90 shrink-0" aria-hidden />
              {termCountToday === 0 ? 'Keine Termine heute' : termCountToday === 1 ? '1 Termin heute' : `${termCountToday} Termine heute`}
            </span>
          </div>
        }
      >
        {/* Input → View-Control → Content mit gap-6 */}
        <div className="max-w-3xl mx-auto w-full -mt-8 flex flex-col gap-6">
          {/* Magic Input – Glass-Card wie Dashboard, überlappt den Header (-mt-8), leicht durchsichtig */}
          <section aria-labelledby="calendar-input-heading" className="pb-6">
            <h2 id="calendar-input-heading" className="sr-only">Neuen Eintrag hinzufügen</h2>
            <div
              className="w-full rounded-2xl p-2 flex items-center gap-2 min-h-[52px]"
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.35)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.08)',
                WebkitBackdropFilter: 'blur(12px)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <span className="shrink-0 text-gray-500 pl-1" aria-hidden>
                <Plus className="w-5 h-5" />
              </span>
              <form onSubmit={handleMagicSubmit} className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  value={magicInput}
                  onChange={(e) => setMagicInput(e.target.value)}
                  placeholder='z.B. "Morgen 14 Uhr Meeting" oder "Freitag 18 Uhr Pasta"'
                  className="flex-1 min-w-0 border-0 bg-transparent px-2 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-0 text-base"
                  aria-label="Termin oder Mahlzeit eingeben"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-gray-800/90 text-white p-2 hover:bg-gray-700 transition-colors backdrop-blur-sm"
                  aria-label="Eintrag erstellen"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
            {successMessage && (
              <p className="text-sm text-green-600 font-medium mt-2 text-center">{successMessage}</p>
            )}
          </section>

          {/* View Control – Segmented Control, mittig (gap-6 zum Input) */}
          <div className="flex justify-center">
            <div
              className="bg-gray-100/80 p-1 rounded-xl inline-flex backdrop-blur-sm"
              role="tablist"
              aria-label="Ansicht umschalten"
            >
              {(['day', 'week', 'month'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    view === v
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  {v === 'day' ? 'Tag' : v === 'week' ? 'Woche' : 'Monat'}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamischer Content je nach View */}
          {view === 'month' ? (
            /* Monats-Ansicht: CalendarGrid mit < Februar 2026 > */
            <section aria-labelledby="calendar-month-heading" className="rounded-3xl shadow-sm border border-gray-100 bg-white p-4">
              <h2 id="calendar-month-heading" className="sr-only">Monatsansicht</h2>
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  aria-label="Vorheriger Monat"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-lg font-semibold text-gray-900">
                  {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                </span>
                <button
                  type="button"
                  onClick={goNextMonth}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                  aria-label="Nächster Monat"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-px text-center">
                {WEEKDAYS_SHORT.map((wd) => (
                  <div key={wd} className="py-1 text-xs font-medium text-gray-500">
                    {wd}
                  </div>
                ))}
                {monthGrid.flat().map((cell, i) => {
                  if (!cell) {
                    return <div key={`e-${i}`} className="aspect-square min-h-[44px]" />;
                  }
                  const dKey = toDateKey(cell);
                  const isToday = dKey === todayKey;
                  const hasEvent = hasEventOnDate(dKey, events);
                  const isSelected = dKey === dateKey;
                  return (
                    <button
                      key={dKey}
                      type="button"
                      onClick={() => {
                        setCurrentDate(cell);
                        setView('day');
                      }}
                      className={cn(
                        'aspect-square min-h-[44px] flex flex-col items-center justify-center rounded-xl text-sm transition-all',
                        isSelected && 'bg-violet-600 text-white font-medium',
                        !isSelected && isToday && 'bg-violet-100 text-violet-700 font-medium',
                        !isSelected && !isToday && 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      {cell.getDate()}
                      {hasEvent && (
                        <span
                          className={cn(
                            'w-1.5 h-1.5 rounded-full mt-0.5',
                            isSelected ? 'bg-white' : isToday ? 'bg-violet-500' : 'bg-violet-400'
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            /* Tag / Woche: Strip + Agenda */
            <section aria-labelledby="calendar-day-heading">
              <h2 id="calendar-day-heading" className="sr-only">{view === 'week' ? 'Wochenansicht' : 'Tagesansicht'}</h2>

              {/* Wochen-Strip: kleiner, eleganter; aktiver Tag = Dunkelblau/Lila wie Header */}
              <div className="flex gap-1.5 overflow-x-auto pb-4 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {weekDays.map((d) => {
                  const dKey = toDateKey(d);
                  const selected = dKey === dateKey;
                  const isToday = dKey === todayKey;
                  return (
                    <button
                      key={dKey}
                      type="button"
                      onClick={() => selectDay(d)}
                      className={cn(
                        'shrink-0 min-w-[48px] flex flex-col items-center rounded-2xl border py-2 px-1.5 transition-all',
                        selected
                          ? 'bg-gradient-to-br from-violet-600 to-indigo-700 text-white border-transparent shadow-md'
                          : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      <span className="text-[10px] font-medium uppercase">{WEEKDAYS_SHORT[d.getDay()]}</span>
                      <span className="text-sm font-bold mt-0.5">{String(d.getDate()).padStart(2, '0')}</span>
                      {isToday && !selected && <span className="mt-0.5 w-1 h-1 rounded-full bg-violet-400" />}
                    </button>
                  );
                })}
              </div>

              {/* Event-Liste (Agenda) – Klick öffnet Detail-Sheet */}
              <div className="flex flex-col gap-3">
                {agendaItems.length === 0 ? (
                  <div className="rounded-2xl p-8 text-center border border-gray-100 bg-gray-50/80">
                    <p className="text-gray-500">Keine Termine an diesem Tag.</p>
                    <p className="text-sm text-gray-400 mt-1">Tippe oben einen neuen Eintrag ein.</p>
                  </div>
                ) : (
                  agendaItems.map((item) => {
                    const accent = getAccentForItem(item);
                    const subline = item.type === 'meal' ? item.subtitle : ('location' in item.event && item.event.location ? item.event.location : null);
                    const cardContent = (
                      <>
                        <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', accent.bar)} aria-hidden />
                        <div className="flex-1 min-w-0 pl-4">
                          <span className={cn('text-sm font-bold', accent.text)}>{item.time}</span>
                          <h3 className="text-lg font-semibold text-gray-900 mt-0.5">{item.title}</h3>
                          {subline && <p className="text-gray-500 text-sm mt-0.5">{subline}</p>}
                        </div>
                        {item.type === 'meal' && item.imageUrl && (
                          <img src={item.imageUrl} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                        )}
                      </>
                    );
                    const cardClass = 'bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden flex items-start gap-3 min-h-[72px]';
                    return (
                      <SwipeableEventItem
                        key={item.id}
                        event={item.event}
                        onDelete={handleDeleteEvent}
                        onEdit={(ev) => setEventModal({ open: true, date: ev.date, time: ev.time ?? '09:00', editEvent: ev })}
                        enableSwipe={typeof navigator !== 'undefined' && 'ontouchstart' in window}
                      >
                        {item.type === 'meal' && item.recipeLink ? (
                          <Link href={item.recipeLink} onClick={(e) => e.stopPropagation()} className={cn(cardClass, 'hover:shadow-md transition-all')}>
                            {cardContent}
                          </Link>
                        ) : (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => setEventModal({ open: true, date: item.event.date, time: item.event.time ?? '09:00', editEvent: item.event })}
                            onKeyDown={(k) => k.key === 'Enter' && setEventModal({ open: true, date: item.event.date, time: item.event.time ?? '09:00', editEvent: item.event })}
                            className={cn(cardClass, 'cursor-pointer hover:shadow-md transition-all')}
                          >
                            {cardContent}
                          </div>
                        )}
                      </SwipeableEventItem>
                    );
                  })
                )}
              </div>
            </section>
          )}
        </div>
      </DashboardShell>

      <EventDetailSheet
        isOpen={eventModal.open}
        onClose={() => setEventModal({ open: false, date: '', time: undefined })}
        date={eventModal.editEvent?.date ?? eventModal.date}
        defaultTime={eventModal.editEvent?.time ?? eventModal.time ?? '09:00'}
        editEvent={eventModal.editEvent}
        events={events}
        onSubmit={handleEventSheetSubmit}
      />
    </div>
  );
}
