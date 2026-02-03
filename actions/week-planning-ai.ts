'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isUserPremium } from '@/lib/subscription';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { getMealPreferences } from './meal-planning-actions';
import { saveResult } from './workspace-actions';

// Generiere 7 neue Rezepte für eine Woche basierend auf Präferenzen
export async function generateWeekRecipes(workspaceId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Nicht angemeldet' };
  }

  const isPremium = await isUserPremium();
  if (!isPremium) {
    return { error: 'PREMIUM_REQUIRED', message: 'Premium-Feature. Bitte upgrade deinen Account.' };
  }

  try {
    // Hole Präferenzen
    const preferences = await getMealPreferences();
    if (!preferences) {
      return { error: 'Keine Präferenzen gefunden. Bitte richte zuerst deine Präferenzen ein.' };
    }

    const dietType = preferences.dietType || 'alles';
    const dietText =
      dietType === 'alles'
        ? 'Ausgewogen (alle Diät-Typen erlaubt)'
        : dietType === 'vegetarisch'
          ? 'Vegetarisch (kein Fleisch, kein Fisch)'
          : dietType === 'high-protein'
            ? 'High Protein (proteinreich, Fleisch/Fisch/Eier/Hülsenfrüchte betonen)'
            : dietType === 'low-carb'
              ? 'Low Carb (kohlenhydratarm, wenig Nudeln/Reis/Brot)'
              : dietType;

    const cookingRhythm = (preferences as { cookingRhythm?: string }).cookingRhythm || 'daily_fresh';
    const rhythmText =
      cookingRhythm === 'meal_prep'
        ? 'MEAL PREP: Der User kocht größere Portionen für 2 Tage. Du erstellst nur 4 Rezepte (für Mo, Mi, Fr, So). Jedes Rezept muss für 2 Tage portioniert sein (doppelte Menge für ' + (preferences.householdSize || 2) * 2 + ' Personen). Die Tage Di, Do, Sa sind "Reste vom Vortag" – dafür gibst du KEIN eigenes Rezept.'
        : cookingRhythm === 'quick_dirty'
          ? 'QUICK & DIRTY: Unter der Woche (Mo–Fr) nur Rezepte mit maximal 20 Min Kochzeit. Am Wochenende (Sa, So) darf die Kochzeit länger sein.'
          : 'TÄGLICH FRISCH: 7 verschiedene Gerichte, jeden Tag frisch kochen.';

    const mealTypesList = preferences.mealTypes?.length ? preferences.mealTypes : ['abendessen'];
    const mealTypesLabel =
      mealTypesList.includes('frühstück') && mealTypesList.includes('abendessen')
        ? 'Frühstück und Abendessen'
        : mealTypesList.includes('frühstück')
          ? 'Frühstück'
          : mealTypesList.includes('mittagessen')
            ? 'Mittagessen'
            : 'Abendessen';
    const mealTypesText = `Zu planende Mahlzeit: ${mealTypesLabel}. Erstelle pro Tag genau diese Mahlzeit.`;

    const allergiesText =
      preferences.allergies && preferences.allergies.length > 0
        ? `WICHTIG - Allergien vermeiden: ${preferences.allergies.join(', ')}`
        : 'Keine Allergien';

    const isMealPrep = cookingRhythm === 'meal_prep';
    const recipeCount = isMealPrep ? 4 : 7;
    const daysForMealPrep = ['monday', 'wednesday', 'friday', 'sunday'];

    const systemPrompt = `Du bist ein professioneller Meal-Planning-Experte und Muttersprachler Deutsch.

ERNÄHRUNGS-ZIEL: ${dietText}
KOCH-RHYTHMUS: ${rhythmText}
MAHLZEITEN: ${mealTypesText}
Portionen: ${preferences.householdSize} Personen pro Rezept (bei Meal Prep: pro Rezept die doppelte Menge für 2 Tage).
${allergiesText}

QUALITÄTS-ANFORDERUNGEN:
- KONSISTENTE deutsche Einheiten: g, kg, ml, l, TL, EL, Stk, Glas, Bund, Packung
- KONSISTENTE Zutat-Benennung (z.B. immer "Tomaten" nicht gemischt "Tomate"/"Tomaten")
- Realistische Mengen für ${preferences.householdSize} Personen
- Korrekte deutsche Rechtschreibung

Antworte NUR mit einem gültigen JSON-Objekt:
{
  "recipes": [
    {
      "day": "monday",
      "recipeName": "Name des Gerichts",
      "stats": { "time": "z.B. 25 Min", "calories": "z.B. 450 kcal", "difficulty": "Einfach/Mittel/Schwer" },
      "ingredients": ["..."],
      "shoppingList": ["..."],
      "instructions": ["Schritt 1", "Schritt 2"],
      "chefTip": "Kurzer Profi-Tipp",
      "cuisine": "Italienisch",
      "proteinType": "vegetarisch"
    }
    ${isMealPrep ? '... (3 weitere Rezepte für wednesday, friday, sunday)' : '... (weitere 6 Rezepte für tuesday bis sunday)'}
  ]
}

WICHTIG:
- "proteinType": "fleisch" | "fisch" | "vegetarisch" | "vegan" – ausgewogen verteilen
- Verschiedene Küchen-Stile
- Bei Meal Prep: Nur 4 Rezepte (day: monday, wednesday, friday, sunday), jede Menge für 2 Tage (${(preferences.householdSize || 2) * 2} Personen)`;

    const userPrompt = `Erstelle ${recipeCount} Rezepte für die Woche:
- Ernährungs-Ziel: ${dietText}
- Rhythmus: ${rhythmText}
- Mahlzeit: ${mealTypesLabel}
- Personen: ${preferences.householdSize}
${allergiesText}

Woche ausgewogen und abwechslungsreich gestalten.`;

    console.log('[WEEK-PLANNING-AI] Generiere 7 Rezepte...');
    const response = await createChatCompletion(
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      },
      'recipe',
      'Wochenplaner AI-Generierung'
    );

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return { error: 'Keine Antwort von der KI erhalten.' };
    }

    // Parse JSON
    let weekData: { recipes: any[] };
    try {
      weekData = JSON.parse(content);
    } catch (parseError) {
      console.error('[WEEK-PLANNING-AI] JSON Parse Error:', parseError);
      return { error: 'Fehler beim Verarbeiten der Antwort. Bitte versuche es erneut.' };
    }

    const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    let recipesToSave = weekData.recipes;

    if (isMealPrep && recipesToSave.length === 4) {
      const byDay: Record<string, any> = {};
      recipesToSave.forEach((r: any) => {
        if (r.day) byDay[r.day] = r;
      });
      recipesToSave = dayOrder.map((day, i) => {
        if (day === 'monday') return byDay.monday || recipesToSave[0];
        if (day === 'tuesday') return { ...(byDay.monday || recipesToSave[0]), day: 'tuesday', recipeName: `Reste: ${(byDay.monday || recipesToSave[0]).recipeName}` };
        if (day === 'wednesday') return byDay.wednesday || recipesToSave[1];
        if (day === 'thursday') return { ...(byDay.wednesday || recipesToSave[1]), day: 'thursday', recipeName: `Reste: ${(byDay.wednesday || recipesToSave[1]).recipeName}` };
        if (day === 'friday') return byDay.friday || recipesToSave[2];
        if (day === 'saturday') return { ...(byDay.friday || recipesToSave[2]), day: 'saturday', recipeName: `Reste: ${(byDay.friday || recipesToSave[2]).recipeName}` };
        if (day === 'sunday') return byDay.sunday || recipesToSave[3];
        return recipesToSave[i];
      });
    }

    if (!weekData.recipes || !Array.isArray(weekData.recipes)) {
      return { error: 'Ungültiges Format. Die KI sollte Rezepte zurückgeben.' };
    }
    if (recipesToSave.length !== 7) {
      return { error: `Ungültiges Format. Erwartet 7 Tage, erhalten: ${recipesToSave.length}.` };
    }

    const savedRecipes: Array<{ recipe: any; resultId: string; isTemporary: boolean }> = [];
    let lastResultId: string | null = null;

    for (const recipeData of recipesToSave) {
      try {
        const isResteDay = recipeData.recipeName && String(recipeData.recipeName).startsWith('Reste:');
        if (isResteDay && lastResultId) {
          savedRecipes.push({
            recipe: recipeData,
            resultId: lastResultId,
            isTemporary: true,
          });
          continue;
        }

        if (!recipeData.recipeName || !recipeData.ingredients || !recipeData.instructions) {
          console.warn(`[WEEK-PLANNING-AI] ⚠️ Ungültiges Rezept für ${recipeData.day}, überspringe...`);
          continue;
        }

        const result = await saveResult(
          'recipe',
          'Gourmet-Planer',
          JSON.stringify(recipeData),
          workspaceId,
          recipeData.recipeName,
          JSON.stringify({
            source: 'week-planning-ai-temporary',
            day: recipeData.day,
            proteinType: recipeData.proteinType,
            cuisine: recipeData.cuisine,
            isTemporary: true,
            weekStart: new Date().toISOString().split('T')[0],
          })
        );

        if (result.success && result.result) {
          lastResultId = result.result.id;
          savedRecipes.push({
            recipe: recipeData,
            resultId: result.result.id,
            isTemporary: true,
          });
        } else {
          console.error(`[WEEK-PLANNING-AI] ❌ Fehler beim Speichern: ${result.error}`);
        }
      } catch (error) {
        console.error(`[WEEK-PLANNING-AI] ❌ Fehler beim Speichern von ${recipeData.day}:`, error);
      }
    }

    if (savedRecipes.length === 0) {
      return { error: 'Keine Rezepte konnten gespeichert werden.' };
    }

    console.log(`[WEEK-PLANNING-AI] ✅ ${savedRecipes.length} Rezepte erfolgreich generiert und gespeichert`);

    return { 
      success: true, 
      recipes: savedRecipes.map(r => ({
        recipe: r.recipe,
        resultId: r.resultId,
        isTemporary: r.isTemporary,
      })),
      count: savedRecipes.length 
    };
  } catch (error) {
    console.error('[WEEK-PLANNING-AI] ❌ Fehler:', error);
    if (error instanceof Error) {
      return { error: `Fehler bei der Rezept-Generierung: ${error.message}` };
    }
    return { error: 'Fehler bei der Rezept-Generierung' };
  }
}

