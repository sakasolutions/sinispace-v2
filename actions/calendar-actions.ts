'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { addDays, format, isBefore, setYear, startOfDay, startOfWeek } from 'date-fns';
import { getNextMonday } from '@/lib/week-plan-dates';
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

/** CookIQ-/Wochenplan-Mahlzeiten aus CalendarEvent in dasselbe JSON-Format wie Magic-Events mappen (Kalender-UI). */
function mealRowsToCalendarJson(
  rows: { id: string; date: string; time: string; title: string | null; resultId: string | null }[]
): CalendarEventJson[] {
  return rows.map((m) => ({
    id: m.id,
    type: 'custom',
    title: (m.title ?? '').trim() || 'Gericht',
    date: m.date,
    time: (m.time ?? '12:00').slice(0, 5),
    eventType: 'personal',
    actionTag: 'food' as const,
    recipeResultId: m.resultId ?? undefined,
  }));
}

/**
 * Lädt Kalender-Events: UserCalendar.eventsJson **plus** Mahlzeiten aus CalendarEvent (CookIQ).
 */
export async function getCalendarEvents(): Promise<CalendarEventJson[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
    const userId = session.user.id;
    const row = await prisma.userCalendar.findUnique({
      where: { userId },
      select: { eventsJson: true },
    });
    let jsonEvents: CalendarEventJson[] = [];
    if (row?.eventsJson) {
      const parsed = JSON.parse(row.eventsJson) as unknown;
      if (Array.isArray(parsed)) jsonEvents = parsed as CalendarEventJson[];
    }

    const rangeStart = format(addDays(startOfDay(new Date()), -14), 'yyyy-MM-dd');
    const rangeEnd = format(addDays(startOfDay(new Date()), 180), 'yyyy-MM-dd');
    const mealRows = await prisma.calendarEvent.findMany({
      where: {
        userId,
        eventType: 'meal',
        date: { gte: rangeStart, lte: rangeEnd },
      },
      select: { id: true, date: true, time: true, title: true, resultId: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });
    const mealEvents = mealRowsToCalendarJson(mealRows);

    const merged = [...jsonEvents, ...mealEvents];
    merged.sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      if (dc !== 0) return dc;
      return a.time.localeCompare(b.time);
    });
    return merged;
  } catch (e) {
    console.error('[CALENDAR] getCalendarEvents:', e);
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
    const userId = session.user.id;
    let removedFromJson = false;

    const calendar = await prisma.userCalendar.findUnique({
      where: { userId },
    });
    if (calendar?.eventsJson) {
      const events = (JSON.parse(calendar.eventsJson) as CalendarEventJson[]) || [];
      const filtered = events.filter((e) => e.id !== eventId);
      if (filtered.length < events.length) {
        await prisma.userCalendar.update({
          where: { userId },
          data: { eventsJson: JSON.stringify(filtered) },
        });
        removedFromJson = true;
      }
    }

    if (!removedFromJson) {
      const mealDel = await prisma.calendarEvent.deleteMany({
        where: { id: eventId, userId },
      });
      if (mealDel.count === 0 && !calendar) {
        return { success: true };
      }
    }

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
      try {
        const data: { title?: string; date?: string; time?: string } = {};
        if (updatedData.title !== undefined) data.title = updatedData.title;
        if (updatedData.date !== undefined) data.date = updatedData.date;
        if (updatedData.time !== undefined) data.time = updatedData.time;
        if (Object.keys(data).length === 0) {
          return { success: false, error: 'Termin nicht gefunden' };
        }
        await prisma.calendarEvent.update({
          where: { id: eventId, userId: session.user.id },
          data,
        });
        revalidatePath('/calendar');
        return { success: true };
      } catch {
        return { success: false, error: 'Termin nicht gefunden' };
      }
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
  /** Wenn gesetzt und im Format HH:mm → ersetzt Default-Uhrzeit für mealType */
  time?: string | null;
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
  let time = defaultTimes[mealType] ?? '12:00';
  const rawT = typeof entry.time === 'string' ? entry.time.trim() : '';
  if (rawT) {
    const hm = rawT.match(/^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/);
    if (hm) {
      time = `${hm[1].padStart(2, '0')}:${hm[2]}`;
    }
  }
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
    console.error('PRISMA SAVE ERROR:', error);
    console.error('[CALENDAR] saveWeeklyPlan:', error);
    const detail = error instanceof Error ? error.message : String(error);
    return {
      success: false as const,
      error: `Fehler beim Speichern des Wochenplans: ${detail}`,
    };
  }
}

/** Roher Entwurfstag (JSON von Client / zukünftige Draft-ID-Auflösung). */
export type ActivateWeeklyPlanDayInput = {
  day?: string;
  meals?: Array<{
    type?: string;
    title?: string;
    time?: string;
    calories?: string;
    imageUrl?: string | null;
    resultId?: string | null;
  }>;
};

