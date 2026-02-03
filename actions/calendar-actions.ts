'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getWorkspaceResults } from './workspace-actions';

/** Custom Event Types */
export type CustomEventType = 'meeting' | 'reminder' | 'personal' | 'work' | 'health';

/** Erweiterte Optionen für Custom Events (NL-Parsing) */
export type CalendarEventExtras = {
  rrule?: string;
  until?: string;
  durationMinutes?: number;
  location?: string;
  locationLat?: number;
  locationLon?: number;
  withPerson?: string;
  notes?: string;
  reminderMinutes?: number;
  isAllDay?: boolean;
};

/** Base Calendar Event */
export type CalendarEvent =
  | ({
      id: string;
      type: 'custom';
      eventType: CustomEventType;
      title: string;
      date: string; // YYYY-MM-DD
      time: string; // HH:mm
      endTime?: string;
    } & Partial<CalendarEventExtras>)
  | {
      id: string;
      type: 'meal';
      slot: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      date: string;
      time: string;
      /** DB-Rezept (Recipe.id) – Kalender weiß: "Ich bin die Lasagne aus der DB" */
      recipeId?: string;
      resultId?: string;
      recipeName?: string;
      /** Mahlzeit-Typ (breakfast | lunch | dinner | snack) */
      mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
      /** Geplante Portionen */
      servings?: number;
      calories?: string;
      prepTime?: string;
    }
  | {
      id: string;
      type: 'workout';
      date: string;
      time: string;
      endTime?: string;
      label?: string;
      routine?: string;
    };

/** User-Rezepte für Recipe Picker (aus Gourmet-Planer) */
export type CalendarRecipe = {
  id: string;
  resultId: string;
  recipeName: string;
  stats?: { time?: string; calories?: string; difficulty?: string };
  recipe: { recipeName: string; stats?: { time?: string; calories?: string }; ingredients?: string[] };
};

/** Ein Eintrag für saveWeeklyPlan: ein Tag + Rezept (aus AI/Wochenplaner) */
export type WeeklyPlanEntry = {
  date: string; // YYYY-MM-DD
  recipeId?: string | null;
  resultId: string;
  title: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
};

/** Kalender-Events laden: JSON (UserCalendar) + DB (CalendarEvent mit Recipe) */
export async function getCalendarEvents() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: 'Nicht angemeldet', events: [] };

  try {
    const userId = session.user.id;

    // 1) Events aus JSON (Legacy / manuell angelegt)
    let record = await prisma.userCalendar.findUnique({
      where: { userId },
    });
    if (!record) {
      record = await prisma.userCalendar.create({
        data: { userId, eventsJson: '[]' },
      });
    }
    const jsonEvents: CalendarEvent[] = JSON.parse(record.eventsJson || '[]');

    // 2) Events aus DB (Wochenplaner/Gourmet) inkl. Rezept-Daten
    const dbEvents = await prisma.calendarEvent.findMany({
      where: { userId },
      include: { recipe: true },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
    });

    const mappedDb: CalendarEvent[] = dbEvents.map((e) => {
      const mealType = (e.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack') || 'dinner';
      const recipe = e.recipe;
      let calories: string | undefined;
      if (recipe?.content) {
        try {
          const c = JSON.parse(recipe.content) as { stats?: { calories?: string } };
          calories = c?.stats?.calories;
        } catch {
          // ignore
        }
      }
      const dbEvent = e as { resultId?: string | null };
      return {
        id: e.id,
        type: 'meal' as const,
        slot: mealType,
        date: e.date,
        time: e.time,
        recipeId: e.recipeId ?? undefined,
        resultId: dbEvent.resultId ?? undefined,
        recipeName: e.title ?? recipe?.title ?? undefined,
        mealType,
        servings: e.servings ?? undefined,
        calories,
      };
    });

    const combined = [...jsonEvents, ...mappedDb].sort(
      (a, b) => (a.date === b.date ? (a.time || '').localeCompare(b.time || '') : a.date.localeCompare(b.date))
    );
    return { success: true as const, events: combined };
  } catch (error) {
    console.error('[CALENDAR] getCalendarEvents:', error);
    return { success: false as const, error: 'Fehler beim Laden', events: [] };
  }
}

