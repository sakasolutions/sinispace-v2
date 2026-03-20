/**
 * Shared storage for SiniSpace Einkaufslisten.
 * Used by /tools/shopping-list and AddToShoppingListModal (Gourmet-Planer).
 */

import { normalizeSmartCartCategory } from '@/lib/shopping-list-categories';

export const SHOPPING_LISTS_STORAGE_KEY = 'sinispace-shopping-lists';

/** Eintrag für Pantry → SmartCart (Text + Kategorie + optionale Mengenfelder). */
export type StructuredShoppingAppendItem = {
  text: string;
  category?: string | null;
  quantity?: number | null;
  unit?: string | null;
};

export type ShoppingItem = {
  id: string;
  text: string;
  checked: boolean;
  /** AI-Kategorie (obst_gemuese, kuhlregal, fleisch, brot, haushalt, tiefkuhl, sonstiges) */
  category?: string;
  quantity?: number | null;
  unit?: string | null;
  /** Status bei Smart-Input: analyzing → done | error */
  status?: 'idle' | 'analyzing' | 'done' | 'error';
  /** Original-Input vor AI-Verarbeitung */
  rawInput?: string;
};
export type ShoppingList = { id: string; name: string; items: ShoppingItem[] };

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function defaultList(): ShoppingList {
  return { id: generateId(), name: 'Allgemein', items: [] };
}

/**
 * Append text items to a list (by id). Creates the list if it doesn't exist.
 * If listId is '__new__', creates a new list with `newListName` and appends there.
 * Returns { listName, appendedCount }.
 */
export function appendToList(
  lists: ShoppingList[],
  listId: string,
  items: string[],
  newListName?: string
): { lists: ShoppingList[]; listName: string; appendedCount: number } {
  const trimmed = items.map((t) => t.trim()).filter(Boolean);
  if (trimmed.length === 0) return { lists, listName: '', appendedCount: 0 };

  let next = [...lists];
  let listName: string;

  if (listId === '__new__') {
    const name = (newListName?.trim() || 'Neue Liste').slice(0, 80);
    const created: ShoppingList = {
      id: generateId(),
      name,
      items: trimmed.map((text) => ({ id: generateId(), text, checked: false })),
    };
    next = [...next, created];
    listName = name;
    return { lists: next, listName, appendedCount: trimmed.length };
  }

  const idx = next.findIndex((l) => l.id === listId);
  if (idx < 0) return { lists, listName: '', appendedCount: 0 };

  listName = next[idx].name;
  const newItems: ShoppingItem[] = trimmed.map((text) => ({
    id: generateId(),
    text,
    checked: false,
  }));
  next = next.map((l, i) =>
    i === idx ? { ...l, items: [...l.items, ...newItems] } : l
  );
  return { lists: next, listName, appendedCount: trimmed.length };
}

/**
 * Wie appendToList, aber mit Kategorie (SmartCart-Schlüssel) und optional quantity/unit pro Item.
 */
export function appendStructuredItemsToList(
  lists: ShoppingList[],
  listId: string,
  items: StructuredShoppingAppendItem[],
  newListName?: string
): { lists: ShoppingList[]; listName: string; appendedCount: number } {
  const valid = items
    .map((i) => ({
      ...i,
      text: typeof i.text === 'string' ? i.text.trim() : '',
    }))
    .filter((i) => i.text.length > 0);
  if (valid.length === 0) return { lists, listName: '', appendedCount: 0 };

  const buildShoppingItems = (): ShoppingItem[] =>
    valid.map((i) => ({
      id: generateId(),
      text: i.text,
      checked: false,
      category: normalizeSmartCartCategory(i.category ?? undefined),
      quantity: i.quantity ?? null,
      unit: i.unit != null && String(i.unit).trim() ? String(i.unit).trim() : null,
    }));

  let next = [...lists];
  let listName: string;

  if (listId === '__new__') {
    const name = (newListName?.trim() || 'Neue Liste').slice(0, 80);
    const created: ShoppingList = {
      id: generateId(),
      name,
      items: buildShoppingItems(),
    };
    next = [...next, created];
    listName = name;
    return { lists: next, listName, appendedCount: valid.length };
  }

  const idx = next.findIndex((l) => l.id === listId);
  if (idx < 0) return { lists, listName: '', appendedCount: 0 };

  listName = next[idx].name;
  const newItems = buildShoppingItems();
  next = next.map((l, i) => (i === idx ? { ...l, items: [...l.items, ...newItems] } : l));
  return { lists: next, listName, appendedCount: valid.length };
}