function mealTitleWithCaloriesForCalendar(title: string, calories?: string | null): string {
  const t = typeof title === 'string' && title.trim().length > 0 ? title.trim() : 'Gericht';
  const raw = typeof calories === 'string' ? calories.trim() : '';
  if (!raw || /^[–—\-/\s]+$/u.test(raw)) return t;
  const c = raw.toLowerCase().includes('kcal') ? raw : `${raw} kcal`;
  return `${t} · ${c}`;
}

function mapDraftMealTypeToCalendar(t: string | undefined): 'breakfast' | 'lunch' | 'dinner' {
  if (t === 'breakfast' || t === 'lunch' || t === 'dinner') return t;
  const s = (t || '').toLowerCase();
  if (s.includes('früh') || s.includes('breakfast')) return 'breakfast';
  if (s.includes('mittag') || s.includes('lunch')) return 'lunch';
  return 'dinner';
}

/**
 * Publish: serialisierter 7-Tage-Entwurf → `CalendarEvent` (meal), **immer ab nächstem Plan-Montag**.
 * Datierung: `mealDate = addDays(getNextMonday(), dayIndex)` für `dayIndex` 0…6 (= Mo…So der Zielwoche).
 * `draftId`: aktuell `JSON.stringify(WeekDraftDay[])`; später ersetzbar durch echte Draft-ID + DB-Laden.
 */
export async function activateWeeklyPlan(
  draftId: string
): Promise<
  { success: true; from: string; to: string } | { success: false; error: string }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht angemeldet' };
  }

  let days: ActivateWeeklyPlanDayInput[];
  try {
    const parsed = JSON.parse(draftId) as unknown;
    if (!Array.isArray(parsed)) {
      return { success: false, error: 'Ungültiger Wochenplan (kein Array).' };
    }
    days = parsed as ActivateWeeklyPlanDayInput[];
  } catch {
    return { success: false, error: 'Ungültiger Wochenplan (JSON).' };
  }

  console.log('[activateWeeklyPlan] RECEIVED DRAFT (days):', days.length, 'sample:', JSON.stringify(days.slice(0, 2)));

  const nextMonday = getNextMonday();
  const planData: WeeklyPlanEntry[] = [];

  for (let dayIndex = 0; dayIndex < Math.min(days.length, 7); dayIndex++) {
    const dayObj = days[dayIndex];
    const mealDate = addDays(nextMonday, dayIndex);
    const dateStr = format(mealDate, 'yyyy-MM-dd');
    const meals = Array.isArray(dayObj?.meals) ? dayObj.meals : [];
    for (const meal of meals) {
      const title = mealTitleWithCaloriesForCalendar(
        typeof meal?.title === 'string' ? meal.title : '',
        meal?.calories
      );
      const img = meal?.imageUrl;
      const imageUrl =
        typeof img === 'string' && img.trim().length > 0 ? img.trim() : null;
      const rid = meal?.resultId;
      const resultId = typeof rid === 'string' && rid.length > 0 ? rid : null;
      planData.push({
        date: dateStr,
        title,
        mealType: mapDraftMealTypeToCalendar(meal?.type),
        time: typeof meal?.time === 'string' ? meal.time : null,
        imageUrl,
        resultId,
      });
    }
  }

  if (planData.length === 0) {
    console.warn('[activateWeeklyPlan] planData empty after mapping (meals missing on days?)');
    return { success: false, error: 'Keine Mahlzeiten im Plan – nichts zu aktivieren.' };
  }

  const calculatedDates = [...new Set(planData.map((p) => p.date))].sort();
  console.log('[activateWeeklyPlan] CALCULATED DATES (YYYY-MM-DD):', calculatedDates);
  console.log('[activateWeeklyPlan] nextMonday (ISO):', nextMonday.toISOString(), 'meal rows:', planData.length);

  try {
    const res = await saveWeeklyPlan(planData);
    if (!res.success) {
      return { success: false, error: res.error || 'Kalender konnte nicht aktualisiert werden.' };
    }
  } catch (error) {
    console.error('PRISMA SAVE ERROR:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Speichern fehlgeschlagen: ${msg}` };
  }

  try {
    revalidatePath('/calendar');
    revalidatePath('/tools/recipe');
  } catch (revalErr) {
    console.error('[activateWeeklyPlan] revalidatePath:', revalErr);
  }

  const sunday = addDays(nextMonday, 6);
  return {
    success: true,
    from: format(nextMonday, 'yyyy-MM-dd'),
    to: format(sunday, 'yyyy-MM-dd'),
  };
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