/** Kalender-Events speichern */
export async function saveCalendarEvents(events: CalendarEvent[]) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Nicht angemeldet' };

  try {
    await prisma.userCalendar.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, eventsJson: JSON.stringify(events) },
      update: { eventsJson: JSON.stringify(events), updatedAt: new Date() },
    });
    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error('[CALENDAR] saveCalendarEvents:', error);
    return { success: false, error: 'Fehler beim Speichern' };
  }
}

/**
 * Event hinzufügen.
 * Für Mahlzeiten (type: 'meal') werden recipeId, mealType und servings mitgespeichert,
 * sodass der Kalender-Eintrag dem Gourmet-Planer-Rezept zugeordnet werden kann.
 */
export async function addCalendarEvent(event: CalendarEvent) {
  const result = await getCalendarEvents();
  if (!result.success || !result.events) return { success: false, error: result.error };
  const events = [...result.events, event];
  return saveCalendarEvents(events);
}

/** Event entfernen (JSON + DB: CalendarEvent) */
export async function removeCalendarEvent(eventId: string) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Nicht angemeldet' };
  try {
    await prisma.calendarEvent.deleteMany({ where: { id: eventId, userId: session.user.id } });
  } catch {
    // kein DB-Event mit dieser ID
  }
  const record = await prisma.userCalendar.findUnique({ where: { userId: session.user.id } });
  const jsonEvents: CalendarEvent[] = record ? JSON.parse(record.eventsJson || '[]') : [];
  const filtered = jsonEvents.filter((e) => e.id !== eventId);
  return saveCalendarEvents(filtered);
}

/** Event aktualisieren (nur JSON-Events; DB-Events werden nicht geändert) */
export async function updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Nicht angemeldet' };
  const record = await prisma.userCalendar.findUnique({ where: { userId: session.user.id } });
  const jsonEvents: CalendarEvent[] = record ? JSON.parse(record.eventsJson || '[]') : [];
  const events = jsonEvents.map((e) =>
    e.id === eventId ? { ...e, ...updates } : e
  ) as CalendarEvent[];
  return saveCalendarEvents(events);
}

/**
 * Wochenplan als Kalender-Events speichern (Sync: Wochenplaner + Kalender nutzen dieselben Daten).
 * Erstellt für jeden Eintrag ein CalendarEvent in der DB (Kategorie Essen, Orange).
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

    type CreateManyArg = NonNullable<Parameters<typeof prisma.calendarEvent.createMany>[0]>;
    type CreateRow = CreateManyArg['data'] extends (infer R)[] ? R : CreateManyArg['data'];
    const rows: CreateRow[] = planData.map((entry) => ({
      userId,
      date: entry.date,
      time: entry.mealType ? defaultTimes[entry.mealType] ?? '12:00' : '12:00',
      eventType: 'meal',
      title: entry.title,
      recipeId: entry.recipeId ?? null,
      mealType: entry.mealType ?? 'dinner',
      resultId: entry.resultId,
      isMeal: true,
    } as CreateRow));
    await prisma.calendarEvent.createMany({ data: rows });

    revalidatePath('/calendar');
    revalidatePath('/tools/recipe');
    return { success: true as const };
  } catch (error) {
    console.error('[CALENDAR] saveWeeklyPlan:', error);
    return { success: false as const, error: 'Fehler beim Speichern des Wochenplans' };
  }
}

/** Rezepte des Users (für Recipe Picker) */
export async function getCalendarRecipes(): Promise<{ success: boolean; recipes: CalendarRecipe[] }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, recipes: [] };

  try {
    const result = await getWorkspaceResults(undefined, 100);
    if (!result.success || !result.results) return { success: true, recipes: [] };
    const recipes = result.results
      .filter((r: { toolId: string }) => r.toolId === 'recipe')
      .map((r: { id: string; content: string } & Record<string, unknown>) => {
        try {
          const content = JSON.parse(r.content);
          return {
            id: r.id,
            resultId: r.id,
            recipeName: content.recipeName || 'Rezept',
            stats: content.stats,
            recipe: content,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as CalendarRecipe[];
    return { success: true, recipes };
  } catch (error) {
    console.error('[CALENDAR] getCalendarRecipes:', error);
    return { success: false, recipes: [] };
  }
}
