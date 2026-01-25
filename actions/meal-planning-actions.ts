'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isUserPremium } from '@/lib/subscription';
import { createChatCompletion } from '@/lib/openai-wrapper';

// Meal Preferences speichern/aktualisieren
export async function saveMealPreferences(preferences: {
  dietType?: string;
  allergies?: string[];
  householdSize?: number;
  budgetRange?: string;
  mealTypes?: string[];
  mealPrep?: boolean;
  cookingLevel?: string;
  preferredCuisines?: string[];
  dislikedIngredients?: string[];
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Nicht angemeldet' };
  }

  try {
    const allergiesJson = preferences.allergies ? JSON.stringify(preferences.allergies) : null;
    const mealTypesJson = preferences.mealTypes ? JSON.stringify(preferences.mealTypes) : null;
    const preferredCuisinesJson = preferences.preferredCuisines ? JSON.stringify(preferences.preferredCuisines) : null;
    const dislikedIngredientsJson = preferences.dislikedIngredients ? JSON.stringify(preferences.dislikedIngredients) : null;

    await prisma.mealPreferences.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        dietType: preferences.dietType || null,
        allergies: allergiesJson,
        householdSize: preferences.householdSize || 2,
        budgetRange: preferences.budgetRange || null,
        mealTypes: mealTypesJson,
        mealPrep: preferences.mealPrep || false,
        cookingLevel: preferences.cookingLevel || null,
        preferredCuisines: preferredCuisinesJson,
        dislikedIngredients: dislikedIngredientsJson,
      },
      update: {
        dietType: preferences.dietType || null,
        allergies: allergiesJson,
        householdSize: preferences.householdSize || 2,
        budgetRange: preferences.budgetRange || null,
        mealTypes: mealTypesJson,
        mealPrep: preferences.mealPrep || false,
        cookingLevel: preferences.cookingLevel || null,
        preferredCuisines: preferredCuisinesJson,
        dislikedIngredients: dislikedIngredientsJson,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error saving meal preferences:', error);
    return { error: 'Fehler beim Speichern der Präferenzen' };
  }
}

// Meal Preferences abrufen
export async function getMealPreferences() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const prefs = await prisma.mealPreferences.findUnique({
      where: { userId: session.user.id },
    });

    if (!prefs) return null;

    return {
      ...prefs,
      allergies: prefs.allergies ? JSON.parse(prefs.allergies) : [],
      mealTypes: prefs.mealTypes ? JSON.parse(prefs.mealTypes) : [],
      preferredCuisines: prefs.preferredCuisines ? JSON.parse(prefs.preferredCuisines) : [],
      dislikedIngredients: prefs.dislikedIngredients ? JSON.parse(prefs.dislikedIngredients) : [],
    };
  } catch (error) {
    console.error('Error fetching meal preferences:', error);
    return null;
  }
}

