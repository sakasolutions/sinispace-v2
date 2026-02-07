/**
 * Kategorien für Smart Einkaufslisten (AI-gestützt).
 * Color-Coded Aisles: bg, border, Lucide-Icon-Name, iconColor pro Kategorie.
 */

export const SHOPPING_CATEGORIES = [
  'obst_gemuese',
  'kuhlregal',
  'fleisch',
  'brot',
  'haushalt',
  'getraenke',
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
  'obst_gemuese',
  'brot',
  'vorrat',
  'fleisch',
  'kuhlregal',
  'haushalt',
  'getraenke',
  'tiefkuhl',
  'sonstiges',
];

export type CategoryTheme = {
  icon: string;
  label: string;
  bg: string;
  border: string;
  iconColor: string;
  /** Sticky header + checkbox accent (Apple Reminders / Bring! style) */
  headerTextColor: string;
  checkboxBorder: string;
  checkboxBg: string;
};

const THEMES: Record<string, CategoryTheme> = {
  obst_gemuese: {
    icon: 'Leaf',
    label: 'Obst & Gemüse',
    bg: 'bg-green-50/50',
    border: 'border-green-100',
    iconColor: 'text-green-600',
    headerTextColor: 'text-emerald-600',
    checkboxBorder: 'border-emerald-500',
    checkboxBg: 'bg-emerald-500',
  },
  fleisch: {
    icon: 'Beef',
    label: 'Fleisch & Fisch',
    bg: 'bg-rose-50/50',
    border: 'border-rose-100',
    iconColor: 'text-rose-600',
    headerTextColor: 'text-rose-600',
    checkboxBorder: 'border-rose-500',
    checkboxBg: 'bg-rose-500',
  },
  kuhlregal: {
    icon: 'Milk',
    label: 'Kühlregal',
    bg: 'bg-sky-50/50',
    border: 'border-sky-100',
    iconColor: 'text-sky-600',
    headerTextColor: 'text-sky-600',
    checkboxBorder: 'border-sky-500',
    checkboxBg: 'bg-sky-500',
  },
  brot: {
    icon: 'Croissant',
    label: 'Brot & Backwaren',
    bg: 'bg-amber-50/50',
    border: 'border-amber-100',
    iconColor: 'text-amber-600',
    headerTextColor: 'text-amber-600',
    checkboxBorder: 'border-amber-500',
    checkboxBg: 'bg-amber-500',
  },
  backwaren: {
    icon: 'Croissant',
    label: 'Brot & Backwaren',
    bg: 'bg-amber-50/50',
    border: 'border-amber-100',
    iconColor: 'text-amber-600',
    headerTextColor: 'text-amber-600',
    checkboxBorder: 'border-amber-500',
    checkboxBg: 'bg-amber-500',
  },
  getraenke: {
    icon: 'Wine',
    label: 'Getränke & Party',
    bg: 'bg-blue-50/50',
    border: 'border-blue-100',
    iconColor: 'text-blue-600',
    headerTextColor: 'text-blue-600',
    checkboxBorder: 'border-blue-500',
    checkboxBg: 'bg-blue-500',
  },
  vorrat: {
    icon: 'Package',
    label: 'Vorrat',
    bg: 'bg-orange-50/50',
    border: 'border-orange-100',
    iconColor: 'text-orange-600',
    headerTextColor: 'text-orange-600',
    checkboxBorder: 'border-orange-500',
    checkboxBg: 'bg-orange-500',
  },
  haushalt: {
    icon: 'Home',
    label: 'Haushalt',
    bg: 'bg-slate-50/50',
    border: 'border-slate-100',
    iconColor: 'text-slate-600',
    headerTextColor: 'text-slate-600',
    checkboxBorder: 'border-slate-500',
    checkboxBg: 'bg-slate-500',
  },
  tiefkuhl: {
    icon: 'Snowflake',
    label: 'Tiefkühl',
    bg: 'bg-cyan-50/50',
    border: 'border-cyan-100',
    iconColor: 'text-cyan-600',
    headerTextColor: 'text-cyan-600',
    checkboxBorder: 'border-cyan-500',
    checkboxBg: 'bg-cyan-500',
  },
  sonstiges: {
    icon: 'Package',
    label: 'Sonstiges',
    bg: 'bg-gray-50/50',
    border: 'border-gray-100',
    iconColor: 'text-gray-600',
    headerTextColor: 'text-gray-600',
    checkboxBorder: 'border-gray-400',
    checkboxBg: 'bg-gray-400',
  },
};

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
  getraenke: 'Getränke & Party',
  tiefkuhl: 'Tiefkühl',
  sonstiges: 'Sonstiges',
};

export const CATEGORY_ICONS = ICONS as Record<ShoppingCategory, string>;
export const CATEGORY_LABELS = LABELS as Record<ShoppingCategory, string>;

export function getCategoryTheme(cat: string | undefined): CategoryTheme {
  if (!cat) return THEMES.sonstiges;
  return THEMES[cat] ?? THEMES.sonstiges;
}

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
