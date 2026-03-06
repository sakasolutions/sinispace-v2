'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { addDays, format, isBefore, setYear, startOfDay } from 'date-fns';
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

/** Keywords für actionTag 'food' (Nachlauf nach parseMagicInput). */
const FOOD_KEYWORDS = /\b(essen|dinner|grillen|party|rezept|kochen|lunch|breakfast|mittag|frühstück|abendessen|mittagessen)\b/i;
/** Keywords für actionTag 'shopping'. */
const SHOPPING_KEYWORDS = /\b(einkauf|supermarkt|einkaufen|smartcart)\b/i;
/** Orts-Präpositionen für Location-Extraktion (im, in der, bei, nach). */
const LOCATION_PREPOSITION = /\b(im|in der|bei|nach)\s+([^,]+?)(?=\s*$|\s+und\s)/i;

/**
 * Robuste Erkennung von Datum und Uhrzeit aus natürlicher Sprache.
 * Gibt title (bereinigt), date (Date) und time (HH:mm) zurück.
 */
export function parseMagicInput(input: string): { title: string; date: Date; time: string } {
  const now = new Date();
  let date = new Date(now);
  let time = '12:00';

  let titleStr = input.trim();

  // 1. UHRZEIT ERKENNEN (z.B. "18 uhr", "18:30", "8:00 uhr")
  const timeRegex = /\b([0-1]?[0-9]|2[0-3])(?:[:.]([0-5][0-9]))?(?:\s*uhr)?\b/i;
  const timeMatch = input.match(timeRegex);

  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2] ? timeMatch[2] : '00';
    time = `${hours}:${minutes}`;
    titleStr = titleStr.replace(timeMatch[0], '');
  }

  // 2. RELATIVE TAGE ERKENNEN (heute, morgen, übermorgen)
  const relativeRegex = /\b(heute|morgen|übermorgen)\b/i;
  const relativeMatch = input.match(relativeRegex);

  if (relativeMatch) {
    const word = relativeMatch[1].toLowerCase();
    if (word === 'morgen') date = addDays(now, 1);
    if (word === 'übermorgen') date = addDays(now, 2);
    titleStr = titleStr.replace(relativeMatch[0], '');
  } else {
    // 3. EXPLIZITE DATEN ERKENNEN (z.B. "21. März", "21.03.")
    const months = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];

    const dateNumRegex = /\b([0-3]?[0-9])\.([0-1]?[0-9])\.?\b/;
    const dateTextRegex = new RegExp(`\\b([0-3]?[0-9])\\.\\s*(${months.join('|')})\\b`, 'i');

    const numMatch = input.match(dateNumRegex);
    const textMatch = input.match(dateTextRegex);

    if (numMatch) {
      const day = parseInt(numMatch[1], 10);
      const monthIndex = parseInt(numMatch[2], 10) - 1;
      date = new Date(now.getFullYear(), monthIndex, day);
      titleStr = titleStr.replace(numMatch[0], '');
    } else if (textMatch) {
      const day = parseInt(textMatch[1], 10);
      const monthWord = textMatch[2].toLowerCase();
      const monthIndex = months.indexOf(monthWord);
      date = new Date(now.getFullYear(), monthIndex, day);
      titleStr = titleStr.replace(textMatch[0], '');
    }

    if ((numMatch || textMatch) && isBefore(date, startOfDay(now))) {
      date = setYear(date, now.getFullYear() + 1);
    }
  }

  // 4. TITEL AUFRÄUMEN
  titleStr = titleStr
    .replace(/\b(am|um)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (titleStr.length > 0) {
    titleStr = titleStr.charAt(0).toUpperCase() + titleStr.slice(1);
  } else {
    titleStr = 'Neuer Termin';
  }

  return { title: titleStr, date, time };
}

/**
 * Extrahiert location und actionTag aus dem Input (Nachlauf für Rich Events).
 */
function extractLocationAndTag(input: string): { location?: string; actionTag?: CalendarActionTag } {
  const text = input.trim();
  let location: string | undefined;
  const locMatch = text.match(LOCATION_PREPOSITION);
  if (locMatch) {
    const locValue = locMatch[2].trim();
    if (locValue.length > 0) {
      location = locValue.charAt(0).toUpperCase() + locValue.slice(1);
    }
  }
  const combined = text.toLowerCase();
  let actionTag: CalendarActionTag | undefined;
  if (FOOD_KEYWORDS.test(combined)) actionTag = 'food';
  else if (SHOPPING_KEYWORDS.test(combined)) actionTag = 'shopping';
  else if (location) actionTag = 'location';
  return { location, actionTag };
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
    const parsed = parseMagicInput(trimmed);
    const dateStr = format(parsed.date, 'yyyy-MM-dd');
    const { location, actionTag } = extractLocationAndTag(trimmed);

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
      title: parsed.title,
      date: dateStr,
      time: parsed.time,
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
