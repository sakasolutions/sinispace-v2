'use server';

import { z } from 'zod';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { normalizeShoppingQuantityFields } from '@/lib/shopping-piece-quantity';
import { normalizeSmartCartCategory, type ShoppingCategory } from '@/lib/shopping-list-categories';
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

const SYSTEM_PROMPT = `Du bist ein hochpräziser Einkaufs-Assistent für deutsche Supermärkte. Deine EINZIGE Aufgabe ist es, einen Text mit Einkaufsartikeln in ein JSON-Array zu übersetzen.
REGELN:

ABSOLUTE REGEL: Erstelle für JEDEN eindeutigen Artikel im Text EXAKT EIN EINZIGES JSON-Objekt. Keine Duplikate! Wenn der User 'Spüli, Eier' schreibt, darf das Array EXAKT ZWEI Objekte enthalten.

Mengen-Zusammenfassung: Wenn der User schreibt 'Bier, Bier, Bier', gib EIN Objekt mit name: 'Bier', quantity: 3, unit: 'x' zurück (Stückzahl immer unit exakt 'x', nie 'Stk' oder 'Stück').

Stückzahlen (zwingend unit 'x'):
- Schreibweisen wie '2x Tomaten', '2 x Tomaten', '2 stk …', '2 Stück …', '2 st …' (nach der Zahl) sind Stückzahlen: quantity = Zahl, unit = 'x', name = Produktname ohne Mengen-Präfix.
- Steht nur eine Zahl vor dem Namen und es handelt sich NICHT um Gewicht, Volumen, Gebinde oder Rezept-Einheit (kein g, kg, ml, l, Packung, Flasche, Dose, Glas, EL, TL, Bund, Zehe, Liter, Milliliter, Prise direkt nach der Zahl bzw. als Einheit), dann ist das Stückzahl: quantity = Zahl, unit = 'x', name = Produktname.
- Gewicht: Gramm immer unit exakt 'g', Kilogramm immer unit exakt 'kg' (inkl. Synonyme wie gr, gramm, kilo).
- Volumen: Milliliter immer 'ml', Liter immer 'l' (Synonyme milliliter, liter).
- Gebinde / typische Einheiten (kanonisch so in 'unit'): Packung/Pck./Päckchen → 'Pck.'; Flasche/fl → 'Fl.'; Dose → 'Dose'; Glas → 'Glas'.
- Rezept: Esslöffel/el → 'EL', Teelöffel/tl → 'TL', Bund → 'Bund', Zehe(n)/Knoblauchzehe → 'Zehe'.
- Diese 'unit'-Strings exakt verwenden; niemals durch 'x' oder g/kg ersetzen, wenn die Menge zur Einheit gehört.

Rechtschreibung: Korrigiere Tippfehler NUR, wenn du dir zu 99% sicher bist. Exoten (wie Sucuk, Pak Choi) nicht eindeutschen.

Mengen: Wenn KEINE Menge genannt wird (z.B. nur 'Milch'), setze quantity: null und unit: null.

Kategorie: Du DARFST NUR EINE dieser exakten Kategorien wählen: obst_gemuese, kuhlregal, fleisch, brot, haushalt, getraenke, tiefkuhl, sonstiges.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt, das ein Array 'items' enthält.
FORMAT: { "items": [ { "name": "...", "quantity": null, "unit": null, "category": "..." } ] }`;

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
        temperature: 0,
      },
      'shopping-list',
      'SmartCart'
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

    const items: ShoppingItemAnalysis[] = parsed.data.items.map((item) => {
      const category = normalizeCategory(item.category);
      const norm = normalizeShoppingQuantityFields({
        name: item.name.trim(),
        quantity: item.quantity ?? null,
        unit: item.unit ?? null,
      });
      return { ...norm, category };
    });

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

// ─── Smart Liste: semantischer Merge + Supermarkt-Gebinde (offene Cart-Positionen) ───

export type SmartCartOptimizeInputItem = {
  text: string;
  quantity: number | null;
  unit: string | null;
  category?: string;
  subtext?: string | null;
};

