'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isUserPremium } from '@/lib/subscription';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { getMealPreferences } from './meal-planning-actions';
import { saveResult } from './workspace-actions';
import { saveWeeklyPlan } from './calendar-actions';

/** Präferenzen aus dem Wizard (Diät, Budget, Kochzeit, Allergien) */
export type MealPlanPreferences = {
  dietType?: string;
  allergies?: string[];
  householdSize?: number;
  budgetRange?: string;
  cookingTime?: string;
  preferredCuisines?: string[];
  dislikedIngredients?: string[];
  meatSelection?: string[];
};

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

    // Baue Präferenzen-Text für AI
    const dietText = preferences.dietType === 'alles' 
      ? 'Alle Diät-Typen erlaubt'
      : preferences.dietType === 'vegetarisch'
      ? 'Vegetarisch (kein Fleisch, kein Fisch)'
      : preferences.dietType === 'vegan'
      ? 'Vegan (keine tierischen Produkte)'
      : preferences.dietType || 'Keine Einschränkung';

    const meatText = preferences.meatSelection && preferences.meatSelection.length > 0
      ? `Bevorzugte Fleischsorten: ${preferences.meatSelection.join(', ')}`
      : preferences.dietType === 'alles'
      ? 'Alle Fleischsorten erlaubt'
      : 'Kein Fleisch';

    const cookingTimeText = preferences.cookingTime === 'schnell'
      ? 'Schnelle Gerichte (<30 Min)'
      : preferences.cookingTime === 'normal'
      ? 'Normale Kochzeit (30-60 Min)'
      : preferences.cookingTime === 'aufwendig'
      ? 'Aufwendige Gerichte (>60 Min)'
      : 'Normale Kochzeit';

    const allergiesText = preferences.allergies && preferences.allergies.length > 0
      ? `WICHTIG - Diese Allergien/Unverträglichkeiten MÜSSEN vermieden werden: ${preferences.allergies.join(', ')}`
      : 'Keine Allergien';

    const dislikedText = preferences.dislikedIngredients && preferences.dislikedIngredients.length > 0
      ? `Diese Zutaten vermeiden: ${preferences.dislikedIngredients.join(', ')}`
      : '';

    const cuisinesText = preferences.preferredCuisines && preferences.preferredCuisines.length > 0
      ? `Bevorzugte Küchen: ${preferences.preferredCuisines.join(', ')}`
      : 'Alle Küchen-Stile erlaubt';

    const systemPrompt = `Du bist ein professioneller Meal-Planning-Experte und Muttersprachler Deutsch. Erstelle 7 verschiedene, ausgewogene Rezepte für eine komplette Woche (Montag bis Sonntag).

WICHTIGE REGELN:
1. Abwechslung: Verschiedene Küchen-Stile über die Woche verteilen
2. Balance: Nicht zu viel Fleisch (max 3-4 Fleisch-Gerichte pro Woche)
3. Diät-Typ: ${dietText}
4. Fleisch: ${meatText}
5. Kochzeit: ${cookingTimeText}
6. ${allergiesText}
${dislikedText ? `7. ${dislikedText}` : ''}
8. Küchen: ${cuisinesText}
9. Portionen: ${preferences.householdSize} Personen pro Rezept

QUALITÄTS-ANFORDERUNGEN:
- Verwende KONSISTENTE deutsche Einheiten: "g" (Gramm), "kg" (Kilogramm), "ml" (Milliliter), "l" (Liter), "TL" (Teelöffel), "EL" (Esslöffel), "Stk" (Stück), "Glas" (Glas), "Bund" (Bund), "Packung" (Packung)
- KONSISTENTE Zutat-Benennung: Nutze IMMER die gleiche Form (z.B. "Tomaten" nicht "Tomate" und "Tomaten" gemischt)
- Realistische Mengen: Für ${preferences.householdSize} ${preferences.householdSize === 1 ? 'Person' : 'Personen'} angemessene Portionsgrößen
- Korrekte deutsche Rechtschreibung und Grammatik: "Glas" nicht "G", "Gurke" nicht "urke", "Basilikum" nicht "basilikum"
- Einkaufsliste-Format: Verwende vollständige Wörter für Einheiten (z.B. "1 Glas Basilikumpesto" nicht "1 G las basilikumpesto", "1 Gurke" nicht "1 G urke")
- Alle Mengenangaben müssen mathematisch korrekt für ${preferences.householdSize} Personen sein

Antworte NUR mit einem gültigen JSON-Objekt in diesem Format:
{
  "recipes": [
    {
      "day": "monday",
      "recipeName": "Name des Gerichts",
      "stats": { "time": "z.B. 25 Min", "calories": "z.B. 450 kcal", "difficulty": "Einfach/Mittel/Schwer" },
      "ingredients": ["2 große Tomaten", "150g Feta-Käse", "2 EL Olivenöl"],
      "shoppingList": ["1 Packung Feta-Käse (ca. 150g)", "1 Bund Rucola (ca. 50g)"],
      "instructions": ["Schritt 1", "Schritt 2"],
      "chefTip": "Ein kurzer Profi-Tipp",
      "cuisine": "Italienisch",
      "proteinType": "vegetarisch"
    },
    ... (weitere 6 Rezepte für tuesday bis sunday)
  ]
}

WICHTIG:
- Jedes Rezept muss für genau ${preferences.householdSize} ${preferences.householdSize === 1 ? 'Person' : 'Personen'} sein
- Alle Mengenangaben müssen passend für ${preferences.householdSize} Personen sein (wenn für 2 Personen normalerweise "4 Eier", dann für ${preferences.householdSize} Personen entsprechend anpassen)
- "proteinType" kann sein: "fleisch", "fisch", "vegetarisch", "vegan"
- Verteile die proteinTypes ausgewogen (nicht 5x Fleisch)
- Verschiedene Küchen-Stile verwenden
- Realistische Kalorien-Angaben pro Portion
- KONSISTENTE Einheiten und Zutat-Namen verwenden`;

    const userPrompt = `Erstelle 7 ausgewogene Rezepte für eine Woche:
- Diät: ${dietText}
- Fleisch: ${meatText}
- Kochzeit: ${cookingTimeText}
- Personen: ${preferences.householdSize}
- Allergien: ${preferences.allergies?.join(', ') || 'Keine'}
${dislikedText ? `- Vermeide: ${preferences.dislikedIngredients?.join(', ')}` : ''}
- Küchen: ${preferences.preferredCuisines?.join(', ') || 'Alle'}

Stelle sicher, dass die Woche ausgewogen ist (nicht zu viel Fleisch, verschiedene Küchen, abwechslungsreich).`;

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

    if (!weekData.recipes || !Array.isArray(weekData.recipes) || weekData.recipes.length !== 7) {
      return { error: 'Ungültiges Format. Die KI sollte 7 Rezepte zurückgeben.' };
    }

    // Speichere jedes Rezept TEMPORÄR (nur für Wochenplan, nicht in "Meine Rezepte")
    // Verwende eine temporäre ID-Struktur, die nicht in der Result-Tabelle gespeichert wird
    const savedRecipes: Array<{ recipe: any; resultId: string; isTemporary: boolean }> = [];
    
    for (const recipeData of weekData.recipes) {
      try {
        // Validiere Rezept
        if (!recipeData.recipeName || !recipeData.ingredients || !recipeData.instructions) {
          console.warn(`[WEEK-PLANNING-AI] ⚠️ Ungültiges Rezept für ${recipeData.day}, überspringe...`);
          continue;
        }

        // TEMPORÄR: Speichere in Result-Tabelle mit Flag, dass es nur für Wochenplan ist
        // Später können User es in "Meine Rezepte" verschieben
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
            isTemporary: true, // Flag für temporäre Rezepte
            weekStart: new Date().toISOString().split('T')[0] // Aktuelle Woche
          })
        );

        if (result.success && result.result) {
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

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;

/**
 * Erstellt einen Wochenplan (Mo–So) per AI und speichert ihn als Draft-Rezepte + Kalender-Events (nächste Woche).
 * Nutzt Präferenzen aus dem Wizard (Diät, Budget, Kochzeit, Allergien).
 */
export async function generateMealPlan(preferences: MealPlanPreferences) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false as const, error: 'Nicht angemeldet' };
  }

  const isPremium = await isUserPremium();
  if (!isPremium) {
    return { success: false as const, error: 'PREMIUM_REQUIRED', message: 'Premium-Feature. Bitte upgrade deinen Account.' };
  }

  const dietType = preferences.dietType ?? 'alles';
  const householdSize = preferences.householdSize ?? 2;
  const allergies = preferences.allergies ?? [];
  const meatSelection = preferences.meatSelection ?? [];
  const cookingTime = preferences.cookingTime ?? 'normal';
  const preferredCuisines = preferences.preferredCuisines ?? [];
  const dislikedIngredients = preferences.dislikedIngredients ?? [];

  const dietText = dietType === 'alles' ? 'Alle Diät-Typen erlaubt' : dietType === 'vegetarisch' ? 'Vegetarisch' : dietType === 'vegan' ? 'Vegan' : dietType;
  const meatText = meatSelection.length > 0 ? `Bevorzugte Fleischsorten: ${meatSelection.join(', ')}` : dietType === 'alles' ? 'Alle Fleischsorten erlaubt' : 'Kein Fleisch';
  const cookingTimeText = cookingTime === 'schnell' ? 'Schnelle Gerichte (<30 Min)' : cookingTime === 'normal' ? 'Normale Kochzeit (30-60 Min)' : 'Aufwendige Gerichte (>60 Min)';
  const allergiesText = allergies.length > 0 ? `WICHTIG - Diese Allergien MÜSSEN vermieden werden: ${allergies.join(', ')}` : 'Keine Allergien';
  const dislikedText = dislikedIngredients.length > 0 ? `Diese Zutaten vermeiden: ${dislikedIngredients.join(', ')}` : '';
  const cuisinesText = preferredCuisines.length > 0 ? preferredCuisines.join(', ') : 'Alle Küchen-Stile erlaubt';

  const systemPrompt = `Du bist ein professioneller Meal-Planning-Experte und Muttersprachler Deutsch.
Erstelle einen Wochenplan (Montag bis Sonntag) basierend auf diesen Präferenzen.
Gib JSON zurück mit: Tag (monday–sunday), Gericht-Name, Kurzbeschreibung, geschätzte Kalorien – und für jedes Gericht ein vollständiges Rezept (Zutaten, Zubereitung), damit es als Draft gespeichert werden kann.

REGELN:
- Diät: ${dietText}
- Fleisch: ${meatText}
- Kochzeit: ${cookingTimeText}
- ${allergiesText}
${dislikedText ? `- Vermeide: ${dislikedText}` : ''}
- Küchen: ${cuisinesText}
- Portionen: ${householdSize} ${householdSize === 1 ? 'Person' : 'Personen'}

Antworte NUR mit einem gültigen JSON-Objekt in diesem Format:
{
  "recipes": [
    {
      "day": "monday",
      "recipeName": "Name des Gerichts",
      "shortDescription": "Eine kurze Beschreibung in 1–2 Sätzen",
      "stats": { "time": "z.B. 25 Min", "calories": "z.B. 450 kcal", "difficulty": "Einfach/Mittel/Schwer" },
      "ingredients": ["2 große Tomaten", "150g Feta-Käse"],
      "shoppingList": ["1 Packung Feta-Käse (ca. 150g)"],
      "instructions": ["Schritt 1", "Schritt 2"],
      "chefTip": "Ein kurzer Profi-Tipp",
      "cuisine": "Italienisch",
      "proteinType": "vegetarisch"
    },
    ... (weitere 6 Rezepte für tuesday bis sunday)
  ]
}

WICHTIG: Genau 7 Rezepte, eines pro Tag (monday bis sunday). Realistische Kalorien und Mengen für ${householdSize} Personen.`;

  const userPrompt = `Erstelle einen Wochenplan (Mo–So) basierend auf:
- Diät: ${dietText}
- Fleisch: ${meatText}
- Kochzeit: ${cookingTimeText}
- Personen: ${householdSize}
- Allergien: ${allergies.join(', ') || 'Keine'}
${dislikedText ? `- Vermeide: ${dislikedIngredients.join(', ')}` : ''}
- Küchen: ${cuisinesText}

Gib 7 Rezepte zurück (Tag, Gericht-Name, Kurzbeschreibung, Kalorien, Zutaten, Zubereitung).`;

  try {
    console.log('[WEEK-PLANNING-AI] generateMealPlan: Generiere 7 Gerichte...');
    const response = await createChatCompletion(
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      },
      'recipe',
      'Wochenplaner Wizard'
    );

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      return { success: false as const, error: 'Keine Antwort von der KI erhalten.' };
    }

    let weekData: { recipes: Array<{ day: string; recipeName: string; shortDescription?: string; stats?: { time?: string; calories?: string }; ingredients?: string[]; instructions?: string[]; [key: string]: unknown }> };
    try {
      weekData = JSON.parse(content);
    } catch {
      return { success: false as const, error: 'Ungültiges Format von der KI. Bitte erneut versuchen.' };
    }

    if (!weekData?.recipes || !Array.isArray(weekData.recipes) || weekData.recipes.length < 7) {
      return { success: false as const, error: 'Die KI hat nicht 7 Rezepte zurückgegeben.' };
    }

    const savedRecipes: Array<{ day: string; resultId: string; title: string }> = [];
    for (const recipeData of weekData.recipes) {
      if (!recipeData.recipeName) continue;
      const result = await saveResult(
        'recipe',
        'Gourmet-Planer',
        JSON.stringify({
          ...recipeData,
          recipeName: recipeData.recipeName,
          stats: recipeData.stats ?? { time: '30 Min', calories: '400 kcal', difficulty: 'Einfach' },
          ingredients: recipeData.ingredients ?? [],
          instructions: recipeData.instructions ?? [],
        }),
        undefined,
        recipeData.recipeName,
        JSON.stringify({ source: 'wizard-meal-plan', day: recipeData.day, isDraft: true })
      );
      if (result.success && result.result) {
        savedRecipes.push({
          day: recipeData.day,
          resultId: result.result.id,
          title: recipeData.recipeName,
        });
      }
    }

    if (savedRecipes.length === 0) {
      return { success: false as const, error: 'Keine Rezepte konnten gespeichert werden.' };
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(nextMonday);
      d.setDate(nextMonday.getDate() + i);
      weekDates.push(d.toISOString().split('T')[0]);
    }

    const sorted = [...savedRecipes].sort(
      (a, b) => DAY_ORDER.indexOf(a.day as (typeof DAY_ORDER)[number]) - DAY_ORDER.indexOf(b.day as (typeof DAY_ORDER)[number])
    );
    const entries = sorted.slice(0, 7).map((r, i) => ({
      date: weekDates[i]!,
      resultId: r.resultId,
      title: r.title,
      mealType: 'dinner' as const,
    }));

    const saveResult_ = await saveWeeklyPlan(entries);
    if (!saveResult_.success) {
      return { success: false as const, error: saveResult_.error ?? 'Kalender konnte nicht aktualisiert werden.' };
    }

    console.log('[WEEK-PLANNING-AI] generateMealPlan: Plan erstellt und im Kalender gespeichert.');
    return { success: true as const };
  } catch (error) {
    console.error('[WEEK-PLANNING-AI] generateMealPlan:', error);
    return {
      success: false as const,
      error: error instanceof Error ? error.message : 'Fehler bei der Planerstellung.',
    };
  }
}
