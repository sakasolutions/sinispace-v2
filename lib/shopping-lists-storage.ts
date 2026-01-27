/**
 * Shared storage for SiniSpace Einkaufslisten.
 * Used by /tools/shopping-list and AddToShoppingListModal (Gourmet-Planer).
 */

export const SHOPPING_LISTS_STORAGE_KEY = 'sinispace-shopping-lists';

export type ShoppingItem = {
  id: string;
  text: string;
  checked: boolean;
  /** AI-Kategorie (obst_gemuese, kuhlregal, fleisch, brot, haushalt, tiefkuhl, sonstiges) */
  category?: string;
  quantity?: number;
  unit?: string;
  /** Geschätzter Preis in Euro (DE, Supermarkt) */
  estimatedPrice?: number;
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

export function loadLists(): ShoppingList[] {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(SHOPPING_LISTS_STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ShoppingList[];
  } catch {
    return [];
  }
}

export function saveLists(lists: ShoppingList[]): void {
  if (lists.length === 0) return;
  try {
    localStorage.setItem(SHOPPING_LISTS_STORAGE_KEY, JSON.stringify(lists));
  } catch (_) {}
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
