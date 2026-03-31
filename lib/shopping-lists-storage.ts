/**
 * Shared storage for SiniSpace Einkaufslisten.
 * Zutaten-Container-Modell: gleicher Name → ein Item; Anzeige-Menge aus sources (gemischte Einheiten möglich).
 */

import { normalizeSmartCartCategory, normalizeItemName } from '@/lib/shopping-list-categories';
import { formatQuantityGerman } from '@/lib/shopping-piece-quantity';
import { singleRawItemToBase, type RawItem } from '@/lib/smartList/preProcessor';

export const SHOPPING_LISTS_STORAGE_KEY = 'sinispace-shopping-lists';

/** Einzelne Mengen-Herkunft (manuell oder aus Rezept). */
export type ItemSource = {
  id: string;
  type: 'manual' | 'recipe';
  amount: number;
  /** Anzeige-Suffix direkt an {@link amount} (z. B. "g", "ml", "x", " Pck.") */
  originalUnit: string;
  recipeName?: string;
};

export type ShoppingItem = {
  id: string;
  name: string;
  totalAmount: number;
  baseUnit: 'g' | 'ml' | 'x';
  /** Primäre Einheits-Label dieses Containers (z. B. "g", "x", "Dose"). */
  unit: string;
  category: string;
  isChecked: boolean;
  sources: ItemSource[];
  /** KI-Vorschlag: mit diesem bestehenden Listennamen zusammenfassen (optional). */
  suggestedMergeTarget?: string;
};

/** Eintrag für Pantry → SmartCart (Text + Kategorie + optionale Mengenfelder). */
export type StructuredShoppingAppendItem = {
  text: string;
  category?: string | null;
  quantity?: number | null;
  unit?: string | null;
  recipeSubtext?: string | null;
  recipeName?: string | null;
};

export function formatItemSourceLine(s: ItemSource): string {
  return `${formatQuantityGerman(s.amount)}${s.originalUnit}`;
}

/**
 * Badge-Text aus allen Quellen (z. B. "200g + 4x"), gruppiert nach `originalUnit`.
 */
export function getDynamicTotal(sources: ItemSource[]): string {
  if (!sources.length) return '';
  const totalsByUnit: Record<string, number> = {};
  for (const s of sources) {
    const unit = s.originalUnit ?? '';
    totalsByUnit[unit] = (totalsByUnit[unit] ?? 0) + s.amount;
  }
  return Object.entries(totalsByUnit)
    .map(([unit, amount]) => `${formatQuantityGerman(amount)}${unit}`)
    .join(' + ');
}

export function formatContainerTotalLabel(item: ShoppingItem): string {
  return getDynamicTotal(item.sources);
}

/**
 * Entfernt Klammerzusätze (z. B. „Nüsse (Walnuss)“ → „Nüsse“) für Merge-Keys & Anzeige.
 */
export function cleanIngredientNameForMerge(name: string): string {
  let s = name.trim();
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/\s*\([^()]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  }
  return s;
}

function resolveAppendRecipeSubtext(i: StructuredShoppingAppendItem): string | undefined {
  const direct = i.recipeSubtext?.trim();
  if (direct) return direct;
  const rn = i.recipeName?.trim();
  if (rn) return `Für ${rn}`;
  return undefined;
}

function parseRecipeNameFromSubtext(s: string): string | undefined {
  const t = s.trim();
  const m = /^für\s+(.+)$/i.exec(t);
  const body = m ? m[1]!.trim() : t;
  const first = body.split(',')[0]?.trim();
  return first || undefined;
}

function originalUnitSuffixForDisplay(q: number | null, u: string | null, baseUnit: 'g' | 'ml' | 'x'): string {
  const unitStr = (u ?? '').trim();
  if (!unitStr) return baseUnit;
  if (unitStr === 'g' || unitStr === 'ml' || unitStr === 'x') return unitStr;
  return unitStr.startsWith(' ') ? unitStr : ` ${unitStr}`;
}

function mergeKeysMatch(a: ShoppingItem, b: ShoppingItem): boolean {
  return (
    normalizeItemName(a.name) === normalizeItemName(b.name) &&
    (a.unit ?? '').trim() === (b.unit ?? '').trim()
  );
}

/**
 * Verschmilzt neue Container-Items mit offenen Zeilen (nur gleicher Name, case-insensitive).
 * Kategorie und Basiseinheit des bestehenden Containers bleiben erhalten; neue Quellen werden angehängt.
 */
export function mergeShoppingItemContainers(existingItems: ShoppingItem[], incoming: ShoppingItem[]): ShoppingItem[] {
  const result = existingItems.map((it) => ({
    ...it,
    sources: [...it.sources],
  }));

  for (const inc of incoming) {
    const matchIdx = result.findIndex(
      (e) => !e.isChecked && mergeKeysMatch(e, inc)
    );

    if (matchIdx >= 0) {
      const e = result[matchIdx]!;
      const mergedSources = [...e.sources, ...inc.sources];
      const sameBase = e.baseUnit === inc.baseUnit;
      result[matchIdx] = {
        ...e,
        totalAmount: sameBase ? e.totalAmount + inc.totalAmount : e.totalAmount,
        sources: mergedSources,
        suggestedMergeTarget: undefined,
      };
    } else {
      result.push({
        ...inc,
        name: cleanIngredientNameForMerge(inc.name),
      });
    }
  }

  return result;
}

