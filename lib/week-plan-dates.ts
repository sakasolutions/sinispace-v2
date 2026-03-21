import { addDays, format, startOfDay } from 'date-fns';

/**
 * Nächster Kalender-Montag für Wochenplan-Aktivierung:
 * - Heute Montag → Montag in **7** Tagen (Plan immer „ab nächster Woche“).
 * - Heute Sonntag → **morgen** (Montag).
 * - Di–Sa → kommender Montag in derselben Woche.
 *
 * Kein 'use server': darf aus Server Actions importiert werden.
 */
export function getNextMonday(from: Date = new Date()): Date {
  const today = startOfDay(from);
  const dow = today.getDay(); // 0 So … 6 Sa
  let daysToAdd: number;
  if (dow === 0) daysToAdd = 1;
  else if (dow === 1) daysToAdd = 7;
  else daysToAdd = 8 - dow;
  return addDays(today, daysToAdd);
}

/** YYYY-MM-DD des nächsten Plan-Montags. */
export function getNextMondayDateString(from?: Date): string {
  return format(getNextMonday(from ?? new Date()), 'yyyy-MM-dd');
}

/**
 * „Nächster Montag“ bis Sonntag – identisch für Speichern (Kalender) und Laden (Re-Hydrierung).
 */
export function getNextWeekRange() {
  const nextMonday = getNextMonday();
  const nextSunday = addDays(nextMonday, 6);
  return {
    weekStart: nextMonday,
    queryFrom: format(nextMonday, 'yyyy-MM-dd'),
    queryTo: format(nextSunday, 'yyyy-MM-dd'),
  };
}
