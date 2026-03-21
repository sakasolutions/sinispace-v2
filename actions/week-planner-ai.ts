'use server';

import { addDays, format } from 'date-fns';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { isUserPremium } from '@/lib/subscription';
import {
  saveWeeklyPlan as saveWeeklyPlanToCalendar,
  activateWeeklyPlan as activateWeeklyPlanToCalendar,
} from '@/actions/calendar-actions';
import { getNextWeekRange } from '@/lib/week-plan-dates';
import { saveResult } from '@/actions/workspace-actions';
import { getShoppingLists, saveShoppingLists } from '@/actions/shopping-list-actions';
import { appendToList, defaultList } from '@/lib/shopping-lists-storage';
import { auth } from '@/auth';
import { fetchUnsplashImageForRecipe } from '@/lib/unsplash-recipe-image';
import { normalizeSmartCartCategory, SHOPPING_CATEGORIES } from '@/lib/shopping-list-categories';
import { z } from 'zod';

export type WeekDraftMeal = {
  type: 'breakfast' | 'lunch' | 'dinner';
  title: string;
  time: string;
  calories: string;
  /** Unsplash (nach engl. Suchphrase) */
  imageUrl?: string | null;
};

export type WeekDraftDay = {
  day: string;
  meals: WeekDraftMeal[];
};

const GERMAN_UI_LANGUAGE_RULE = 'WICHTIG: ALLE nutzerseitigen Texte (inkl. Gerichtstitel, Beschreibungen, Mahlzeitentypen, Zutaten, Schritte und Tipps) MÜSSEN AUSSCHLIESSLICH auf DEUTSCH erzeugt werden.';
const ENGLISH_UNSPLASH_RULE = 'NUR das Feld imageSearchQuery bzw. Unsplash-Suchphrasen dürfen auf ENGLISCH sein.';

const SmartShoppingIngredientSchema = z.object({
  item: z.string().min(1),
  amount: z.string().min(1),
  /** SmartCart-Schlüssel (snake_case); Rohstring von der KI → normalisiert. */
  category: z
    .string()
    .min(1)
    .transform((s) => normalizeSmartCartCategory(s)),
});

const SmartShoppingOutputSchema = z.object({
  ingredients: z.array(SmartShoppingIngredientSchema),
});

export type SmartShoppingIngredient = z.infer<typeof SmartShoppingIngredientSchema>;

/**
 * Gerichtstitel → kurze englische Unsplash-Suchphrasen (ein API-Call für viele Titel).
 */
async function mealTitlesToEnglishQueries(titles: string[]): Promise<string[]> {
  const trimmed = titles.map((t) => (typeof t === 'string' ? t.trim() : ''));
  if (trimmed.length === 0) return [];
  try {
    const res = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'The user sends JSON {"titles":["..."]}. Reply with ONLY JSON: {"q":["..."]} — same array length and order as "titles". Each string is a concise ENGLISH food photo search phrase (3–6 words) for Unsplash for that dish. Translate German/other languages to English. No suffixes like "food photography".',
          },
          { role: 'user', content: JSON.stringify({ titles: trimmed }) },
        ],
        response_format: { type: 'json_object' as const },
        temperature: 0.2,
      },
      'recipe',
      'CookIQ Week Planner Unsplash i18n'
    );
    const text = res.choices[0]?.message?.content;
    if (!text) return trimmed;
    const parsed = JSON.parse(text) as { q?: unknown };
    const q = parsed?.q;
    if (!Array.isArray(q) || q.length !== trimmed.length) return trimmed;
    return q.map((s, i) => {
      const phrase = typeof s === 'string' ? s.trim() : '';
      return phrase || trimmed[i] || 'healthy meal';
    });
  } catch {
    return trimmed;
  }
}

