'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getShoppingLists } from './shopping-list-actions';

type MealEventLike = { type: string; date: string; time?: string; recipeName?: string; resultId?: string };

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
  const [lists, userCalendar, dbMealEvents, recipeCountResult, recipeRecent] = await Promise.all([
    getShoppingLists(),
    prisma.userCalendar.findUnique({ where: { userId } }),
    prisma.calendarEvent.findMany({
      where: { userId, eventType: 'meal' },
      orderBy: [{ date: 'asc' }, { time: 'asc' }],
      select: { date: true, time: true, title: true, resultId: true },
    }),
    prisma.result.count({ where: { userId, toolId: 'recipe' } }),
    prisma.result.findMany({
      where: { userId, toolId: 'recipe' },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: { id: true, content: true },
    }),
  ]);

  const shoppingCount = lists.reduce(
    (sum, list) => sum + (list.items?.filter((i) => !i.isChecked).length ?? 0),
    0
  );

  const jsonEvents: MealEventLike[] = (() => {
    try {
      const raw = userCalendar?.eventsJson ?? '[]';
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  })();
  const mealFromJson = jsonEvents.filter((e) => e.type === 'meal') as MealEventLike[];
  const mealFromDb = dbMealEvents.map((e) => ({
    type: 'meal' as const,
    date: e.date,
    time: e.time,
    recipeName: e.title ?? undefined,
    resultId: e.resultId ?? undefined,
  }));
  const mealEvents: MealEventLike[] = [...mealFromJson, ...mealFromDb].sort(
    (a, b) => (a.date === b.date ? (a.time || '').localeCompare(b.time || '') : a.date.localeCompare(b.date))
  );

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
        title: nextMealEvent.recipeName ?? 'Geplantes Gericht',
        date: nextMealEvent.date,
        resultId: nextMealEvent.resultId,
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