// Generiere 3 Alternative-Rezepte für einen Tag
export async function generateAlternativeRecipes(
  day: string,
  currentRecipe: any,
  preferences: any,
  workspaceId?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Nicht angemeldet' };
  }

  const isPremium = await isUserPremium();
  if (!isPremium) {
    return { error: 'PREMIUM_REQUIRED' };
  }

  try {
    const systemPrompt = `Du bist ein professioneller Koch. Erstelle 3 ALTERNATIVE Rezepte für ${day}, die ähnlich gut sind wie das aktuelle Rezept, aber anders.

Aktuelles Rezept: ${currentRecipe.recipeName}
Küche: ${currentRecipe.cuisine || 'Verschieden'}
Protein: ${currentRecipe.proteinType || 'Verschieden'}

Erstelle 3 verschiedene Alternativen mit:
- Verschiedenen Küchen-Stilen
- Verschiedenen Protein-Typen (wenn möglich)
- Ähnlicher Kochzeit und Schwierigkeit
- Passend zu den User-Präferenzen

Antworte NUR mit JSON:
{
  "alternatives": [
    {
      "recipeName": "Name",
      "stats": { "time": "25 Min", "calories": "450 kcal", "difficulty": "Einfach" },
      "ingredients": [...],
      "shoppingList": [...],
      "instructions": [...],
      "chefTip": "...",
      "cuisine": "Italienisch",
      "proteinType": "vegetarisch",
      "reason": "Warum diese Alternative gut ist"
    },
    ... (2 weitere)
  ]
}`;

    const userPrompt = `Erstelle 3 Alternativen für ${day}:
- Personen: ${preferences.householdSize}
- Diät: ${preferences.dietType || 'Alles'}
- Kochzeit: ${preferences.cookingTime || 'Normal'}
- Allergien: ${preferences.allergies?.join(', ') || 'Keine'}

Die Alternativen sollten anders sein als "${currentRecipe.recipeName}", aber genauso gut passen.`;

    const response = await createChatCompletion(
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9, // Kreativer für Alternativen
      },
      'recipe',
      'Wochenplaner Alternative-Generierung'
    );

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return { error: 'Keine Antwort von der KI erhalten.' };
    }

    const data = JSON.parse(content);
    if (!data.alternatives || !Array.isArray(data.alternatives)) {
      return { error: 'Ungültiges Format.' };
    }

    return { 
      success: true, 
      alternatives: data.alternatives 
    };
  } catch (error) {
    console.error('[WEEK-PLANNING-AI] ❌ Fehler bei Alternative-Generierung:', error);
    return { error: 'Fehler bei der Generierung von Alternativen' };
  }
}
