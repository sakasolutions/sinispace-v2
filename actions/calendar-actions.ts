'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getWorkspaceResults } from './workspace-actions';

/** Custom Event Types */
export type CustomEventType = 'meeting' | 'reminder' | 'personal' | 'work';

/** Erweiterte Optionen für Custom Events (NL-Parsing) */
export type CalendarEventExtras = {
  rrule?: string;
  until?: string;
  durationMinutes?: number;
  location?: string;
  withPerson?: string;
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
      slot: 'breakfast' | 'lunch' | 'dinner';
      date: string;
      time: string;
      recipeId?: string;
      resultId?: string;
      recipeName?: string;
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

/** Kalender-Events laden */
export async function getCalendarEvents() {
  const session = await auth();
  if (!session?.user?.id) return { success: false as const, error: 'Nicht angemeldet', events: [] };

  try {
    let record = await prisma.userCalendar.findUnique({
      where: { userId: session.user.id },
    });
    if (!record) {
      record = await prisma.userCalendar.create({
        data: { userId: session.user.id, eventsJson: '[]' },
      });
    }
    const events: CalendarEvent[] = JSON.parse(record.eventsJson || '[]');
    return { success: true as const, events };
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

/** Event hinzufügen */
export async function addCalendarEvent(event: CalendarEvent) {
  const result = await getCalendarEvents();
  if (!result.success || !result.events) return { success: false, error: result.error };
  const events = [...result.events, event];
  return saveCalendarEvents(events);
}

/** Event entfernen */
export async function removeCalendarEvent(eventId: string) {
  const result = await getCalendarEvents();
  if (!result.success || !result.events) return { success: false, error: result.error };
  const events = result.events.filter((e) => e.id !== eventId);
  return saveCalendarEvents(events);
}

/** Event aktualisieren */
export async function updateCalendarEvent(eventId: string, updates: Partial<CalendarEvent>) {
  const result = await getCalendarEvents();
  if (!result.success || !result.events) return { success: false, error: result.error };
  const events = result.events.map((e) =>
    e.id === eventId ? { ...e, ...updates } : e
  ) as CalendarEvent[];
  return saveCalendarEvents(events);
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
