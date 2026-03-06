'use server';

import { createChatCompletion } from '@/lib/openai-wrapper';
import { isUserPremium } from '@/lib/subscription';

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
