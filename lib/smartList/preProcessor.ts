/**
 * Hybrid-Engine: Mengen deterministisch in Basiseinheiten (g, ml, x) voraggregieren,
 * bevor die KI nur noch Supermarkt-Gebinde „übersetzt“ (ohne Mathematik).
 */

import {
  normalizeVolumePackagingCulinaryUnit,
  normalizeWeightUnitSynonym,
  parseShoppingFallbackLine,
} from '@/lib/shopping-piece-quantity';
import { normalizeSmartCartCategory, type ShoppingCategory } from '@/lib/shopping-list-categories';

/** Rohzeile wie von `sanitizeCartItems` / Shopping-List-Payload. */
export interface RawItem {
  text: string;
  quantity: number | null;
  unit: string | null;
  category?: string;
  subtext?: string | null;
}

/**
 * Nach Gruppierung und Addition: eine konsolidierte Zeile für die KI.
 * `amount` ist immer die Summe in `basis` (keine weiteren Umrechnungen durch das LLM).
 */
export interface ProcessedItem {
  name: string;
  category: ShoppingCategory;
  /** Interner Gruppierungsschlüssel: normalisierter Name + Kategorie */
  groupKey: string;
  basis: 'g' | 'ml' | 'x';
  amount: number;
  subtext: string | null;
}

/**
 * Typische deutsche Supermarkt-Annahmen pro Gebinde (Gramm oder Milliliter pro Stück).
 * Dient nur der deterministischen Vorstufe, nicht der KI.
 */
export const STANDARD_WEIGHTS: Record<string, { grams?: number; ml?: number }> = {
  'Pck.': { grams: 500 },
  Becher: { grams: 200 },
  Dose: { grams: 400 },
  Glas: { ml: 350 },
  'Fl.': { ml: 500 },
  Bund: { grams: 50 },
  Zehe: { grams: 5 },
  Tasse: { ml: 250 },
  EL: { ml: 15 },
  TL: { ml: 5 },
};

function normalizeNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '');
}

function mergeSubtexts(parts: (string | null | undefined)[]): string | null {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const t = p?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.length ? out.join(' | ') : null;
}

function composeLine(raw: RawItem): string {
  const text = raw.text.trim();
  const q = raw.quantity;
  const u = raw.unit?.trim();
  if (q != null && Number.isFinite(q) && u) {
    return `${q} ${u} ${text}`.trim();
  }
  if (q != null && Number.isFinite(q) && !u) {
    return `${q}x ${text}`.trim();
  }
  return text;
}

function canonicalPackagingUnit(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  const w = normalizeWeightUnitSynonym(t);
  if (w) return w;
  const v = normalizeVolumePackagingCulinaryUnit(t);
  if (v) return v;
  const l = t.toLowerCase().replace(/\.+$/g, '');
  const map: Record<string, string> = {
    pck: 'Pck.',
    packung: 'Pck.',
    packungen: 'Pck.',
    becher: 'Becher',
    dose: 'Dose',
    dosen: 'Dose',
    glas: 'Glas',
    gläser: 'Glas',
    glaser: 'Glas',
    flasche: 'Fl.',
    flaschen: 'Fl.',
    bund: 'Bund',
    bünde: 'Bund',
    zehe: 'Zehe',
    zehen: 'Zehe',
    tasse: 'Tasse',
    tassen: 'Tasse',
  };
  return map[l] ?? t;
}

function isPieceUnit(unit: string | null | undefined): boolean {
  if (unit == null) return false;
  const u = unit.trim().toLowerCase();
  return u === 'x' || u === 'stk' || u === 'stk.' || u === 'stück' || u === 'st';
}

function looksLikeFreshProduce(category: ShoppingCategory, name: string): boolean {
  if (category === 'obst_gemuese') return true;
  const n = name.toLowerCase();
  return /\b(tomate|tomaten|gurke|gurken|paprika|zwiebel|zwiebeln|kartoffel|kartoffeln|möhre|möhren|karotte|karotten|salat|apfel|äpfel|banane|bananen|zitrone|zitronen)\b/.test(
    n
  );
}

/**
 * Heuristik: Stückzahl bei Kühlregal-Molkerei in Gramm (Becher-Äquivalent), wenn sinnvoll.
 */
function pieceToGramsDairy(category: ShoppingCategory, name: string, qty: number): number | null {
  if (category !== 'kuhlregal') return null;
  const n = name.toLowerCase();
  if (!/\b(joghurt|jogurt|quark|sahne|creme|frischkäse|frischkase|skyr|buttermilch)\b/.test(n)) {
    return null;
  }
  const g = STANDARD_WEIGHTS['Becher']?.grams ?? 200;
  return qty * g;
}

type Contribution =
  | { kind: 'g'; value: number }
  | { kind: 'ml'; value: number }
  | { kind: 'x'; value: number };