/** Lädt pro Mahlzeit ein Unsplash-Bild (Suchbegriff idealerweise Englisch). */
async function enrichDraftMealsWithUnsplash(draft: WeekDraftDay[]): Promise<WeekDraftDay[]> {
  const flat: { dayIdx: number; mealIdx: number }[] = [];
  const titles: string[] = [];
  draft.forEach((day, dayIdx) => {
    day.meals.forEach((meal, mealIdx) => {
      flat.push({ dayIdx, mealIdx });
      titles.push(meal.title?.trim() || 'meal');
    });
  });
  if (flat.length === 0) return draft;

  const queries = await mealTitlesToEnglishQueries(titles);

  const out: WeekDraftDay[] = draft.map((day) => ({
    day: day.day,
    meals: day.meals.map((m) => ({ ...m })),
  }));

  for (let i = 0; i < flat.length; i++) {
    const { dayIdx, mealIdx } = flat[i];
    const query = queries[i] ?? titles[i];
    const { imageUrl } = await fetchUnsplashImageForRecipe(query);
    out[dayIdx].meals[mealIdx] = {
      ...out[dayIdx].meals[mealIdx],
      imageUrl: imageUrl ?? null,
    };
  }

  return out;
}

async function enrichSingleMealWithUnsplash(meal: WeekDraftMeal): Promise<WeekDraftMeal> {
  const title = meal.title?.trim() || 'meal';
  const [english] = await mealTitlesToEnglishQueries([title]);
  const { imageUrl } = await fetchUnsplashImageForRecipe(english ?? title);
  return { ...meal, imageUrl: imageUrl ?? null };
}

export async function generateWeekDraft(
  meals: { breakfast: boolean; lunch: boolean; dinner: boolean },
  filters: string[],
  customPrompt: string
): Promise<{ success: true; draft: WeekDraftDay[] } | { success: false; error: string }> {
  const isAllowed = await isUserPremium();
  if (!isAllowed) {
    return { success: false, error: 'Premium-Feature. Bitte upgrade deinen Account.' };
  }

  try {
    const requestedMeals: string[] = [];
    if (meals.breakfast) requestedMeals.push('Frühstück');
    if (meals.lunch) requestedMeals.push('Mittagessen');
    if (meals.dinner) requestedMeals.push('Abendessen');

    if (requestedMeals.length === 0) {
      return { success: false, error: 'Bitte wähle mindestens eine Mahlzeit.' };
    }

    const filterText = filters.length > 0 ? `Beachte strikt diese Ernährungs-Filter: ${filters.join(', ')}.` : '';
    const customText = customPrompt.trim() ? `Besonderer Wunsch des Users: "${customPrompt.trim()}".` : '';

    const jsonSchema = `{
  "plan": [
    { "day": "Montag", "meals": [ { "type": "breakfast", "title": "Name des Gerichts auf DEUTSCH", "time": "20 Min", "calories": "450 kcal" } ] },
    { "day": "Dienstag", "meals": [ ... ] },
    ... für alle 7 Tage (Montag bis Sonntag)
  ]
}
Jedes "meals"-Array enthält nur die vom User gewünschten Mahlzeit-Typen (type: "breakfast" | "lunch" | "dinner").`;

    const systemPrompt = `Du bist ein 5-Sterne Meal-Prep Coach. Erstelle einen abwechslungsreichen Wochenplan für 7 Tage (Montag bis Sonntag).
Der User möchte pro Tag folgende Mahlzeiten geplant haben: ${requestedMeals.join(', ')}.
${filterText}
${customText}

Regeln:
0. ${GERMAN_UI_LANGUAGE_RULE} ${ENGLISH_UNSPLASH_RULE}
1. JEDES Gericht muss zu 100% einzigartig sein. Keine Wiederholungen innerhalb der Woche!
2. Die Werte für 'calories' und 'time' müssen realistisch sein und zu den Filtern passen (z.B. wenig Kalorien bei Low Carb, kurze Zeit bei "Unter 30 Min").
3. Antworte NUR mit einem gültigen JSON-Objekt mit genau einem Schlüssel "plan", der ein Array aus 7 Tagen ist. Jeder Tag hat "day" (z.B. "Montag") und "meals" (Array von Objekten mit type, title, time, calories).
4. "type" muss exakt "breakfast", "lunch" oder "dinner" sein.

Format: ${jsonSchema}`;

    const userPrompt = 'Generiere den Wochenplan-Entwurf als JSON (nur Metadaten: Tag, Mahlzeittyp, Titel, Zeit, Kalorien).';

    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' as const },
        temperature: 0.7,
      },
      'recipe',
      'CookIQ Week Planner'
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'Keine Antwort von der KI erhalten.' };
    }

    let parsed: { plan?: WeekDraftDay[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      return { success: false, error: 'Fehler beim Verarbeiten der Antwort. Bitte versuche es erneut.' };
    }

    const plan = parsed?.plan;
    if (!Array.isArray(plan) || plan.length === 0) {
      return { success: false, error: 'Ungültiges Format des Wochenplans.' };
    }

    const draft: WeekDraftDay[] = plan.slice(0, 7).map((dayObj: any) => ({
      day: typeof dayObj?.day === 'string' ? dayObj.day : String(dayObj?.day ?? ''),
      meals: Array.isArray(dayObj?.meals)
        ? dayObj.meals
            .filter((m: any) => m && (m.type === 'breakfast' || m.type === 'lunch' || m.type === 'dinner'))
            .map((m: any) => ({
              type: m.type as 'breakfast' | 'lunch' | 'dinner',
              title: typeof m.title === 'string' ? m.title : String(m.title ?? ''),
              time: typeof m.time === 'string' ? m.time : String(m.time ?? ''),
              calories: typeof m.calories === 'string' ? m.calories : String(m.calories ?? ''),
            }))
        : [],
    }));

    const draftWithImages = await enrichDraftMealsWithUnsplash(draft);
    return { success: true, draft: draftWithImages };
  } catch (error) {
    console.error('Fehler beim Generieren des Wochenplans:', error);
    return { success: false, error: 'Konnte Plan nicht generieren.' };
  }
}

