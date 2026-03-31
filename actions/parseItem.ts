'use server';

import { z } from 'zod';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { normalizeSmartCartCategory, type ShoppingCategory } from '@/lib/shopping-list-categories';
import { isUserPremium } from '@/lib/subscription';

function buildParseSingleSystemPrompt(existingNames: string[]): string {
  const namesList = existingNames.length === 0 ? '(keine)' : existingNames.join(', ');
  return `Du bist ein dummer, aber präziser Einheiten-Konverter. Der User gibt eine Zutat ein (z.B. "2 Pck. Haferflocken" oder "Tomaten").
DEINE EINZIGE AUFGABE: Wandle die Eingabe in Basiseinheiten (g, ml, x) um.

Masse (Pck, Becher, Glas) -> in "g" umwandeln (1 Pck=500g, 1 Becher=200g).

Volumen (Liter, Flasche) -> in "ml" umwandeln (1 L=1000ml).

Zählbares -> "x".

Kategorie: Ordne es in exakt eine dieser Supermarkt-Kategorien ein: "Obst & Gemüse", "Kühlregal", "Fleisch & Fisch", "Vorratsschrank", "Backwaren", "Getränke", "Haushalt", "Sonstiges".
ERFINDE NIEMALS REZEPTE.

WICHTIGE NAMENS-REGEL:
Halte den Namen sauber, ABER lösche NIEMALS Wörter, die den Verarbeitungszustand oder die Art des Produkts beschreiben (z.B. "Dose", "Passiert", "Gehackt", "TK", "Getrocknet").
- Eingabe "1 Dose Tomaten" -> name: "Dosentomaten" (NICHT nur "Tomaten").
- Eingabe "Passierte Tomaten" -> name: "Passierte Tomaten".
- Eingabe "2x frische Tomaten" -> name: "Tomaten".

Du erhältst als Kontext eine Liste von Zutaten, die BEREITS auf der Liste stehen: [${namesList}].
SMART SUGGESTION REGEL (WICHTIG):
1. Der "name" MUSS immer exakt das abbilden, was der User eingegeben hat (bereinigt). Ändere NIEMALS den "name", nur weil er einem existierenden Item ähnelt! (Wenn der User "Griechischer Joghurt" eingibt, bleibt der name "Griechischer Joghurt").
2. WENN es eine Ähnlichkeit gibt (z.B. User tippt "Griechischer Joghurt", es existiert aber "Joghurt"), dann fülle das Feld "suggestedMergeTarget" mit dem exakten existierenden Namen (z.B. "Joghurt").
3. Wenn es keine Ähnlichkeit gibt, lass "suggestedMergeTarget" leer ("").

Beispiel-Ausgabe für Eingabe "Griechischer Joghurt" (wenn "Joghurt" schon existiert):
{ "name": "Griechischer Joghurt", "amount": 1, "unit": "x", "category": "Kühlregal", "suggestedMergeTarget": "Joghurt" }

Antworte AUSSCHLIESSLICH als JSON:
{ "name": "Joghurt", "amount": 2, "unit": "x", "category": "Kühlregal", "suggestedMergeTarget": "Griechischer Joghurt" }`;
}

const OutputSchema = z.object({
  name: z.string().min(1),
  amount: z.coerce.number(),
  unit: z.enum(['g', 'ml', 'x']),
  category: z.string(),
  suggestedMergeTarget: z
    .string()
    .optional()
    .nullable()
    .transform((s) => (s == null ? '' : String(s).trim())),
});

export type ParsedSingleItem = {
  name: string;
  amount: number;
  unit: 'g' | 'ml' | 'x';
  category: ShoppingCategory;
  suggestedMergeTarget?: string;
};

function stripMarkdownCodeFence(content: string): string {
  let s = content.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (m) s = m[1]!.trim();
  return s;
}

/**
 * Parst eine einzelne Einkaufszeile in Basiseinheiten (g, ml, x) per gpt-4o-mini.
 * @param existingNames Namen der aktuell auf der Liste (für Smart-Suggestion-Vorschläge).
 */
export async function parseSingleItem(
  inputString: string,
  existingNames: string[] = []
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
    const systemPrompt = buildParseSingleSystemPrompt(existingNames);
    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
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

    if (raw && typeof raw === 'object' && raw !== null) {
      const o = raw as Record<string, unknown>;
      delete o.subtext;
      delete o.recipeSubtext;
    }

    const parsed = OutputSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: 'KI-Antwort hat falsches Format.' };
    }

    const category = normalizeSmartCartCategory(parsed.data.category);
    const suggestion = parsed.data.suggestedMergeTarget;

    const out: ParsedSingleItem = {
      name: parsed.data.name.trim(),
      amount: parsed.data.amount,
      unit: parsed.data.unit,
      category,
    };
    if (suggestion) {
      out.suggestedMergeTarget = suggestion;
    }

    return { data: out };
  } catch (e) {
    console.error('[parseSingleItem]', e);
    return {
      error: e instanceof Error ? e.message : 'Parsen fehlgeschlagen.',
    };
  }
}