function rowToContribution(
  name: string,
  category: ShoppingCategory,
  quantity: number,
  unitRaw: string
): Contribution {
  const q = Number.isFinite(quantity) && quantity >= 0 ? quantity : 1;

  const w = normalizeWeightUnitSynonym(unitRaw);
  if (w === 'g') return { kind: 'g', value: q };
  if (w === 'kg') return { kind: 'g', value: q * 1000 };

  const uLower = unitRaw.trim().toLowerCase();
  if (uLower === 'ml' || uLower === 'milliliter') return { kind: 'ml', value: q };
  if (uLower === 'l' || uLower === 'liter') return { kind: 'ml', value: q * 1000 };

  const canon = canonicalPackagingUnit(unitRaw);
  if (canon && STANDARD_WEIGHTS[canon]) {
    const sw = STANDARD_WEIGHTS[canon]!;
    if (sw.grams != null) return { kind: 'g', value: q * sw.grams };
    if (sw.ml != null) return { kind: 'ml', value: q * sw.ml };
  }

  if (isPieceUnit(unitRaw)) {
    if (looksLikeFreshProduce(category, name)) {
      return { kind: 'x', value: q };
    }
    const dairyG = pieceToGramsDairy(category, name, q);
    if (dairyG != null) return { kind: 'g', value: dairyG };
    return { kind: 'x', value: q };
  }

  return { kind: 'x', value: q > 0 ? q : 1 };
}

type GroupAcc = {
  name: string;
  category: ShoppingCategory;
  groupKey: string;
  grams: number;
  ml: number;
  pieces: number;
  subtexts: (string | null | undefined)[];
};

function makeGroupKey(nameKey: string, category: ShoppingCategory): string {
  return `${nameKey}::${category}`;
}

function parseRawToRows(raw: RawItem): { name: string; category: ShoppingCategory; quantity: number; unit: string } | null {
  const category = normalizeSmartCartCategory(raw.category);
  const line = composeLine(raw);
  const parsed = parseShoppingFallbackLine(line);

  if (parsed) {
    return {
      name: parsed.name.trim(),
      category,
      quantity: parsed.quantity,
      unit: parsed.unit,
    };
  }

  const text = raw.text.trim();
  if (!text) return null;

  const q = raw.quantity;
  const u = raw.unit?.trim();
  if (q != null && Number.isFinite(q) && u) {
    return { name: text, category, quantity: q, unit: u };
  }
  if (q != null && Number.isFinite(q) && !u) {
    return { name: text, category, quantity: q, unit: 'x' };
  }

  return { name: text, category, quantity: 1, unit: 'x' };
}

function accumulate(acc: GroupAcc, c: Contribution, sub: string | null | undefined) {
  acc.subtexts.push(sub);
  if (c.kind === 'g') acc.grams += c.value;
  else if (c.kind === 'ml') acc.ml += c.value;
  else acc.pieces += c.value;
}

/**
 * Normalisiert Rohzeilen, gruppiert nach `name::category`, addiert in g / ml / x.
 */
/**
 * Eine Rohzeile → Totals in Basiseinheit (ohne Gruppierung mit anderen Zeilen).
 * Nutzt dieselbe Umrechnungslogik wie {@link preProcessItems}.
 */
export function singleRawItemToBase(raw: RawItem): { totalAmount: number; baseUnit: 'g' | 'ml' | 'x' } {
  const out = preProcessItems([raw]);
  if (out.length === 0) return { totalAmount: 1, baseUnit: 'x' };
  const g = out.find((o) => o.basis === 'g');
  const ml = out.find((o) => o.basis === 'ml');
  const x = out.find((o) => o.basis === 'x');
  if (g) return { totalAmount: g.amount, baseUnit: 'g' };
  if (ml) return { totalAmount: ml.amount, baseUnit: 'ml' };
  if (x) return { totalAmount: x.amount, baseUnit: 'x' };
  return { totalAmount: 1, baseUnit: 'x' };
}

export function preProcessItems(items: RawItem[]): ProcessedItem[] {
  const groups = new Map<string, GroupAcc>();

  for (const raw of items) {
    const row = parseRawToRows(raw);
    if (!row) continue;

    const nameKey = normalizeNameKey(row.name);
    if (!nameKey) continue;

    const groupKey = makeGroupKey(nameKey, row.category);
    let acc = groups.get(groupKey);
    if (!acc) {
      acc = {
        name: row.name.trim(),
        category: row.category,
        groupKey,
        grams: 0,
        ml: 0,
        pieces: 0,
        subtexts: [],
      };
      groups.set(groupKey, acc);
    }

    const contrib = rowToContribution(row.name, row.category, row.quantity, row.unit);
    accumulate(acc, contrib, raw.subtext);
  }

  const out: ProcessedItem[] = [];

  for (const acc of groups.values()) {
    const sub = mergeSubtexts(acc.subtexts);

    const hasG = acc.grams > 0;
    const hasMl = acc.ml > 0;
    const hasX = acc.pieces > 0;

    if (hasG) {
      out.push({
        name: acc.name,
        category: acc.category,
        groupKey: acc.groupKey,
        basis: 'g',
        amount: acc.grams,
        subtext: sub,
      });
    }
    if (hasMl) {
      out.push({
        name: acc.name,
        category: acc.category,
        groupKey: acc.groupKey,
        basis: 'ml',
        amount: acc.ml,
        subtext: sub,
      });
    }
    if (hasX) {
      out.push({
        name: acc.name,
        category: acc.category,
        groupKey: acc.groupKey,
        basis: 'x',
        amount: acc.pieces,
        subtext: sub,
      });
    }
  }

  return out;
}
