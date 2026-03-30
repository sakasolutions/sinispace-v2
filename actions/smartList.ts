'use server';

import { z } from 'zod';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { normalizeShoppingQuantityFields } from '@/lib/shopping-piece-quantity';
import { normalizeSmartCartCategory, type ShoppingCategory } from '@/lib/shopping-list-categories';
import { isUserPremium } from '@/lib/subscription';

const SMART_LIST_SYSTEM = `Du bist 'SiniSpace', eine smarte KI für Supermarkt-Einkaufslisten. 
Du erhältst ein Array mit Zutaten, deren Mengen bereits mathematisch perfekt berechnet wurden (oft in g oder ml).

DEINE AUFGABE (DIE SUPERMARKT-ÜBERSETZUNG):
1. GEBINDE SCHNÜREN: Wandle nackte Gewichte (g, ml) in realistische deutsche Supermarkt-Gebinde um (z.B. Becher, Pck., Glas, Dose, Fl., x). 
   - Beispiel: 700g Haferflocken -> Angenommen 1 Pck = 500g -> Es MÜSSEN 2 Pck. gekauft werden (immer aufrunden!).
2. UX-TRANSPARENZ IM SUBTEXT (WICHTIG!): Der User muss wissen, wie viel er eigentlich für das Rezept braucht. Wenn du eine Gramm/ml-Zahl in ein Gebinde umwandelst, schreibe den ursprünglichen Bedarf VORNE in den Subtext.
   - Format: "Bedarf: [Ursprüngliche Menge] | [Bisheriger Subtext]"
   - Beispiel: Aus {amount: 700, unit: "g", name: "Haferflocken", subtext: "Für Porridge"} WIRD {amount: 2, unit: "Pck.", name: "Haferflocken", subtext: "Bedarf: 700g | Für Porridge"}
3. AUSNAHMEN: Frisches Gemüse/Obst (z.B. 3 Tomaten) oder simple Stückzahlen lässt du einfach so, wie sie sind.
4. NAMEN BEREINIGEN: Halte die Namen sauber und generisch (Aus "Nüsse (z.B. Walnüsse)" wird "Walnüsse").

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt, das ein Array namens "items" enthält:
{
  "items": [
    { "amount": 2, "unit": "Pck.", "name": "Haferflocken", "subtext": "Bedarf: 700g | Für Porridge" }
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
 * Smart Liste: Supermarkt-Gebinde aus voraggregierten g/ml; Subtext mit Bedarf-Transparenz.
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

    console.log('[smartList] optimizeSmartCart OK, ausgehende Zeilen:', out.length);
    return { data: out };
  } catch (e) {
    console.error('[smartList] optimizeSmartCart', e);
    return {
      error: e instanceof Error ? e.message : 'Optimierung fehlgeschlagen. Bitte erneut versuchen.',
    };
  }
}
