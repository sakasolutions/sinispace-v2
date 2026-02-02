'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, MapPin, UtensilsCrossed, Briefcase, Dumbbell, User, Stethoscope, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent, CustomEventType } from '@/actions/calendar-actions';
import { LocationPicker } from '@/components/ui/location-picker';

function weatherCodeToEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 3) return code === 1 ? '🌤️' : code === 2 ? '⛅' : '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌦️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95 && code <= 99) return '⛈️';
  return '🌡️';
}

function weatherCodeToLabel(code: number): string {
  if (code === 0) return 'Klar';
  if (code === 1) return 'Heiter';
  if (code === 2) return 'Bewölkt';
  if (code === 3) return 'Bedeckt';
  if (code === 45 || code === 48) return 'Nebel';
  if (code >= 51 && code <= 67) return 'Regen';
  if (code >= 71 && code <= 77) return 'Schnee';
  if (code >= 80 && code <= 82) return 'Schauer';
  if (code >= 95 && code <= 99) return 'Gewitter';
  return 'Wechselhaft';
}

const WEEKDAYS_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

function getEventTitle(e: CalendarEvent): string {
  if (e.type === 'meal') return (e.recipeName || e.slot).toLowerCase();
  if (e.type === 'workout') return (e.label || 'workout').toLowerCase();
  return (e.title || '').toLowerCase();
}

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9äöüß\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSimilar(query: string, eventTitle: string): boolean {
  if (!query || query.length < 2) return false;
  const q = normalizeForMatch(query);
  const t = normalizeForMatch(eventTitle);
  if (!q || !t) return false;
  if (t.includes(q) || q.includes(t)) return true;
  const qWords = q.split(/\s+/).filter((w) => w.length >= 2);
  const tWords = t.split(/\s+/).filter((w) => w.length >= 2);
  const overlap = qWords.filter((w) => tWords.some((tw) => tw.includes(w) || w.includes(tw))).length;
  return overlap >= Math.min(1, qWords.length);
}

export type SmartSuggestion =
  | { type: 'time'; label: string; value: string }
  | { type: 'location'; label: string; value: string }
  | { type: 'duration'; label: string; durationMinutes: number }
  | { type: 'recipe'; label: string; value: string }
  | { type: 'weekday'; label: string; weekday: number };

