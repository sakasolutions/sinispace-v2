'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { addDays, format, getDay, isBefore, startOfDay } from 'date-fns';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/** Smart-Tag für kontextbezogene Aktionen (Chips, Icons). */
export type CalendarActionTag = 'food' | 'shopping' | 'location';

/** Event-Objekt im UserCalendar.eventsJson (Magic-Input / Custom) */
export type CalendarEventJson = {
  id: string;
  type: 'custom';
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  eventType: 'personal';
  endTime?: string; // HH:mm, optional
  location?: string;
  actionTag?: CalendarActionTag;
};

/**
 * Lädt die Kalender-Events des eingeloggten Users aus der DB (UserCalendar.eventsJson).
 * Kein LocalStorage-Fallback.
 */
export async function getCalendarEvents(): Promise<CalendarEventJson[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const row = await prisma.userCalendar.findUnique({
      where: { userId: session.user.id },
      select: { eventsJson: true },
    });
    if (!row?.eventsJson) return [];
    const parsed = JSON.parse(row.eventsJson) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Deutsche Wochentage für NL-Parser (date-fns: 0=So, 1=Mo, …, 6=Sa) */
const WEEKDAY_DE: Record<string, number> = {
  sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6,
};

/** Deutsche Monatsnamen → Monatsindex (0 = Januar, 11 = Dezember) */
const MONTH_DE: Record<string, number> = {
  januar: 0, februar: 1, märz: 2, april: 3, mai: 4, juni: 5, juli: 6,
  august: 7, september: 8, oktober: 9, november: 10, dezember: 11,
};

/** Relative Tagesbegriffe (Deutsch/Englisch) → Tage relativ zu heute. Case-insensitive. */
const RELATIVE_DAYS: { pattern: RegExp; daysToAdd: number }[] = [
  { pattern: /\b(übermorgen|uebermorgen|day\s+after)\b/i, daysToAdd: 2 },
  { pattern: /\b(morgen|tomorrow)\b/i, daysToAdd: 1 },
  { pattern: /\b(heute|today)\b/i, daysToAdd: 0 },
];

/** Keywords für actionTag 'food' (case-insensitive). */
const FOOD_KEYWORDS = /\b(essen|dinner|grillen|party|rezept|kochen|lunch|breakfast|mittag|frühstück|abendessen|mittagessen)\b/i;
/** Keywords für actionTag 'shopping'. */
const SHOPPING_KEYWORDS = /\b(einkauf|supermarkt|einkaufen|smartcart)\b/i;
/** Orts-Präpositionen für Location-Extraktion (im, in der, bei, nach). */
const LOCATION_PREPOSITION = /\b(im|in der|bei|nach)\s+([^,]+?)(?=\s*$|\s+und\s)/i;

/**
 * Parst natürliche Sprache zu title, date, time, location, actionTag.
 * Case-insensitive. Orts-Erkennung (im/in der/bei/nach) und Kategorie-Keywords (food/shopping).
 */
function parseNaturalLanguage(
  inputText: string,
  currentDate: Date
): { title: string; date: string; time: string; location?: string; actionTag?: CalendarActionTag } {
  const original = inputText.trim();
  const text = original.toLowerCase();
  let resolvedDate = new Date(currentDate);
  let time = '09:00';

  // 1) Explizites Datum: "21. März" / "21. märz" (DD. Monat)
  const dayMonthNameMatch = text.match(/\b(\d{1,2})\.\s*(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/i);
  if (dayMonthNameMatch) {
    const day = Math.max(1, Math.min(31, parseInt(dayMonthNameMatch[1], 10)));
    const monthName = dayMonthNameMatch[2].toLowerCase();
    const monthIndex = MONTH_DE[monthName] ?? 0;
    let candidate = new Date(currentDate.getFullYear(), monthIndex, day);
    const today = startOfDay(currentDate);
    if (isBefore(candidate, today)) {
      candidate = new Date(currentDate.getFullYear() + 1, monthIndex, day);
    }
    resolvedDate = candidate;
  } else {
    // 2) Explizites Datum: "21.03." / "21.03" (DD.MM. oder DD.MM)
    const dayMonthNumMatch = text.match(/\b(\d{1,2})\.(\d{1,2})\.?\b/);
    if (dayMonthNumMatch) {
      const day = Math.max(1, Math.min(31, parseInt(dayMonthNumMatch[1], 10)));
      const month = Math.max(1, Math.min(12, parseInt(dayMonthNumMatch[2], 10))) - 1; // 0-indexed
      let candidate = new Date(currentDate.getFullYear(), month, day);
      const today = startOfDay(currentDate);
      if (isBefore(candidate, today)) {
        candidate = new Date(currentDate.getFullYear() + 1, month, day);
      }
      resolvedDate = candidate;
    } else {
      // 3) Relative Tage: übermorgen (+2), morgen (+1), heute (+0) – Reihenfolge wichtig (längere Begriffe zuerst)
      let matchedRelative = false;
      for (const { pattern, daysToAdd } of RELATIVE_DAYS) {
        if (pattern.test(text)) {
          resolvedDate = addDays(currentDate, daysToAdd);
          matchedRelative = true;
          break;
        }
      }
      if (!matchedRelative) {
        // 4) Wochentag: "Mittwoch", "nächsten Freitag" etc.
        const dayMatch = text.match(/\b(nächsten?\s*)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/i);
        if (dayMatch) {
          const dayName = dayMatch[2].toLowerCase();
          const targetDay = WEEKDAY_DE[dayName] ?? 1;
          const currentDay = getDay(currentDate);
          let daysToAdd = (targetDay - currentDay + 7) % 7;
          if (daysToAdd === 0 && !/nächsten?\s*/i.test(dayMatch[1] ?? '')) {
            daysToAdd = 0;
          } else if (daysToAdd === 0) {
            daysToAdd = 7;
          }
          resolvedDate = addDays(currentDate, daysToAdd);
        }
      }
    }
  }

  // Uhrzeit: "18 Uhr", "18:00", "18.30", "um 10 uhr" (case-insensitive durch toLowerCase)
  const timeMatch =
    text.match(/\b(\d{1,2})\s*[.:]\s*(\d{2})\s*(?:uhr)?\b/i) ||
    text.match(/\b(?:um\s*)?(\d{1,2})\s*uhr\b/i);
  if (timeMatch) {
    const h = timeMatch[1].padStart(2, '0');
    const m = timeMatch[2] ? timeMatch[2].padStart(2, '0') : '00';
    time = `${h}:${m}`;
  }

  // Titel: aus ORIGINAL-String (Original-Casing) alle erkannten Datum/Zeit-Strings entfernen (case-insensitive mit /gi)
  let title = original
    .replace(/\b\d{1,2}\.\s*(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/gi, '')
    .replace(/\b\d{1,2}\.\d{1,2}\.?\b/g, '')
    .replace(/\b(übermorgen|uebermorgen|day\s+after)\b/gi, '')
    .replace(/\b(morgen|tomorrow)\b/gi, '')
    .replace(/\b(heute|today)\b/gi, '')
    .replace(/\b(?:nächsten?\s*)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, '')
    .replace(/\b(?:um\s*)?\d{1,2}\s*[.:]?\s*\d{0,2}\s*uhr\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title) title = 'Termin';
  // Orts-Erkennung: "im Vapiano", "in der Praxis", "bei Dr. Müller", "nach Hamburg" → location, aus title entfernen
  let location: string | undefined;
  const locMatch = title.match(LOCATION_PREPOSITION);
  if (locMatch) {
    const fullPhrase = locMatch[0].trim();
    const locValue = locMatch[2].trim();
    if (locValue.length > 0) {
      location = locValue.charAt(0).toUpperCase() + locValue.slice(1);
      const escaped = fullPhrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      title = title.replace(new RegExp(escaped, 'i'), '').replace(/\s+/g, ' ').trim();
    } else {
      location = undefined;
    }
  }

  // Ersten Buchstaben groß (Rest unverändert)
  if (title.length > 0) {
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Kategorie-Erkennung (Smart Tags): food, shopping, sonst bei Ort → location
  const combined = `${title} ${location ?? ''}`.toLowerCase();
  let actionTag: CalendarEventJson['actionTag'];
  if (FOOD_KEYWORDS.test(combined)) {
    actionTag = 'food';
  } else if (SHOPPING_KEYWORDS.test(combined)) {
    actionTag = 'shopping';
  } else if (location) {
    actionTag = 'location';
  }

  const parsedDateStr = format(resolvedDate, 'yyyy-MM-dd');
  return {
    title,
    date: parsedDateStr,
    time,
    location: location || undefined,
    actionTag,
  };
}

/**
 * Erstellt aus natürlicher Sprache ein Event und speichert es in UserCalendar.eventsJson.
 */
export async function createMagicEvent(
  inputText: string,
  currentDate: Date
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht angemeldet' };
  }

  const trimmed = inputText?.trim();
  if (!trimmed) {
    return { success: false, error: 'Bitte einen Text eingeben' };
  }

  try {
    const parsed = parseNaturalLanguage(trimmed, currentDate);
    const { title, date: parsedDate, time, location, actionTag } = parsed;

    let calendar = await prisma.userCalendar.findUnique({
      where: { userId: session.user.id },
    });
    if (!calendar) {
      calendar = await prisma.userCalendar.create({
        data: { userId: session.user.id, eventsJson: '[]' },
      });
    }

    const events = (JSON.parse(calendar.eventsJson) as CalendarEventJson[]) || [];
    const newEvent: CalendarEventJson = {
      id: randomUUID(),
      type: 'custom',
      title,
      date: parsedDate,
      time,
      eventType: 'personal',
      ...(location && { location }),
      ...(actionTag && { actionTag }),
    };
    events.push(newEvent);

    await prisma.userCalendar.update({
      where: { userId: session.user.id },
      data: { eventsJson: JSON.stringify(events) },
    });

    revalidatePath('/calendar');
    return { success: true };
  } catch (e) {
    console.error('[CALENDAR] createMagicEvent:', e);
    return { success: false, error: 'Fehler beim Speichern' };
  }
}

/**
 * Entfernt ein Event anhand der ID aus UserCalendar.eventsJson und speichert die DB.
 */
export async function deleteCalendarEvent(
  eventId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht angemeldet' };
  }

  if (!eventId?.trim()) {
    return { success: false, error: 'Keine Event-ID' };
  }

  try {
    const calendar = await prisma.userCalendar.findUnique({
      where: { userId: session.user.id },
    });
    if (!calendar) {
      return { success: true }; // Kein Kalender = nichts zu löschen
    }

    const events = (JSON.parse(calendar.eventsJson) as CalendarEventJson[]) || [];
    const filtered = events.filter((e) => e.id !== eventId);
    if (filtered.length === events.length) {
      return { success: true }; // ID nicht gefunden, idempotent
    }

    await prisma.userCalendar.update({
      where: { userId: session.user.id },
      data: { eventsJson: JSON.stringify(filtered) },
    });

    revalidatePath('/calendar');
    return { success: true };
  } catch (e) {
    console.error('[CALENDAR] deleteCalendarEvent:', e);
    return { success: false, error: 'Fehler beim Löschen' };
  }
}

/** Aktualisierbare Felder (ohne id, type, eventType). */
export type CalendarEventUpdate = Partial<
  Pick<CalendarEventJson, 'title' | 'date' | 'time' | 'endTime' | 'location' | 'actionTag'>
>;

/**
 * Aktualisiert ein Event im eventsJson: Sucht per eventId, überschreibt mit updatedData, speichert, revalidiert.
 */
export async function updateCalendarEvent(
  eventId: string,
  updatedData: CalendarEventUpdate
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht angemeldet' };
  }

  if (!eventId?.trim()) {
    return { success: false, error: 'Keine Event-ID' };
  }

  try {
    const calendar = await prisma.userCalendar.findUnique({
      where: { userId: session.user.id },
    });
    if (!calendar) {
      return { success: false, error: 'Kalender nicht gefunden' };
    }

    const events = (JSON.parse(calendar.eventsJson) as CalendarEventJson[]) || [];
    const index = events.findIndex((e) => e.id === eventId);
    if (index === -1) {
      return { success: false, error: 'Termin nicht gefunden' };
    }

    events[index] = { ...events[index], ...updatedData };

    await prisma.userCalendar.update({
      where: { userId: session.user.id },
      data: { eventsJson: JSON.stringify(events) },
    });

    revalidatePath('/calendar');
    return { success: true };
  } catch (e) {
    console.error('[CALENDAR] updateCalendarEvent:', e);
    return { success: false, error: 'Fehler beim Speichern' };
  }
}

/** Ein Eintrag für saveWeeklyPlan: ein Tag + Rezept (aus AI/Wochenplaner) */
export type WeeklyPlanEntry = {
  date: string; // YYYY-MM-DD
  recipeId?: string | null;
  resultId: string;
  title: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
};

/**
 * Wochenplan als Kalender-Events speichern (Sync: Wochenplaner + Kalender nutzen dieselben Daten).
 * Erstellt für jeden Eintrag ein CalendarEvent in der DB (Kategorie Essen).
 */
export async function saveWeeklyPlan(planData: WeeklyPlanEntry[]) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: 'Nicht angemeldet' };

  if (!planData?.length) return { success: true as const };

  try {
    const userId = session.user.id;
    const dates = planData.map((p) => p.date);
    const minDate = dates.reduce((a, b) => (a <= b ? a : b));
    const maxDate = dates.reduce((a, b) => (a >= b ? a : b));

    await prisma.calendarEvent.deleteMany({
      where: {
        userId,
        eventType: 'meal',
        date: { gte: minDate, lte: maxDate },
      },
    });

    const defaultTimes: Record<string, string> = {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '19:00',
    };

    const rows: Prisma.CalendarEventCreateManyInput[] = planData.map((entry) => ({
      userId,
      date: entry.date,
      time: entry.mealType ? defaultTimes[entry.mealType] ?? '12:00' : '12:00',
      eventType: 'meal',
      title: entry.title,
      recipeId: entry.recipeId ?? null,
      mealType: entry.mealType ?? 'dinner',
      resultId: entry.resultId,
      isMeal: true,
    }));
    await prisma.calendarEvent.createMany({ data: rows });

    revalidatePath('/calendar');
    revalidatePath('/tools/recipe');
    return { success: true as const };
  } catch (error) {
    console.error('[CALENDAR] saveWeeklyPlan:', error);
    return { success: false as const, error: 'Fehler beim Speichern des Wochenplans' };
  }
}
