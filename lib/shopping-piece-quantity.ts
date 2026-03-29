/**
 * SmartCart: Mengen parsen und anzeigen — Gewicht (g, kg), Volumen/Gebinde/Rezept-Einheiten, Stück ("x").
 * Reihenfolge Fallback: kg → g → ml/l/Pck./… → Stück.
 */

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;

/**
 * Erstes Wort des Namens darf keine Maß-/Gebinde-Einheit sein (Inferenz unit "x" bei fehlender Einheit).
 */
const UNIT_LIKE_NAME_START =
  /^(el|tl|g|kg|mg|ml|cl|dl|l|liter|milliliter|l\.|prise|kilo|kilogramm|gramm|gram|gr|pfund|dkg|dag|packung|packungen|päckchen|pck\.?|flasche|flaschen|fl\.?|dose|dosen|glas|gläser|glaser|esslöffel|essloeffel|bünde|bunde|bund|zehe|zehen|knoblauchzehe|knoblauchzehen)\b/i;

function isPieceUnitToken(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const u = raw.trim().toLowerCase();
  return u === 'x' || u === 'stk' || u === 'stk.' || u === 'stück' || u === 'st';
}

/** Gramm-/Kilogramm-Synonyme → kanonisch "g" | "kg" (Speicherung). */
export function normalizeWeightUnitSynonym(raw: string | null | undefined): 'g' | 'kg' | null {
  if (raw == null) return null;
  const l = raw.trim().toLowerCase();
  if (['g', 'gr', 'gram', 'gramm'].includes(l)) return 'g';
  if (['kg', 'kilo', 'kilogram', 'kilogramm'].includes(l)) return 'kg';
  return null;
}

/** Volumen, Gebinde, Rezept-Einheiten → kanonische Schreibweise (für Speicherung & Pille). */
export function normalizeVolumePackagingCulinaryUnit(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const l = raw.trim().toLowerCase().replace(/\.+$/g, '');
  const map = new Map<string, string>([
    ['milliliter', 'ml'],
    ['ml', 'ml'],
    ['liter', 'l'],
    ['l', 'l'],
    ['päckchen', 'Pck.'],
    ['packungen', 'Pck.'],
    ['packung', 'Pck.'],
    ['pck', 'Pck.'],
    ['flaschen', 'Fl.'],
    ['flasche', 'Fl.'],
    ['fl', 'Fl.'],
    ['dosen', 'Dose'],
    ['dose', 'Dose'],
    ['gläser', 'Glas'],
    ['glaser', 'Glas'],
    ['glas', 'Glas'],
    ['esslöffel', 'EL'],
    ['essloeffel', 'EL'],
    ['el', 'EL'],
    ['teelöffel', 'TL'],
    ['tl', 'TL'],
    ['bünde', 'Bund'],
    ['bunde', 'Bund'],
    ['bund', 'Bund'],
    ['knoblauchzehen', 'Zehe'],
    ['knoblauchzehe', 'Zehe'],
    ['zehen', 'Zehe'],
    ['zehe', 'Zehe'],
  ]);
  return map.get(l) ?? null;
}

/**
 * Plural/Singular für Dose, Zehe, Glas abhängig von der Menge (z. B. 2 → Dosen, 1 → Dose; 1,5 zählt als > 1).
 * Vor dem Schreiben in den State / nach dem Parsen anwenden.
 */
export function applyShoppingUnitPlural(quantity: number | null, unit: string | null): string | null {
  if (unit == null) return null;
  const formattedUnit = unit.trim();
  if (formattedUnit === '' || formattedUnit === 'x') return formattedUnit;

  if (quantity == null || !Number.isFinite(quantity)) return unit;

  const numericMenge = Number(quantity);
  if (Number.isNaN(numericMenge)) return unit;

  const unitLower = formattedUnit.toLowerCase().replace(/\.+$/g, '');

  if (numericMenge > 1) {
    if (unitLower === 'dose' || unitLower === 'dosen') return 'Dosen';
    if (unitLower === 'zehe' || unitLower === 'zehen') return 'Zehen';
    if (unitLower === 'glas' || unitLower === 'gläser' || unitLower === 'glaser') return 'Gläser';
    return unit;
  }

  if (unitLower === 'dosen' || unitLower === 'dose') return 'Dose';
  if (unitLower === 'zehen' || unitLower === 'zehe') return 'Zehe';
  if (unitLower === 'gläser' || unitLower === 'glaser' || unitLower === 'glas') return 'Glas';
  return unit;
}