function buildShoppingItemFromStructured(i: StructuredShoppingAppendItem): ShoppingItem {
  const name = cleanIngredientNameForMerge(i.text);
  const cat = normalizeSmartCartCategory(i.category ?? undefined);
  const q = i.quantity ?? null;
  const rawU = i.unit != null && String(i.unit).trim() ? String(i.unit).trim() : null;
  const raw: RawItem = {
    text: name,
    quantity: q,
    unit: rawU,
    category: cat,
    subtext: null,
  };
  const { totalAmount, baseUnit } = singleRawItemToBase(raw);
  const recipeSub = resolveAppendRecipeSubtext(i);
  const source: ItemSource = {
    id: generateId(),
    type: i.recipeName?.trim() || recipeSub ? 'recipe' : 'manual',
    amount: q != null && Number.isFinite(q) ? q : totalAmount,
    originalUnit: originalUnitSuffixForDisplay(q, rawU, baseUnit),
    recipeName: i.recipeName?.trim() || (recipeSub ? parseRecipeNameFromSubtext(recipeSub) : undefined),
  };
  return {
    id: generateId(),
    name,
    totalAmount,
    baseUnit,
    unit: source.originalUnit,
    category: cat,
    isChecked: false,
    sources: [source],
  };
}

/**
 * Legacy-Shape (text, checked, quantity, …) → Container-Modell.
 */
export function migrateShoppingItemFromLegacy(legacyRow: unknown): ShoppingItem {
  const o = legacyRow as Record<string, unknown>;
  if (
    o &&
    typeof o === 'object' &&
    typeof (o as Partial<ShoppingItem>).name === 'string' &&
    Array.isArray((o as Partial<ShoppingItem>).sources) &&
    ((o as Partial<ShoppingItem>).sources?.length ?? 0) > 0
  ) {
    const cast = o as unknown as ShoppingItem;
    // Backfill für alte Shapes ohne `unit`
    if (typeof (cast as any).unit !== 'string' || !(cast as any).unit.trim()) {
      const firstUnit =
        (cast.sources?.[0]?.originalUnit != null ? String(cast.sources[0].originalUnit) : '') ||
        cast.baseUnit;
      return { ...cast, unit: firstUnit };
    }
    return cast;
  }

  const legacyText = String(o.text ?? o.name ?? '');
  const name = cleanIngredientNameForMerge(legacyText);
  const category = normalizeSmartCartCategory(
    typeof o.category === 'string' ? o.category : 'sonstiges'
  );
  const q = typeof o.quantity === 'number' ? o.quantity : null;
  const u = o.unit != null ? String(o.unit) : null;
  const raw: RawItem = {
    text: name,
    quantity: q,
    unit: u,
    category,
    subtext: null,
  };
  const { totalAmount, baseUnit } = singleRawItemToBase(raw);
  const recipeSub = o.recipeSubtext != null ? String(o.recipeSubtext) : undefined;
  const source: ItemSource = {
    id: generateId(),
    type: recipeSub ? 'recipe' : 'manual',
    amount: q != null && Number.isFinite(q) ? q : totalAmount,
    originalUnit: originalUnitSuffixForDisplay(q, u, baseUnit),
    recipeName: recipeSub ? parseRecipeNameFromSubtext(recipeSub) : undefined,
  };

  return {
    id: String(o.id ?? generateId()),
    name,
    totalAmount,
    baseUnit,
    unit: source.originalUnit,
    category,
    isChecked: Boolean(o.checked ?? o.isChecked),
    sources: [source],
  };
}

export function migrateShoppingList(list: unknown): ShoppingList {
  if (!list || typeof list !== 'object') return defaultList();
  const l = list as Record<string, unknown>;
  const itemsRaw = l.items;
  const items = Array.isArray(itemsRaw)
    ? itemsRaw.map((it) => migrateShoppingItemFromLegacy(it))
    : [];
  return {
    id: String(l.id ?? generateId()),
    name: String(l.name ?? 'Liste'),
    items,
  };
}

export function migrateShoppingLists(raw: unknown): ShoppingList[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((l) => migrateShoppingList(l));
}

/**
 * @deprecated Nutze mergeShoppingItemContainers
 */
export function mergeStructuredShoppingItemsIntoList(
  existingItems: ShoppingItem[],
  incoming: ShoppingItem[]
): ShoppingItem[] {
  return mergeShoppingItemContainers(existingItems, incoming);
}

export type ShoppingList = { id: string; name: string; items: ShoppingItem[] };

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function defaultList(): ShoppingList {
  return { id: generateId(), name: 'Allgemein', items: [] };
}