// Auto-Planning: AI generiert Wochenplan
export async function autoPlanWeek(weekStart: Date, workspaceId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Nicht angemeldet' };
  }

  const isPremium = await isUserPremium();
  if (!isPremium) {
    return { error: 'PREMIUM_REQUIRED', message: 'Premium-Feature. Bitte upgrade deinen Account.' };
  }

  try {
    // Prüfe ob MealPreferences Tabelle existiert (Migration)
    try {
      await prisma.$queryRaw`SELECT 1 FROM "MealPreferences" LIMIT 1`;
    } catch (tableError: any) {
      if (tableError.code === '42P01' || tableError.message?.includes('does not exist')) {
        console.error('[MEAL-PLANNING] ❌ MealPreferences Tabelle existiert nicht. Migration ausführen!');
        return { error: 'Datenbank-Migration fehlt. Bitte kontaktiere den Support.' };
      }
      throw tableError;
    }

    // Hole User-Präferenzen
    const preferences = await getMealPreferences();

    // Hole verfügbare Rezepte
    const recipes = await prisma.result.findMany({
      where: {
        userId: session.user.id,
        toolId: 'recipe',
        workspaceId: workspaceId || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Maximal 50 Rezepte für Planung
    });

    if (recipes.length === 0) {
      return { error: 'Keine Rezepte gefunden. Erstelle zuerst einige Rezepte!' };
    }

    // Parse Rezepte
    const parsedRecipes = recipes
      .map(r => {
        try {
          const recipe = JSON.parse(r.content);
          return {
            id: r.id,
            name: recipe.recipeName || 'Rezept',
            ingredients: recipe.ingredients || [],
            stats: recipe.stats || {},
            shoppingList: recipe.shoppingList || [],
          };
        } catch {
          return null;
        }
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (parsedRecipes.length === 0) {
      return { error: 'Keine gültigen Rezepte gefunden. Erstelle zuerst einige Rezepte!' };
    }

    // AI-Prompt für Wochenplanung
    const preferencesText = preferences ? `
Präferenzen:
- Diät: ${preferences.dietType || 'keine'}
- Allergien: ${preferences.allergies?.join(', ') || 'keine'}
- Haushaltsgröße: ${preferences.householdSize} Personen
- Budget: ${preferences.budgetRange || 'medium'}
- Meal-Types: ${preferences.mealTypes?.join(', ') || 'abendessen'}
- Meal-Prep: ${preferences.mealPrep ? 'ja' : 'nein'}
- Koch-Level: ${preferences.cookingLevel || 'fortgeschritten'}
- Bevorzugte Küchen: ${preferences.preferredCuisines?.join(', ') || 'alle'}
- Nicht gemochte Zutaten: ${preferences.dislikedIngredients?.join(', ') || 'keine'}
` : 'Keine Präferenzen gesetzt.';

    const recipesText = parsedRecipes.map((r, i) => 
      `${i + 1}. ${r.name} (${r.stats.time || 'N/A'}, ${r.stats.calories || 'N/A'})`
    ).join('\n');

    const prompt = `Du bist ein intelligenter Meal-Planning-Assistent. Plane eine ausgewogene Woche basierend auf den User-Präferenzen und verfügbaren Rezepten.

${preferencesText}

Verfügbare Rezepte:
${recipesText}

WICHTIGE REGELN:
1. Abwechslung: Maximal 1x gleiche Proteinquelle pro Woche (z.B. nicht 3x Hühnchen)
2. Nährwert-Balance: Abwechslung zwischen leichten und sättigenden Gerichten
3. Budget-Optimierung: Kombiniere teure Rezepte mit günstigen Beilagen
4. Seasonal-Intelligence: Berücksichtige die Jahreszeit (aktuell: ${new Date().toLocaleDateString('de-DE', { month: 'long' })})
5. Meal-Prep: ${preferences?.mealPrep ? 'Plane größere Portionen für Sonntag/Montag, die für mehrere Tage reichen' : 'Normale Portionen'}
6. Koch-Level: ${preferences?.cookingLevel === 'anfänger' ? 'Nur einfache Rezepte (15-30 Min)' : preferences?.cookingLevel === 'profi' ? 'Komplexe Rezepte erlaubt' : 'Mittlere Komplexität'}
7. Diät & Allergien: Respektiere alle Einschränkungen strikt

Antworte NUR mit einem JSON-Objekt im folgenden Format (kein zusätzlicher Text):
{
  "monday": { "recipeIndex": 0, "reason": "Warum dieses Rezept?" },
  "tuesday": { "recipeIndex": 1, "reason": "Warum dieses Rezept?" },
  "wednesday": { "recipeIndex": 2, "reason": "Warum dieses Rezept?" },
  "thursday": { "recipeIndex": 3, "reason": "Warum dieses Rezept?" },
  "friday": { "recipeIndex": 4, "reason": "Warum dieses Rezept?" },
  "saturday": { "recipeIndex": 5, "reason": "Warum dieses Rezept?" },
  "sunday": { "recipeIndex": 6, "reason": "Warum dieses Rezept?" }
}

recipeIndex bezieht sich auf die Position in der Rezepte-Liste (0-basiert).`;

    const response = await createChatCompletion(
      {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Du bist ein Meal-Planning-Experte. Antworte NUR mit gültigem JSON, kein zusätzlicher Text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      },
      'recipe',
      'Wochenplaner Auto-Planning'
    );

    // Parse AI-Response
    const responseContent = response.choices[0]?.message?.content?.trim();
    if (!responseContent) {
      console.error('[MEAL-PLANNING] ❌ Keine Response von AI erhalten');
      return { error: 'Keine Antwort von der KI erhalten. Bitte versuche es erneut.' };
    }

    let planData: any;
    try {
      // Entferne mögliche Markdown-Code-Blöcke
      const cleanedContent = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      planData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('[MEAL-PLANNING] ❌ JSON Parse Fehler:', parseError);
      console.error('[MEAL-PLANNING] ❌ Response Content:', responseContent);
      return { error: 'Ungültige Antwort von der KI. Bitte versuche es erneut.' };
    }

    // Konvertiere zu unserem Format
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const plan: Record<string, { recipeId: string; resultId: string; feedback: 'positive' | 'negative' | null }> = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];

      const dayPlan = planData[days[i]];
      if (dayPlan && typeof dayPlan.recipeIndex === 'number') {
        const recipeIndex = dayPlan.recipeIndex;
        if (recipeIndex >= 0 && recipeIndex < parsedRecipes.length) {
          const recipe = parsedRecipes[recipeIndex];
          plan[dateKey] = {
            recipeId: recipe.id,
            resultId: recipe.id,
            feedback: null,
          };
        } else {
          console.warn(`[MEAL-PLANNING] ⚠️ Ungültiger recipeIndex ${recipeIndex} für ${days[i]}. Verfügbare Rezepte: ${parsedRecipes.length}`);
        }
      } else {
        console.warn(`[MEAL-PLANNING] ⚠️ Kein Plan für ${days[i]} gefunden`);
      }
    }

    // Prüfe ob mindestens ein Tag geplant wurde
    if (Object.keys(plan).length === 0) {
      console.error('[MEAL-PLANNING] ❌ Keine Rezepte konnten zugeordnet werden');
      return { error: 'Die KI konnte keine Rezepte für die Woche zuordnen. Bitte versuche es erneut.' };
    }

    // Speichere Wochenplan
    await prisma.weeklyPlan.upsert({
      where: {
        userId_weekStart: {
          userId: session.user.id,
          weekStart: weekStart,
        },
      },
      create: {
        userId: session.user.id,
        workspaceId: workspaceId || null,
        weekStart: weekStart,
        weekEnd: weekEnd,
        planData: JSON.stringify(plan),
        autoPlanned: true,
      },
      update: {
        planData: JSON.stringify(plan),
        autoPlanned: true,
      },
    });

    console.log(`[MEAL-PLANNING] ✅ Woche erfolgreich geplant: ${Object.keys(plan).length} Tage`);
    return { success: true, plan };
  } catch (error) {
    console.error('[MEAL-PLANNING] ❌ Fehler bei Auto-Planning:', error);
    if (error instanceof Error) {
      console.error('[MEAL-PLANNING] ❌ Error Message:', error.message);
      console.error('[MEAL-PLANNING] ❌ Error Stack:', error.stack);
      return { error: `Fehler bei der automatischen Planung: ${error.message}` };
    }
    return { error: 'Fehler bei der automatischen Planung' };
  }
}

