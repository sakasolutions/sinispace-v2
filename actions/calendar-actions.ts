'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { addDays, format, isBefore, setYear, startOfDay, startOfWeek } from 'date-fns';
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
  /** Rezept-Verknüpfung (CookIQ: „Im Kalender planen“) – für Link „Jetzt kochen“. */
  recipeResultId?: string;
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
 * Nutzt Leerzeichen/String-Grenzen statt \b (Umlaute wie übermorgen/märz).
 * Strikte Uhrzeit-Regex, damit "21." aus Datum nicht als 21:00 erkannt wird.
 * Gibt date direkt als YYYY-MM-DD zurück.
 */
function parseMagicInput(input: string): { title: string; date: string; time: string; type: 'default' | 'shopping' } {
  const now = new Date();
  let date = now;
  let time = '12:00';

  let titleStr = input.trim();

  // 1. UHRZEIT ERKENNEN
  const timeRegex = /(?:^|\s)([0-1]?[0-9]|2[0-3])([:.][0-5][0-9]|\s*uhr)(?:\s|$|[.,])/i;
  const timeMatch = titleStr.match(timeRegex);

  if (timeMatch) {
    const hours = timeMatch[1].padStart(2, '0');
    const minutesMatch = timeMatch[2].match(/[0-5][0-9]/);
    const minutes = minutesMatch ? minutesMatch[0] : '00';
    time = `${hours}:${minutes}`;
    titleStr = titleStr.replace(timeMatch[0], ' ');
  }

  // 2. RELATIVE TAGE ERKENNEN (heute, morgen, übermorgen)
  const relativeRegex = /(?:^|\s)(heute|morgen|übermorgen)(?:\s|$|[.,])/i;
  const relativeMatch = titleStr.match(relativeRegex);

  if (relativeMatch) {
    const word = relativeMatch[1].toLowerCase();
    if (word === 'morgen') date = addDays(now, 1);
    if (word === 'übermorgen') date = addDays(now, 2);
    titleStr = titleStr.replace(relativeMatch[0], ' ');
  }
  // 3. WOCHENTAGE ERKENNEN (Montag, Dienstag, etc.)
  else {
    const weekdayRegex = /(?:^|\s)(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)(?:\s|$|[.,])/i;
    const weekdayMatch = titleStr.match(weekdayRegex);

    if (weekdayMatch) {
      const daysMap: Record<string, number> = {
        'sonntag': 0, 'montag': 1, 'dienstag': 2, 'mittwoch': 3,
        'donnerstag': 4, 'freitag': 5, 'samstag': 6,
      };

      const targetDay = daysMap[weekdayMatch[1].toLowerCase()];
      const currentDay = now.getDay(); // 0 = Sonntag, 1 = Montag...

      let daysToAdd = targetDay - currentDay;
      if (daysToAdd <= 0) {
        daysToAdd += 7; // Nächste Woche, wenn heute oder schon vorbei
      }

      date = addDays(now, daysToAdd);
      titleStr = titleStr.replace(weekdayMatch[0], ' ');
    }
    // 4. EXPLIZITE DATEN ERKENNEN (z.B. 21. März)
    else {
      const months = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
      const dateNumRegex = /(?:^|\s)([0-3]?[0-9])\.([0-1]?[0-9])\.(?:\s|$)/;
      const dateTextRegex = new RegExp(`(?:^|\\s)([0-3]?[0-9])\\.\\s*(${months.join('|')})(?:\\s|$|[.,])`, 'i');

      const numMatch = titleStr.match(dateNumRegex);
      const textMatch = titleStr.match(dateTextRegex);

      if (numMatch) {
        const day = parseInt(numMatch[1], 10);
        const monthIndex = parseInt(numMatch[2], 10) - 1;
        date = new Date(now.getFullYear(), monthIndex, day);
        titleStr = titleStr.replace(numMatch[0], ' ');
      } else if (textMatch) {
        const day = parseInt(textMatch[1], 10);
        const monthWord = textMatch[2].toLowerCase();
        const monthIndex = months.indexOf(monthWord);
        date = new Date(now.getFullYear(), monthIndex, day);
        titleStr = titleStr.replace(textMatch[0], ' ');
      }

      if (isBefore(date, startOfDay(now)) && (numMatch || textMatch)) {
        date = addDays(setYear(date, now.getFullYear() + 1), 0);
      }
    }
  }

  // 5. TITEL AUFRÄUMEN
  titleStr = titleStr
    .replace(/(?:^|\s)(am|um)(?:\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (titleStr.length > 0) {
    titleStr = titleStr.charAt(0).toUpperCase() + titleStr.slice(1);
  } else {
    titleStr = 'Neuer Termin';
  }

  // 6. EVENT-TYP ERKENNEN (Intelligentes Tagging)
  let eventType: 'default' | 'shopping' = 'default';
  const shoppingKeywords = /(einkaufen|supermarkt|aldi|lidl|rewe|edeka|kaufland|dm|rossmann|markt)/i;
  if (shoppingKeywords.test(titleStr)) {
    eventType = 'shopping';
  }

  return { title: titleStr, date: format(date, 'yyyy-MM-dd'), time, type: eventType };
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
    const { location, actionTag: extractedTag } = extractLocationAndTag(trimmed);
    const actionTag = extractedTag ?? (parsed.type === 'shopping' ? 'shopping' : undefined);

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
      date: parsed.date,
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

/** Standard-Zeiten für Mahlzeiten (CookIQ Einzelrezept → Kalender). */
const MEAL_TIME_MAP: Record<'breakfast' | 'lunch' | 'dinner', string> = {
  breakfast: '08:00',
  lunch: '12:30',
  dinner: '19:00',
};

/**
 * Plant ein einzelnes Rezept an einem Tag im Kalender (CookIQ Detailansicht).
 * Speichert in UserCalendar.eventsJson wie Magic-Events, mit actionTag 'food' und recipeResultId für „Jetzt kochen“.
 */
export async function scheduleSingleRecipe(
  recipeId: string,
  title: string,
  dateStr: string,
  mealType: 'breakfast' | 'lunch' | 'dinner'
): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht angemeldet' };
  }

  const time = MEAL_TIME_MAP[mealType];
  const eventTitle = `🍽️ ${title}`.trim();

  try {
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
      title: eventTitle,
      date: dateStr,
      time,
      eventType: 'personal',
      actionTag: 'food',
      recipeResultId: recipeId,
    };
    events.push(newEvent);

    await prisma.userCalendar.update({
      where: { userId: session.user.id },
      data: { eventsJson: JSON.stringify(events) },
    });

    revalidatePath('/calendar');
    revalidatePath('/tools/recipe');
    return { success: true };
  } catch (e) {
    console.error('[CALENDAR] scheduleSingleRecipe:', e);
    return { success: false, error: 'Konnte nicht im Kalender gespeichert werden.' };
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
  resultId?: string | null; // Optional für Draft-Pläne (nur Titel im Kalender)
  title: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
  imageUrl?: string | null;
};

/**
 * Wochenplan als Kalender-Events speichern (Sync: Wochenplaner + Kalender nutzen dieselben Daten).
 * Erstellt für jeden Eintrag ein CalendarEvent in der DB (Kategorie Essen).
 */
function normalizeWeeklyPlanRow(
  userId: string,
  entry: WeeklyPlanEntry,
  stamp: Date
): Prisma.CalendarEventCreateManyInput {
  const defaultTimes: Record<string, string> = {
    breakfast: '08:00',
    lunch: '12:00',
    dinner: '19:00',
  };
  const mt = entry.mealType;
  const mealType: 'breakfast' | 'lunch' | 'dinner' =
    mt === 'breakfast' || mt === 'lunch' || mt === 'dinner' ? mt : 'dinner';
  const time = defaultTimes[mealType] ?? '12:00';
  const title =
    typeof entry.title === 'string' && entry.title.trim().length > 0 ? entry.title.trim() : 'Gericht';
  const rid = entry.resultId;
  const resultId =
    typeof rid === 'string' && rid.length > 0 ? rid : null;
  const pid = entry.recipeId;
  const recipeId = typeof pid === 'string' && pid.length > 0 ? pid : null;
  const img = entry.imageUrl;
  const imageUrl =
    typeof img === 'string' && img.trim().length > 0 ? img.trim() : null;

  return {
    userId,
    date: entry.date,
    time,
    eventType: 'meal',
    title,
    recipeId,
    mealType,
    resultId,
    imageUrl,
    // createMany setzt @default/@updatedAt oft nicht zuverlässig – explizit für NOT NULL in Prod
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export async function saveWeeklyPlan(planData: WeeklyPlanEntry[]) {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: 'Nicht angemeldet' };

  if (!planData?.length) return { success: true as const };

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  for (const p of planData) {
    if (!p.date || !dateRe.test(p.date)) {
      return {
        success: false as const,
        error: `Ungültiges Datum im Plan: ${String(p.date)}`,
      };
    }
  }

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

    const stamp = new Date();
    const rows: Prisma.CalendarEventCreateManyInput[] = planData.map((entry) =>
      normalizeWeeklyPlanRow(userId, entry, stamp)
    );
    await prisma.calendarEvent.createMany({ data: rows });

    try {
      revalidatePath('/calendar');
      revalidatePath('/tools/recipe');
    } catch (revalErr) {
      console.error('[CALENDAR] saveWeeklyPlan revalidatePath (nicht kritisch):', revalErr);
    }

    return { success: true as const };
  } catch (error) {
    console.error('[CALENDAR] saveWeeklyPlan:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return {
      success: false as const,
      error: `Fehler beim Speichern des Wochenplans: ${detail}`,
    };
  }
}

/** Ein Meal im wiederhergestellten Wochenplan (Format wie WeekDraftMeal). */
export type RestoredWeekMeal = {
  type: 'breakfast' | 'lunch' | 'dinner';
  title: string;
  time: string;
  calories: string;
  imageUrl?: string | null;
};

/** Ein Tag im wiederhergestellten Wochenplan (Format wie WeekDraftDay). */
export type RestoredWeekDay = {
  day: string;
  date: string;
  meals: RestoredWeekMeal[];
};

const WEEKDAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'] as const;

/**
 * Liest alle CalendarEvent-Einträge mit eventType === 'meal' für aktuelle und nächste Woche,
 * gruppiert sie nach Datum und mappt sie in das Format WeekDraftDay[] (activeWeekPlan).
 * Bevorzugt die Woche, in der tatsächlich Events liegen (Speicherung erfolgt auf „nächste Woche“).
 */
function groupEventsIntoWeekPlan(
  events: {
    date: string;
    time: string | null;
    title: string | null;
    mealType: string | null;
    imageUrl: string | null;
  }[],
  weekStart: Date
): RestoredWeekDay[] {
  const plan: RestoredWeekDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayEvents = events.filter((e) => e.date === dateStr);
    const meals: RestoredWeekMeal[] = dayEvents.map((e) => {
      const mealType =
        e.mealType === 'breakfast' || e.mealType === 'lunch' || e.mealType === 'dinner' ? e.mealType : 'dinner';
      const url = (e.imageUrl ?? '').trim();
      return {
        type: mealType,
        title: (e.title ?? '').trim() || 'Gericht',
        time: e.time ?? '—',
        calories: '—',
        imageUrl: url.length > 0 ? url : null,
      };
    });
    plan.push({ day: WEEKDAY_NAMES[i], date: dateStr, meals });
  }
  return plan;
}

