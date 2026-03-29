'use server';

import { z } from 'zod';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { normalizeShoppingQuantityFields } from '@/lib/shopping-piece-quantity';
import { normalizeSmartCartCategory, type ShoppingCategory } from '@/lib/shopping-list-categories';
import { isUserPremium } from '@/lib/subscription';

const SMART_LIST_SYSTEM = `Du bist 'SiniSpace', eine smarte KI für Supermarkt-Einkaufslisten. 
Der User übergibt dir ein JSON-Array mit seinen aktuellen Zutaten.

DEINE REGELN FÜR DIE OPTIMIERUNG:
1. AGGREGIEREN & GEBINDE: Fasse gleiche Zutaten zusammen. Wandle reine Gewichte (g, ml) in realistische deutsche Supermarkt-Gebinde um (z.B. Becher, Pck., Glas, Dose, Fl., x).
2. DER KONFLIKT-LÖSER (x vs. g/ml): Wenn eine Zutat sowohl als Stückzahl ("x") als auch als Gewicht vorkommt (z.B. "2x Joghurt" und "400g Joghurt"), MUSST du eine Standard-Gebindegröße annehmen (z.B. 1 Becher = 200g oder 500g, 1 Pck. = 200g). 
   - Rechne die benötigten Gramm in Stückzahlen um und addiere sie zu den manuellen Stückzahlen.
   - Beispiel: 2x Joghurt + 400g Joghurt -> Angenommen 1 Becher = 200g -> 400g sind 2 Becher. Gesamt: 4 Becher Joghurt.
3. TRANSPARENZ IM SUBTEXT: Kombiniere die 'subtext' Felder (Rezepte). WENN du eine Annahme zur Gebindegröße getroffen hast, füge das zwingend am Ende des Subtexts in Klammern hinzu!
   - Beispiel-Subtext: "Für Porridge, Lasagne (Angenommen: 200g / Becher)"
4. NAMEN BEREINIGEN: Halte die Namen sauber und generisch (Aus "Nüsse (z.B. Walnüsse)" wird "Walnüsse").

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt, das ein Array namens "items" enthält:
{
  "items": [
    { "amount": 4, "unit": "Becher", "name": "Griechischer Joghurt", "subtext": "Für Rezept A (Angenommen: 200g / Becher)" },
    { "amount": 1, "unit": "Pck.", "name": "Walnüsse", "subtext": "Für Rezept B (Angenommen: 200g / Pck.)" }
  ]
}`;

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
 * Smart Liste: Einkaufsliste per KI optimieren (Gebinde, x vs. g/ml, Subtext).
 */
export async function optimizeSmartCart(
  items: unknown[]
): Promise<{ data?: OptimizedCartLine[]; error?: string }> {
  const sanitized = sanitizeCartItems(items);
  if (sanitized.length === 0) {
    return { error: 'Keine Artikel zum Optimieren.' };
  }

  const allowed = await isUserPremium();
  if (!allowed) {
    return { error: 'PREMIUM_REQUIRED' };
  }

  const userPayload = JSON.stringify(sanitized);

  try {
    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SMART_LIST_SYSTEM },
          {
            role: 'user',
            content: `Hier ist die Einkaufsliste als JSON-Array (Felder: text, quantity, unit, category optional, subtext optional):\n\n${userPayload}`,
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

    return { data: out };
  } catch (e) {
    console.error('[smartList] optimizeSmartCart', e);
    return {
      error: e instanceof Error ? e.message : 'Optimierung fehlgeschlagen. Bitte erneut versuchen.',
    };
  }
}