// Wochenplan abrufen
export async function getWeeklyPlan(weekStart: Date) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  try {
    const plan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId: session.user.id,
          weekStart: weekStart,
        },
      },
    });

    if (!plan) return null;

    return {
      ...plan,
      planData: JSON.parse(plan.planData),
    };
  } catch (error) {
    console.error('Error fetching weekly plan:', error);
    return null;
  }
}

// Feedback für Wochentag speichern
export async function saveDayFeedback(weekStart: Date, dateKey: string, feedback: 'positive' | 'negative') {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Nicht angemeldet' };
  }

  try {
    const plan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId: session.user.id,
          weekStart: weekStart,
        },
      },
    });

    if (!plan) {
      return { error: 'Wochenplan nicht gefunden' };
    }

    const planData = JSON.parse(plan.planData);
    if (planData[dateKey]) {
      planData[dateKey].feedback = feedback;
    }

    // Zähle positive Feedbacks
    const totalFeedback = Object.values(planData).filter(
      (day: any) => day.feedback === 'positive'
    ).length;

    await prisma.weeklyPlan.update({
      where: { id: plan.id },
      data: {
        planData: JSON.stringify(planData),
        totalFeedback,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error saving day feedback:', error);
    return { error: 'Fehler beim Speichern des Feedbacks' };
  }
}

// Trial-Zähler prüfen (3 kostenlose Auto-Planungen)
export async function getAutoPlanTrialCount() {
  const session = await auth();
  if (!session?.user?.id) {
    return { count: 0, remaining: 0 };
  }

  try {
    const count = await prisma.weeklyPlan.count({
      where: {
        userId: session.user.id,
        autoPlanned: true,
      },
    });

    return { count, remaining: Math.max(0, 3 - count) };
  } catch (error) {
    return { count: 0, remaining: 0 };
  }
}

// Premium-Status abrufen (für Client Components)
export async function getPremiumStatus() {
  return await isUserPremium();
}
