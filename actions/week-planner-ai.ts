'use server';

import { addDays, format, startOfDay, startOfWeek } from 'date-fns';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { isUserPremium } from '@/lib/subscription';
import { saveWeeklyPlan as saveWeeklyPlanToCalendar } from '@/actions/calendar-actions';
import { saveResult } from '@/actions/workspace-actions';

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
): Promise<{ success: true } | { success: false; error?: string }> {
  const isAllowed = await isUserPremium();
  if (!isAllowed) {
    return { success: false, error: 'Premium-Feature. Bitte upgrade deinen Account.' };
  }

  if (!weekDraft?.length) {
    return { success: false, error: 'Kein Plan zum Speichern.' };
  }

  try {
    // 1. Plan in der CookIQ-Datenbank speichern (optional, z. B. WeeklyPlan-Tabelle)
    // await db.weeklyPlan.create({ data: { userId, weekStart: nextMonday, planData: JSON.stringify(weekDraft) } });

    // 2. Kalender-Sync: Events für die kommende Woche anlegen (CalendarEvent)
    const today = startOfDay(new Date());
    const thisMonday = startOfWeek(today, { weekStartsOn: 1 });
    const nextMonday = thisMonday > today ? thisMonday : addDays(thisMonday, 7);

    const planData = weekDraft.flatMap((dayObj, dayIndex) => {
      const date = addDays(nextMonday, dayIndex);
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

    // Künstlicher Delay für Frontend-Testing der Raketen-Animation (später entfernen)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return { success: true };
  } catch (error) {
    console.error('Fehler beim Speichern & Kalender-Sync:', error);
    return { success: false, error: 'Konnte Plan nicht speichern.' };
  }
}
