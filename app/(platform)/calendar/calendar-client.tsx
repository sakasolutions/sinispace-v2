'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  Dumbbell,
  Calendar,
  Clock,
  Send,
  ExternalLink,
  Plus,
  Repeat,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { rrulestr } from 'rrule';
import confetti from 'canvas-confetti';
import {
  getCalendarEvents,
  saveCalendarEvents,
  removeCalendarEvent,
  type CalendarEvent,
} from '@/actions/calendar-actions';
import { parseNaturalLanguage, getSmartTags, type ParsedEvent, type SmartTag } from '@/lib/parse-natural-language';
import { EventDetailSheet } from './event-detail-sheet';
import { RecipePickerModal } from './recipe-picker-modal';
import { SwipeableEventItem } from './swipeable-event-item';
import { DashboardShell } from '@/components/platform/dashboard-shell';

const WEEKDAYS_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const WEEKDAYS_HEADER = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const BRAND_GRADIENT = 'bg-gradient-to-r from-violet-600 to-pink-500';
const BRAND_GRADIENT_HOVER = 'hover:from-violet-700 hover:to-pink-600';
const BRAND_GRADIENT_TEXT = 'bg-gradient-to-r from-violet-600 to-pink-500 bg-clip-text text-transparent';

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type AgendaItem =
  | { id: string; type: 'event'; time: string; title: string; subtitle?: string; isRecurring?: boolean; event: CalendarEvent }
  | { id: string; type: 'meal'; time: string; title: string; subtitle?: string; event: CalendarEvent; recipeLink?: string; mealIcon?: string; imageUrl?: string | null }
  | { id: string; type: 'workout'; time: string; title: string; event: CalendarEvent };

/** Akzentfarbe + Badge für Event-Listen-Karten: Termin/Privat=rose, Arbeit=blue, Sport=emerald, Mahlzeit=orange */
function getAccentForItem(item: AgendaItem): { bar: string; text: string; badge: string; badgeBg: string } {
  if (item.type === 'meal') return { bar: 'bg-orange-500', text: 'text-orange-500', badge: 'Mahlzeit', badgeBg: 'bg-orange-50 text-orange-600' };
  if (item.type === 'workout') return { bar: 'bg-emerald-500', text: 'text-emerald-500', badge: 'Sport', badgeBg: 'bg-emerald-50 text-emerald-600' };
  const eventType = item.type === 'event' && 'eventType' in item.event ? item.event.eventType : 'reminder';
  if (eventType === 'work' || eventType === 'meeting') return { bar: 'bg-blue-500', text: 'text-blue-500', badge: 'Arbeit', badgeBg: 'bg-blue-50 text-blue-600' };
  return { bar: 'bg-rose-500', text: 'text-rose-500', badge: 'Privat', badgeBg: 'bg-rose-50 text-rose-600' };
}

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🍳',
  lunch: '🥗',
  dinner: '🍝',
  snack: '🍎',
};

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
      const hasRecipe = !!(e.recipeId || e.resultId);
      const mealIcon = hasRecipe ? (MEAL_ICONS[e.slot] ?? '🍽️') : undefined;
      const recipeLink = e.resultId ? `/tools/recipe?open=${encodeURIComponent(e.resultId)}` : undefined;
      const imageUrl = 'imageUrl' in e ? e.imageUrl : undefined;
      return { id: e.id, type: 'meal' as const, time: e.time || '12:00', title: label, subtitle, event: e, recipeLink, mealIcon, imageUrl };
    }
    if (e.type === 'workout') return { id: e.id, type: 'workout' as const, time: e.time || '08:00', title: e.label || 'Workout', event: e };
    const isRecurring = !!(e.type === 'custom' && 'rrule' in e && e.rrule);
    return { id: e.id, type: 'event' as const, time: e.time || '09:00', title: e.title, event: e, isRecurring };
  });
  return items.sort((a, b) => a.time.localeCompare(b.time));
}

