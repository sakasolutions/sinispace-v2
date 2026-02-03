'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getShoppingLists } from './shopping-list-actions';
import { getCalendarEvents } from './calendar-actions';

export type GourmetDashboardData = {
  shoppingCount: number;
  plannedDays: number;
  recipeCount: number;
  nextMeal: { title: string; date: string; resultId?: string } | null;
  recentRecipes: { id: string; recipeName: string }[];
};

function getWeekRange(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(monday), end: fmt(sunday) };
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Parallel: Einkaufsliste-Count, geplante Tage, Rezept-Count, nächstes Meal, letzte 3 Rezepte */
export async function getGourmetDashboardData(): Promise<GourmetDashboardData> {
  const session = await auth();
  const empty: GourmetDashboardData = {
    shoppingCount: 0,
    plannedDays: 0,
    recipeCount: 0,
    nextMeal: null,
    recentRecipes: [],
  };
  if (!session?.user?.id) return empty;

  const today = getTodayStr();
  const { start: weekStart, end: weekEnd } = getWeekRange();

  const userId = session.user.id;
  const [lists, calendarRes, recipeCountResult, recipeRecent] = await Promise.all([
    getShoppingLists(),
    getCalendarEvents(),
    prisma.result.count({ where: { userId, toolId: 'recipe' } }),
    prisma.result.findMany({
      where: { userId, toolId: 'recipe' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, content: true },
    }),
  ]);

  const shoppingCount = lists.reduce(
    (sum, list) => sum + (list.items?.filter((i) => !i.checked).length ?? 0),
    0
  );

  const events = calendarRes.success && calendarRes.events ? calendarRes.events : [];
  const mealEvents = events.filter((e): e is typeof e & { type: 'meal' } => e.type === 'meal');

  const plannedDaysSet = new Set<string>();
  mealEvents.forEach((e) => {
    if (e.date >= weekStart && e.date <= weekEnd) plannedDaysSet.add(e.date);
  });
  const plannedDays = plannedDaysSet.size;

  const futureMeals = mealEvents
    .filter((e) => e.date >= today)
    .sort((a, b) => (a.date === b.date ? (a.time || '').localeCompare(b.time || '') : a.date.localeCompare(b.date)));
  const nextMealEvent = futureMeals[0];
  const nextMeal = nextMealEvent
    ? {
        title: (nextMealEvent as { recipeName?: string }).recipeName ?? 'Geplantes Gericht',
        date: nextMealEvent.date,
        resultId: (nextMealEvent as { resultId?: string }).resultId,
      }
    : null;

  const recipeCount = recipeCountResult;
  const recentRecipes = recipeRecent.map((r) => {
    let recipeName = 'Rezept';
    try {
      const content = JSON.parse(r.content || '{}') as { recipeName?: string; title?: string };
      recipeName = content.recipeName ?? content.title ?? recipeName;
    } catch {
      // ignore
    }
    return { id: r.id, recipeName };
  });

  return {
    shoppingCount,
    plannedDays,
    recipeCount,
    nextMeal,
    recentRecipes,
  };
}
