/**
 * SmartCart: Mengen parsen und anzeigen — Stück ("x"), Gramm, Kilogramm.
 * Gewichts-Parsing läuft vor Stück-Fallback, damit z. B. "500 g Mehl" nicht als Stückzahl gilt.
 */

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;

/** Erstes Wort des Namens darf keine Massen-/Volumen-Einheit sein (Inferenz unit "x"). */
const UNIT_LIKE_NAME_START =
  /^(el|tl|g|kg|mg|ml|cl|dl|l|liter|l\.|prise|kilo|kilogramm|gramm|gram|gr|pfund|dkg|dag)\b/i;

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

const deQtyFormatter = new Intl.NumberFormat('de-DE', {
  maximumFractionDigits: 10,
  useGrouping: false,
});

/** Anzeige von Mengen im deutschen Format (Komma bei Dezimalen). */
export function formatQuantityGerman(n: number): string {
  return deQtyFormatter.format(n);
}

/**
 * Label für Badge / Export: Stück als "Nx", Gewichte als "N g" / "N,5 kg" (mit Leerzeichen).
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
    if (u === 'g' || u === 'kg') return `${qStr} ${u}`;
    return `${qStr} ${u}`;
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
 * Zerlegt eine Zeile in Menge (Stück), Einheit "x" und Produktname.
 * Nur Stück-Fälle; Gewicht zuerst über parseWeightQuantityFromLine.
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

export type ParsedFallbackShoppingLine =
  | { quantity: number; unit: 'g' | 'kg'; name: string }
  | { quantity: number; unit: 'x'; name: string };

/** Fallback-Zeile: zuerst Gewicht, dann Stück (Schritt 1 + 2). */
export function parseShoppingFallbackLine(line: string): ParsedFallbackShoppingLine | null {
  const w = parseWeightQuantityFromLine(line);
  if (w) return w;
  return parsePieceQuantityFromLine(line);
}

/**
 * Nach KI-Analyse: Gewichts-Synonyme → "g"/"kg"; Stück-Synonyme → "x";
 * bei fehlender Einheit weiterhin "x", wenn der Name nicht wie Maßeinheit beginnt.
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
    } else if (isPieceUnitToken(unit)) {
      unit = 'x';
    }
  }

  if (quantity != null && (unit == null || String(unit).trim() === '')) {
    const n = name.trim();
    if (n && !UNIT_LIKE_NAME_START.test(n)) {
      unit = 'x';
    }
  }

  return { name, quantity, unit };
}

/**
 * Freitext im Mengen-Badge: Gewicht, dann Stück, dann generisch (Einheit normalisieren).
 */
export function parseQtyInputForShopping(raw: string): { quantity: number | null; unit: string | null } {
  const s = raw.trim();
  if (!s) return { quantity: null, unit: null };

  const kgOnly = new RegExp(`^${NUM}\\s*(?:kilogramm|kilogram|kilo|kg)\\s*$`, 'i');
  const gOnly = new RegExp(`^${NUM}\\s*(?:gramm|gram|gr|g)\\s*$`, 'i');
  const kgOnlyMatch = kgOnly.exec(s);
  if (kgOnlyMatch) {
    const q = parseFloat(kgOnlyMatch[1]!.replace(',', '.'));
    if (!Number.isNaN(q)) return { quantity: q, unit: 'kg' };
  }
  const gOnlyMatch = gOnly.exec(s);
  if (gOnlyMatch) {
    const q = parseFloat(gOnlyMatch[1]!.replace(',', '.'));
    if (!Number.isNaN(q)) return { quantity: q, unit: 'g' };
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
  let uRaw = m[2]?.trim() || null;
  if (Number.isNaN(q)) return { quantity: null, unit: null };

  if (uRaw && isPieceUnitToken(uRaw)) {
    return { quantity: q, unit: 'x' };
  }

  const w = normalizeWeightUnitSynonym(uRaw);
  if (w) return { quantity: q, unit: w };

  return { quantity: q, unit: uRaw || null };
}
