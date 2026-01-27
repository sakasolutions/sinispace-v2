/**
 * Kategorien für Smart Einkaufslisten (AI-gestützt).
 * Reihenfolge = Anzeige-Reihenfolge im UI.
 */

export const SHOPPING_CATEGORIES = [
  'obst_gemuese',
  'kuhlregal',
  'fleisch',
  'brot',
  'haushalt',
  'tiefkuhl',
  'sonstiges',
] as const;

export type ShoppingCategory = (typeof SHOPPING_CATEGORIES)[number];

export const CATEGORY_ICONS: Record<ShoppingCategory, string> = {
  obst_gemuese: '🥬',
  kuhlregal: '🥛',
  fleisch: '🥩',
  brot: '🍞',
  haushalt: '🧻',
  tiefkuhl: '🧊',
  sonstiges: '📦',
};

export const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  obst_gemuese: 'Obst & Gemüse',
  kuhlregal: 'Kühlregal',
  fleisch: 'Fleisch & Fisch',
  brot: 'Brot & Backwaren',
  haushalt: 'Haushalt',
  tiefkuhl: 'Tiefkühl',
  sonstiges: 'Sonstiges',
};

export function getCategoryIcon(cat: string | undefined): string {
  if (!cat || !(cat in CATEGORY_ICONS)) return CATEGORY_ICONS.sonstiges;
  return CATEGORY_ICONS[cat as ShoppingCategory];
}

export function getCategoryLabel(cat: string | undefined): string {
  if (!cat || !(cat in CATEGORY_LABELS)) return CATEGORY_LABELS.sonstiges;
  return CATEGORY_LABELS[cat as ShoppingCategory];
}

export function categoryOrder(cat: string | undefined): number {
  const i = (SHOPPING_CATEGORIES as readonly string[]).indexOf(cat ?? '');
  return i >= 0 ? i : SHOPPING_CATEGORIES.length;
}

/** Für Smart Aggregation: gleicher Name = gleiche Zeile */
export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