export async function regenerateSingleMealDraft(
  day: string,
  mealType: string,
  filters: string[],
  customPrompt: string,
  oldTitle: string
): Promise<{ success: true; meal: WeekDraftMeal } | { success: false; error: string }> {
  const isAllowed = await isUserPremium();
  if (!isAllowed) {
    return { success: false, error: 'Premium-Feature. Bitte upgrade deinen Account.' };
  }

  try {
    const filterText = filters.length > 0 ? `Beachte strikt diese Ernährungs-Filter: ${filters.join(', ')}.` : '';
    const customText = customPrompt.trim() ? `Besonderer Wunsch des Users: "${customPrompt.trim()}".` : '';

    const typeNorm = mealType === 'breakfast' || mealType === 'lunch' || mealType === 'dinner' ? mealType : 'dinner';

    const systemPrompt = `Du bist ein 5-Sterne Meal-Prep Coach. Der User hat einen Wochenplan, aber möchte EIN Gericht austauschen.
Es geht um den Tag: ${day}, Mahlzeit: ${typeNorm}.
Das bisherige Gericht war "${oldTitle}". Generiere eine NEUE, völlig ANDERE Alternative dafür.
${filterText}
${customText}

Regeln:
0. ${GERMAN_UI_LANGUAGE_RULE} ${ENGLISH_UNSPLASH_RULE}
1. Generiere nur EIN Gericht.
2. Die Werte für 'calories' und 'time' müssen realistisch sein.
3. Antworte NUR mit einem JSON-Objekt mit genau einem Schlüssel "meal": { "type": "${typeNorm}", "title": "...", "time": "...", "calories": "..." }`;

    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generiere die Alternative als JSON (ein Objekt "meal" mit type, title, time, calories).' },
        ],
        response_format: { type: 'json_object' as const },
        temperature: 0.8,
      },
      'recipe',
      'CookIQ Week Planner Re-Roll'
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'Keine Antwort von der KI erhalten.' };
    }

    let parsed: { meal?: any };
    try {
      parsed = JSON.parse(content);
    } catch {
      return { success: false, error: 'Fehler beim Verarbeiten der Antwort.' };
    }

    const m = parsed?.meal;
    if (!m || typeof m.title !== 'string') {
      return { success: false, error: 'Ungültiges Format.' };
    }

    let meal: WeekDraftMeal = {
      type: typeNorm,
      title: String(m.title ?? ''),
      time: typeof m.time === 'string' ? m.time : String(m.time ?? ''),
      calories: typeof m.calories === 'string' ? m.calories : String(m.calories ?? ''),
    };

    meal = await enrichSingleMealWithUnsplash(meal);

    return { success: true, meal };
  } catch (error) {
    console.error('Fehler beim Re-Roll:', error);
    return { success: false, error: 'Konnte Gericht nicht austauschen.' };
  }
}