function getNextWeekdayDate(currentDateStr: string, targetWeekday: number): string {
  const [y, m, d] = currentDateStr.split('-').map(Number);
  const current = new Date(y, m - 1, d);
  const currentWd = current.getDay();
  let diff = (targetWeekday - currentWd + 7) % 7;
  if (diff === 0) diff = 7;
  const next = new Date(current);
  next.setDate(current.getDate() + diff);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

function getSmartSuggestions(events: CalendarEvent[], query: string, excludeId?: string): SmartSuggestion[] {
  if (!query || query.trim().length < 2) return [];
  const similar = events.filter((e) => e.id !== excludeId && isSimilar(query.trim(), getEventTitle(e)));
  if (similar.length === 0) return [];

  const suggestions: SmartSuggestion[] = [];

  const weekdays = similar.map((e) => {
    const [y, m, d] = e.date.split('-').map(Number);
    return new Date(y, m - 1, d).getDay();
  });
  if (weekdays.length > 0) {
    const counts = new Map<number, number>();
    weekdays.forEach((wd) => counts.set(wd, (counts.get(wd) || 0) + 1));
    const mostWd = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (mostWd && mostWd[1] >= 2) {
      suggestions.push({
        type: 'weekday',
        label: `📅 Wie immer ${WEEKDAYS_SHORT[mostWd[0]]}?`,
        weekday: mostWd[0],
      });
    }
  }

  const times = similar.map((e) => e.time || '09:00').filter(Boolean);
  if (times.length > 0) {
    const counts = new Map<string, number>();
    times.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));
    const mostTime = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (mostTime && mostTime[1] >= 1) {
      suggestions.push({ type: 'time', label: `🕒 Wie immer: ${mostTime[0]} Uhr?`, value: mostTime[0] });
    }
  }

  const locations = similar
    .filter((e) => e.type === 'custom' && 'location' in e && e.location && e.location.trim())
    .map((e) => ('location' in e ? e.location! : ''))
    .filter(Boolean);
  if (locations.length > 0) {
    const counts = new Map<string, number>();
    locations.forEach((l) => counts.set(l, (counts.get(l) || 0) + 1));
    const mostLoc = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (mostLoc && mostLoc[1] >= 1) {
      suggestions.push({ type: 'location', label: `📍 Wie immer: ${mostLoc[0]}?`, value: mostLoc[0] });
    }
  }

  const recipes = similar
    .filter((e): e is Extract<CalendarEvent, { type: 'meal' }> => e.type === 'meal' && !!e.recipeName)
    .map((e) => e.recipeName as string);
  if (recipes.length > 0) {
    const counts = new Map<string, number>();
    recipes.forEach((r) => counts.set(r, (counts.get(r) || 0) + 1));
    const mostRecipe = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (mostRecipe && mostRecipe[1] >= 1) {
      suggestions.push({ type: 'recipe', label: `🍽️ Wie immer: ${mostRecipe[0]}?`, value: mostRecipe[0] });
    }
  }

  const withEnd = similar.filter((e) => 'endTime' in e && e.endTime);
  if (withEnd.length > 0) {
    const durations: number[] = [];
    withEnd.forEach((e) => {
      const t = e.time || '09:00';
      const end = 'endTime' in e ? e.endTime! : '';
      if (!end) return;
      const [h1, m1] = t.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      const mins = (h2 - h1) * 60 + (m2 - m1);
      if (mins > 0 && mins <= 480) durations.push(mins);
    });
    if (durations.length > 0) {
      const counts = new Map<number, number>();
      durations.forEach((d) => counts.set(d, (counts.get(d) || 0) + 1));
      const mostDur = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (mostDur && mostDur[1] >= 1) {
        suggestions.push({
          type: 'duration',
          label: `⏱️ Wie immer: ${mostDur[0]} min?`,
          durationMinutes: mostDur[0],
        });
      }
    }
  }

  return suggestions;
}

export type EventCategory = 'arbeit' | 'essen' | 'sport' | 'privat' | 'gesundheit';

