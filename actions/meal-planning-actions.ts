'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isUserPremium } from '@/lib/subscription';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { generateWeekRecipes } from './week-planning-ai';

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
  meatSelection?: string[]; // Neu
  cookingTime?: string; // Neu
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
    // Speichere meatSelection und cookingTime in preferredCuisines als erweitertes JSON (temporär, bis Schema erweitert)
    const extendedCuisines = {
      cuisines: preferences.preferredCuisines || [],
      meatSelection: preferences.meatSelection || [],
      cookingTime: preferences.cookingTime || null,
    };
    const extendedCuisinesJson = JSON.stringify(extendedCuisines);

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
        preferredCuisines: extendedCuisinesJson,
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
        preferredCuisines: extendedCuisinesJson,
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

    // Parse extended cuisines (kann altes Format oder neues Format sein)
    let parsedCuisines: any = [];
    let meatSelection: string[] = [];
    let cookingTime: string | null = null;
    
    if (prefs.preferredCuisines) {
      try {
        const parsed = JSON.parse(prefs.preferredCuisines);
        if (parsed.cuisines) {
          // Neues erweitertes Format
          parsedCuisines = parsed.cuisines;
          meatSelection = parsed.meatSelection || [];
          cookingTime = parsed.cookingTime || null;
        } else {
          // Altes Format (nur Array)
          parsedCuisines = parsed;
        }
      } catch {
        parsedCuisines = [];
      }
    }
    
    return {
      ...prefs,
      allergies: prefs.allergies ? JSON.parse(prefs.allergies) : [],
      mealTypes: prefs.mealTypes ? JSON.parse(prefs.mealTypes) : [],
      preferredCuisines: parsedCuisines,
      dislikedIngredients: prefs.dislikedIngredients ? JSON.parse(prefs.dislikedIngredients) : [],
      meatSelection,
      cookingTime,
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
    if (!preferences) {
      return { error: 'Keine Präferenzen gefunden. Bitte richte zuerst deine Präferenzen ein.' };
    }

    console.log('[MEAL-PLANNING] 🎨 Generiere 7 neue Rezepte mit AI...');
    
    // NEU: Generiere 7 neue Rezepte mit AI
    const generationResult = await generateWeekRecipes(workspaceId);
    if (generationResult.error) {
      return generationResult;
    }

    if (!generationResult.recipes || generationResult.recipes.length === 0) {
      return { error: 'Keine Rezepte konnten generiert werden.' };
    }

    const recipes = generationResult.recipes;
    console.log(`[MEAL-PLANNING] ✅ ${recipes.length} neue Rezepte generiert`);

    // Rezepte sind bereits im richtigen Format (von generateWeekRecipes)
    // Jedes Rezept hat bereits einen Tag zugewiesen (monday, tuesday, etc.)
    const parsedRecipes = recipes.map(r => ({
      id: r.resultId,
      name: r.recipe.recipeName || 'Rezept',
      ingredients: r.recipe.ingredients || [],
      stats: r.recipe.stats || {},
      shoppingList: r.recipe.shoppingList || [],
      day: r.recipe.day,
      cuisine: r.recipe.cuisine,
      proteinType: r.recipe.proteinType,
    }));

    // Direktes Mapping: Jedes generierte Rezept hat bereits einen Tag zugewiesen
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const plan: Record<string, { recipeId: string; resultId: string; feedback: 'positive' | 'negative' | null }> = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    // Mappe generierte Rezepte direkt zu Tagen
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      const dayName = days[i];

      // Finde Rezept für diesen Tag
      const recipeForDay = parsedRecipes.find(r => r.day === dayName);
      if (recipeForDay) {
        plan[dateKey] = {
          recipeId: recipeForDay.id,
          resultId: recipeForDay.id,
          feedback: null,
        };
      } else {
        console.warn(`[MEAL-PLANNING] ⚠️ Kein Rezept für ${dayName} gefunden`);
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
