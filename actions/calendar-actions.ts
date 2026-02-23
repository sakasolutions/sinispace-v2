'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { addDays, format, getDay } from 'date-fns';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/** Event-Objekt im UserCalendar.eventsJson (Magic-Input / Custom) */
export type CalendarEventJson = {
  id: string;
  type: 'custom';
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  eventType: 'personal';
  endTime?: string; // HH:mm, optional
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

/**
 * Parst natürliche Sprache (z.B. "Morgen 18 Uhr Fussball", "Mittwoch Ikea") zu title, date (YYYY-MM-DD), time (HH:mm).
 * Nutzt currentDate als Referenz. Das zurückgegebene date wird exakt so im Event gespeichert.
 */
function parseNaturalLanguage(
  inputText: string,
  currentDate: Date
): { title: string; date: string; time: string } {
  const text = inputText.trim().toLowerCase();
  let resolvedDate = new Date(currentDate);
  let time = '09:00';

  // Datum: heute / morgen / übermorgen
  if (/\b(morgen|tomorrow)\b/.test(text)) {
    resolvedDate = addDays(currentDate, 1);
  } else if (/\b(übermorgen|day after)\b/.test(text)) {
    resolvedDate = addDays(currentDate, 2);
  } else {
    // Wochentag: "Mittwoch", "nächsten Freitag" etc. → nächstes Vorkommen dieses Wochentags
    const dayMatch = text.match(/\b(nächsten?\s*)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/i);
    if (dayMatch) {
      const dayName = dayMatch[2].toLowerCase() as keyof typeof WEEKDAY_DE;
      const targetDay = WEEKDAY_DE[dayName] ?? 1;
      const currentDay = getDay(currentDate); // 0=So, 1=Mo, …
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      if (daysToAdd === 0 && !/nächsten?\s*/i.test(dayMatch[1] ?? '')) {
        daysToAdd = 0; // "Mittwoch" und heute ist Mittwoch → heute
      } else if (daysToAdd === 0) {
        daysToAdd = 7; // "nächsten Mittwoch" und heute Mittwoch → nächste Woche
      }
      resolvedDate = addDays(currentDate, daysToAdd);
    }
  }

  // Uhrzeit: "18 Uhr", "18:00", "18.30", "um 10 uhr"
  const timeMatch =
    text.match(/\b(\d{1,2})\s*[.:]\s*(\d{2})\s*(?:uhr)?\b/i) ||
    text.match(/\b(?:um\s*)?(\d{1,2})\s*uhr\b/i);
  if (timeMatch) {
    const h = timeMatch[1].padStart(2, '0');
    const m = timeMatch[2] ? timeMatch[2].padStart(2, '0') : '00';
    time = `${h}:${m}`;
  }

  // Titel: Rest des Textes ohne Datum/Zeit-Keywords (inkl. Wochentage)
  let title = text
    .replace(/\b(heute|morgen|übermorgen|tomorrow)\b/gi, '')
    .replace(/\b(?:nächsten?\s*)?(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, '')
    .replace(/\b(?:um\s*)?\d{1,2}\s*[.:]?\s*\d{0,2}\s*uhr\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title) title = 'Termin';

  // WICHTIG: Dieses date (YYYY-MM-DD) wird 1:1 im Event gespeichert – kein Fallback auf „heute“.
  const parsedDateStr = format(resolvedDate, 'yyyy-MM-dd');
  return {
    title,
    date: parsedDateStr,
    time,
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
    // Explizit: Das vom Parser gelieferte date wird ins Event übernommen (kein currentDate).
    const { title, date: parsedDate, time } = parsed;

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
