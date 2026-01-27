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
  'tiefkuhl',
  'sonstiges',
] as const;

const CategoryEnum = z.enum(CATEGORIES);

const AnalysisSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  estimatedPrice: z.number().min(0),
  category: CategoryEnum,
});

export type ShoppingItemAnalysis = z.infer<typeof AnalysisSchema>;

const JSON_FORMAT = `{
  "name": "Korrigierter Produktname (z.B. Tomaten)",
  "quantity": 1,
  "unit": "kg",
  "estimatedPrice": 2.49,
  "category": "obst_gemuese"
}`;

const SYSTEM_PROMPT = `Du bist ein Einkaufs-Assistent für deutsche Supermärkte.
Analysiere den User-Input. Aufgaben:
1. Tippfehler korrigieren.
2. Menge und Einheit extrahieren (quantity: Zahl, unit: z.B. "kg", "g", "Stück", "Packung", "l", "ml" – oder weglassen wenn unklar).
3. Preis schätzen (DE, typischer Supermarkt), in Euro als Zahl (estimatedPrice).
4. Kategorie wählen: genau eine von obst_gemuese, kuhlregal, fleisch, brot, haushalt, tiefkuhl, sonstiges.

Antworte NUR mit validem JSON, kein anderer Text. Format: ${JSON_FORMAT}`;

export async function analyzeShoppingItem(
  inputString: string
): Promise<{ data?: ShoppingItemAnalysis; error?: string }> {
  const trimmed = (inputString ?? '').trim().slice(0, 500);
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

    const parsed = AnalysisSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: 'KI-Antwort hat falsches Format.' };
    }

    return { data: parsed.data };
  } catch (e) {
    console.error('[shopping-list-ai]', e);
    return {
      error: e instanceof Error ? e.message : 'Fehler bei der Analyse. Bitte erneut versuchen.',
    };
  }
}
