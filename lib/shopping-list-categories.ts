/**
 * Kategorien für Smart Einkaufslisten (AI-gestützt).
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

/**
 * Supermarkt-Route: fixe Reihenfolge wie typischer Laufweg im Laden.
 * Obst & Gemüse immer ganz oben (gesunder Start), TK ganz am Ende (Schmelzgefahr).
 * Unbekannte Kategorien landen vor 'sonstiges'.
 */
export const CATEGORY_ORDER: readonly string[] = [
  'obst_gemuese', // 1. Eingang: Frisches
  'brot',         // 2. Brot & Backwaren (≈ backwaren)
  'vorrat',       // 3. Trockenes / Dosen / Saucen
  'fleisch',      // 4. Fleisch & Fisch
  'kuhlregal',    // 5. Milch & Käse (meist hinten)
  'haushalt',     // 6. Drogerie & Putzmittel
  'getraenke',    // 7. Getränke
  'tiefkuhl',     // 8. TK (ganz am Ende wegen Schmelzgefahr)
  'sonstiges',    // 9. Der Rest
];

const ICONS: Record<string, string> = {
  obst_gemuese: '🥬',
  kuhlregal: '🥛',
  fleisch: '🥩',
  brot: '🍞',
  backwaren: '🍞',
  vorrat: '🫙',
  haushalt: '🧻',
  getraenke: '🥤',
  tiefkuhl: '🧊',
  sonstiges: '📦',
};

const LABELS: Record<string, string> = {
  obst_gemuese: 'Obst & Gemüse',
  kuhlregal: 'Kühlregal',
  fleisch: 'Fleisch & Fisch',
  brot: 'Brot & Backwaren',
  backwaren: 'Brot & Backwaren',
  vorrat: 'Vorrat',
  haushalt: 'Haushalt',
  getraenke: 'Getränke',
  tiefkuhl: 'Tiefkühl',
  sonstiges: 'Sonstiges',
};

export const CATEGORY_ICONS = ICONS as Record<ShoppingCategory, string>;
export const CATEGORY_LABELS = LABELS as Record<ShoppingCategory, string>;

export function getCategoryIcon(cat: string | undefined): string {
  if (!cat) return ICONS.sonstiges;
  return ICONS[cat] ?? ICONS.sonstiges;
}

export function getCategoryLabel(cat: string | undefined): string {
  if (!cat) return LABELS.sonstiges;
  return LABELS[cat] ?? LABELS.sonstiges;
}

/** Sortiert Kategorien nach Supermarkt-Route (CATEGORY_ORDER). Unbekannte vor 'sonstiges'. */
export function sortCategoriesBySupermarktRoute(categoryKeys: string[]): string[] {
  const so = CATEGORY_ORDER.indexOf('sonstiges');
  const orderIndex = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i >= 0 ? i : so - 0.5;
  };
  return [...categoryKeys].sort((a, b) => {
    const va = orderIndex(a);
    const vb = orderIndex(b);
    if (va !== vb) return va - vb;
    return (a || '').localeCompare(b || '');
  });
}

/** Für Smart Aggregation: gleicher Name = gleiche Zeile */
export function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