export type GetCurrentWeekMealsResult = {
  plan: RestoredWeekDay[];
  queryFrom: string;
  queryTo: string;
};

/**
 * Liest meal-Events für aktuelle + nächste Kalenderwoche (Mo–So × 2).
 * Gruppiert nach der Woche, in der Daten liegen: bevorzugt „nächste Woche“ (wie beim Speichern),
 * sonst „diese Woche“ – deckt TZ-/Randfälle und ältere Daten im Fenster ab.
 */
export async function getCurrentWeekMeals(): Promise<GetCurrentWeekMealsResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { plan: [], queryFrom: '', queryTo: '' };
  }

  try {
    const today = startOfDay(new Date());
    const thisMonday = startOfWeek(today, { weekStartsOn: 1 });
    const nextMonday = addDays(thisMonday, 7);
    const nextSunday = addDays(nextMonday, 6);
    const queryFrom = format(thisMonday, 'yyyy-MM-dd');
    const queryTo = format(nextSunday, 'yyyy-MM-dd');
    const nextMondayStr = format(nextMonday, 'yyyy-MM-dd');

    const events = await prisma.calendarEvent.findMany({
      where: {
        userId: session.user.id,
        eventType: 'meal',
        date: { gte: queryFrom, lte: queryTo },
      },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      select: { date: true, time: true, title: true, mealType: true, imageUrl: true },
    });

    if (events.length === 0) {
      return { plan: [], queryFrom, queryTo };
    }

    const preferNextWeek = events.some((e) => e.date >= nextMondayStr);
    const weekAnchor = preferNextWeek ? nextMonday : thisMonday;
    const plan = groupEventsIntoWeekPlan(events, weekAnchor);
    const hasAnyMeals = plan.some((d) => d.meals.length > 0);
    const result = hasAnyMeals ? plan : [];
    return { plan: result, queryFrom, queryTo };
  } catch (error) {
    console.error('[CALENDAR] getCurrentWeekMeals:', error);
    return { plan: [], queryFrom: '', queryTo: '' };
  }
}
