'use client';

import { useState, useMemo } from 'react';
import { format, startOfWeek, addDays, getDay, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Send } from 'lucide-react';

interface MockEvent {
  id: string;
  title: string;
  time: string;
  categoryColor: string;
  note?: string;
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
      { id: '1', title: 'Meeting', time: '09:00', categoryColor: 'bg-orange-400', note: 'Konferenzraum A' },
      { id: '2', title: 'Mittag', time: '13:00', categoryColor: 'bg-pink-400', note: 'Café um die Ecke' },
      { id: '3', title: 'Sport', time: '18:30', categoryColor: 'bg-violet-400', note: 'Fitnessstudio' },
      { id: '4', title: 'Abendessen', time: '19:30', categoryColor: 'bg-rose-400' },
    ],
    []
  );

  const displayEvents = useMemo(() => {
    if (currentKey !== todayKey) return [];
    return mockEvents.sort((a, b) => a.time.localeCompare(b.time));
  }, [currentKey, todayKey, mockEvents]);

  return (
    <div className="min-h-full w-full relative">
      {/* Immersive Header – gleicher Stil wie Dashboard (dunkle Wellen, edel) */}
      <header className="w-full min-h-[340px] pt-12 pb-10 px-4 sm:px-6 md:px-8 relative overflow-hidden rounded-b-[40px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(/assets/images/dashboard-header.webp)' }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-800/60 to-gray-900/60 z-0"
          aria-hidden
        />
        <div className="relative z-10 flex flex-col h-full min-h-[300px]">
          <h1 className="text-2xl sm:text-3xl font-bold text-white capitalize tracking-tight">
            {monthYearLabel}
          </h1>
          {/* Eleganter Wochen-Strip: feiner Text, ausgewählter Tag = weißer Kreis */}
          <div className="flex justify-center sm:justify-start gap-1 sm:gap-2 mt-8 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {weekDays.map((d) => {
              const dayKey = getTodayDateKey(d);
              const selected = dayKey === currentKey;
              return (
                <button
                  key={dayKey}
                  type="button"
                  onClick={() => setCurrentDate(d)}
                  className={cn(
                    'shrink-0 flex flex-col items-center justify-center min-w-[44px] py-1 transition-all',
                    selected &&
                      'w-10 h-10 rounded-full bg-white text-purple-600 shadow-xl flex items-center justify-center'
                  )}
                >
                  {selected ? (
                    <span className="text-sm font-bold">{format(d, 'd')}</span>
                  ) : (
                    <>
                      <span className="text-[11px] font-medium text-white/90">
                        {WEEKDAY_LABELS[(getDay(d) + 6) % 7]}
                      </span>
                      <span className="text-sm font-medium text-white mt-0.5">{format(d, 'd')}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Weißer Body mit Overlap – überlappt den Header */}
      <div className="bg-gray-50 rounded-t-[40px] -mt-12 w-full min-h-screen pt-8 px-6 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
        <div className="max-w-2xl mx-auto pb-20">
          {/* Magic-Input: oben im überlappenden Bereich, mit Senden-Button */}
          <div className="w-full bg-white rounded-2xl py-4 px-6 shadow-sm border border-gray-100 flex items-center justify-between text-gray-600 mb-8">
            <input
              type="text"
              placeholder="Neuer Termin..."
              className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-gray-400 text-gray-800 font-medium"
              aria-label="Neuer Termin eingeben"
            />
            <button
              type="button"
              className="shrink-0 p-2 rounded-full text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
              aria-label="Termin hinzufügen"
            >
              <Send className="w-5 h-5" strokeWidth={2} />
            </button>
          </div>

          {/* Editorial Agenda – keine Rahmen, extrem clean */}
          <div className="flex flex-col">
            {displayEvents.length === 0 ? (
              <p className="py-12 text-gray-400 text-sm text-center">
                {currentKey === todayKey
                  ? 'Keine Termine für heute.'
                  : `Keine Termine für den ${format(parseISO(currentKey), 'd. MMMM', { locale: de })}.`}
              </p>
            ) : (
              displayEvents.map((event) => (
                <div key={event.id} className="flex items-start gap-4 mb-8">
                  <span className="w-16 text-sm font-bold text-gray-800 shrink-0">{event.time}</span>
                  <span
                    className={cn('w-2.5 h-2.5 rounded-full mt-1.5 shrink-0', event.categoryColor)}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-900">{event.title}</p>
                    {event.note && (
                      <p className="text-xs text-gray-400 mt-0.5">{event.note}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
