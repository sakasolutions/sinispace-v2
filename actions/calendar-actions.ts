'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

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
