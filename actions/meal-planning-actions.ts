'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { isUserPremium } from '@/lib/subscription';
import { createChatCompletion } from '@/lib/openai-wrapper';
import { generateWeekRecipes } from './week-planning-ai';

/** Multi-Meal: Slot pro Tag (Frühstück, Mittag, Abend, Snack) */
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/** Ein Eintrag pro Mahlzeit (Rezept + Feedback) */
export type MealEntry = {
  recipeId?: string;
  resultId: string;
  feedback: 'positive' | 'negative' | null;
  recipe?: any;
  mealType?: MealSlot; // Default DINNER wenn nicht angegeben
};

/** Pro Tag bis zu 4 Slots – Backend-Struktur für planData */
export type DayMeals = {
  breakfast?: MealEntry;
  lunch?: MealEntry;
  dinner?: MealEntry;
  snack?: MealEntry;
};

/** Prüft ob ein Wert das neue DayMeals-Format hat (Slots als Keys) */
function isDayMeals(val: any): val is DayMeals {
  if (!val || typeof val !== 'object') return false;
  const keys = Object.keys(val);
  return keys.some((k) => ['breakfast', 'lunch', 'dinner', 'snack'].includes(k));
}

/** Normalisiert planData aus der DB: Legacy (ein Objekt pro Tag) → DayMeals pro Tag */
function normalizePlanDataToDayMeals(raw: Record<string, any>): Record<string, DayMeals> {
  const out: Record<string, DayMeals> = {};
  for (const [dateKey, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue;
    if (isDayMeals(entry)) {
      out[dateKey] = entry as DayMeals;
      continue;
    }
    // Legacy: ein Rezept pro Tag → als dinner speichern
    if (entry.resultId != null) {
      out[dateKey] = {
        dinner: {
          recipeId: entry.recipeId,
          resultId: entry.resultId,
          feedback: entry.feedback ?? null,
          recipe: entry.recipe,
          mealType: 'dinner',
        },
      };
    }
  }
  return out;
}

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
  meatSelection?: string[];
  cookingTime?: string;
  cookingRhythm?: string; // 'daily_fresh' | 'quick_dirty' | 'meal_prep'
  filters?: string[]; // Basis/Lifestyle/Ziele/Situation (z.B. Halal, Vegetarisch, High Protein)
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Nicht angemeldet' };
  }

  try {
    const allergiesJson = preferences.allergies ? JSON.stringify(preferences.allergies) : null;
    const mealTypesJson = preferences.mealTypes ? JSON.stringify(preferences.mealTypes) : null;
    const dislikedIngredientsJson = preferences.dislikedIngredients ? JSON.stringify(preferences.dislikedIngredients) : null;
    const extendedCuisines = {
      cuisines: preferences.preferredCuisines || [],
      meatSelection: preferences.meatSelection || [],
      cookingTime: preferences.cookingTime || null,
      cookingRhythm: preferences.cookingRhythm || null,
      filters: preferences.filters || [],
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

    let parsedCuisines: any = [];
    let meatSelection: string[] = [];
    let cookingTime: string | null = null;
    let cookingRhythm: string | null = null;
    let filters: string[] = [];

    if (prefs.preferredCuisines) {
      try {
        const parsed = JSON.parse(prefs.preferredCuisines);
        if (parsed.cuisines) {
          parsedCuisines = parsed.cuisines;
          meatSelection = parsed.meatSelection || [];
          cookingTime = parsed.cookingTime || null;
          cookingRhythm = parsed.cookingRhythm || null;
          filters = Array.isArray(parsed.filters) ? parsed.filters : [];
        } else {
          parsedCuisines = Array.isArray(parsed) ? parsed : [];
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
      cookingRhythm,
      filters,
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
    // Die Rezepte enthalten bereits das vollständige Recipe-Objekt

    // Direktes Mapping: Jedes generierte Rezept hat bereits einen Tag zugewiesen (Multi-Meal: dinner pro Tag)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const plan: Record<string, DayMeals> = {};
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      const dayName = days[i];

      const recipeForDay = recipes.find(r => r.recipe.day === dayName);
      if (recipeForDay) {
        plan[dateKey] = {
          dinner: {
            recipeId: recipeForDay.resultId,
            resultId: recipeForDay.resultId,
            feedback: null,
            recipe: recipeForDay.recipe,
            mealType: 'dinner',
          },
        };
      } else {
        console.warn(`[MEAL-PLANNING] ⚠️ Kein Rezept für ${dayName} gefunden`);
      }
    }

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
    // Auto-Delete: Lösche Pläne älter als 7 Tage
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    await prisma.weeklyPlan.deleteMany({
      where: {
        userId: session.user.id,
        weekStart: {
          lt: sevenDaysAgo,
        },
      },
    });

    // Normalisiere weekStart auf Montag 00:00:00 für exakte Übereinstimmung
    const normalizedWeekStart = new Date(weekStart);
    normalizedWeekStart.setHours(0, 0, 0, 0);
    // Stelle sicher, dass es Montag ist
    const dayOfWeek = normalizedWeekStart.getDay();
    const diff = normalizedWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is Sunday
    normalizedWeekStart.setDate(diff);

    console.log('[MEAL-PLANNING] 🔍 Suche Plan für Woche:', normalizedWeekStart.toISOString().split('T')[0]);

    const plan = await prisma.weeklyPlan.findUnique({
      where: {
        userId_weekStart: {
          userId: session.user.id,
          weekStart: normalizedWeekStart,
        },
      },
    });

    if (!plan) {
      console.log('[MEAL-PLANNING] ⚠️ Kein Plan gefunden für:', normalizedWeekStart.toISOString().split('T')[0]);
      return null;
    }

    const rawPlanData = JSON.parse(plan.planData) as Record<string, any>;
    const planData = normalizePlanDataToDayMeals(rawPlanData);
    console.log('[MEAL-PLANNING] ✅ Plan gefunden:', plan.id, 'mit', Object.keys(planData).length, 'Tagen (Multi-Meal)');
    return {
      ...plan,
      planData,
    };
  } catch (error) {
    console.error('[MEAL-PLANNING] ❌ Error fetching weekly plan:', error);
    return null;
  }
}

// Feedback für Wochentag + Slot speichern (Multi-Meal)
export async function saveDayFeedback(
  weekStart: Date,
  dateKey: string,
  feedback: 'positive' | 'negative',
  mealType: MealSlot = 'dinner'
) {
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

    const rawPlanData = JSON.parse(plan.planData) as Record<string, any>;
    const planData = normalizePlanDataToDayMeals(rawPlanData);

    if (!planData[dateKey]) {
      planData[dateKey] = {};
    }
    if (!planData[dateKey][mealType]) {
      planData[dateKey][mealType] = { resultId: '', feedback: null, mealType };
    }
    planData[dateKey][mealType]!.feedback = feedback;

    // Zähle positive Feedbacks über alle Tage und Slots
    let totalFeedback = 0;
    for (const day of Object.values(planData)) {
      for (const slot of Object.values(day)) {
        if (slot?.feedback === 'positive') totalFeedback++;
      }
    }

    await prisma.weeklyPlan.update({
      where: { id: plan.id },
      data: {
        planData: JSON.stringify(planData),
        totalFeedback,
        updatedAt: new Date(),
      },
    });

    console.log(`[MEAL-PLANNING] ✅ Feedback für ${dateKey}/${mealType} gespeichert`);
    return { success: true };
  } catch (error) {
    console.error('Error saving day feedback:', error);
    return { error: 'Fehler beim Speichern des Feedbacks' };
  }
}

// Wochenplan explizit speichern
export async function saveWeeklyPlan(weekStart: Date, planData: Record<string, any>, workspaceId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Nicht angemeldet' };
  }

  try {
    // Normalisiere weekStart auf Montag 00:00:00 für exakte Übereinstimmung
    const normalizedWeekStart = new Date(weekStart);
    normalizedWeekStart.setHours(0, 0, 0, 0);
    // Stelle sicher, dass es Montag ist
    const dayOfWeek = normalizedWeekStart.getDay();
    const diff = normalizedWeekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // adjust when day is Sunday
    normalizedWeekStart.setDate(diff);

    const weekEnd = new Date(normalizedWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Normalisiere auf Multi-Meal (DayMeals pro Tag), falls Frontend noch Legacy sendet
    const normalized = normalizePlanDataToDayMeals(planData);
    console.log('[MEAL-PLANNING] 💾 Speichere Plan für Woche:', normalizedWeekStart.toISOString().split('T')[0], 'mit', Object.keys(normalized).length, 'Tagen (Multi-Meal)');

    await prisma.weeklyPlan.upsert({
      where: {
        userId_weekStart: {
          userId: session.user.id,
          weekStart: normalizedWeekStart,
        },
      },
      create: {
        userId: session.user.id,
        workspaceId: workspaceId || null,
        weekStart: normalizedWeekStart,
        weekEnd: weekEnd,
        planData: JSON.stringify(normalized),
        autoPlanned: false,
      },
      update: {
        planData: JSON.stringify(normalized),
        updatedAt: new Date(),
      },
    });

    console.log('[MEAL-PLANNING] ✅ Wochenplan explizit gespeichert für:', normalizedWeekStart.toISOString().split('T')[0]);
    return { success: true };
  } catch (error) {
    console.error('[MEAL-PLANNING] ❌ Fehler beim Speichern des Wochenplans:', error);
    return { error: 'Fehler beim Speichern des Wochenplans' };
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
