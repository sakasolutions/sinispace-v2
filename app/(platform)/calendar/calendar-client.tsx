'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  startOfWeek,
  addDays,
  isSameMonth,
  parseISO,
  isToday,
} from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface MockEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  dotColor: string;
}

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

/** Mock-Termine für „heute“ (zur Laufzeit); andere Tage können leer sein oder hier ergänzt werden. */
const MOCK_TODAY_EVENTS: MockEvent[] = [
  { id: '1', title: 'Meeting', startTime: '15:00', endTime: '16:00', dotColor: 'bg-orange-400' },
  { id: '2', title: 'Sport', startTime: '18:00', endTime: '19:30', dotColor: 'bg-violet-500' },
  { id: '3', title: 'Abendessen', startTime: '20:00', endTime: '21:00', dotColor: 'bg-pink-400' },
];

export function CalendarClient() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const currentKey = getDateKey(currentDate);
  const monthYearLabel = useMemo(
    () => format(currentDate, 'MMMM yyyy', { locale: de }),
    [currentDate]
  );

  const monthGridDays = useMemo(() => getMonthGridDays(currentDate), [currentDate]);

  const displayEvents = useMemo(() => {
    const list = isToday(currentDate) ? MOCK_TODAY_EVENTS : [];
    return [...list].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [currentKey, currentDate]);

  const selectedDayLabel = useMemo(() => {
    if (isToday(currentDate)) return 'Heute';
    return format(parseISO(currentKey), 'EEEE, d. MMMM', { locale: de });
  }, [currentDate, currentKey]);

  return (
    <div className="min-h-full w-full relative">
      {/* Immersive Header – voller Monatskalender */}
      <header className="w-full pt-12 pb-8 px-4 sm:px-6 relative overflow-hidden rounded-b-[40px] bg-gradient-to-br from-purple-900 via-indigo-800 to-purple-800">
        <h1 className="text-2xl sm:text-3xl font-bold text-white capitalize tracking-tight">
          {monthYearLabel}
        </h1>

        {/* Wochentags-Leiste (7er-Grid) */}
        <div className="grid grid-cols-7 gap-1 mt-6 text-center">
          {WEEKDAY_LABELS.map((label) => (
            <span
              key={label}
              className="text-sm text-white/80 font-medium"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Monats-Grid (7 Spalten) */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mt-2">
          {monthGridDays.map((d) => {
            const dayKey = getDateKey(d);
            const selected = dayKey === currentKey;
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
              placeholder="z.B. Morgen 18 Uhr Fussball"
              className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-gray-500 text-gray-800"
              aria-label="Termin in natürlicher Sprache eingeben"
            />
            <button
              type="button"
              className="shrink-0 p-2 rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
              aria-label="Eingabe senden"
            >
              <Sparkles className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Überschrift: Heute / Ausgewählter Tag */}
          <h2 className="text-2xl font-bold text-gray-800 mb-6 capitalize">
            {selectedDayLabel}
          </h2>

          {/* Event-Timeline (gestrichelte Linie + Punkte) */}
          <div className="relative border-l-2 border-dashed border-gray-200 ml-3">
            {displayEvents.length === 0 ? (
              <p className="pl-8 text-gray-400 text-sm">
                Keine Termine für diesen Tag.
              </p>
            ) : (
              displayEvents.map((event) => (
                <div key={event.id} className="relative pl-8 mb-8">
                  {/* Timeline-Punkt auf der Linie */}
                  <span
                    className={cn(
                      'absolute -left-[5px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm',
                      event.dotColor
                    )}
                    aria-hidden
                  />
                  <p className="text-lg font-semibold text-gray-800">{event.title}</p>
                  <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                    {event.startTime} – {event.endTime} Uhr
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