/** Regex-Fragment (längere Token zuerst) + kanonische Einheit für Zeilen-Parsing. */
const VPC_LINE_RULES: { pattern: string; unit: string }[] = [
  { pattern: String.raw`(?:milliliter|ml)`, unit: 'ml' },
  { pattern: String.raw`(?:liter|l)`, unit: 'l' },
  { pattern: String.raw`(?:päckchen|packungen|packung|pck)`, unit: 'Pck.' },
  { pattern: String.raw`(?:flaschen|flasche|fl)`, unit: 'Fl.' },
  { pattern: String.raw`(?:dosen|dose)`, unit: 'Dose' },
  { pattern: String.raw`(?:gläser|glaser|glas)`, unit: 'Glas' },
  { pattern: String.raw`(?:esslöffel|essloeffel|el)`, unit: 'EL' },
  { pattern: String.raw`(?:teelöffel|tl)`, unit: 'TL' },
  { pattern: String.raw`(?:bünde|bunde|bund)`, unit: 'Bund' },
  {
    pattern: String.raw`(?:knoblauchzehen|knoblauchzehe|zehen|zehe)`,
    unit: 'Zehe',
  },
];

const deQtyFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 10,
  useGrouping: false,
});

/** Anzeige von Mengen im deutschen Format (Komma bei Dezimalen). */
export function formatQuantityGerman(n: number): string {
  return deQtyFormatter.format(n);
}

/**
 * Label für Badge / Export: Stück als "Nx" ohne Leerzeichen; alle anderen Einheiten mit Leerzeichen.
 */
export function formatShoppingQtyLabel(
  quantity: number | null | undefined,
  unit: string | null | undefined
): string {
  const u = unit?.trim() || null;
  const q = quantity;
  if (q != null && Number.isFinite(q)) {
    const qStr = formatQuantityGerman(q);
    if (u == null || u === 'x') return `${qStr}x`;
    const displayUnit = applyShoppingUnitPlural(q, u) ?? u;
    return `${qStr} ${displayUnit}`;
  }
  if (u) return u;
  return '';
}

/**
 * Zerlegt eine Zeile in Menge (Gewicht) und Produktname.
 * Kilogramm-Varianten vor Gramm (damit "kg" nicht als "g" endet).
 */
export function parseWeightQuantityFromLine(line: string): {
  quantity: number;
  unit: 'g' | 'kg';
  name: string;
} | null {
  const s = line.trim();
  if (!s) return null;

  const kgRe = new RegExp(`^${NUM}\\s*(?:kilogramm|kilogram|kilo|kg)\\b\\s*(.+)$`, 'i');
  const kgMatch = kgRe.exec(s);
  if (kgMatch) {
    const q = parseFloat(kgMatch[1]!.replace(',', '.'));
    const name = kgMatch[2]!.trim();
    if (!Number.isNaN(q) && name.length > 0) return { quantity: q, unit: 'kg', name };
  }

  const gRe = new RegExp(`^${NUM}\\s*(?:gramm|gram|gr|g)\\b\\s*(.+)$`, 'i');
  const gMatch = gRe.exec(s);
  if (gMatch) {
    const q = parseFloat(gMatch[1]!.replace(',', '.'));
    const name = gMatch[2]!.trim();
    if (!Number.isNaN(q) && name.length > 0) return { quantity: q, unit: 'g', name };
  }

  return null;
}

/**
 * Volumen, typische Gebinde, EL/TL, Bund, Zehe — vor Stück-Fallback.
 */
export function parseVolumePackagingCulinaryFromLine(line: string): {
  quantity: number;
  unit: string;
  name: string;
} | null {
  const s = line.trim();
  if (!s) return null;

  for (const { pattern, unit } of VPC_LINE_RULES) {
    const re = new RegExp(`^${NUM}\\s*${pattern}\\b\\s*(.+)$`, 'i');
    const m = re.exec(s);
    if (m) {
      const q = parseFloat(m[1]!.replace(',', '.'));
      const name = m[2]!.trim();
      if (!Number.isNaN(q) && name.length > 0) {
        const pluralUnit = applyShoppingUnitPlural(q, unit) ?? unit;
        return { quantity: q, unit: pluralUnit, name };
      }
    }
  }
  return null;
}

/**
 * Zerlegt eine Zeile in Menge (Stück), Einheit "x" und Produktname.
 * Nur Stück-Fälle; Gewicht & VPC zuerst über parseShoppingFallbackLine.
 */
export function parsePieceQuantityFromLine(line: string): {
  quantity: number;
  unit: 'x';
  name: string;
} | null {
  const s = line.trim();
  if (!s) return null;

  const withX = new RegExp(`^${NUM}\\s*x\\s+(.+)$`, 'i').exec(s);
  if (withX) {
    const q = parseFloat(withX[1]!.replace(',', '.'));
    if (!Number.isNaN(q)) return { quantity: q, unit: 'x', name: withX[2]!.trim() };
  }

  const withStück = new RegExp(`^${NUM}\\s*(?:stk\\.?|stück|st)\\s+(.+)$`, 'i').exec(s);
  if (withStück) {
    const q = parseFloat(withStück[1]!.replace(',', '.'));
    if (!Number.isNaN(q)) return { quantity: q, unit: 'x', name: withStück[2]!.trim() };
  }

  const bare = new RegExp(`^${NUM}\\s+(.+)$`).exec(s);
  if (bare) {
    const rest = bare[2]!.trim();
    if (rest && !UNIT_LIKE_NAME_START.test(rest)) {
      const q = parseFloat(bare[1]!.replace(',', '.'));
      if (!Number.isNaN(q)) return { quantity: q, unit: 'x', name: rest };
    }
  }

  return null;
}

