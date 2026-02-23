'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { addDays, format } from 'date-fns';
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

/**
 * Parst natürliche Sprache (z.B. "Morgen 18 Uhr Fussball") zu title, date (YYYY-MM-DD), time (HH:mm).
 * Nutzt currentDate als Referenz für "heute", "morgen", "übermorgen".
 */
function parseNaturalLanguage(
  inputText: string,
  currentDate: Date
): { title: string; date: string; time: string } {
  const text = inputText.trim().toLowerCase();
  let date = new Date(currentDate);
  let time = '09:00';

  // Datum: heute / morgen / übermorgen
  if (/\b(morgen|tomorrow)\b/.test(text)) {
    date = addDays(currentDate, 1);
  } else if (/\b(übermorgen|day after)\b/.test(text)) {
    date = addDays(currentDate, 2);
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

  // Titel: Rest des Textes ohne Datum/Zeit-Keywords
  let title = text
    .replace(/\b(heute|morgen|übermorgen|tomorrow)\b/gi, '')
    .replace(/\b(?:um\s*)?\d{1,2}\s*[.:]?\s*\d{0,2}\s*uhr\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title) title = 'Termin';

  return {
    title,
    date: format(date, 'yyyy-MM-dd'),
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
    const { title, date, time } = parseNaturalLanguage(trimmed, currentDate);

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
      date,
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
