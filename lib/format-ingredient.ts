import { parseIngredient as parseIngredientSmartCart } from '@/lib/ingredient-parser';

/**
 * Parst einen Zutaten-String (Rezept-Anzeige, Portionsskalierung) — gleiche Logik wie SmartCart.
 */
export function parseIngredient(ingredient: string): {
  amount: number | null;
  unit: string;
  name: string;
  original: string;
} {
  const p = parseIngredientSmartCart(ingredient);
  return {
    amount: p.amount,
    unit: p.unit ?? '',
    name: p.name || ingredient.trim(),
    original: ingredient,
  };
}

/** Gängige Dezimalzahlen → Bruch (für Anzeige); 1.5, 2.5 etc. entstehen über wholePart + 0.5 */
const FRACTION_MAP: Array<{ value: number; label: string }> = [
  { value: 0.25, label: '1/4' },
  { value: 0.33, label: '1/3' },
  { value: 0.5, label: '1/2' },
  { value: 0.67, label: '2/3' },
  { value: 0.75, label: '3/4' },
].sort((a, b) => b.value - a.value);

function amountToFractionOrDecimal(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const fractionalPart = rounded % 1;
  const wholePart = Math.floor(rounded);

  for (const { value, label } of FRACTION_MAP) {
    if (Math.abs(fractionalPart - value) < 0.04) {
      return wholePart >= 1 ? `${wholePart} ${label}` : label;
    }
  }
  // Max. 1 Nachkommastelle, Komma (Deutsch)
  const oneDecimal = Math.round(rounded * 10) / 10;
  const str = oneDecimal.toString(10).replace('.', ',');
  return str;
}

/**
 * Formatiert Menge (+ optional Einheit) für die Anzeige.
 * - Bruche für 0.25, 0.5, 0.75, 1.5, 0.33, 0.67 etc.
 * - Sonst max. 1 Nachkommastelle mit Komma.
 * - Dirty Fix: Wenn unit 'g' ist und name mit 'roße' oder 'leine' beginnt, Einheit verstecken.
 */
export function formatIngredientAmount(
  amount: number,
  unit?: string | null,
  name?: string
): string {
  const amountStr = amountToFractionOrDecimal(amount);
  let effectiveUnit = unit?.trim() || '';

  // Dirty Fix: "1 g roße Zwiebel" → Einheit "g" verstecken (Adjektiv wurde fälschlich als Einheit geparst)
  if (effectiveUnit === 'g' && name && /^(roße|leine|rote|gelbe)\s/i.test(name)) {
    effectiveUnit = '';
  }

  if (!effectiveUnit) {
    return amountStr;
  }
  return `${amountStr} ${effectiveUnit}`;
}

/**
 * Formatiert einen kompletten Zutaten-String für die Anzeige (Menge + Einheit + Name mit Brüchen).
 * z.B. "0.5 große Zwiebel" → "1/2 große Zwiebel", "100 g Mehl" → "100 g Mehl"
 */
export function formatIngredientDisplay(ingredient: string): string {
  const parsed = parseIngredient(ingredient);
  if (parsed.amount === null) {
    return ingredient;
  }
  const prefix = formatIngredientAmount(parsed.amount, parsed.unit, parsed.name);
  return `${prefix} ${parsed.name}`.trim();
}