export type ParsedFallbackShoppingLine = {
  quantity: number;
  unit: string;
  name: string;
};

/** Fallback-Zeile: Gewicht → Volumen/Gebinde/Rezept → Stück. */
export function parseShoppingFallbackLine(line: string): ParsedFallbackShoppingLine | null {
  const w = parseWeightQuantityFromLine(line);
  if (w) return w;
  const v = parseVolumePackagingCulinaryFromLine(line);
  if (v) return v;
  return parsePieceQuantityFromLine(line);
}

/**
 * Nach KI-Analyse: kanonische Einheiten; bei fehlender Einheit ggf. "x".
 */
export function normalizeShoppingQuantityFields(item: {
  name: string;
  quantity: number | null;
  unit: string | null;
}): { name: string; quantity: number | null; unit: string | null } {
  let unit = item.unit;
  const { quantity, name } = item;

  if (quantity != null && unit != null && String(unit).trim() !== '') {
    const w = normalizeWeightUnitSynonym(unit);
    if (w) {
      unit = w;
    } else {
      const v = normalizeVolumePackagingCulinaryUnit(unit);
      if (v) {
        unit = v;
      } else if (isPieceUnitToken(unit)) {
        unit = 'x';
      }
    }
  }

  if (quantity != null && (unit == null || String(unit).trim() === '')) {
    const n = name.trim();
    if (n && !UNIT_LIKE_NAME_START.test(n)) {
      unit = 'x';
    }
  }

  return { name, quantity, unit: applyShoppingUnitPlural(quantity, unit) };
}

/** Nur-Einheit-Zeilen fürs Mengen-Badge (Reihenfolge wie VPC_LINE_RULES, ml vor l). */
const VPC_QTY_ONLY_RULES: { pattern: string; unit: string }[] = VPC_LINE_RULES.map(({ pattern, unit }) => ({
  pattern,
  unit,
}));

/**
 * Freitext im Mengen-Badge: Gewicht, Volumen/Gebinde, Stück, dann generisch.
 */
export function parseQtyInputForShopping(raw: string): { quantity: number | null; unit: string | null } {
  const s = raw.trim();
  if (!s) return { quantity: null, unit: null };

  const kgOnly = new RegExp(`^${NUM}\\s*(?:kilogramm|kilogram|kilo|kg)\\s*$`, 'i');
  const gOnly = new RegExp(`^${NUM}\\s*(?:gramm|gram|gr|g)\\s*$`, 'i');
  const kgOnlyMatch = kgOnly.exec(s);
  if (kgOnlyMatch) {
    const q = parseFloat(kgOnlyMatch[1]!.replace(',', '.'));
    if (!Number.isNaN(q)) return { quantity: q, unit: applyShoppingUnitPlural(q, 'kg') ?? 'kg' };
  }
  const gOnlyMatch = gOnly.exec(s);
  if (gOnlyMatch) {
    const q = parseFloat(gOnlyMatch[1]!.replace(',', '.'));
    if (!Number.isNaN(q)) return { quantity: q, unit: applyShoppingUnitPlural(q, 'g') ?? 'g' };
  }

  for (const { pattern, unit } of VPC_QTY_ONLY_RULES) {
    const re = new RegExp(`^${NUM}\\s*${pattern}\\s*$`, 'i');
    const m = re.exec(s);
    if (m) {
      const q = parseFloat(m[1]!.replace(',', '.'));
      if (!Number.isNaN(q)) return { quantity: q, unit: applyShoppingUnitPlural(q, unit) ?? unit };
    }
  }

  const pieceSuffix = new RegExp(`^${NUM}\\s*(?:x|stk\\.?|stück|st)\\s*$`, 'i');
  const loneNum = new RegExp(`^${NUM}\\s*$`);
  if (pieceSuffix.test(s) || loneNum.test(s)) {
    const mNum = s.match(new RegExp(`^${NUM}`));
    if (mNum) {
      const q = parseFloat(mNum[1]!.replace(',', '.'));
      if (!Number.isNaN(q)) return { quantity: q, unit: 'x' };
    }
  }

  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(\S*)$/);
  if (!m) return { quantity: null, unit: null };
  const q = parseFloat(m[1]!.replace(',', '.'));
  const uRaw = m[2]?.trim() || null;
  if (Number.isNaN(q)) return { quantity: null, unit: null };

  if (uRaw && isPieceUnitToken(uRaw)) {
    return { quantity: q, unit: 'x' };
  }

  const w = normalizeWeightUnitSynonym(uRaw);
  if (w) return { quantity: q, unit: applyShoppingUnitPlural(q, w) ?? w };

  const v = normalizeVolumePackagingCulinaryUnit(uRaw);
  if (v) return { quantity: q, unit: applyShoppingUnitPlural(q, v) ?? v };

  const rawUnit = uRaw || null;
  return { quantity: q, unit: applyShoppingUnitPlural(q, rawUnit) ?? rawUnit };
}
