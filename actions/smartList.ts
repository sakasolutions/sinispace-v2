'use server';

import { z } from 'zod';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { normalizeShoppingQuantityFields } from '@/lib/shopping-piece-quantity';
import { normalizeSmartCartCategory, type ShoppingCategory } from '@/lib/shopping-list-categories';
import { isUserPremium } from '@/lib/subscription';
import { preProcessItems, type RawItem } from '@/lib/smartList/preProcessor';

const SMART_LIST_SYSTEM = `Du bist 'SiniSpace', eine KI für Supermarkt-Einkaufslisten.

WICHTIG — KEINE MATHEMATIK:
Die Mengen wurden bereits serverseitig korrekt addiert und in Basiseinheiten überführt. Jedes Listenelement enthält:
- basis: "g" (Gramm), "ml" (Milliliter) oder "x" (Stück)
- amount: die ENDGÜLTIGE Summe in genau dieser Einheit
Du darfst KEINE Addition, Subtraktion, Multiplikation oder Division durchführen und keine Zahlen aus verschiedenen Zeilen oder Einheiten kombinieren. Vertraue ausschließlich den übergebenen amount-Werten.

DEINE AUFGABE (NUR ÜBERSETZUNG & UX):
1. SUPERMARKT-GEBINDE: Für basis "g" oder "ml" übersetze den Bedarf in realistische deutsche Gebinde (z. B. Pck., Becher, Dose, Glas, Fl.). Wähle eine plausible Standard-Gebindegröße und rechne nur so um, dass die KAUfmenge mindestens den angegebenen Bedarf deckt — immer AUFRUNDEN (Ceiling), nie abrunden.
2. SUBTEXT: Bei basis "g" oder "ml" beginne den Subtext mit dem echten Rezeptbedarf, z. B. "Bedarf: 700g | …" bzw. "Bedarf: 500ml | …", gefolgt vom bisherigen Kontext aus dem Feld subtext (Rezepte), getrennt mit " | ".
3. BASIS "x": Stückzahlen (z. B. Tomaten) unverändert lassen; nur Namen bereinigen und Subtext sinnvoll übernehmen.
4. NAMEN: Kurz, generisch, ohne Zusatzklammern wo möglich (z. B. "Walnüsse" statt "Nüsse (z. B. Walnüsse)").

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt mit einem Array "items":
{
  "items": [
    { "amount": 2, "unit": "Pck.", "name": "Haferflocken", "subtext": "Bedarf: 700g | Für Porridge", "category": "haushalt" }
  ]
}
Nutze pro Zeile die passende category aus der Eingabe (oder sinnvoll ableiten).`;

const OptimizeOutputSchema = z.object({
  items: z.array(
    z.object({
      amount: z.coerce.number().nullable().optional(),
      unit: z.string(),
      name: z.string().min(1),
      subtext: z.string().nullable().optional(),
      category: z.string().nullable().optional(),
    })
  ),
});

export type OptimizedCartLine = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: ShoppingCategory;
  recipeSubtext?: string;
};

function stripMarkdownCodeFence(content: string): string {
  let s = content.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (m) s = m[1]!.trim();
  return s;
}

function sanitizeCartItems(items: unknown[]) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x))
    .map((i) => {
      const text = typeof i.text === 'string' ? i.text.trim() : '';
      let quantity: number | null = null;
      if (typeof i.quantity === 'number' && Number.isFinite(i.quantity)) {
        quantity = i.quantity;
      } else if (i.quantity === null) {
        quantity = null;
      }
      const unitRaw = i.unit;
      const unit =
        unitRaw === null || unitRaw === undefined
          ? null
          : String(unitRaw).trim() || null;
      const category = typeof i.category === 'string' ? i.category : undefined;
      const subRaw = i.subtext;
      const subtext =
        subRaw === null || subRaw === undefined ? null : String(subRaw);
      return { text, quantity, unit, category, subtext };
    })
    .filter((i) => i.text.length > 0)
    .slice(0, 120);
}

/**
 * Smart Liste: Hybrid — `preProcessItems` aggregiert Mengen deterministisch; die KI übersetzt nur in Gebinde.
 */
export async function optimizeSmartCart(
  items: unknown[]
): Promise<{ data?: OptimizedCartLine[]; error?: string }> {
  console.log('[smartList] optimizeSmartCart aufgerufen, Roh-Items:', Array.isArray(items) ? items.length : 'kein Array');

  const sanitized = sanitizeCartItems(items);
  console.log('[smartList] sanitizeCartItems →', sanitized.length, 'Zeilen');

  if (sanitized.length === 0) {
    return { error: 'Keine Artikel zum Optimieren.' };
  }

  const allowed = await isUserPremium();
  if (!allowed) {
    return { error: 'PREMIUM_REQUIRED' };
  }

  const rawItems: RawItem[] = sanitized.map((i) => ({
    text: i.text,
    quantity: i.quantity,
    unit: i.unit,
    category: i.category,
    subtext: i.subtext,
  }));

  const processedItems = preProcessItems(rawItems);
  if (processedItems.length === 0) {
    return { error: 'Keine Artikel zum Optimieren.' };
  }

  const llmPayload = processedItems.map(({ name, category, basis, amount, subtext }) => ({
    name,
    category,
    basis,
    amount,
    subtext,
  }));
  const userPayload = JSON.stringify(llmPayload);

  try {
    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SMART_LIST_SYSTEM },
          {
            role: 'user',
            content: `Hier ist die voraggregierte Einkaufsliste (JSON). Jedes Objekt hat: name, category, basis ("g" | "ml" | "x"), amount (bereits summiert — NICHT neu berechnen oder mit anderen Zeilen verknüpfen), subtext (optional, Rezeptkontext).\n\n${userPayload}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      },
      'shopping-list',
      'SmartCart Smart Liste'
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { error: 'Keine Antwort von der KI erhalten.' };
    }

    let raw: unknown;
    try {
      raw = JSON.parse(stripMarkdownCodeFence(content));
    } catch {
      return { error: 'Ungültiges JSON von der KI.' };
    }

    const parsed = OptimizeOutputSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: 'KI-Antwort hat falsches Format.' };
    }

    const out: OptimizedCartLine[] = parsed.data.items.map((row) => {
      const q = row.amount != null && Number.isFinite(row.amount) ? row.amount : null;
      const norm = normalizeShoppingQuantityFields({
        name: row.name.trim(),
        quantity: q,
        unit: row.unit?.trim() || null,
      });
      const category = normalizeSmartCartCategory(row.category);
      const st = row.subtext?.trim();
      return {
        name: norm.name,
        quantity: norm.quantity,
        unit: norm.unit,
        category,
        ...(st ? { recipeSubtext: st } : {}),
      };
    });

    if (out.length === 0) {
      return { error: 'KI hat keine optimierte Liste zurückgegeben.' };
    }

    console.log('[smartList] optimizeSmartCart OK, ausgehende Zeilen:', out.length);
    return { data: out };
  } catch (e) {
    console.error('[smartList] optimizeSmartCart', e);
    return {
      error: e instanceof Error ? e.message : 'Optimierung fehlgeschlagen. Bitte erneut versuchen.',
    };
  }
}
