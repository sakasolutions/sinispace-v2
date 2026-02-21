'use server';

import { z } from 'zod';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { isUserPremium } from '@/lib/subscription';

const CATEGORIES = [
  'obst_gemuese',
  'kuhlregal',
  'fleisch',
  'brot',
  'haushalt',
  'getraenke',
  'tiefkuhl',
  'sonstiges',
] as const;

const CategoryEnum = z.enum(CATEGORIES);

const ItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().nullable().optional(),
  unit: z.string().nullable().optional(),
  category: z.string(),
});

const OutputSchema = z.object({
  items: z.array(ItemSchema),
});

export type ShoppingItemAnalysis = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: (typeof CATEGORIES)[number];
};

const CATEGORY_LIST = CATEGORIES.join(', ');

const JSON_FORMAT = `{
  "items": [
    { "name": "Korrigierter Produktname", "quantity": null, "unit": null, "category": "obst_gemuese" }
  ]
}`;

const SYSTEM_PROMPT = `Du bist ein Einkaufs-Assistent für deutsche Supermärkte.
Analysiere den User-Input, der aus einem oder mehreren Artikeln bestehen kann (z.B. eine WhatsApp-Liste, Zeilen oder Komma-getrennt).

Aufgaben:
1. Rechtschreibung: Korrigiere Tippfehler NUR, wenn du dir zu 99% sicher bist.
   Wenn ein Wort wie eine spezifische Zutat aus einer anderen Küche aussieht (z.B. Kusbasi, Sucuk, Pak Choi, Mochi, Halloumi, Harissa, Tahini), behalte das Originalwort bei. Ändere es NICHT in ein ähnliches deutsches Wort.

2. Menge und Einheit NUR übernehmen, wenn der User sie ausdrücklich angibt:
   - "3 Tomaten" oder "2x Milch" → quantity: 3 bzw. 2, unit: "Stk" oder leer.
   - "500g Hack" → quantity: 500, unit: "g".
   - Wenn der User KEINE Menge angibt (z.B. nur "Milch", "Brot"), setze quantity: null und unit: null. Erfinde KEINE Standard-Menge.

3. Kategorie: für jeden Artikel genau eine wählen. Erlaubt sind NUR: ${CATEGORY_LIST}.

Antworte NUR mit validem JSON, kein anderer Text. Gib IMMER ein Array von Objekten zurück, auch bei nur einem Artikel.
Format: ${JSON_FORMAT}`;

function normalizeCategory(category: string): (typeof CATEGORIES)[number] {
  const lower = category?.trim().toLowerCase() ?? '';
  if (CategoryEnum.safeParse(lower).success) {
    return lower as (typeof CATEGORIES)[number];
  }
  return 'sonstiges';
}

export async function analyzeShoppingItems(
  inputString: string
): Promise<{ data?: ShoppingItemAnalysis[]; error?: string }> {
  const trimmed = (inputString ?? '').trim().slice(0, 2000);
  if (!trimmed) {
    return { error: 'Leerer Eingabetext.' };
  }

  const allowed = await isUserPremium();
  if (!allowed) {
    return { error: 'PREMIUM_REQUIRED' };
  }

  try {
    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analysiere diesen Einkaufs-Input:\n\n"${trimmed}"` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      },
      'shopping-list',
      'Einkaufslisten'
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { error: 'Keine Antwort von der KI erhalten.' };
    }

    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      return { error: 'Ungültiges JSON von der KI.' };
    }

    const parsed = OutputSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: 'KI-Antwort hat falsches Format.' };
    }

    const items: ShoppingItemAnalysis[] = parsed.data.items.map((item) => ({
      name: item.name.trim(),
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      category: normalizeCategory(item.category),
    }));

    if (items.length === 0) {
      return { error: 'KI hat keine Artikel zurückgegeben.' };
    }

    return { data: items };
  } catch (e) {
    console.error('[shopping-list-ai]', e);
    return {
      error: e instanceof Error ? e.message : 'Fehler bei der Analyse. Bitte erneut versuchen.',
    };
  }
}

/** @deprecated Nutze analyzeShoppingItems. Liefert nur das erste Item für Abwärtskompatibilität. */
export async function analyzeShoppingItem(
  inputString: string
): Promise<{ data?: ShoppingItemAnalysis; error?: string }> {
  const res = await analyzeShoppingItems(inputString);
  if (res.error) return { error: res.error };
  if (res.data?.length) return { data: res.data[0] };
  return { error: 'KI hat keine Artikel zurückgegeben.' };
}
