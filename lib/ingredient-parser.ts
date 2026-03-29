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
