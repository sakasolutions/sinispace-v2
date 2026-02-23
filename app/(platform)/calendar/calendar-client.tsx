'use client';

import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, isToday, getDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MockEvent {
  id: string;
  title: string;
  time: string;
  categoryColor: string;
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getTodayDateKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function CalendarClient() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const todayKey = getTodayDateKey(new Date());
  const currentKey = getTodayDateKey(currentDate);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const monthYearLabel = useMemo(
    () => format(currentDate, 'MMMM yyyy', { locale: de }),
    [currentDate]
  );

  const mockEvents: MockEvent[] = useMemo(
    () => [
      { id: '1', title: 'Meeting', time: '09:00', categoryColor: 'bg-orange-500' },
      { id: '2', title: 'Mittag', time: '13:00', categoryColor: 'bg-pink-500' },
      { id: '3', title: 'Sport', time: '18:30', categoryColor: 'bg-purple-500' },
      { id: '4', title: 'Abendessen', time: '19:30', categoryColor: 'bg-rose-500' },
    ],
    []
  );

  const displayEvents = useMemo(() => {
    if (currentKey !== todayKey) return [];
    return mockEvents.sort((a, b) => a.time.localeCompare(b.time));
  }, [currentKey, todayKey, mockEvents]);

  return (
    <div className="min-h-full w-full relative">
      {/* Immersive Header */}
      <header className="w-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 pt-12 pb-24 px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white capitalize">
          {monthYearLabel}
        </h1>
        <div className="flex justify-center sm:justify-start gap-2 mt-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {weekDays.map((d) => {
            const dayKey = getTodayDateKey(d);
            const selected = dayKey === currentKey;
            const isTodayDay = isToday(d);
            return (
              <button
                key={dayKey}
                type="button"
                onClick={() => setCurrentDate(d)}
                className={cn(
                  'shrink-0 flex flex-col items-center justify-center min-w-[44px] py-2.5 px-2 rounded-full text-white transition-all',
                  selected && isTodayDay && 'bg-white/20 backdrop-blur-md',
                  !selected && 'hover:bg-white/10'
                )}
              >
                <span className="text-xs font-medium">{WEEKDAY_LABELS[(getDay(d) + 6) % 7]}</span>
                <span className="text-sm font-bold mt-0.5">{format(d, 'd')}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 relative z-10 -mt-8 pb-20">
        {/* Schwebe Magic-Input */}
        <div className="mb-8">
          <input
            type="text"
            placeholder="Neuer Termin..."
            className="w-full bg-white/80 backdrop-blur-xl shadow-xl rounded-full px-6 py-4 outline-none placeholder:text-gray-400 text-gray-900 border-0"
            aria-label="Neuer Termin eingeben"
          />
        </div>

        {/* Clean Agenda */}
        <div className="flex flex-col">
          {displayEvents.length === 0 ? (
            <p className="py-8 text-gray-400 text-sm text-center">
              {currentKey === todayKey
                ? 'Keine Termine für heute.'
                : `Keine Termine für den ${format(parseISO(currentKey), 'd. MMMM', { locale: de })}.`}
            </p>
          ) : (
            displayEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-b-0"
              >
                <span className="text-gray-400 text-sm font-medium w-16 shrink-0">
                  {event.time}
                </span>
                <span
                  className={cn('w-3 h-3 rounded-full shrink-0', event.categoryColor)}
                  aria-hidden
                />
                <span className="text-gray-800 font-medium flex-1 min-w-0">
                  {event.title}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