/** Kategorien pro Datum (max 4, Reihenfolge: Gesundheit, Termin, Essen, Sport) */
type CategoryColor = 'blue' | 'orange' | 'pink' | 'emerald';

function getCategoryDotsForDate(dateKey: string, events: CalendarEvent[]): CategoryColor[] {
  const dayEvents = events.filter((e) => eventOccursOnDate(e, dateKey));
  const categories = new Set<CategoryColor>();
  for (const e of dayEvents) {
    if (e.type === 'custom') {
      categories.add('eventType' in e && e.eventType === 'health' ? 'emerald' : 'blue');
    } else if (e.type === 'meal') categories.add('orange');
    else if (e.type === 'workout') categories.add('pink');
  }
  const order: CategoryColor[] = ['emerald', 'blue', 'orange', 'pink'];
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
    emerald: selected ? 'bg-white' : 'bg-emerald-500',
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
  const startPad = (first.getDay() + 6) % 7;
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

/** Stunden für Spatial Timeline (06:00–23:00) */
const TIMELINE_HOURS = Array.from({ length: 18 }, (_, i) => {
  const h = i + 6;
  return `${String(h).padStart(2, '0')}:00`;
});

/** Stunde aus "HH:mm" oder "H:mm" extrahieren (0–23) für Raster-Platzierung */
function hourFromTime(time: string): number {
  if (!time || typeof time !== 'string') return 9;
  const [h] = time.trim().split(':').map(Number);
  const hour = Number.isFinite(h) ? h : 9;
  return Math.min(23, Math.max(0, hour));
}

/** Agenda-Items nach Startstunde gruppieren (06–23), alle Events inkl. Custom */
function groupAgendaItemsByHour(items: AgendaItem[]): Map<number, AgendaItem[]> {
  const byHour = new Map<number, AgendaItem[]>();
  for (const item of items) {
    const h = hourFromTime(item.time);
    const hour = Math.min(23, Math.max(6, h)); // Timeline 06:00–23:00, nichts verlieren
    const list = byHour.get(hour) ?? [];
    list.push(item);
    byHour.set(hour, list);
  }
  for (const list of byHour.values()) list.sort((a, b) => a.time.localeCompare(b.time));
  return byHour;
}

type ViewMode = 'agenda' | 'woche' | 'monat';

export function CalendarClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('agenda');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [magicInput, setMagicInput] = useState('');
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
  const [recipeModal, setRecipeModal] = useState<{ open: boolean; date: string; slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'; time: string } | null>(null);

  const loadEvents = useCallback(async () => {
    const res = await getCalendarEvents();
    if (res.success && res.events) setEvents(res.events);
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (searchParams.get('plan') !== 'success') return;
    const fire = () => {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 200);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 400);
    };
    fire();
    setSuccessMessage('Wochenplan erstellt! 🎉');
    loadEvents();
    router.replace('/calendar', { scroll: false });
    const t = setTimeout(() => setSuccessMessage(null), 5000);
    return () => clearTimeout(t);
  }, [searchParams, router, loadEvents]);

  const dateKey = toDateKey(currentDate);
  const todayKey = toDateKey(new Date());
  const isToday = dateKey === todayKey;

  const monthGrid = useMemo(() => getMonthGrid(viewDate.getFullYear(), viewDate.getMonth()), [viewDate]);
  const agendaItems = useMemo(() => getDayEvents(dateKey, events), [dateKey, events]);
  const eventsByHour = useMemo(() => groupAgendaItemsByHour(agendaItems), [agendaItems]);

  /** Position der "Jetzt"-Linie in px (nur wenn heute); Zeilen je 80px, 06:00 = 0 */
  const nowLineTop = useMemo(() => {
    if (dateKey !== todayKey) return null;
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    if (h < 6 || h >= 24) return null;
    return (h - 6) * 80;
  }, [dateKey, todayKey]);

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
    if (typeof console !== 'undefined' && console.log) {
      console.log('[Calendar Event]', { text, parsed, creating: parsed.isMeal ? 'meal' : 'event' });
    }
    if (parsed.isMeal) {
      const slot = parsed.time < '11:00' ? 'breakfast' : parsed.time < '15:00' ? 'lunch' : parsed.time < '17:00' ? 'snack' : 'dinner';
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

  const handleEventSheetSubmit = async (event: CalendarEvent) => {
    const existing = events.find((e) => e.id === event.id);
    const next = existing ? events.map((e) => (e.id === event.id ? event : e)) : [...events, event];
    setEvents(next as CalendarEvent[]);
    await saveCalendarEvents(next as CalendarEvent[]);
    setEventModal({ open: false, date: '', time: undefined });
  };

  const handleAddMealFromRecipe = async (recipe: { id: string; resultId: string; recipeName: string; stats?: { time?: string; calories?: string } }, slot: 'breakfast' | 'lunch' | 'dinner' | 'snack', date: string, time: string) => {
    const newEvent: CalendarEvent = { id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, type: 'meal', slot, date, time, resultId: recipe.resultId, recipeId: recipe.id, recipeName: recipe.recipeName, calories: recipe.stats?.calories, prepTime: recipe.stats?.time };
    const next = [...events, newEvent];
    setEvents(next);
    await saveCalendarEvents(next);
  };

  const handleDeleteEvent = async (eventId: string) => {
    const prev = events;
    setEvents((e) => e.filter((ev) => ev.id !== eventId));
    const result = await removeCalendarEvent(eventId);
    if (!result.success) {
      setEvents(prev);
      console.error('[Calendar] Delete failed:', result.error);
    }
  };

  const eventCountForDate = (d: Date) => events.filter((e) => eventOccursOnDate(e, toDateKey(d))).length;

  const dayLabel = `${isToday ? 'Heute' : WEEKDAYS_LONG[currentDate.getDay()]}, ${currentDate.getDate()}. ${MONTHS[currentDate.getMonth()]}`;

  return (
    <>
      <DashboardShell
        headerVariant="default"
        headerBackground={
          <div className="relative w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=1200&q=80)' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/40 z-0" aria-hidden />
          </div>
        }
        title={
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mt-0 text-white" style={{ letterSpacing: '-0.3px' }}>
            Dein Tag
          </h1>
        }
        subtitle={
          <p className="text-sm sm:text-base mt-1 font-normal text-white/90" style={{ letterSpacing: '0.1px' }}>
            {dayLabel}
          </p>
        }
        headerExtra={
          <div className="flex gap-2 sm:gap-3 overflow-x-auto mt-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {weekDays.map((d) => {
              const dKey = toDateKey(d);
              const selected = dKey === dateKey;
              const isTodayDate = dKey === todayKey;
              return (
                <button
                  key={dKey}
                  onClick={() => selectDay(d)}
                  className={cn(
                    'shrink-0 w-14 sm:w-16 flex flex-col items-center justify-center rounded-xl sm:rounded-2xl py-2.5 px-2 transition-all border',
                    selected
                      ? 'bg-gray-900 text-white font-bold border-gray-900 shadow-lg'
                      : 'bg-white/95 backdrop-blur-sm text-gray-600 border-gray-200/80 hover:bg-white'
                  )}
                >
                  <span className={cn('text-[10px] font-semibold uppercase tracking-wide', selected ? 'text-white' : 'text-gray-500')}>
                    {WEEKDAYS_SHORT[d.getDay()]}
                  </span>
                  <span className={cn('text-base sm:text-lg font-bold mt-0.5', selected ? 'text-white' : 'text-gray-700')}>
                    {d.getDate()}
                  </span>
                  {isTodayDate && !selected && <span className="mt-0.5 w-1 h-1 rounded-full bg-violet-500" />}
                </button>
              );
            })}
          </div>
        }
      >
        <div ref={agendaRef} className="max-w-3xl mx-auto">
          <div className="flex flex-col gap-4">
          {agendaItems.length === 0 ? (
            <div className="bg-white/80 backdrop-blur rounded-2xl p-8 text-center border border-gray-100 shadow-sm">
              <p className="text-gray-500">Keine Termine an diesem Tag.</p>
              <p className="text-sm text-gray-400 mt-1">Tippe unten einen neuen Eintrag ein.</p>
            </div>
          ) : (
            agendaItems.map((item) => {
              const accent = getAccentForItem(item);
              const subline = item.type === 'meal' ? item.subtitle : ('location' in item.event && item.event.location ? item.event.location : null);
              return (
                <SwipeableEventItem
                  key={item.id}
                  event={item.event}
                  onDelete={handleDeleteEvent}
                  onEdit={(e) => setEventModal({ open: true, date: e.date, time: e.time ?? '09:00', editEvent: e })}
                  enableSwipe={isMobile}
                >
                  {item.type === 'meal' && item.recipeLink ? (
                    <Link
                      href={item.recipeLink}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all flex items-start gap-4"
                    >
                      <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', accent.bar)} aria-hidden />
                      <div className="flex-1 min-w-0">
                        <span className={cn('text-sm font-bold', accent.text)}>{item.time}</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-1">{item.title}</h3>
                        {subline && <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">{subline}</p>}
                        <span className={cn('inline-block mt-2 text-xs px-2 py-1 rounded-full', accent.badgeBg)}>{accent.badge}</span>
                      </div>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      ) : null}
                    </Link>
                  ) : (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setEventModal({ open: true, date: item.event.date, time: item.event.time ?? '09:00', editEvent: item.event })}
                      onKeyDown={(k) => k.key === 'Enter' && setEventModal({ open: true, date: item.event.date, time: item.event.time ?? '09:00', editEvent: item.event })}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-all flex items-start gap-4 cursor-pointer"
                    >
                      <div className={cn('absolute left-0 top-0 bottom-0 w-1.5', accent.bar)} aria-hidden />
                      <div className="flex-1 min-w-0">
                        <span className={cn('text-sm font-bold', accent.text)}>{item.time}</span>
                        <h3 className="text-lg font-bold text-gray-900 mt-1">{item.title}</h3>
                        {subline && (
                          <p className="text-gray-500 text-sm mt-1 flex items-center gap-1">
                            {item.type === 'event' && 'location' in item.event && item.event.location && <MapPin className="w-3.5 h-3.5 shrink-0" />}
                            {subline}
                          </p>
                        )}
                        <span className={cn('inline-block mt-2 text-xs px-2 py-1 rounded-full', accent.badgeBg)}>{accent.badge}</span>
                      </div>
                      {item.type === 'meal' && item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      ) : null}
                      {'isRecurring' in item && item.isRecurring && <Repeat className="w-4 h-4 text-violet-500 shrink-0 absolute top-4 right-4" aria-label="Wiederkehrend" />}
                    </div>
                  )}
                </SwipeableEventItem>
              );
            })
          )}
          </div>
        </div>
      </DashboardShell>

      {/* ========== MAGIC INPUT (fixiert unten) ========== */}
      <div
        className={cn(
          'fixed bottom-[90px] left-4 right-4 md:bottom-6 z-50 max-w-3xl mx-auto',
          eventModal.open && 'pointer-events-none opacity-0'
        )}
      >
        <div className="space-y-2">
          {successMessage && (
            <p className="text-sm text-green-600 font-medium text-center bg-green-50 rounded-full py-2 px-4 border border-green-100">✓ {successMessage}</p>
          )}
          {parsedLive?.recurrenceLabel && !successMessage && (
            <p className="text-sm text-violet-600 font-medium text-center">🔄 {parsedLive?.recurrenceLabel}</p>
          )}
          {smartTags.length > 0 && !successMessage && (
            <div className="flex flex-wrap gap-2 justify-center">
              {smartTags.map((tag, i) => (
                <span key={i} className="inline-flex px-3 py-1.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">{tag.label}</span>
              ))}
            </div>
          )}
          <form
            onSubmit={handleMagicSubmit}
            className="flex items-center gap-2 p-2 bg-white/90 backdrop-blur-xl shadow-2xl border border-white/50 rounded-full min-w-0 w-full"
          >
            <button
              type="button"
              onClick={() => setEventModal({ open: true, date: dateKey, time: '09:00' })}
              className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-gray-900 text-white hover:bg-gray-800 transition-colors"
              aria-label="Termin hinzufügen"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={magicInput}
              onChange={(e) => setMagicInput(e.target.value)}
              placeholder='z.B. "Morgen 14 Uhr Shisha" oder "Jeden Freitag 18 Uhr Fußball"'
              className="flex-1 min-w-0 min-h-[44px] px-4 rounded-full bg-transparent border-none focus:ring-0 outline-none text-base placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!magicInput.trim()}
              className={cn('shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-colors', BRAND_GRADIENT, BRAND_GRADIENT_HOVER)}
              aria-label="Hinzufügen"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Schwebender Magic Input (nur falls später wieder Woche/Monat-View) – aktuell nur Timeline */}
      {false && (
      <motion.div
        className="fixed left-0 right-0 px-4 md:bottom-8 md:left-64 md:right-0 md:px-6 z-[60] pb-[env(safe-area-inset-bottom)] pointer-events-none bottom-[calc(100px+env(safe-area-inset-bottom))] md:bottom-8"
        initial={false}
        animate={{
          y: eventModal.open ? '100%' : 0,
          opacity: eventModal.open ? 0 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className={cn('space-y-2 max-w-2xl mx-auto', eventModal.open ? 'pointer-events-none' : 'pointer-events-auto')}>
          {successMessage && (
            <p className="text-sm text-green-600 font-medium animate-in fade-in duration-200 text-center bg-green-50 rounded-full py-2 px-4 border border-green-100">
              ✓ {successMessage}
            </p>
          )}
          {parsedLive?.recurrenceLabel && !successMessage && (
            <p className="text-sm text-violet-600 font-medium animate-in fade-in duration-200 text-center">
              🔄 {parsedLive?.recurrenceLabel}
            </p>
          )}
          {smartTags.length > 0 && !successMessage && (
            <div className="flex flex-wrap gap-2 justify-center animate-in fade-in duration-200">
              {smartTags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100"
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}
          <form
            onSubmit={handleMagicSubmit}
            className="flex items-center gap-2 p-2 bg-white/80 backdrop-blur-md shadow-2xl border border-white/50 rounded-full min-w-0 w-full"
          >
            <button
              type="button"
              onClick={() => setEventModal({ open: true, date: dateKey, time: '09:00' })}
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              aria-label="Termin hinzufügen"
            >
              <Plus className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={magicInput}
              onChange={(e) => setMagicInput(e.target.value)}
              placeholder='z.B. "Jeden Freitag 18 Uhr Fußball" oder "Morgen 14 Uhr Meeting"'
              className="flex-1 min-w-0 min-h-[44px] px-4 rounded-full bg-transparent border-none focus:ring-0 outline-none text-base placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!magicInput.trim()}
              className={cn('shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-colors', BRAND_GRADIENT, BRAND_GRADIENT_HOVER)}
              aria-label="Hinzufügen"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </motion.div>
      )}

      <EventDetailSheet
        isOpen={eventModal.open}
        onClose={() => setEventModal({ open: false, date: '', time: undefined })}
        date={eventModal.editEvent?.date ?? eventModal.date}
        defaultTime={eventModal.editEvent?.time ?? eventModal.time ?? '09:00'}
        editEvent={eventModal.editEvent}
        events={events}
        onSubmit={handleEventSheetSubmit}
      />
      {recipeModal && <RecipePickerModal isOpen={recipeModal.open} onClose={() => setRecipeModal(null)} date={recipeModal.date} slot={recipeModal.slot} defaultTime={recipeModal.time} onSelect={handleAddMealFromRecipe} />}
    </>
  );
}
