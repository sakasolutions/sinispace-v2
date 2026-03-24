'use client';

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import {
  ArrowLeft,
  Clock,
  ChefHat,
  Minus,
  Plus,
  AlertCircle,
  RotateCcw,
  Play,
  CheckCircle2,
  Lightbulb,
  Flame,
  Share2,
  ShoppingBasket,
  UtensilsCrossed,
  CalendarDays,
  X,
  Circle,
  ChevronRight,
  PartyPopper,
} from 'lucide-react';
import {
  AddToShoppingListModal,
  type AddToShoppingListSuccessPayload,
} from '@/components/recipe/add-to-shopping-list-modal';
import { scheduleSingleRecipe } from '@/actions/calendar-actions';
import { cn } from '@/lib/utils';
import { parseIngredient, formatIngredientDisplay } from '@/lib/format-ingredient';

export type RecipeDetailRecipe = {
  recipeName: string;
  stats: {
    time: string;
    calories: string | number;
    difficulty: string;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  ingredients: string[];
  shoppingList: string[];
  instructions: string[];
  chefTip: string;
  imageUrl?: string | null;
  imageCredit?: string | null;
};

export interface RecipeDetailViewProps {
  recipe: RecipeDetailRecipe;
  resultId: string;
  createdAt: Date;
  onBack: () => void;
  fromWeekPlan?: boolean; // Kommt aus Wochenplan?
  onSaveToCollection?: () => void;
  /** Wenn true: kein eigenes Hero-Bild (wird von DashboardShell / page.tsx geliefert). */
  embedHeroInParent?: boolean;
}

/** Glass-Elemente: einheitliche Handschrift wie Dashboard/Gourmet (mobil + Desktop) */
const RECIPE_GLASS_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 12px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.06)',
  WebkitBackdropFilter: 'blur(12px)',
  backdropFilter: 'blur(12px)',
};

export type IngredientRow = {
  /** Stabil über Portionen (p-0, s-1, u-2), damit isAvailable erhalten bleibt. */
  id: string;
  /** Angezeigter / für SmartCart genutzter Text (portionsskalierter String). */
  name: string;
  /** true = „Vorhanden“, false = „Fehlt noch“. */
  isAvailable: boolean;
};

function rebuildSplitRows(
  pantry: string[],
  shopping: string[],
  prev: IngredientRow[] | null
): IngredientRow[] {
  const rows: IngredientRow[] = [];
  pantry.forEach((name, i) => {
    const id = `p-${i}`;
    const prevRow = prev?.find((r) => r.id === id);
    rows.push({ id, name, isAvailable: prevRow?.isAvailable ?? true });
  });
  shopping.forEach((name, i) => {
    const id = `s-${i}`;
    const prevRow = prev?.find((r) => r.id === id);
    rows.push({ id, name, isAvailable: prevRow?.isAvailable ?? false });
  });
  return rows;
}

function rebuildUnifiedRows(ingredients: string[], prev: IngredientRow[] | null): IngredientRow[] {
  return ingredients.map((name, i) => {
    const id = `u-${i}`;
    const prevRow = prev?.find((r) => r.id === id);
    return { id, name, isAvailable: prevRow?.isAvailable ?? true };
  });
}