export type OptimizedCartLine = {
  name: string;
  quantity: number | null;
  unit: string | null;
  category: ShoppingCategory;
  recipeSubtext?: string;
};

const SMART_MERGE_OUTPUT = z.object({
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

const SMART_MERGE_SYSTEM = `Du bist SiniSpace, eine smarte KI für Supermarkt-Einkäufe.
Der User übergibt dir ein JSON-Array seiner Einkaufsliste (offene Positionen). Einige Zutaten sind doppelt, aber mit unterschiedlichen Einheiten (z.B. "1x Joghurt" und "200g Joghurt").

Jedes Eingabeobjekt hat: text (Produktname), quantity (Zahl oder null), unit (String oder null), category (optional), subtext (optional, z.B. Rezept-Herkunft).

Deine Aufgabe:
1. AGGREGIEREN: Erkenne semantisch gleiche Zutaten und addiere sie logisch. (Hinweis: Gehe bei "1x" oder "1 Portion" von handelsüblichen Durchschnittsgrößen aus, z.B. 1x Joghurt = ca. 200g-500g, 1x Nüsse = ca. 100g-200g).
2. GEBINDE-LOGIK: Wandle die aggregierten Mengen in realistische deutsche Supermarkt-Gebinde um (z.B. Pck., Becher, Glas, Fl., Dose, x).
   Beispiel: Aus "1x Joghurt" und "200g Joghurt" kann "2 Becher Griechischer Joghurt" werden.
   Beispiel: Aus "1x Nüsse" und "50g Nüsse" kann "1 Pck. Nüsse" werden.
3. SUBTEXT MERGEN: Wenn du Items zusammenfasst, kombiniere ihre "subtext"-Felder (kommagetrennt, keine Duplikate), damit der User weiß, für welche Rezepte die Zutat gedacht ist.
4. KATEGORIE: Pro Ausgabezeile setze "category" auf genau eine dieser Schlüssel: obst_gemuese, kuhlregal, fleisch, brot, haushalt, getraenke, tiefkuhl, sonstiges. Übernimm sinnvoll aus den Eingaben oder wähle passend.

Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt der Form:
{ "items": [ { "amount": 2, "unit": "Becher", "name": "Griechischer Joghurt", "subtext": "Für Rezept A, Rezept B", "category": "kuhlregal" } ] }
Das Feld "amount" ist die Stückzahl/Menge als Zahl (bei Bedarf Dezimal); "unit" ist die Einheit wie im Supermarkt (z.B. Becher, Pck., Fl., x).`;

function stripMarkdownCodeFence(content: string): string {
  let s = content.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(s);
  if (m) s = m[1]!.trim();
  return s;
}

/**
 * KI: semantisches Zusammenführen inkl. Einheiten-Mix und Gebinde-Optimierung (Premium).
 */
export async function optimizeSmartCartListWithAi(
  inputItems: SmartCartOptimizeInputItem[]
): Promise<{ data?: OptimizedCartLine[]; error?: string }> {
  const items = inputItems
    .filter((i) => typeof i.text === 'string' && i.text.trim().length > 0)
    .slice(0, 120);
  if (items.length === 0) {
    return { error: 'Keine Artikel zum Optimieren.' };
  }

  const allowed = await isUserPremium();
  if (!allowed) {
    return { error: 'PREMIUM_REQUIRED' };
  }

  const userPayload = JSON.stringify(items);

  try {
    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SMART_MERGE_SYSTEM },
          {
            role: 'user',
            content: `Optimiere diese offenen Einkaufslisten-Positionen (JSON-Array):\n\n${userPayload}`,
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

    const parsed = SMART_MERGE_OUTPUT.safeParse(raw);
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
    console.error('[shopping-list-ai] optimizeSmartCartListWithAi', e);
    return {
      error: e instanceof Error ? e.message : 'Optimierung fehlgeschlagen. Bitte erneut versuchen.',
    };
  }
}
