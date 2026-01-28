'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import type { ShoppingList } from '@/lib/shopping-lists-storage';

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
  } catch {
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