export function mergeShoppingListsFromServer(
  server: ShoppingList[],
  local: ShoppingList[]
): ShoppingList[] {
  const localByListId = new Map(local.map((l) => [l.id, l]));
  const merged: ShoppingList[] = server.map((srv) => {
    const loc = localByListId.get(srv.id);
    if (!loc) return srv;
    const serverIds = new Set(srv.items.map((i) => i.id));
    const onlyLocal = loc.items.filter((i) => !serverIds.has(i.id));
    if (onlyLocal.length === 0) return srv;
    return { ...srv, items: [...srv.items, ...onlyLocal] };
  });
  const serverListIds = new Set(server.map((l) => l.id));
  for (const loc of local) {
    if (!serverListIds.has(loc.id)) {
      merged.push(loc);
    }
  }
  return merged;
}

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
      items: trimmed.map((text) => {
        const nameClean = cleanIngredientNameForMerge(text);
        const src: ItemSource = {
          id: generateId(),
          type: 'manual',
          amount: 1,
          originalUnit: 'x',
        };
        return {
          id: generateId(),
          name: nameClean,
          totalAmount: 1,
          baseUnit: 'x' as const,
          unit: src.originalUnit,
          category: 'sonstiges',
          isChecked: false,
          sources: [src],
        };
      }),
    };
    next = [...next, created];
    listName = name;
    return { lists: next, listName, appendedCount: trimmed.length };
  }

  const idx = next.findIndex((l) => l.id === listId);
  if (idx < 0) return { lists, listName: '', appendedCount: 0 };

  listName = next[idx].name;
  const newItems: ShoppingItem[] = trimmed.map((text) => {
    const nameClean = cleanIngredientNameForMerge(text);
    const inc: ShoppingItem = {
      id: generateId(),
      name: nameClean,
      totalAmount: 1,
      baseUnit: 'x',
      unit: 'x',
      category: 'sonstiges',
      isChecked: false,
      sources: [
        {
          id: generateId(),
          type: 'manual',
          amount: 1,
          originalUnit: 'x',
        },
      ],
    };
    return inc;
  });
  const merged = mergeShoppingItemContainers(next[idx].items, newItems);
  next = next.map((l, i) => (i === idx ? { ...l, items: merged } : l));
  return { lists: next, listName, appendedCount: trimmed.length };
}

/** Manuelles / Fallback-Item aus Name + Menge + Einheit (lokal, ohne KI). */
export function createManualShoppingItemFromParts(
  name: string,
  quantity: number | null,
  unit: string | null,
  categoryRaw: string
): ShoppingItem {
  const n = cleanIngredientNameForMerge(name);
  const cat = normalizeSmartCartCategory(categoryRaw);
  const raw: RawItem = {
    text: n,
    quantity,
    unit: unit,
    category: cat,
    subtext: null,
  };
  const { totalAmount, baseUnit } = singleRawItemToBase(raw);
  const source: ItemSource = {
    id: generateId(),
    type: 'manual',
    amount: quantity != null && Number.isFinite(quantity) ? quantity : totalAmount,
    originalUnit: originalUnitSuffixForDisplay(quantity, unit, baseUnit),
  };
  return {
    id: generateId(),
    name: n,
    totalAmount,
    baseUnit,
    unit: source.originalUnit,
    category: cat,
    isChecked: false,
    sources: [source],
  };
}

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

  const batch = valid.map((i) => buildShoppingItemFromStructured(i));

  let next = [...lists];
  let listName: string;

  if (listId === '__new__') {
    const name = (newListName?.trim() || 'Neue Liste').slice(0, 80);
    const created: ShoppingList = {
      id: generateId(),
      name,
      items: mergeShoppingItemContainers([], batch),
    };
    next = [...next, created];
    listName = name;
    return { lists: next, listName, appendedCount: valid.length };
  }

  const idx = next.findIndex((l) => l.id === listId);
  if (idx < 0) return { lists, listName: '', appendedCount: 0 };

  listName = next[idx].name;
  const mergedItems = mergeShoppingItemContainers(next[idx].items, batch);
  next = next.map((l, i) => (i === idx ? { ...l, items: mergedItems } : l));
  return { lists: next, listName, appendedCount: valid.length };
}

/**
 * Kombiniert „Für …“-Zeilen ohne doppelte Rezeptnamen (Legacy-Export).
 */
export function mergeRecipeSourceSubtext(
  existing: string | undefined,
  incoming: string | undefined
): string | undefined {
  const labels = new Map<string, string>();

  const ingest = (s: string | undefined) => {
    if (!s?.trim()) return;
    const t = s.trim();
    const body = /^für\s+/i.test(t) ? t.replace(/^für\s+/i, '').trim() : t;
    for (const part of body.split(',')) {
      const p = part.trim();
      if (p) labels.set(p.toLowerCase(), p);
    }
  };

  ingest(existing);
  ingest(incoming);
  if (labels.size === 0) return undefined;
  return `Für ${[...labels.values()].join(', ')}`;
}
