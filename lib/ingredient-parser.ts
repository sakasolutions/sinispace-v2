/**
 * Zentrale Zutaten-Zeilen-Parsing für SmartCart (manuelle Eingabe, Rezept-Transfer, Fallback).
 * Mengenlogik: {@link parseShoppingFallbackLine} in shopping-piece-quantity (inkl. Brüche, Einheiten).
 */

import { formatShoppingQtyLabel, parseShoppingFallbackLine } from '@/lib/shopping-piece-quantity';

export type ParsedIngredient = {
  amount: number | null;
  unit: string | null;
  name: string;
  /** Label wie in der Mengen-Pille (z. B. "1/4 Tasse" → de-Format über formatShoppingQtyLabel). */
  formattedAmountUnit: string;
};

/** Minimales Ergebnis nach Parse, vor Supermarkt-Normierung (Rezept → SmartCart). */
export type IngredientQuantityFields = {
  amount: number | null;
  unit: string | null;
  name: string;
};

/** Koch-/Rezept-Einheiten → vor dem Schreiben in den SmartCart zu Einkaufs-Logik normieren. */
const CULINARY_UNIT_KEYS = new Set([
  'el',
  'tl',
  'tasse',
  'tassen',
  'prise',
  'spritzer',
  'zehe',
  'zehen',
]);

function normalizedUnitKey(unit: string | null | undefined): string | null {
  if (unit == null) return null;
  const t = unit.trim().toLowerCase().replace(/\.+$/g, '');
  return t || null;
}

/**
 * Rezept-Zutaten für den Supermarkt: Koch-Einheiten (EL, TL, Tasse, …) werden auf ein kaufbares
 * Minimum normiert (`1` + `x` bzw. bei Knoblauchzehen `Knolle`). Echte Handelseinheiten bleiben unverändert.
 */
export function convertToShoppingUnit(parsed: IngredientQuantityFields): IngredientQuantityFields {
  const key = normalizedUnitKey(parsed.unit);
  if (key == null || !CULINARY_UNIT_KEYS.has(key)) {
    return parsed;
  }

  const name = parsed.name.trim();

  if (key === 'zehe' || key === 'zehen') {
    if (/knoblauch/i.test(name)) {
      return { amount: 1, unit: 'Knolle', name: 'Knoblauch' };
    }
  }

  return { amount: 1, unit: 'x', name: name || parsed.name };
}

/**
 * Zerlegt eine Roheingabezeile in Menge, Einheit und Produktnamen (SmartCart-kanonisch).
 */
export function parseIngredient(rawInput: string): ParsedIngredient {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { amount: null, unit: null, name: '', formattedAmountUnit: '' };
  }

  const parsed = parseShoppingFallbackLine(trimmed);
  if (parsed) {
    return {
      amount: parsed.quantity,
      unit: parsed.unit,
      name: parsed.name,
      formattedAmountUnit: formatShoppingQtyLabel(parsed.quantity, parsed.unit),
    };
  }

  return {
    amount: null,
    unit: null,
    name: trimmed,
    formattedAmountUnit: '',
  };
}
