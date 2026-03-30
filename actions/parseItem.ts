'use server';

import { z } from 'zod';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { normalizeSmartCartCategory, type ShoppingCategory } from '@/lib/shopping-list-categories';
import { isUserPremium } from '@/lib/subscription';

const PARSE_SINGLE_SYSTEM = `Du bist ein präziser Converter für Supermarkt-Eingaben. Der User gibt EINE Zutat ein.
DEINE AUFGABEN:
1. BASISEINHEIT: Wandle in (g, ml, x) um. (1 Pck=500g, 1 Becher=200g, 1 L=1000ml).
2. KEINE HALLUZINATIONEN: Erfinde NIEMALS Rezepte oder Verwendungszwecke! Das Feld "subtext" MUSS zwingend leer ("") bleiben.
3. KATEGORIEN: Du MUSST das Item in exakt EINE dieser fixen Kategorien einordnen:
   "Obst & Gemüse", "Kühlregal", "Fleisch & Fisch", "Vorratsschrank", "Backwaren", "Getränke", "Haushalt", "Sonstiges".
   (Beispiel: Haferflocken = Vorratsschrank, NICHT Haushalt!).
4. NAME: Sauber und generisch (Aus "2x frische Tomaten" wird "Tomaten").

Antworte AUSSCHLIESSLICH als JSON-Objekt:
{
  "name": "Tomaten",
  "amount": 2,
  "unit": "x",
  "category": "Obst & Gemüse",
  "subtext": ""
}`;

const OutputSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number(),
  unit: z.enum(['g', 'ml', 'x']),
  category: z.string(),
  /** Modell darf nur "" liefern; alles andere wird serverseitig verworfen. */
  subtext: z.string().optional().transform(() => ''),
});

export type ParsedSingleItem = {
  name: string;
  amount: number;
  unit: 'g' | 'ml' | 'x';
  category: ShoppingCategory;
};

function stripMarkdownCodeFence(content: string): string {
  let s = content.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (m) s = m[1]!.trim();
  return s;
}

/**
 * Parst eine einzelne Einkaufszeile in Basiseinheiten (g, ml, x) per gpt-4o-mini.
 */
export async function parseSingleItem(
  inputString: string
): Promise<{ data?: ParsedSingleItem; error?: string }> {
  const trimmed = (inputString ?? '').trim().slice(0, 800);
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
          { role: 'system', content: PARSE_SINGLE_SYSTEM },
          { role: 'user', content: trimmed },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      },
      'shopping-list',
      'Parse Single Item'
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

    const parsed = OutputSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: 'KI-Antwort hat falsches Format.' };
    }

    const category = normalizeSmartCartCategory(parsed.data.category);

    return {
      data: {
        name: parsed.data.name.trim(),
        amount: parsed.data.amount,
        unit: parsed.data.unit,
        category,
      },
    };
  } catch (e) {
    console.error('[parseSingleItem]', e);
    return {
      error: e instanceof Error ? e.message : 'Parsen fehlgeschlagen.',
    };
  }
}
