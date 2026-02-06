'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ShoppingList } from '@/lib/shopping-lists-storage';
import { normalizeItemName } from '@/lib/shopping-list-categories';

export async function getShoppingLists(): Promise<ShoppingList[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  try {
    const row = await prisma.userShoppingLists.findUnique({
      where: { userId: session.user.id },
    });
    if (!row?.listsJson) return [];
    const parsed = JSON.parse(row.listsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ShoppingList[];
  } catch (e) {
    console.error('[shopping-list-actions] getShoppingLists', e);
    return [];
  }
}

export async function saveShoppingLists(
  lists: ShoppingList[]
): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: 'Nicht angemeldet' };
  if (lists.length === 0) return { success: true };
  try {
    const listsJson = JSON.stringify(lists);
    await prisma.userShoppingLists.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, listsJson, updatedAt: new Date() },
      update: { listsJson, updatedAt: new Date() },
    });
    return { success: true };
  } catch (e) {
    console.error('[shopping-list-actions] saveShoppingLists', e);
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Fehler beim Speichern',
    };
  }
}

/** Smart History: Item beim Hinzufügen oder Abhaken tracken (usageCount hochzählen). */
export async function recordFrequentItem(itemLabel: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;
  const label = normalizeItemName(itemLabel);
  if (!label) return;
  try {
    await prisma.shoppingListFrequentItem.upsert({
      where: {
        userId_itemLabel: { userId: session.user.id, itemLabel: label },
      },
      create: {
        userId: session.user.id,
        itemLabel: label,
        usageCount: 1,
      },
      update: { usageCount: { increment: 1 } },
    });
  } catch (e) {
    console.error('[shopping-list-actions] recordFrequentItem', e);
  }
}

/** Smart History: Top N häufig gekaufte Items (Quick-Add Chips). */
export async function getFrequentItems(limit = 10): Promise<{ itemLabel: string }[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  try {
    const rows = await prisma.shoppingListFrequentItem.findMany({
      where: { userId: session.user.id },
      orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }],
      take: limit,
      select: { itemLabel: true },
    });
    return rows;
  } catch (e) {
    console.error('[shopping-list-actions] getFrequentItems', e);
    return [];
  }
}

/** Smart History: Type-Ahead – historische Items filtern (query in itemLabel). */
export async function searchFrequentItems(
  query: string,
  limit = 10
): Promise<{ itemLabel: string }[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  const q = normalizeItemName(query);
  if (!q) return [];
  try {
    const rows = await prisma.shoppingListFrequentItem.findMany({
      where: {
        userId: session.user.id,
        itemLabel: { contains: q, mode: 'insensitive' },
      },
      orderBy: [{ usageCount: 'desc' }, { lastUsedAt: 'desc' }],
      take: limit,
      select: { itemLabel: true },
    });
    return rows;
  } catch (e) {
    console.error('[shopping-list-actions] searchFrequentItems', e);
    return [];
  }
}

/** Smart Nachkaufen: KI-Vorschläge „was bald fehlt“. Placeholder/mock für jetzt; echte Logik später einbaubar. */
export async function getSmartNachkaufenSuggestions(
  limit = 10
): Promise<{ label: string }[]> {
  await auth();
  // TODO: Replace with real logic (e.g. ML, purchase history, pantry expiry).
  const mock: { label: string }[] = [
    { label: 'milch' },
    { label: 'kaffee' },
    { label: 'eier' },
  ];
  return mock.slice(0, limit);
}
