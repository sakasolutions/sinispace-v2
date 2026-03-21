/**
 * Dashboard: Kalender-Mahlzeit „heute“ + offene SmartCart-Positionen.
 * Nur für Server Components / Server Actions importieren.
 */

import { prisma } from '@/lib/prisma';
import type { ShoppingList } from '@/lib/shopping-lists-storage';

export type DashboardSnapshot = {
  /** Erste geplante Mahlzeit heute (Titel), sonst null */
  todaysMealTitle: string | null;
  /** Summe aller Listen-Einträge mit checked === false */
  openCartItemsCount: number;
};

/** „Heute“ im Sinne der Nutzerzeitzone (DE). */
export function getTodayDateStringBerlin(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function countOpenShoppingItems(listsJson: string | null | undefined): number {
  if (!listsJson) return 0;
  try {
    const parsed = JSON.parse(listsJson) as unknown;
    if (!Array.isArray(parsed)) return 0;
    let n = 0;
    for (const list of parsed as ShoppingList[]) {
      const items = list?.items;
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        if (item && item.checked === false) n += 1;
      }
    }
    return n;
  } catch {
    return 0;
  }
}

export async function getDashboardSnapshot(userId: string): Promise<DashboardSnapshot> {
  const today = getTodayDateStringBerlin();

  const [mealRows, shoppingRow] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        userId,
        date: today,
        eventType: 'meal',
      },
      orderBy: { time: 'asc' },
      select: { title: true },
    }),
    prisma.userShoppingLists.findUnique({
      where: { userId },
      select: { listsJson: true },
    }),
  ]);

  const todaysMealTitle =
    mealRows.map((r) => r.title?.trim()).find((t) => t && t.length > 0) ?? null;

  return {
    todaysMealTitle,
    openCartItemsCount: countOpenShoppingItems(shoppingRow?.listsJson),
  };
}