const CATEGORIES: { id: EventCategory; label: string; icon: typeof Briefcase; color: string; bg: string; border: string }[] = [
  { id: 'gesundheit', label: 'Gesundheit', icon: Stethoscope, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'arbeit', label: 'Arbeit', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  { id: 'essen', label: 'Essen', icon: UtensilsCrossed, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  { id: 'sport', label: 'Sport', icon: Dumbbell, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
  { id: 'privat', label: 'Privat', icon: User, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
];

const DURATION_CHIPS = [
  { label: '30 min', minutes: 30 },
  { label: '1 h', minutes: 60 },
  { label: '2 h', minutes: 120 },
  { label: '4 h', minutes: 240 },
];

const REMINDER_OPTIONS = [
  { label: 'Keine', minutes: 0 },
  { label: '5 min vorher', minutes: 5 },
  { label: '15 min vorher', minutes: 15 },
  { label: '30 min vorher', minutes: 30 },
  { label: '1 Stunde vorher', minutes: 60 },
  { label: '1 Tag vorher', minutes: 24 * 60 },
];

const MEAL_SLOTS = [
  { id: 'breakfast' as const, label: 'Frühstück', defaultTime: '08:00' },
  { id: 'lunch' as const, label: 'Mittagessen', defaultTime: '12:30' },
  { id: 'dinner' as const, label: 'Abendessen', defaultTime: '18:30' },
];

function eventToCategory(e: CalendarEvent): EventCategory {
  if (e.type === 'meal') return 'essen';
  if (e.type === 'workout') return 'sport';
  if (e.type === 'custom') {
    if (e.eventType === 'health') return 'gesundheit';
    if (e.eventType === 'work' || e.eventType === 'meeting') return 'arbeit';
    return 'privat';
  }
  return 'privat';
}

/** AI-Kategorie-Erkennung: Heuristik basierend auf Titel */
function detectCategoryFromTitle(title: string): EventCategory | null {
  const t = title.toLowerCase();
  if (/\b(arzt|praxis|zahn|ärztin|termin)\b/.test(t)) return 'gesundheit';
  if (/\b(meeting|call|büro|office|konferenz)\b/.test(t)) return 'arbeit';
  if (/\b(essen|dinner|lunch|mittag|frühstück|abendessen)\b/.test(t)) return 'essen';
  if (/\b(gym|sport|training|joggen|yoga|fitness)\b/.test(t)) return 'sport';
  return null;
}

function eventToForm(e: CalendarEvent): { category: EventCategory; title: string; date: string; time: string; endTime: string; location: string; locationLat?: number; locationLon?: number; recipeName: string; slot: 'breakfast' | 'lunch' | 'dinner'; routine: string; isAllDay: boolean; notes: string; reminderMinutes: number } {
  const category = eventToCategory(e);
  let title = '';
  let recipeName = '';
  let slot: 'breakfast' | 'lunch' | 'dinner' = 'lunch';
  let routine = '';
  if (e.type === 'meal') {
    title = e.recipeName || `${e.slot === 'breakfast' ? 'Frühstück' : e.slot === 'lunch' ? 'Mittagessen' : 'Abendessen'}`;
    recipeName = e.recipeName || '';
    slot = e.slot;
  } else if (e.type === 'workout') {
    title = e.label || 'Workout';
    routine = e.routine || '';
  } else {
    title = e.title;
  }
  return {
    category,
    title,
    date: e.date,
    time: e.time || '09:00',
    endTime: ('endTime' in e ? e.endTime : '') || '',
    location: ('location' in e ? e.location : '') || '',
    locationLat: ('locationLat' in e ? e.locationLat : undefined),
    locationLon: ('locationLon' in e ? e.locationLon : undefined),
    recipeName,
    slot,
    routine,
    isAllDay: ('isAllDay' in e ? e.isAllDay : false) || false,
    notes: ('notes' in e ? e.notes : '') || '',
    reminderMinutes: ('reminderMinutes' in e ? e.reminderMinutes : 15) ?? 15,
  };
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  defaultTime?: string;
  editEvent?: CalendarEvent;
  events?: CalendarEvent[];
  onSubmit: (event: CalendarEvent) => void | Promise<void>;
};

function computeEndTime(time: string, durationMinutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + durationMinutes;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function EventDetailSheet({ isOpen, onClose, date, defaultTime = '09:00', editEvent, events = [], onSubmit }: Props) {
  const [category, setCategory] = useState<EventCategory>('privat');
  const [title, setTitle] = useState('');
  const [formDate, setFormDate] = useState(date);
  const [time, setTime] = useState(defaultTime);
  const [endTime, setEndTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [locationLat, setLocationLat] = useState<number | undefined>(undefined);
  const [locationLon, setLocationLon] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState(15);
  const [recipeName, setRecipeName] = useState('');
  const [slot, setSlot] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
  const [routine, setRoutine] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [weather, setWeather] = useState<{ code: number; label: string } | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lon: number }>({ lat: 52.52, lon: 13.41 });

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  const fetchWeather = useCallback(async (dateStr: string) => {
    try {
      const { lat, lon } = coords;
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`
      );
      const data = await res.json();
      const code = data?.daily?.weathercode?.[0] ?? null;
      if (code != null) {
        setWeather({ code: Number(code), label: weatherCodeToLabel(Number(code)) });
      } else {
        setWeather(null);
      }
    } catch {
      setWeather(null);
    }
  }, [coords.lat, coords.lon]);

  useEffect(() => {
    if (isOpen && formDate) {
      fetchWeather(formDate);
    } else {
      setWeather(null);
    }
  }, [isOpen, formDate, fetchWeather]);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (editEvent) {
        const f = eventToForm(editEvent);
        setCategory(f.category);
        setTitle(f.title);
        setFormDate(f.date);
        setTime(f.time);
        setEndTime(f.endTime);
        setDurationMinutes(f.endTime ? (() => {
          const [h1, m1] = f.time.split(':').map(Number);
          const [h2, m2] = f.endTime.split(':').map(Number);
          const mins = (h2 - h1) * 60 + (m2 - m1);
          return DURATION_CHIPS.find((c) => c.minutes === mins)?.minutes ?? mins;
        })() : 60);
        setIsAllDay(f.isAllDay);
        setLocation(f.location);
        setLocationLat(f.locationLat);
        setLocationLon(f.locationLon);
        setNotes(f.notes);
        setReminderMinutes(f.reminderMinutes);
        setRecipeName(f.recipeName);
        setSlot(f.slot);
        setRoutine(f.routine);
      } else {
        setCategory('privat');
        setTitle('');
        setFormDate(date);
        setTime(defaultTime);
        setEndTime(computeEndTime(defaultTime, 60));
        setDurationMinutes(60);
        setIsAllDay(false);
        setLocation('');
        setLocationLat(undefined);
        setLocationLon(undefined);
        setNotes('');
        setReminderMinutes(15);
        setRecipeName('');
        setSlot(defaultTime < '11:00' ? 'breakfast' : defaultTime < '15:00' ? 'lunch' : 'dinner');
        setRoutine('');
      }
    }
  }, [isOpen, editEvent, date, defaultTime]);

  const suggestions = useMemo(
    () => getSmartSuggestions(events, title, editEvent?.id),
    [events, title, editEvent?.id]
  );

  const applySuggestion = (s: SmartSuggestion) => {
    if (s.type === 'time') {
      setTime(s.value);
    } else if (s.type === 'location') {
      setLocation(s.value);
      setLocationLat(undefined);
      setLocationLon(undefined);
    } else if (s.type === 'duration') {
      setDurationMinutes(s.durationMinutes);
      setEndTime(computeEndTime(time, s.durationMinutes));
    } else if (s.type === 'recipe') {
      setRecipeName(s.value);
    } else if (s.type === 'weekday') {
      setFormDate(getNextWeekdayDate(formDate, s.weekday));
    }
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    const detected = detectCategoryFromTitle(value);
    if (detected) setCategory(detected);
  };

  const handleDurationChip = (minutes: number) => {
    setDurationMinutes(minutes);
    setEndTime(computeEndTime(time, minutes));
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
    if (!isAllDay) setEndTime(computeEndTime(newTime, durationMinutes));
  };

  const catConfig = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const accentBg = catConfig.bg;
  const accentColor = catConfig.color;
  const accentBorder = catConfig.border;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle && category !== 'essen') return;
    const displayTitle = trimmedTitle || (slot === 'breakfast' ? 'Frühstück' : slot === 'lunch' ? 'Mittagessen' : 'Abendessen');

    const buildEvent = (): CalendarEvent => {
      if (category === 'essen') {
        return {
          id: editEvent ? editEvent.id : `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'meal',
          slot,
          date: formDate,
          time,
          recipeName: recipeName || displayTitle,
        };
      }
      if (category === 'sport') {
        return {
          id: editEvent ? editEvent.id : `workout-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          type: 'workout',
          date: formDate,
          time,
          endTime: endTime || undefined,
          label: displayTitle,
          routine: routine || undefined,
        };
      }
      const eventType: CustomEventType =
        category === 'gesundheit' ? 'health' : category === 'arbeit' ? 'work' : 'personal';
      return {
        id: editEvent ? editEvent.id : `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'custom',
        eventType,
        title: displayTitle,
        date: formDate,
        time: isAllDay ? '00:00' : time,
        endTime: isAllDay ? '23:59' : (endTime || undefined),
        location: location || undefined,
        locationLat: locationLat,
        locationLon: locationLon,
        notes: notes.trim() || undefined,
        reminderMinutes: reminderMinutes || undefined,
        isAllDay: isAllDay || undefined,
      } as CalendarEvent;
    };
    await onSubmit(buildEvent());
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setCategory('privat');
    onClose();
  };

  const showLocation = category === 'arbeit' || category === 'privat' || category === 'gesundheit';
  const showRecipe = category === 'essen';
  const showRoutine = category === 'sport';

  const springTransition = { type: 'spring' as const, stiffness: 300, damping: 25 };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="event-sheet"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={springTransition}
          className={cn('fixed inset-0 z-50 flex', isMobile ? 'items-end justify-center' : 'items-center justify-center')}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden
          />
          <div
            className={cn(
              'relative w-full max-w-lg bg-white shadow-xl flex flex-col z-10',
              isMobile ? 'max-h-[85vh] rounded-t-3xl' : 'max-h-[85vh] rounded-2xl'
            )}
            role="dialog"
            aria-labelledby="event-sheet-title"
          >
            {/* Header mit Kategorie-Farbe + Wetter */}
            <div className={cn('sticky top-0 z-10 px-4 py-3 flex items-center justify-between border-b transition-colors shrink-0', accentBg, accentBorder)}>
              <div className="flex items-center gap-3 min-w-0">
                <h2 id="event-sheet-title" className={cn('text-lg font-semibold', accentColor)}>
                  {editEvent ? 'Termin bearbeiten' : 'Termin hinzufügen'}
                </h2>
                {weather && (
                  <span className="shrink-0 text-sm text-gray-600" title={weather.label}>
                    {weatherCodeToEmoji(weather.code)} {weather.label}
                  </span>
                )}
              </div>
              <button onClick={handleClose} className={cn('p-2 rounded-lg hover:bg-black/5 transition-colors shrink-0', accentColor)} aria-label="Schließen">
                <X className="w-5 h-5" />
              </button>
            </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 p-4 pb-8 space-y-5">
          {/* Titel – groß oben */}
          <div className="space-y-2">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={category === 'essen' ? 'z.B. Pasta Carbonara' : category === 'sport' ? 'z.B. Joggen, Yoga' : category === 'gesundheit' ? 'z.B. Zahnarzt, Arzttermin' : 'z.B. Team Call, Zahnarzt'}
              className={cn(
                'w-full px-4 py-4 text-lg font-medium rounded-xl border-2 focus:outline-none focus:ring-2 transition-all',
                category === 'gesundheit' && 'border-emerald-200 focus:border-emerald-500 focus:ring-emerald-100',
                category === 'arbeit' && 'border-blue-200 focus:border-blue-500 focus:ring-blue-100',
                category === 'essen' && 'border-orange-200 focus:border-orange-500 focus:ring-orange-100',
                category === 'sport' && 'border-pink-200 focus:border-pink-500 focus:ring-pink-100',
                category === 'privat' && 'border-purple-200 focus:border-purple-500 focus:ring-purple-100'
              )}
              autoFocus
            />
            {/* Smart Suggestions – aus Historie ähnlicher Events */}
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions
                  .filter((s) => {
                    if (s.type === 'location' && category !== 'arbeit' && category !== 'privat' && category !== 'gesundheit') return false;
                    if (s.type === 'duration' && category === 'essen') return false;
                    if (s.type === 'recipe' && category !== 'essen') return false;
                    return true;
                  })
                  .slice(0, 4)
                  .map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applySuggestion(s)}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Kategorie-Picker (AI setzt live um) */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-3">Kategorie</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-sm font-medium transition-all',
                      active ? `${c.bg} ${c.color} ${c.border}` : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    )}
                  >
                    <Icon className="w-6 h-6" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meal Slot (nur bei Essen) */}
          {showRecipe && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">Mahlzeit</label>
              <div className="grid grid-cols-3 gap-2">
                {MEAL_SLOTS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setSlot(s.id); setTime(s.defaultTime); }}
                    className={cn(
                      'py-2.5 px-3 rounded-xl border text-sm font-medium transition-all',
                      slot === s.id ? 'bg-orange-50 text-orange-600 border-orange-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ort (bei Arbeit / Privat / Gesundheit) – intelligente Suche via OpenStreetMap Nominatim */}
          {showLocation && (
            <LocationPicker
              id="event-location"
              value={location}
              onChange={(name, coords) => {
                setLocation(name);
                if (coords) {
                  setLocationLat(coords.lat);
                  setLocationLon(coords.lon);
                } else {
                  setLocationLat(undefined);
                  setLocationLon(undefined);
                }
              }}
              placeholder="z.B. Zahnarzt Herbrechtingen, Büro, Vapiano"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 outline-none transition-all"
            />
          )}

          {/* Notizen (auto-growing) */}
          <div>
            <label htmlFor="event-notes" className="block text-sm font-medium text-gray-600 mb-2">
              Notizen (optional)
            </label>
            <textarea
              id="event-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Weitere Infos..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 outline-none transition-all resize-none min-h-[80px]"
            />
          </div>

          {/* Erinnerung */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">
              <Bell className="w-4 h-4 inline mr-1" /> Erinnerung
            </label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((r) => (
                <button
                  key={r.minutes}
                  type="button"
                  onClick={() => setReminderMinutes(r.minutes)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                    reminderMinutes === r.minutes
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rezept / Gericht (bei Essen) */}
          {showRecipe && (
            <div>
              <label htmlFor="event-recipe" className="block text-sm font-medium text-gray-600 mb-2">
                <UtensilsCrossed className="w-4 h-4 inline mr-1" /> Gericht / Rezept
              </label>
              <input
                id="event-recipe"
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="z.B. Pasta, Salat"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
              />
            </div>
          )}

          {/* Routine (bei Sport) */}
          {showRoutine && (
            <div>
              <label htmlFor="event-routine" className="block text-sm font-medium text-gray-600 mb-2">
                <Dumbbell className="w-4 h-4 inline mr-1" /> Routine (optional)
              </label>
              <input
                id="event-routine"
                type="text"
                value={routine}
                onChange={(e) => setRoutine(e.target.value)}
                placeholder="z.B. 30 min Joggen"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
              />
            </div>
          )}

          {/* Datum & Ganztägig */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label htmlFor="event-date" className="block text-sm font-medium text-gray-600 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" /> Datum
              </label>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <input
                  id="event-date"
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-gray-900 focus:ring-0 focus:outline-none [color-scheme:light]"
                />
              </div>
            </div>
            {category !== 'essen' && (
              <div className="flex items-center gap-3 py-2 sm:pb-0">
                <span className="text-sm font-medium text-gray-600">Ganztägig</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isAllDay}
                  onClick={() => setIsAllDay(!isAllDay)}
                  className={cn(
                    'relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors',
                    isAllDay ? 'bg-gray-900' : 'bg-gray-200'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform mt-1',
                      isAllDay ? 'translate-x-6 ml-0.5' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>
            )}
          </div>

          {/* Zeit + Dauer-Chips (Outlook-Style, nur wenn nicht ganztägig) */}
          {!isAllDay && category !== 'essen' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="event-time" className="block text-sm font-medium text-gray-600 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" /> Startzeit
                </label>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 w-fit">
                  <input
                    id="event-time"
                    type="time"
                    value={time}
                    onChange={(e) => handleTimeChange(e.target.value)}
                    className="bg-transparent border-none p-0 text-gray-900 focus:ring-0 focus:outline-none [color-scheme:light]"
                  />
                </div>
              </div>
              <div>
                <span className="block text-sm font-medium text-gray-600 mb-2">Dauer</span>
                <div className="flex flex-wrap gap-2">
                  {DURATION_CHIPS.map((c) => (
                    <button
                      key={c.minutes}
                      type="button"
                      onClick={() => handleDurationChip(c.minutes)}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-all',
                        durationMinutes === c.minutes
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isAllDay && category === 'essen' && (
            <div>
              <label htmlFor="event-time" className="block text-sm font-medium text-gray-600 mb-2">
                <Clock className="w-4 h-4 inline mr-1" /> Uhrzeit
              </label>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 w-fit">
                <input
                  id="event-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-transparent border-none p-0 text-gray-900 focus:ring-0 focus:outline-none [color-scheme:light]"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={handleClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors">
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!title.trim() && category !== 'essen'}
              className={cn(
                'flex-1 py-3 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                category === 'gesundheit' && 'bg-emerald-500 hover:bg-emerald-600',
                category === 'arbeit' && 'bg-blue-500 hover:bg-blue-600',
                category === 'essen' && 'bg-orange-500 hover:bg-orange-600',
                category === 'sport' && 'bg-pink-500 hover:bg-pink-600',
                category === 'privat' && 'bg-purple-500 hover:bg-purple-600'
              )}
            >
              {editEvent ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
