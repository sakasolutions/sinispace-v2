'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  format,
  startOfMonth,
  startOfWeek,
  addDays,
  addMonths,
  subMonths,
  addYears,
  subYears,
  eachDayOfInterval,
  isSameMonth,
  parseISO,
  isToday,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Sparkles, Loader2, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { getCalendarEvents, createMagicEvent, deleteCalendarEvent, type CalendarEventJson } from '@/actions/calendar-actions';

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

/** Erzeugt ein Grid (42 Zellen) für den angezeigten Monat inkl. Fülltage davor/danach. */
function getMonthGridDays(viewDate: Date): Date[] {
  const monthStart = startOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(addDays(gridStart, i));
  }
  return days;
}

/** Montag–Sonntag der Woche, die das gegebene Datum enthält. */
function getWeekDays(anchorDate: Date): Date[] {
  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  return eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
}

const DOT_COLORS = ['bg-orange-400', 'bg-violet-500', 'bg-pink-400', 'bg-rose-400'] as const;

function getDotColor(index: number): string {
  return DOT_COLORS[index % DOT_COLORS.length];
}

export function CalendarClient() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [events, setEvents] = useState<CalendarEventJson[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDateKey = useMemo(
    () => format(currentDate, 'yyyy-MM-dd'),
    [currentDate]
  );
  const monthYearLabel = useMemo(
    () => format(currentDate, 'MMMM yyyy', { locale: de }),
    [currentDate]
  );

  const monthGridDays = useMemo(() => getMonthGridDays(currentDate), [currentDate]);
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  function prevMonth() {
    setCurrentDate((d) => subMonths(d, 1));
  }
  function nextMonth() {
    setCurrentDate((d) => addMonths(d, 1));
  }
  function prevYear() {
    setCurrentDate((d) => subYears(d, 1));
  }
  function nextYear() {
    setCurrentDate((d) => addYears(d, 1));
  }

  const gridDays = viewMode === 'week' ? weekDays : monthGridDays;

  useEffect(() => {
    let cancelled = false;
    getCalendarEvents().then((list) => {
      if (!cancelled) setEvents(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayEvents = useMemo(() => {
    const list = events.filter((e) => e.date === selectedDateKey);
    return [...list].sort((a, b) => a.time.localeCompare(b.time));
  }, [events, selectedDateKey]);

  const selectedDayLabel = useMemo(() => {
    if (isToday(currentDate)) return 'Heute';
    return format(parseISO(selectedDateKey), 'EEEE, d. MMMM', { locale: de });
  }, [currentDate, selectedDateKey]);

  async function handleSubmit() {
    const trimmed = inputValue.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await createMagicEvent(trimmed, new Date());
      if (result.success) {
        const next = await getCalendarEvents();
        setEvents(next);
        setInputValue('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="min-h-full w-full relative">
      {/* Immersive Header – dynamische Wochen-/Monatsansicht */}
      <header className="w-full pt-12 pb-8 px-4 sm:px-6 relative overflow-hidden rounded-b-[40px] bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-800">
        {/* Navigation: Jahr/Monat + zentrierter Titel + Ansicht-Toggle */}
        <div className="flex items-center justify-between w-full mb-6">
          <div className="flex items-center shrink-0" aria-hidden />
          <div className="flex items-center justify-center gap-0 sm:gap-1">
            <button
              type="button"
              onClick={prevYear}
              className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition"
              aria-label="Vorheriges Jahr"
            >
              <ChevronsLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={prevMonth}
              className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition"
              aria-label="Vorheriger Monat"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
            </button>
            <span className="text-2xl font-bold text-white capitalize mx-2 sm:mx-4 min-w-[140px] sm:min-w-[180px] text-center">
              {monthYearLabel}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition"
              aria-label="Nächster Monat"
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={nextYear}
              className="text-white/70 hover:text-white hover:bg-white/10 p-2 rounded-full transition"
              aria-label="Nächstes Jahr"
            >
              <ChevronsRight className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2} />
            </button>
          </div>
          <div className="flex bg-white/10 backdrop-blur-md rounded-full p-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('week')}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                viewMode === 'week'
                  ? 'bg-white text-purple-700 shadow-md'
                  : 'text-white/70 hover:text-white'
              )}
            >
              Woche
            </button>
            <button
              type="button"
              onClick={() => setViewMode('month')}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                viewMode === 'month'
                  ? 'bg-white text-purple-700 shadow-md'
                  : 'text-white/70 hover:text-white'
              )}
            >
              Monat
            </button>
          </div>
        </div>

        {/* Wochentags-Leiste (7er-Grid) */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS.map((label) => (
            <span
              key={label}
              className="text-sm text-white/80 font-medium"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Dynamisches Grid: Woche (1 Zeile) oder Monat (6 Zeilen) */}
        <div
          className={cn(
            'grid grid-cols-7 gap-1 sm:gap-2 mt-2 transition-all duration-300 ease-in-out',
            viewMode === 'week' ? 'grid-rows-1' : ''
          )}
        >
          {gridDays.map((d) => {
            const dayKey = getDateKey(d);
            const selected = dayKey === selectedDateKey;
            const inMonth = isSameMonth(d, currentDate);
            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => setCurrentDate(d)}
                className={cn(
                  'aspect-square flex items-center justify-center rounded-full text-sm font-medium transition-all',
                  selected
                    ? 'bg-orange-400 text-white font-bold shadow-lg'
                    : inMonth
                      ? 'text-white hover:bg-white/15'
                      : 'text-white/40'
                )}
              >
                {format(d, 'd')}
              </button>
            );
          })}
        </div>
      </header>

      {/* Weißer Body (Overlap & Magic Input) */}
      <div className="bg-white w-full rounded-t-[40px] px-6 pt-8 pb-24 -mt-6 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.15)]">
        <div className="max-w-2xl mx-auto">
          {/* Magic Input – natürliche Spracheingabe */}
          <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-gray-700 shadow-inner flex items-center justify-between mb-8">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={isSubmitting ? 'Wird gespeichert...' : 'z.B. Morgen 18 Uhr Fussball'}
              disabled={isSubmitting}
              className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-gray-500 text-gray-800 disabled:opacity-70"
              aria-label="Termin in natürlicher Sprache eingeben"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !inputValue.trim()}
              className="shrink-0 p-2 rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:pointer-events-none"
              aria-label="Eingabe senden"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2} />
              ) : (
                <Sparkles className="w-5 h-5" strokeWidth={2} />
              )}
            </button>
          </div>

          {/* Dynamische Überschrift: Heute oder formatiertes Datum (z. B. Mittwoch, 25. Februar) */}
          <h2 className="text-2xl font-bold text-gray-800 mb-6 capitalize">
            {selectedDayLabel}
          </h2>

          {/* Event-Timeline (gestrichelte Linie + Punkte) */}
          <div className="relative border-l-2 border-dashed border-gray-200 ml-3">
            {displayEvents.length === 0 ? (
              <p className="pl-8 text-gray-400 text-sm">
                Keine Termine an diesem Tag.
              </p>
            ) : (
              displayEvents.map((event, index) => (
                <div key={event.id} className="relative pl-8 mb-8 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <span
                      className={cn(
                        'absolute -left-[5px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm',
                        getDotColor(index)
                      )}
                      aria-hidden
                    />
                    <p className="text-lg font-semibold text-gray-800">{event.title}</p>
                    <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                      {event.endTime
                        ? `${event.time} – ${event.endTime} Uhr`
                        : `${event.time} Uhr`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEvents((prev) => prev.filter((e) => e.id !== event.id));
                      void deleteCalendarEvent(event.id);
                    }}
                    className="text-gray-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 ml-auto shrink-0"
                    aria-label={`Termin „${event.title}" löschen`}
                  >
                    <Trash2 className="w-5 h-5" strokeWidth={2} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
