'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Calendar as CalendarIcon, Send, Plus } from 'lucide-react';
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

export function CalendarClient() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(() => new Date());
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
    <>
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
        <div className="space-y-6 md:space-y-8 max-w-3xl mx-auto w-full">
          {/* Schritt 2: Magic Input als Hero-Card (erste Position im Overlap) */}
          <section aria-labelledby="calendar-input-heading">
            <h2 id="calendar-input-heading" className="sr-only">Neuen Eintrag hinzufügen</h2>
            <div className="w-full bg-white shadow-xl rounded-2xl p-2 flex items-center gap-2">
              <span className="shrink-0 text-gray-400 pl-1" aria-hidden>
                <Plus className="w-5 h-5" />
              </span>
              <form onSubmit={handleMagicSubmit} className="flex-1 flex items-center gap-2 min-w-0">
                <input
                  type="text"
                  value={magicInput}
                  onChange={(e) => setMagicInput(e.target.value)}
                  placeholder='z.B. "Morgen 14 Uhr Meeting" oder "Freitag 18 Uhr Pasta"'
                  className="flex-1 min-w-0 border-0 bg-transparent px-2 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 text-base"
                  aria-label="Termin oder Mahlzeit eingeben"
                />
                <button
                  type="submit"
                  className="shrink-0 rounded-full bg-gray-900 text-white p-2 hover:bg-gray-800 transition-colors"
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

          {/* Schritt 3: Kalender-Content – Wochen-Leiste + Event-Liste */}
          <section aria-labelledby="calendar-day-heading" className="mt-8">
            <h2 id="calendar-day-heading" className="sr-only">Tagesansicht</h2>

            {/* A) Wochen-Leiste: horizontal scroll, aktiver Tag = dunkler Hintergrund */}
            <div className="flex gap-2 overflow-x-auto pb-4 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                      'shrink-0 min-w-[56px] flex flex-col items-center rounded-xl py-2.5 px-2 transition-all border',
                      selected
                        ? 'bg-gray-800 text-white border-gray-800 shadow-md'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <span className="text-[10px] font-medium uppercase">{WEEKDAYS_SHORT[d.getDay()]}</span>
                    <span className="text-base font-bold mt-0.5">{String(d.getDate()).padStart(2, '0')}</span>
                    {isToday && !selected && <span className="mt-0.5 w-1 h-1 rounded-full bg-gray-400" />}
                  </button>
                );
              })}
            </div>

            {/* B) Event-Liste: weiße Karten mit farbigem Rand links */}
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
    </>
  );
}
