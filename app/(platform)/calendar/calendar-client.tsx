'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PageTransition } from '@/components/ui/PageTransition';
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Dumbbell,
  Plus,
  Calendar,
  ChefHat,
  GripVertical,
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
import { SmartQuickAdd } from './smart-quick-add';

const MEAL_SLOTS = [
  { id: 'breakfast' as const, label: 'Frühstück', time: '08:00' },
  { id: 'lunch' as const, label: 'Mittagessen', time: '12:30' },
  { id: 'dinner' as const, label: 'Abendessen', time: '19:00' },
];

const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Traffic Light: free=green, tight=yellow (zwischen Terminen), busy=red (hat Termin) */
function getSlotStatus(time: string, events: CalendarEvent[], dateKey: string): 'free' | 'busy' | 'tight' {
  const hasEvent = events.some((e) => e.date === dateKey && e.time === time);
  if (hasEvent) return 'busy';

  const [h, m] = time.split(':').map(Number);
  const prevH = m === 0 ? h - 1 : h;
  const prevM = m === 0 ? 30 : 0;
  const nextH = m === 30 ? h + 1 : h;
  const nextM = m === 30 ? 0 : 30;
  const prevSlot = `${prevH.toString().padStart(2, '0')}:${prevM.toString().padStart(2, '0')}`;
  const nextSlot = `${nextH.toString().padStart(2, '0')}:${nextM.toString().padStart(2, '0')}`;
  const hasPrev = prevH >= 6 && events.some((e) => e.date === dateKey && e.time === prevSlot);
  const hasNext = nextH <= 21 && events.some((e) => e.date === dateKey && e.time === nextSlot);
  if (hasPrev || hasNext) return 'tight';

  return 'free';
}

function getEventDisplay(e: CalendarEvent): string {
  if (e.type === 'custom') return e.title;
  if (e.type === 'meal') return e.recipeName || e.slot;
  return e.label || 'Workout';
}

