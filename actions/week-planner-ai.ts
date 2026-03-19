'use server';

import { addDays, format } from 'date-fns';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { isUserPremium } from '@/lib/subscription';
import { saveWeeklyPlan as saveWeeklyPlanToCalendar, getNextWeekRange } from '@/actions/calendar-actions';
import { saveResult } from '@/actions/workspace-actions';
import { getShoppingLists, saveShoppingLists } from '@/actions/shopping-list-actions';
import { appendToList, defaultList } from '@/lib/shopping-lists-storage';
import { auth } from '@/auth';

export type WeekDraftMeal = {
  type: 'breakfast' | 'lunch' | 'dinner';
  title: string;
  time: string;
  calories: string;
};

export type WeekDraftDay = {
  day: string;
  meals: WeekDraftMeal[];
};

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
    { "day": "Montag", "meals": [ { "type": "breakfast", "title": "Gerichtename", "time": "20 Min", "calories": "450 kcal" } ] },
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

    return { success: true, draft };
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

    const meal: WeekDraftMeal = {
      type: typeNorm,
      title: String(m.title ?? ''),
      time: typeof m.time === 'string' ? m.time : String(m.time ?? ''),
      calories: typeof m.calories === 'string' ? m.calories : String(m.calories ?? ''),
    };

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
  "recipeName": "Name des Gerichts",
  "stats": { "time": "20 Min", "calories": 450, "protein": 0, "carbs": 0, "fat": 0, "difficulty": "Einfach" },
  "ingredients": [ "Menge Einheit Zutat" ],
  "shoppingList": [ "Menge Einheit Zutat" ],
  "instructions": [ "Schritt 1", "Schritt 2" ],
  "chefTip": "Profi-Tipp",
  "categoryIcon": "pasta",
  "imageSearchQuery": "Food query"
}`;

    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Du bist ein 5-Sterne-Koch. Erstelle ein vollständiges Rezept nur aus dem Gerichtsnamen. Antworte NUR mit validem JSON: ${jsonFormat}. categoryIcon: einer von pasta, pizza, burger, soup, salad, vegetable, meat, chicken, fish, egg, dessert, breakfast. ingredients: nur Basics (Salz, Pfeffer, Öl, Wasser). shoppingList: alle übrigen Zutaten.`,
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
      return (dayObj.meals ?? []).map((meal) => ({
        date: dateStr,
        title: meal.title || 'Gericht',
        mealType: meal.type,
      }));
    });

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
