import { addDays, format, startOfDay, startOfWeek } from 'date-fns';

/**
 * „Nächster Montag“ bis Sonntag – identisch für Speichern (Kalender) und Laden (Re-Hydrierung).
 * Kein 'use server': darf aus Server Actions importiert werden, ohne async zu sein.
 */
export function getNextWeekRange() {
  const today = startOfDay(new Date());
  const thisMonday = startOfWeek(today, { weekStartsOn: 1 });
  const nextMonday = thisMonday > today ? thisMonday : addDays(thisMonday, 7);
  const nextSunday = addDays(nextMonday, 6);
  return {
    weekStart: nextMonday,
    queryFrom: format(nextMonday, 'yyyy-MM-dd'),
    queryTo: format(nextSunday, 'yyyy-MM-dd'),
  };
}