export function RecipeDetailView({
  recipe,
  resultId,
  createdAt,
  onBack,
  fromWeekPlan = false,
  onSaveToCollection,
  embedHeroInParent = false,
}: RecipeDetailViewProps) {
  // Original-Servings aus Recipe (normalerweise 2)
  const originalServings = 2;
  const [servings, setServings] = useState(originalServings);
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);
  /** Welche Zutaten im „Einkaufen“-Modal angezeigt werden: alle (vom Einkaufen-Button) oder nur fehlende (vom Auf Einkaufsliste-Button). */
  const [addToListIngredients, setAddToListIngredients] = useState<string[]>([]);
  /** Single source of truth für Vorhanden / Fehlt noch + SmartCart-Vorauswahl. */
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([]);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [cookingMode, setCookingMode] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduleMealType, setScheduleMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('dinner');
  const [isScheduling, setIsScheduling] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const lastResultIdRef = useRef(resultId);

  const handleScheduleRecipe = async () => {
    setIsScheduling(true);
    const res = await scheduleSingleRecipe(
      resultId,
      recipe.recipeName,
      scheduleDate,
      scheduleMealType
    );
    setIsScheduling(false);
    if (res?.success) {
      setIsCalendarModalOpen(false);
      setToast({ message: 'Rezept im Kalender geplant!' });
    } else {
      setToast({ message: res?.error ?? 'Konnte nicht gespeichert werden.' });
    }
  };

  const adjustIngredientForServings = (ingredient: string, originalServings: number, newServings: number) => {
    const parsed = parseIngredient(ingredient);
    if (parsed.amount !== null) {
      const ratio = newServings / originalServings;
      const newAmount = parsed.amount * ratio;
      
      // Formatierung: Bei großen Mengen kg statt g
      if (parsed.unit === 'g' && newAmount >= 1000) {
        return `${(newAmount / 1000).toFixed(1)}kg ${parsed.name}`;
      }
      
      // Runde auf sinnvolle Werte
      const rounded = newAmount < 1 ? newAmount.toFixed(2) : Math.round(newAmount * 10) / 10;
      return `${rounded}${parsed.unit ? ' ' + parsed.unit : ''} ${parsed.name}`;
    }
    return ingredient;
  };

  // Live-Recalculation: Zutatenmengen ändern sich sofort
  const adjustedIngredients = useMemo(() => {
    return recipe.ingredients.map(ing => 
      adjustIngredientForServings(ing, originalServings, servings)
    );
  }, [recipe.ingredients, servings, originalServings]);

  // Einkaufsliste auch an Portionen anpassen
  const adjustedShoppingList = useMemo(() => {
    if (!recipe.shoppingList || recipe.shoppingList.length === 0) return [];
    return recipe.shoppingList.map(ing => 
      adjustIngredientForServings(ing, originalServings, servings)
    );
  }, [recipe.shoppingList, servings, originalServings]);

  const hasSplitIngredientLayout = adjustedShoppingList.length > 0;

  useLayoutEffect(() => {
    const resultChanged = lastResultIdRef.current !== resultId;
    if (resultChanged) lastResultIdRef.current = resultId;
    const expectedCount = hasSplitIngredientLayout
      ? adjustedIngredients.length + adjustedShoppingList.length
      : adjustedIngredients.length;
    setIngredientRows((prev) => {
      const carryPrev = resultChanged || prev.length !== expectedCount ? null : prev;
      return hasSplitIngredientLayout
        ? rebuildSplitRows(adjustedIngredients, adjustedShoppingList, carryPrev)
        : rebuildUnifiedRows(adjustedIngredients, carryPrev);
    });
  }, [resultId, servings, adjustedIngredients, adjustedShoppingList, hasSplitIngredientLayout]);

  // Kalorien pro Portion anpassen (unterstützt Zahl oder String wie "450 kcal")
  const adjustedCalories = useMemo(() => {
    if (recipe.stats?.calories == null) return null;
    const raw = recipe.stats.calories;
    let originalCalories: number;
    if (typeof raw === 'number') {
      originalCalories = raw;
    } else {
      const match = String(raw).match(/(\d+)/);
      if (!match) return raw as string;
      originalCalories = parseInt(match[1], 10);
    }
    const ratio = servings / originalServings;
    const newCalories = Math.round(originalCalories * ratio);
    return `${newCalories} kcal`;
  }, [recipe.stats?.calories, servings, originalServings]);

  // Parse Kochzeit für Timer
  const parseTime = (timeStr: string) => {
    const match = timeStr.match(/(\d+)\s*Min/i);
    return match ? parseInt(match[1]) : 0;
  };

  const cookingTime = parseTime(recipe.stats?.time || '');

  const availableIngredients = useMemo(
    () => ingredientRows.filter((r) => r.isAvailable),
    [ingredientRows]
  );
  const missingIngredients = useMemo(
    () => ingredientRows.filter((r) => !r.isAvailable),
    [ingredientRows]
  );

  function toggleIngredient(ingredientName: string) {
    setIngredientRows((prev) =>
      prev.map((row) =>
        row.name === ingredientName ? { ...row, isAvailable: !row.isAvailable } : row
      )
    );
  }

  function handleAddToListSuccess(payload: AddToShoppingListSuccessPayload) {
    const { count, listName, uncheckedIngredients } = payload;
    setToast({
      message: count
        ? `${count} ${count === 1 ? 'Zutat' : 'Zutaten'} zu „${listName}“ hinzugefügt`
        : 'SmartCart aktualisiert',
    });
    if (uncheckedIngredients.length > 0) {
      setIngredientRows((prev) =>
        prev.map((row) =>
          uncheckedIngredients.includes(row.name) ? { ...row, isAvailable: true } : row
        )
      );
    }
  }

  const heroImageUrl =
    recipe.imageUrl && String(recipe.imageUrl).trim().length > 0
      ? String(recipe.imageUrl).trim()
      : null;

  // Kochmodus: Immersive Focus – Card ohne Extra-Overlap, Progress-Bar für Fortschritt
  if (cookingMode) {
    const totalSteps = recipe.instructions.length;
    const progressPercent = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
    return (
      <div className="px-4 md:px-6 pb-32 max-w-4xl mx-auto">
        <div className="relative z-20 rounded-[32px] overflow-hidden shadow-tier1 border border-white/50" style={RECIPE_GLASS_STYLE}>
          <div className="h-1.5 w-full bg-gray-100" aria-hidden>
            <div
              className="h-full bg-orange-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="p-6 sm:p-8 flex flex-col min-h-[50vh]">
            <button
              type="button"
              onClick={() => setCookingMode(false)}
              className="self-start text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
            >
              ← Rezept
            </button>
            {/* Schritt-Indikator: Editorial – Wasserzeichen + Label */}
            <div className="relative">
              <span className="text-6xl md:text-8xl font-black text-orange-100/50 absolute top-4 right-4 pointer-events-none select-none tabular-nums">
                {String(currentStep + 1).padStart(2, '0')}
              </span>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                Schritt {currentStep + 1} von {totalSteps}
              </p>
            </div>

            {/* Anleitungstext – groß und lesbar */}
            <p className="text-xl md:text-2xl text-gray-800 font-medium leading-relaxed mt-12 mb-8 flex-1">
              {recipe.instructions[currentStep]}
            </p>

            {/* Erledigt-Button (optional, dezent) */}
            <button
              type="button"
              onClick={() => {
                const newCompleted = new Set(completedSteps);
                if (newCompleted.has(currentStep)) newCompleted.delete(currentStep);
                else newCompleted.add(currentStep);
                setCompletedSteps(newCompleted);
              }}
              className={cn(
                'self-start mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border',
                completedSteps.has(currentStep)
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600'
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              {completedSteps.has(currentStep) ? 'Erledigt' : 'Als erledigt markieren'}
            </button>

            {/* Navigation – Fat Finger friendly */}
            <div className="flex gap-4 mt-auto pt-8 border-t border-gray-100/80">
              <button
                type="button"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="flex-1 h-14 rounded-full bg-slate-100/90 hover:bg-slate-200/90 text-slate-700 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Zurück
              </button>
              {currentStep < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex-1 h-14 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-glow-orange transition-all hover:brightness-105"
                >
                  Weiter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setCookingMode(false); setCurrentStep(0); }}
                  className="flex-1 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-[0_8px_24px_-6px_rgba(16,185,129,0.4)] transition-colors inline-flex items-center justify-center gap-2"
                >
                  <PartyPopper className="w-5 h-5 shrink-0" aria-hidden />
                  Fertig
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-10 fade-in duration-700 ease-out pb-40 md:pb-44">
      {/* North Star: Edge-to-Edge Hero ~35vh (nur ohne embed – Wochenplan o. ä.) */}
      {!embedHeroInParent && (
        <div className="w-screen max-w-[100vw] relative left-1/2 -translate-x-1/2 -mt-[max(0.5rem,env(safe-area-inset-top))] md:-mt-6 overflow-hidden">
          <div className="relative h-[35vh] min-h-[200px] max-h-[340px] w-full bg-gray-900">
            {heroImageUrl ? (
              <img
                src={heroImageUrl}
                alt={recipe.recipeName}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div
                className="absolute inset-0 bg-gradient-to-br from-orange-200/90 via-amber-100 to-rose-100 flex items-center justify-center"
                aria-hidden
              >
                <UtensilsCrossed className="w-24 h-24 text-orange-300/80" strokeWidth={1.5} />
              </div>
            )}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/70 via-black/20 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/30 to-transparent"
              aria-hidden
            />
            {fromWeekPlan && (
              <div className="absolute top-4 left-4 right-4 z-10 flex justify-start">
                <button
                  type="button"
                  onClick={onBack}
                  className="inline-flex items-center gap-2 rounded-full bg-black/40 hover:bg-black/55 backdrop-blur-md text-white px-4 py-2 text-sm font-semibold border border-white/20 shadow-lg"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Zurück
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className={cn(
          'relative z-10 w-full max-w-5xl mx-auto',
          embedHeroInParent ? '-mt-14 md:-mt-24 px-0 sm:px-4 md:px-6' : '-mt-12 md:-mt-16 px-4 md:px-6'
        )}
      >
        <div className="rounded-t-[40px] bg-white shadow-xl border border-slate-100/90 px-6 pt-8 pb-8 md:px-8 md:pb-10">
          {fromWeekPlan && onSaveToCollection && (
            <div className="flex justify-end mb-6">
              <button
                type="button"
                onClick={onSaveToCollection}
                className="px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold shadow-glow-orange flex items-center gap-2"
              >
                <ChefHat className="w-4 h-4" />
                In Meine Rezepte speichern
              </button>
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-4">
                {!embedHeroInParent && !heroImageUrl ? (
                  <div className="w-14 h-14 shrink-0 rounded-2xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                    <UtensilsCrossed className="w-7 h-7 text-orange-500" strokeWidth={1.5} aria-hidden />
                  </div>
                ) : null}
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                    Generiert am{' '}
                    {new Date(createdAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </p>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 leading-tight">
                    {recipe.recipeName}
                  </h1>
                  <div className="flex flex-wrap gap-2">
                    {recipe.stats?.time ? (
                      <span className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-sm font-medium">
                        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        {recipe.stats.time}
                      </span>
                    ) : null}
                    {adjustedCalories ? (
                      <span className="inline-flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-full text-sm font-medium">
                        <Flame className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        {adjustedCalories}
                        {servings !== originalServings ? ' / Portion' : ''}
                      </span>
                    ) : null}
                    {recipe.stats?.difficulty ? (
                      <span className="inline-flex items-center gap-2 bg-violet-50 text-violet-600 px-3 py-1.5 rounded-full text-sm font-medium">
                        <ChefHat className="w-3.5 h-3.5 shrink-0" aria-hidden />
                        {recipe.stats.difficulty}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 shrink-0 w-full md:w-auto md:min-w-[240px]">
              <div className="flex flex-col sm:flex-row md:flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setCookingMode(true)}
                  className="w-full px-6 py-3.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-glow-orange hover:brightness-105 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 shrink-0" />
                  Zubereitung starten
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `${recipe.recipeName} – ${window.location.href}`;
                    if (navigator.share) {
                      navigator
                        .share({
                          title: recipe.recipeName,
                          text: recipe.recipeName,
                          url: window.location.href,
                        })
                        .catch(() => {
                          navigator.clipboard.writeText(text);
                          setToast({ message: 'Link kopiert' });
                        });
                    } else {
                      navigator.clipboard.writeText(text);
                      setToast({ message: 'Link kopiert' });
                    }
                  }}
                  className="w-full px-5 py-3.5 rounded-full border border-slate-200/90 bg-white/80 backdrop-blur-sm text-slate-600 font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Share2 className="w-4 h-4 shrink-0" />
                  Teilen
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-4 justify-start">
                <div className="inline-flex items-center gap-4 bg-slate-50 rounded-full px-5 py-2.5 border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    disabled={servings <= 1}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 bg-white shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-slate-900 font-bold min-w-[6ch] tabular-nums text-center text-sm">
                    {servings} Pers.
                  </span>
                  <button
                    type="button"
                    onClick={() => setServings(Math.min(8, servings + 1))}
                    disabled={servings >= 8}
                    className="w-9 h-9 flex items-center justify-center rounded-full text-slate-600 bg-white shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {servings !== originalServings && (
                  <button
                    type="button"
                    onClick={() => setServings(originalServings)}
                    className="text-sm font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-slate-100"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Original
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zutaten + Zubereitung – mehr Whitespace, FAB für Einkaufen/Kalender */}
      <div className="max-w-5xl mx-auto mt-10 md:mt-12 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-start px-4 sm:px-6 md:px-8">
        <div className="md:col-span-4 md:sticky md:top-24">
          {ingredientRows.length > 0 ? (
            <>
              {availableIngredients.length > 0 && (
                <>
                  <h2 className="text-lg font-bold text-slate-900 mb-2">Zutaten (Vorhanden)</h2>
                  <p className="text-sm text-slate-500 mb-6">
                    für {servings} {servings === 1 ? 'Person' : 'Personen'} · Tippen zum Umsortieren
                  </p>
                  <div className="flex flex-col gap-3 mb-8">
                    {availableIngredients.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => toggleIngredient(row.name)}
                        className="w-full text-left bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 hover:border-orange-100 hover:shadow-md transition-all active:scale-[0.99]"
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden />
                          </span>
                          <span className="text-sm text-slate-800 font-medium leading-relaxed">
                            {formatIngredientDisplay(row.name)}
                          </span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" aria-hidden />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {missingIngredients.length > 0 ? (
                <>
                  <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-50">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden />
                    </span>
                    Fehlt noch
                  </h2>
                  <p className="text-sm text-slate-500 mb-6">
                    für {servings} {servings === 1 ? 'Person' : 'Personen'} · Tippen zum Umsortieren
                  </p>
                  <div className="flex flex-col gap-3">
                    {missingIngredients.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => toggleIngredient(row.name)}
                        className="w-full text-left bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3 hover:border-amber-100 hover:shadow-md transition-all active:scale-[0.99]"
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 shrink-0">
                            <Circle className="w-5 h-5 text-amber-600" strokeWidth={2} aria-hidden />
                          </span>
                          <span className="text-sm text-slate-800 font-medium leading-relaxed">
                            {formatIngredientDisplay(row.name)}
                          </span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" aria-hidden />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                availableIngredients.length > 0 && (
                  <p className="text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mt-2">
                    Für die Einkaufsliste ist nichts mehr offen – oder du hast alles als vorhanden markiert.
                  </p>
                )
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500">Keine Zutaten hinterlegt.</p>
          )}
        </div>

        <div className="md:col-span-8">
          <h2 className="text-lg font-bold text-slate-900 mb-8">Zubereitung</h2>
          <ol className="space-y-8 md:space-y-10">
            {recipe.instructions.map((step, index) => (
              <li key={index} className="flex gap-5 items-start">
                <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 font-bold text-sm shrink-0 border border-orange-100">
                  {index + 1}
                </div>
                <p className="text-slate-700 text-lg leading-relaxed flex-1 pt-1">{step}</p>
              </li>
            ))}
          </ol>
          {cookingTime > 0 && (
            <div className="mt-10 pt-8 border-t border-slate-100 flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-2 text-slate-600 text-sm font-medium">
                <Clock className="w-5 h-5 text-orange-500 shrink-0" />
                Gesamt-Kochzeit: {cookingTime} Minuten
              </span>
              <button
                type="button"
                onClick={() => alert(`Timer für ${cookingTime} Minuten – Feature kommt gleich!`)}
                className="px-5 py-2.5 rounded-full bg-orange-50 text-orange-700 text-sm font-semibold hover:bg-orange-100 transition-colors border border-orange-100"
              >
                Timer starten
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profi-Tipp */}
      {recipe.chefTip && (
        <div className="max-w-5xl mx-auto mt-12 md:mt-14 px-4 sm:px-6 md:px-8">
          <div className="rounded-[32px] border border-orange-100/80 bg-gradient-to-br from-orange-50/90 to-amber-50/50 p-6 md:p-8 flex gap-5 shadow-sm">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-orange-100 shrink-0">
              <Lightbulb className="w-6 h-6 text-orange-600" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 mb-2">Profi-Tipp</p>
              <p className="text-slate-700 italic leading-relaxed">{recipe.chefTip}</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar – Glass, Daumenzone (Einkaufen + Kalender) */}
      <div
        className="fixed left-1/2 z-50 flex w-[90%] max-w-md -translate-x-1/2 items-center gap-2 rounded-[32px] border border-white/20 bg-white/80 p-2 shadow-2xl backdrop-blur-xl"
        style={{ bottom: 'max(1.5rem, calc(0.5rem + env(safe-area-inset-bottom, 0px)))' }}
      >
        <button
          type="button"
          onClick={() => setIsCalendarModalOpen(true)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/90 text-slate-700 shadow-sm transition-all hover:bg-white active:scale-95"
          aria-label="Im Kalender planen"
        >
          <CalendarDays className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            const missing = missingIngredients.map((r) => r.name);
            if (missing.length === 0) {
              setToast({
                message:
                  'Alles als vorhanden markiert – tippe Zutaten an, die du noch einkaufen musst, oder schiebe sie nach „Fehlt noch“.',
              });
              return;
            }
            setAddToListIngredients(missing);
            setIsAddToListOpen(true);
          }}
          className="flex min-h-[3.5rem] flex-1 items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-4 text-center text-base font-bold text-white shadow-glow-rose transition-all hover:bg-rose-600 active:scale-[0.98]"
        >
          <ShoppingBasket className="w-5 h-5 shrink-0" aria-hidden />
          Einkaufen
        </button>
      </div>

      {/* Auf Einkaufsliste setzen – Modal + Toast */}
      <AddToShoppingListModal
          isOpen={isAddToListOpen}
          onClose={() => setIsAddToListOpen(false)}
          ingredients={addToListIngredients}
          onAdded={handleAddToListSuccess}
        />

      {/* Im Kalender planen – Modal */}
      {isCalendarModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-modal-title"
        >
          <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 id="calendar-modal-title" className="text-xl font-bold mb-4 text-gray-800">Wann kochen?</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="schedule-date" className="block text-sm font-medium text-gray-600 mb-1">Datum</label>
                <input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-purple-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Mahlzeit</label>
                <div className="flex gap-2">
                  {[
                    { id: 'breakfast' as const, label: 'Frühstück' },
                    { id: 'lunch' as const, label: 'Mittag' },
                    { id: 'dinner' as const, label: 'Abends' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setScheduleMealType(type.id)}
                      className={cn(
                        'flex-1 py-2 rounded-xl text-sm font-medium transition-all border-2',
                        scheduleMealType === type.id
                          ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleScheduleRecipe}
                disabled={isScheduling}
                className="w-full mt-4 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 text-white rounded-xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {isScheduling ? 'Wird geplant...' : 'Im Kalender eintragen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed left-1/2 z-[80] max-w-[min(90%,24rem)] -translate-x-1/2 animate-in rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg fade-in duration-200"
          style={{ bottom: 'max(6.5rem, calc(4.5rem + env(safe-area-inset-bottom, 0px)))' }}
          role="status"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