export function CalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

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
  const isToday = dateKey === toDateKey(new Date());
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const dayEvents = useMemo(() => {
    return events.filter((e) => e.date === dateKey).sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  }, [events, dateKey]);

  /** Next 3 upcoming events (ab jetzt, max. 7 Tage) */
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const todayKey = toDateKey(now);
    const nowStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const result: { event: CalendarEvent; dateKey: string; sortKey: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const key = toDateKey(d);
      events
        .filter((e) => e.date === key)
        .filter((e) => key !== todayKey || (e.time || '00:00') >= nowStr)
        .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'))
        .forEach((e) => result.push({ event: e, dateKey: key, sortKey: key + (e.time || '00:00') }));
    }
    return result.sort((a, b) => a.sortKey.localeCompare(b.sortKey)).slice(0, 3);
  }, [events]);

  const handleAddFromQuickInput = async (data: { title: string; date: string; time: string }) => {
    const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newEvent: CalendarEvent = {
      id,
      type: 'custom',
      eventType: 'reminder',
      title: data.title,
      date: data.date,
      time: data.time,
    };
    const next = [...events, newEvent];
    setEvents(next);
    await saveCalendarEvents(next);
  };

  const handleAddCustomEvent = async (data: { type: CustomEventType; title: string; date: string; time: string; endTime?: string }) => {
    const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newEvent: CalendarEvent = {
      id,
      type: 'custom',
      eventType: data.type,
      title: data.title,
      date: data.date,
      time: data.time,
      endTime: data.endTime,
    };
    const next = [...events, newEvent];
    setEvents(next);
    await saveCalendarEvents(next);
  };

  const handleAddMealFromRecipe = async (
    recipe: { id: string; resultId: string; recipeName: string; stats?: { time?: string; calories?: string } },
    slot: 'breakfast' | 'lunch' | 'dinner',
    date: string,
    time: string
  ) => {
    const id = `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newEvent: CalendarEvent = {
      id,
      type: 'meal',
      slot,
      date,
      time,
      resultId: recipe.resultId,
      recipeId: recipe.id,
      recipeName: recipe.recipeName,
      calories: recipe.stats?.calories,
      prepTime: recipe.stats?.time,
    };
    const next = [...events, newEvent];
    setEvents(next);
    await saveCalendarEvents(next);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const next = events.filter((e) => e.id !== eventId);
    setEvents(next);
    await saveCalendarEvents(next);
  };

  const goPrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const goNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const goToday = () => setCurrentDate(new Date());

  const timeSlots = Array.from({ length: 32 }, (_, i) => {
    const h = 6 + Math.floor(i / 2);
    const m = (i % 2) * 30;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }); // 06:00 - 21:30 alle 30 Min

  return (
    <PageTransition className="max-w-2xl mx-auto space-y-5">
      {/* TODAY-FIRST HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Was steht heute an?</h1>
        <p className="text-gray-500 mt-0.5">
          {WEEKDAYS[currentDate.getDay()]}, {currentDate.getDate()}. {MONTHS[currentDate.getMonth()]}
        </p>
      </div>

      {/* ZERO-FRICTION INPUT */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <SmartQuickAdd
          onAdd={handleAddFromQuickInput}
          dateKey={dateKey}
          placeholder="z.B. Morgen 15 Uhr Zahnarzt · Dienstag Friseur · 14 Uhr Meeting"
        />
      </div>

      {/* NEXT 3 UPCOMING */}
      {upcomingEvents.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-600 mb-2">Als nächstes</h2>
          <div className="space-y-2">
            {upcomingEvents.map(({ event, dateKey: dk }) => (
              <div
                key={event.id}
                className="flex items-center gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm"
              >
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{getEventDisplay(event)}</div>
                  <div className="text-sm text-gray-500">
                    {dk === toDateKey(new Date()) ? 'Heute' : new Date(dk + 'T12:00').toLocaleDateString('de-DE', { weekday: 'short' })}{' '}
                    {event.time}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIMELINE MIT NOW INDICATOR */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Tagesplan</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={goPrevDay}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100"
              aria-label="Vorheriger Tag"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToday}
              className={cn(
                'min-h-[44px] px-3 rounded-lg text-sm font-medium',
                isToday ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              Heute
            </button>
            <button
              onClick={goNextDay}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100"
              aria-label="Nächster Tag"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Timeline Slots mit Traffic Light */}
          <div className="space-y-1">
            {timeSlots.map((slot) => {
              const [h, m] = slot.split(':').map(Number);
              const slotMinutes = h * 60 + m;
              const status = getSlotStatus(slot, dayEvents, dateKey);
              const isNow = isToday && slotMinutes <= nowMinutes && nowMinutes < slotMinutes + 30;
              const hasEvent = dayEvents.find((e) => e.time === slot);

              return (
                <div
                  key={slot}
                  className={cn(
                    'flex items-center gap-3 min-h-[52px] rounded-xl px-3 transition-colors',
                    isNow && 'bg-orange-50 ring-1 ring-orange-200',
                    status === 'free' && !isNow && 'bg-gray-50/50 hover:bg-gray-50',
                    status === 'busy' && !hasEvent && 'bg-gray-50'
                  )}
                >
                  <div className="w-12 shrink-0 flex items-center gap-1">
                    <span
                      className={cn(
                        'w-2.5 h-2.5 rounded-full shrink-0',
                        status === 'free' && 'bg-emerald-400',
                        status === 'busy' && 'bg-red-400',
                        status === 'tight' && 'bg-amber-400'
                      )}
                    />
                    <span className="text-sm font-medium text-gray-600">{slot}</span>
                  </div>
                  {isNow && (
                    <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full shrink-0">
                      Jetzt
                    </span>
                  )}
                  {hasEvent ? (
                    <SwipeableEventItem
                      event={hasEvent}
                      onDelete={handleDeleteEvent}
                      colorClass="flex-1 flex items-center gap-2 p-3 rounded-lg bg-white border border-gray-100"
                    >
                      <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-medium text-gray-900 truncate">{getEventDisplay(hasEvent)}</span>
                    </SwipeableEventItem>
                  ) : (
                    <button
                      onClick={() => setEventModal({ open: true, date: dateKey, time: slot })}
                      className="flex-1 flex items-center gap-2 p-3 rounded-lg border border-dashed border-gray-200 hover:border-orange-200 hover:bg-orange-50/30 text-left min-h-[44px]"
                    >
                      <Plus className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="text-sm text-gray-500">Termin hinzufügen</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mahlzeiten */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-orange-500" />
              Mahlzeiten
            </h3>
            <div className="grid gap-2">
              {MEAL_SLOTS.map((slot) => {
                const assigned = dayEvents.find((e) => e.type === 'meal' && e.slot === slot.id);
                const content = (
                  <button
                    onClick={() => setRecipeModal({ open: true, date: dateKey, slot: slot.id, time: slot.time })}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 p-4 rounded-xl border text-left min-h-[52px] transition-colors',
                      assigned ? 'border-orange-200 bg-orange-50' : 'border-orange-100 bg-orange-50/30 hover:bg-orange-50/50'
                    )}
                  >
                    <div>
                      <span className="text-sm font-medium text-orange-700">{slot.label}</span>
                      {assigned && assigned.type === 'meal' && assigned.recipeName && (
                        <div className="text-xs text-orange-600 mt-0.5 truncate">{assigned.recipeName}</div>
                      )}
                    </div>
                    <span className="text-xs text-orange-500">{assigned ? 'Ändern' : 'Rezept wählen'}</span>
                  </button>
                );
                return assigned ? (
                  <SwipeableEventItem key={slot.id} event={assigned} onDelete={handleDeleteEvent} colorClass="rounded-xl overflow-hidden">
                    {content}
                  </SwipeableEventItem>
                ) : (
                  <div key={slot.id}>{content}</div>
                );
              })}
            </div>
          </div>

          {/* Workout */}
          <Link
            href="/tools/fitness"
            className="mt-4 flex items-center gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 hover:bg-emerald-50/50 min-h-[52px]"
          >
            <Dumbbell className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium text-emerald-700">Workout planen</span>
          </Link>
        </div>
      </div>

      {/* Sekundäre Links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/tools/recipe" className="px-4 py-2.5 rounded-xl bg-orange-50 text-orange-700 text-sm font-medium hover:bg-orange-100 min-h-[44px] flex items-center">
          Gourmet-Planer
        </Link>
        <Link href="/tools/shopping-list" className="px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 min-h-[44px] flex items-center">
          Einkaufsliste
        </Link>
      </div>

      {/* Modals */}
      <EventCreateModal
        isOpen={eventModal.open}
        onClose={() => setEventModal({ open: false, date: '', time: undefined })}
        date={eventModal.date}
        defaultTime={eventModal.time}
        onSubmit={handleAddCustomEvent}
      />
      {recipeModal && (
        <RecipePickerModal
          isOpen={recipeModal.open}
          onClose={() => setRecipeModal(null)}
          date={recipeModal.date}
          slot={recipeModal.slot}
          defaultTime={recipeModal.time}
          onSelect={handleAddMealFromRecipe}
        />
      )}
    </PageTransition>
  );
}
