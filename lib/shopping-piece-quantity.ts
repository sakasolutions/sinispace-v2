/**
 * SmartCart: Stückzahlen erkennen (stk, st, stück, x, führende Zahl ohne Gewicht/Volumen)
 * und intern auf Einheit "x" normieren (Anzeige z. B. "2x" ohne Leerzeichen).
 * Gewichte (g, kg) und Volumen (ml, l, EL, TL, …) bleiben unverändert.
 */

const NUM = String.raw`(\d+(?:[.,]\d+)?)`;

/** Erstes Wort des Namens darf keine Gewichts-/Volumen-Einheit sein (für Inferenz unit "x" bei fehlender Einheit). */
const UNIT_LIKE_NAME_START =
  /^(el|tl|g|kg|mg|ml|cl|dl|l|liter|l\.|prise|kilo|kilogramm|gramm|pfund|dkg|dag)\b/i;

function isPieceUnitToken(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const u = raw.trim().toLowerCase();
  return u === 'x' || u === 'stk' || u === 'stk.' || u === 'stück' || u === 'st';
}

/**
 * Zerlegt eine Zeile in Menge (Stück), Einheit "x" und Produktname.
 * Nur Stück-Fälle; sonst null (keine Änderung an g/kg/ml/…).
 */
export function parsePieceQuantityFromLine(line: string): {
  quantity: number;
  unit: 'x';
  name: string;
} | null {
  const s = line.trim();
  if (!s) return null;

  // 2x Tomaten / 2 x Tomaten (optional Leerzeichen vor x)
  const withX = new RegExp(`^${NUM}\\s*x\\s+(.+)$`, 'i').exec(s);
  if (withX) {
    const q = parseFloat(withX[1]!.replace(',', '.'));
    if (!Number.isNaN(q)) return { quantity: q, unit: 'x', name: withX[2]!.trim() };
  }

  // 2 stk … / 2 Stück … / 2 st … (Wortgrenze bei "st")
  const withStück = new RegExp(`^${NUM}\\s*(?:stk\\.?|stück|st)\\s+(.+)$`, 'i').exec(s);
  if (withStück) {
    const q = parseFloat(withStück[1]!.replace(',', '.'));
    if (!Number.isNaN(q)) return { quantity: q, unit: 'x', name: withStück[2]!.trim() };
  }

  // Nur führende Zahl + Name, wenn der Rest nicht wie Gewicht/Volumen beginnt
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

/**
 * Nach KI-Analyse: Stück-Synonyme → "x"; bei Menge ohne Einheit sinnvoll "x" setzen
 * (nur wenn der Name nicht mit einer Massen-/Volumen-Einheit beginnt).
 */
export function normalizeShoppingQuantityFields(item: {
  name: string;
  quantity: number | null;
  unit: string | null;
}): { name: string; quantity: number | null; unit: string | null } {
  let unit = item.unit;
  const { quantity, name } = item;

  if (quantity != null && unit != null && String(unit).trim() !== '') {
    if (isPieceUnitToken(unit)) {
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
 * Freitext im Mengen-Badge (Bearbeiten): Stück-Varianten → quantity + unit "x".
 * Bestehende g/kg/ml/…-Zeilen unverändert (letzter Fallback wie bisher).
 */
export function parseQtyInputForShopping(raw: string): { quantity: number | null; unit: string | null } {
  const s = raw.trim();
  if (!s) return { quantity: null, unit: null };

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

  return { quantity: q, unit: uRaw || null };
}
