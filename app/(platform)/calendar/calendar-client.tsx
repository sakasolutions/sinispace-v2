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
import { Sparkles, Loader2, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MapPin, ShoppingCart, Utensils, Calendar, X } from 'lucide-react';
import { getCalendarEvents, createMagicEvent, deleteCalendarEvent, updateCalendarEvent, type CalendarEventJson } from '@/actions/calendar-actions';

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

/** Icon + Hintergrundfarbe für den Timeline-Punkt je nach actionTag. */
function getEventDotStyle(actionTag?: string) {
  switch (actionTag) {
    case 'food':
      return { bg: 'bg-pink-500', Icon: Utensils };
    case 'shopping':
      return { bg: 'bg-orange-500', Icon: ShoppingCart };
    case 'location':
      return { bg: 'bg-blue-500', Icon: MapPin };
    default:
      return { bg: 'bg-violet-500', Icon: Calendar };
  }
}

export function CalendarClient() {
  // selectedDate & viewDate: ein State – initial immer „heute“
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [events, setEvents] = useState<CalendarEventJson[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventJson | null>(null);
  const [editForm, setEditForm] = useState({ title: '', date: '', time: '', location: '' });

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

  useEffect(() => {
    if (editingEvent) {
      setEditForm({
        title: editingEvent.title,
        date: editingEvent.date,
        time: editingEvent.time,
        location: editingEvent.location ?? '',
      });
    }
  }, [editingEvent]);

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

  async function handleUpdateEvent() {
    if (!editingEvent) return;
    const payload = {
      title: editForm.title.trim() || editingEvent.title,
      date: editForm.date || editingEvent.date,
      time: editForm.time || editingEvent.time,
      location: editForm.location.trim() || undefined,
    };
    const eventId = editingEvent.id;
    const updated = { ...editingEvent, ...payload };
    setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
    setEditingEvent(null);
    const result = await updateCalendarEvent(eventId, payload);
    if (!result.success) {
      setEvents((prev) => prev.map((e) => (e.id === eventId ? editingEvent : e)));
    }
  }

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-white">
      {/* Ebene 2: Hero-Header (volle Breite, unten abgerundet) – Höhe dynamisch für Monatsansicht */}
      <header
        className={cn(
          'relative z-[1] w-full max-w-[100vw] -mx-0 sm:-mx-4 md:w-[calc(100%+3rem)] md:-mx-6 lg:w-[calc(100%+4rem)] lg:-mx-8 -mt-[max(0.5rem,env(safe-area-inset-top))] md:-mt-6 lg:-mt-8',
          viewMode === 'month' ? 'min-h-[500px]' : 'min-h-[280px]'
        )}
      >
        {/* Hintergrund SiniSpace Gradient – Höhe an Header anpassen */}
        <div
          className={cn(
            'absolute top-0 left-0 w-full z-0 overflow-hidden rounded-b-[40px]',
            viewMode === 'month' ? 'min-h-[500px]' : 'h-[280px]'
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600" aria-hidden />
        </div>

        {/* Inhalt des Headers */}
        <div className="dashboard-header-pt md:pt-12 relative z-10 w-full pb-12">
          <div className="max-w-7xl mx-auto w-full px-3 sm:px-4 md:px-6 lg:px-8">
            {/* Responsive Navigation Wrapper */}
            <div className="relative w-full flex items-center justify-center md:justify-between mb-6">
              {/* 1. Heute Button: Schwebend oben links auf Mobile, normaler Fluss auf Desktop */}
              <div className="absolute -top-10 left-0 sm:-top-8 md:static md:w-1/3 flex justify-start">
                <button
                  type="button"
                  onClick={() => setCurrentDate(new Date())}
                  className="text-sm font-medium text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-full transition-all backdrop-blur-md"
                  aria-label="Heute anzeigen"
                >
                  Heute
                </button>
              </div>

              {/* 2. Monat & Pfeile: Bestimmt die Höhe, sitzt zentriert */}
              <div className="flex items-center justify-center gap-1 sm:gap-2 md:w-1/3">
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

              {/* 3. Toggle Button: Schwebend oben rechts auf Mobile, normaler Fluss auf Desktop */}
              <div className="absolute -top-10 right-0 sm:-top-8 md:static md:w-1/3 flex justify-end">
                <div className="flex bg-white/10 backdrop-blur-md rounded-full p-1">
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
            </div>

            {/* 2. Reihe: Wochentags-Grid (Mo, Di, Mi …) */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="text-sm text-white/80 font-medium">
                  {label}
                </span>
              ))}
            </div>

            {/* Dynamisches Grid: Woche (1 Zeile) oder Monat (6 Zeilen) – jede Zelle h-16, aktiver Tag mit Gradient */}
            <div
              className={cn(
                'grid grid-cols-7 gap-1 sm:gap-2 mt-2 transition-all duration-300 ease-in-out',
                viewMode === 'week' ? 'grid-rows-1' : ''
              )}
            >
              {(viewMode === 'month' ? monthGridDays : weekDays).map((d) => {
                const dayKey = getDateKey(d);
                const selected = dayKey === selectedDateKey;
                const inMonth = isSameMonth(d, currentDate);
                const hasEvents = events.some((e) => e.date === dayKey);
                const isTodayDay = isToday(d);
                return (
                  <div
                    key={dayKey}
                    className="relative flex flex-col items-center justify-center h-16"
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentDate(d)}
                      className={cn(
                        'rounded-full text-sm font-medium transition-all flex items-center justify-center',
                        selected
                          ? 'w-10 h-10 rounded-full flex items-center justify-center bg-white text-purple-600 font-bold shadow-[0_4px_14px_0_rgba(0,0,0,0.1)]'
                          : cn(
                              'aspect-square w-full max-w-12',
                              inMonth ? 'text-white hover:bg-white/15' : 'text-white/40',
                              isTodayDay && !selected && 'border border-white/50'
                            )
                      )}
                    >
                      {format(d, 'd')}
                    </button>
                    {hasEvents && (
                      <div
                        className="w-1 h-1 rounded-full mt-1 absolute bottom-2 left-1/2 -translate-x-1/2"
                        style={{
                          backgroundColor: selected ? '#9333ea' : 'white',
                        }}
                        aria-hidden
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Ebene 3 & 4: Overlap & Content (schwebender Bereich) – -mt-20 lappt über Header */}
      <div className="relative z-10 mx-auto max-w-7xl w-full px-3 sm:px-4 md:px-6 lg:px-8 pb-32 md:pb-32 -mt-20 pt-9">
        <div className="space-y-6 md:space-y-8">
          <div className="max-w-2xl mx-auto">
            {/* Magic Input – saubere Box */}
            <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-4 flex items-center justify-between mb-8">
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

            {/* Event-Timeline: Heute / formatiertes Datum + Liste */}
            <h2 className="text-2xl font-bold text-gray-800 mb-6 capitalize">
              {selectedDayLabel}
            </h2>

            <div className="relative border-l-2 border-dashed border-gray-200 ml-3">
              {displayEvents.length === 0 ? (
                <p className="pl-8 text-gray-400 text-sm">
                  Keine Termine an diesem Tag.
                </p>
              ) : (
                displayEvents.map((event) => {
                  const { bg: dotBg, Icon: DotIcon } = getEventDotStyle(event.actionTag);
                  return (
                    <div key={event.id} className="relative pl-10 mb-6">
                      <span
                        className={cn(
                          'absolute -left-[11px] top-5 w-6 h-6 rounded-full border-2 border-white shadow-sm flex items-center justify-center',
                          dotBg
                        )}
                        aria-hidden
                      >
                        <DotIcon className="w-3 h-3 text-white" strokeWidth={2.5} aria-hidden />
                      </span>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setEditingEvent(event)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingEvent(event)}
                        className="bg-white border border-gray-100 shadow-sm rounded-2xl p-4 w-full group transition-all hover:shadow-md cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-lg font-semibold text-gray-800 flex-1 min-w-0">
                            {event.title}
                          </p>
                          <button
                            type="button"
                            onClick={(evt) => {
                              evt.stopPropagation();
                              setEvents((prev) => prev.filter((x) => x.id !== event.id));
                              void deleteCalendarEvent(event.id);
                            }}
                            className="text-gray-300 hover:text-red-500 opacity-70 group-hover:opacity-100 transition-all p-2 rounded-full hover:bg-red-50 shrink-0"
                            aria-label={`Termin „${event.title}" löschen`}
                          >
                            <Trash2 className="w-5 h-5" strokeWidth={2} />
                          </button>
                        </div>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">
                          {event.endTime
                            ? `${event.time} – ${event.endTime} Uhr`
                            : `${event.time} Uhr`}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {event.location && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full flex items-center gap-1 font-medium w-fit">
                              <MapPin className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                              {event.location}
                            </span>
                          )}
                          {event.actionTag === 'shopping' && (
                            <span className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full flex items-center gap-1 font-medium w-fit">
                              <ShoppingCart className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                              SmartCart öffnen
                            </span>
                          )}
                          {event.actionTag === 'food' && (
                            <span className="text-xs bg-pink-50 text-pink-600 px-3 py-1.5 rounded-full flex items-center gap-1 font-medium w-fit">
                              <Utensils className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
                              CookIQ Rezept
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Smart Edit Modal */}
      {editingEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-event-title"
        >
          <div
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header mit Gradient-Streifen + X */}
            <div className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 h-1 w-full" />
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h3 id="edit-event-title" className="text-lg font-semibold text-gray-800">
                Termin bearbeiten
              </h3>
              <button
                type="button"
                onClick={() => setEditingEvent(null)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Schließen"
              >
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            {/* Formular (minimalistische Inputs) */}
            <form
              className="p-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateEvent();
              }}
            >
              <div>
                <label htmlFor="edit-title" className="sr-only">
                  Titel
                </label>
                <input
                  id="edit-title"
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="text-xl font-bold border-b border-gray-200 bg-transparent focus:border-purple-500 outline-none w-full py-2 text-gray-800 placeholder:text-gray-400"
                  placeholder="Titel"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-date" className="block text-xs font-medium text-gray-500 mb-1">
                    Datum
                  </label>
                  <input
                    id="edit-date"
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                    className="border-b border-gray-200 bg-transparent focus:border-purple-500 outline-none w-full py-2 text-gray-800"
                  />
                </div>
                <div>
                  <label htmlFor="edit-time" className="block text-xs font-medium text-gray-500 mb-1">
                    Zeit
                  </label>
                  <input
                    id="edit-time"
                    type="time"
                    value={editForm.time}
                    onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))}
                    className="border-b border-gray-200 bg-transparent focus:border-purple-500 outline-none w-full py-2 text-gray-800"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="edit-location" className="sr-only">
                  Ort
                </label>
                <div className="flex items-center gap-2 border-b border-gray-200 focus-within:border-purple-500 transition-colors">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0" strokeWidth={2} />
                  <input
                    id="edit-location"
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
                    className="flex-1 bg-transparent focus:outline-none py-2 text-gray-800 placeholder:text-gray-400"
                    placeholder="Ort (optional)"
                  />
                </div>
              </div>

              {/* Action: Speichern */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 text-white rounded-full py-3 font-semibold shadow-lg hover:shadow-xl transition-all mt-6"
              >
                Speichern
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