/**
 * JIT: Generiert aus Titel/Kalorien/Zeit das volle Rezept per KI und speichert es in der Sammlung (Result).
 */
export async function generateAndSaveFullRecipe(
  title: string,
  calories: string,
  time: string
): Promise<
  | { success: true; recipe: Record<string, unknown>; resultId?: string }
  | { success: false; error?: string }
> {
  const isAllowed = await isUserPremium();
  if (!isAllowed) {
    return { success: false, error: 'Premium-Feature. Bitte upgrade deinen Account.' };
  }

  try {
    const jsonFormat = `{
  "recipeName": "Name des Gerichts auf DEUTSCH",
  "stats": { "time": "20 Min", "calories": 450, "protein": 0, "carbs": 0, "fat": 0, "difficulty": "Einfach" },
  "ingredients": [ "Menge Einheit Zutat" ],
  "shoppingList": [ "Menge Einheit Zutat" ],
  "instructions": [ "Schritt 1", "Schritt 2" ],
  "chefTip": "Profi-Tipp",
  "categoryIcon": "pasta",
  "imageSearchQuery": "English search term for Unsplash (3-6 words)"
}`;

    const imageSearchRule = `
- imageSearchQuery (String): Kurzer ENGLISCHER Unsplash-Suchbegriff (3–6 Wörter) NUR für interne Bildsuche. Übersetze den deutschen Gerichtstitel ins Englische (z. B. "Gefüllte Paprika" → "stuffed bell peppers"). Beschreibe das Gericht, nicht isolierte Zutaten. Keine Phrasen wie "food photography" anhängen.
- WICHTIG: recipeName, stats.difficulty, ingredients, shoppingList, instructions und chefTip bleiben vollständig auf DEUTSCH.
`;

    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Du bist ein 5-Sterne-Koch. Erstelle ein vollständiges Rezept nur aus dem Gerichtsnamen. ${GERMAN_UI_LANGUAGE_RULE} ${ENGLISH_UNSPLASH_RULE} Antworte NUR mit validem JSON: ${jsonFormat}. categoryIcon: einer von pasta, pizza, burger, soup, salad, vegetable, meat, chicken, fish, egg, dessert, breakfast. ingredients: nur Basics (Salz, Pfeffer, Öl, Wasser). shoppingList: alle übrigen Zutaten.
${imageSearchRule}`,
          },
          {
            role: 'user',
            content: `Gericht: "${title}". Ungefähr ${calories || '—'}, Zubereitung ${time || '—'}. Erstelle das komplette Rezept mit Zutaten und Zubereitungsschritten.`,
          },
        ],
        response_format: { type: 'json_object' as const },
        temperature: 0.7,
      },
      'recipe',
      'CookIQ Wochenplan JIT'
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'Keine Antwort von der KI.' };
    }

    let recipe: Record<string, unknown>;
    try {
      recipe = JSON.parse(content) as Record<string, unknown>;
    } catch {
      return { success: false, error: 'Ungültiges Rezept-Format.' };
    }

    if (!recipe.recipeName || !Array.isArray(recipe.ingredients) || !Array.isArray(recipe.instructions)) {
      return { success: false, error: 'Rezept unvollständig.' };
    }

    const q = String(
      (recipe.imageSearchQuery as string) || (recipe.recipeName as string) || ''
    ).trim();
    const { imageUrl, imageCredit } = await fetchUnsplashImageForRecipe(q);
    if (imageUrl) {
      recipe.imageUrl = imageUrl;
      recipe.imageCredit = imageCredit;
    }

    const saved = await saveResult(
      'recipe',
      'CookIQ',
      JSON.stringify(recipe),
      undefined,
      String(recipe.recipeName),
      JSON.stringify({ source: 'week-planner-jit', calories, time })
    );

    if (!saved?.success || !saved.result) {
      return { success: false, error: saved?.error ?? 'Speichern fehlgeschlagen.' };
    }

    return { success: true, recipe, resultId: saved.result.id };
  } catch (error) {
    console.error('Fehler bei JIT-Generierung:', error);
    return { success: false, error: 'Konnte Rezept nicht generieren.' };
  }
}

/**
 * Speichert den finalen Wochenplan-Entwurf: schreibt in den Kalender (CalendarEvent)
 * und nutzt die kommende Woche (Start: nächster Montag).
 */
export async function saveWeeklyPlan(
  weekDraft: WeekDraftDay[]
): Promise<{ success: true; savedFrom: string; savedTo: string } | { success: false; error?: string }> {
  const isAllowed = await isUserPremium();
  if (!isAllowed) {
    return { success: false, error: 'Premium-Feature. Bitte upgrade deinen Account.' };
  }

  if (!weekDraft?.length) {
    return { success: false, error: 'Kein Plan zum Speichern.' };
  }

  try {
    const { weekStart, queryFrom: savedFrom, queryTo: savedTo } = getNextWeekRange();

    const planData = weekDraft.flatMap((dayObj, dayIndex) => {
      const date = addDays(weekStart, dayIndex);
      const dateStr = format(date, 'yyyy-MM-dd');
      return (dayObj.meals ?? []).map((meal) => {
        const t = meal.title || 'Gericht';
        const raw = (meal.calories || '').trim();
        const title =
          !raw || /^[–—\-/\s]+$/u.test(raw)
            ? t
            : `${t} · ${raw.toLowerCase().includes('kcal') ? raw : `${raw} kcal`}`;
        return {
          date: dateStr,
          title,
          mealType: meal.type,
          time: meal.time,
          imageUrl:
            meal.imageUrl && String(meal.imageUrl).trim().length > 0
              ? String(meal.imageUrl).trim()
              : null,
        };
      });
    });

    if (planData.length === 0) {
      return { success: false, error: 'Keine Mahlzeiten im Plan – nichts zum Speichern.' };
    }

    const res = await saveWeeklyPlanToCalendar(planData);
    if (res.success === false) {
      return { success: false, error: res.error };
    }

    return { success: true, savedFrom, savedTo };
  } catch (error) {
    console.error('Fehler beim Speichern & Kalender-Sync:', error);
    return { success: false, error: 'Konnte Plan nicht speichern.' };
  }
}

/**
 * Wochenplan-Entwurf als Kalender-Events ab **nächstem Plan-Montag** (siehe getNextMonday).
 * `draftId`: `JSON.stringify(WeekDraftDay[])` – kompatibel mit zukünftiger echter Draft-ID.
 */
export async function activateWeeklyPlan(
  draftId: string
): Promise<
  { success: true; from: string; to: string } | { success: false; error: string }
> {
  const isAllowed = await isUserPremium();
  if (!isAllowed) {
    return { success: false, error: 'Premium-Feature. Bitte upgrade deinen Account.' };
  }
  return activateWeeklyPlanToCalendar(draftId);
}

/**
 * SmartCart Pantry Check:
 * Konsolidiert Zutaten über mehrere Gerichte hinweg als strukturierte Einkaufsliste.
 */
export async function generateSmartShoppingList(
  mealTitles: string[]
): Promise<{ success: true; ingredients: SmartShoppingIngredient[] } | { success: false; error: string }> {
  const isAllowed = await isUserPremium();
  if (!isAllowed) {
    return { success: false, error: 'Premium-Feature. Bitte upgrade deinen Account.' };
  }

  const normalizedTitles = Array.isArray(mealTitles)
    ? mealTitles
        .map((t) => (typeof t === 'string' ? t.trim() : ''))
        .filter((t) => t.length > 0)
        .slice(0, 60)
    : [];

  if (normalizedTitles.length === 0) {
    return { success: false, error: 'Bitte mindestens einen Gerichtstitel übergeben.' };
  }

  const allowedCategories = [...SHOPPING_CATEGORIES].join(', ');

  const systemPrompt = `You are a smart grocery planner.
The user will provide an array of meal titles for the upcoming week.

Generate a consolidated grocery list needed to cook all these meals.
Combine amounts if ingredients overlap.

CRITICAL: Ignore absolute basics (salt, pepper, tap water, basic frying oil).

LANGUAGE:
- "item" and "amount" MUST be in German (e.g. item "Hähnchenbrust", amount "500 g" or "2 Stk").
- "category" MUST NOT be German text. It MUST be EXACTLY one of these snake_case keys (copy verbatim, no other strings):
  ${allowedCategories}

You MUST categorize every ingredient using ONLY one of the exact category strings above. Do not invent new categories. If unsure, pick the closest valid key (e.g. dry pasta → haushalt, yogurt → kuhlregal, frozen peas → tiefkuhl).

Return ONLY valid JSON with exactly this shape:
{
  "ingredients": [
    { "item": "…", "amount": "…", "category": "obst_gemuese" }
  ]
}`;

  try {
    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify({ mealTitles: normalizedTitles }) },
        ],
        response_format: { type: 'json_object' as const },
        temperature: 0.2,
      },
      'recipe',
      'CookIQ SmartCart Pantry Check'
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false, error: 'Keine Antwort von der KI erhalten.' };
    }

    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      return { success: false, error: 'Ungültiges JSON von der KI.' };
    }

    const parsed = SmartShoppingOutputSchema.safeParse(raw);
    if (!parsed.success) {
      return { success: false, error: 'KI-Antwort hat ein ungültiges Format.' };
    }

    const ingredients = parsed.data.ingredients
      .map((ing) => ({
        item: ing.item.trim(),
        amount: ing.amount.trim(),
        category: normalizeSmartCartCategory(ing.category),
      }))
      .filter((ing) => ing.item.length > 0 && ing.amount.length > 0);

    if (ingredients.length === 0) {
      return { success: false, error: 'Keine verwertbaren Zutaten in der KI-Antwort.' };
    }

    return { success: true, ingredients };
  } catch (error) {
    console.error('Fehler bei generateSmartShoppingList:', error);
    return { success: false, error: 'Konnte SmartCart-Liste nicht generieren.' };
  }
}

/**
 * Master-Einkaufsliste aus den Rezept-Titeln der Woche (ohne volle Rezepte zu laden).
 * KI generiert aggregierte Zutatenliste; Speicherung in UserShoppingLists (SmartCart).
 */
export async function generateMasterShoppingList(
  weekPlan: WeekDraftDay[]
): Promise<{ success: true; list: string[] } | { success: false }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false };
  }

  try {
    const mealsContext = weekPlan
      .flatMap((day) =>
        day.meals.map((m: WeekDraftMeal) => `- ${m.title} (${m.calories ?? '—'})`)
      )
      .join('\n');

    const systemPrompt = `Du bist ein intelligenter Einkaufs-Assistent.
Der User kocht diese Woche folgende Gerichte:

${mealsContext}

Deine Aufgabe:
1. Leite die logischen Zutaten für diese Gerichte ab (für ca. 2 Personen, falls nicht anders angegeben).
2. Fasse gleiche Zutaten intelligent zusammen (z.B. aus 2x "1 Zwiebel" wird "2 Zwiebeln").
3. Ignoriere absolute Basis-Zutaten (Salz, Pfeffer, Leitungswasser).
Antworte NUR mit einem JSON-Objekt mit genau einem Schlüssel "items", der ein Array von Strings ist. Jeder String ist ein Einkaufslisten-Eintrag (z.B. "500g Hähnchenbrust", "1 Netz Zwiebeln").`;

    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generiere die aggregierte Einkaufsliste als JSON mit Schlüssel "items" (Array von Strings).' },
        ],
        response_format: { type: 'json_object' as const },
        temperature: 0.4,
      },
      'recipe',
      'CookIQ Master SmartCart'
    );

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { success: false };
    }

    let parsed: { items?: string[] };
    try {
      parsed = JSON.parse(content) as { items?: string[] };
    } catch {
      return { success: false };
    }

    const shoppingListItems = Array.isArray(parsed?.items)
      ? parsed.items.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
      : [];

    if (shoppingListItems.length === 0) {
      return { success: false };
    }

    let lists = await getShoppingLists();
    if (lists.length === 0) {
      lists = [defaultList()];
    }
    const targetListId = lists[0].id;
    const { lists: updatedLists } = appendToList(lists, targetListId, shoppingListItems);
    const saveRes = await saveShoppingLists(updatedLists);
    if (!saveRes.success) {
      console.error('Master-Liste: Speichern in SmartCart fehlgeschlagen', saveRes.error);
      return { success: false };
    }

    return { success: true, list: shoppingListItems };
  } catch (error) {
    console.error('Fehler bei der Master-Liste:', error);
    return { success: false };
  }
}
