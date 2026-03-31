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
import {
  PreFlightModal,
  type RecipeIngredient,
} from '@/components/recipe/pre-flight-modal';
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

/** Glass-Elemente: Dark Theme (CookIQ / App-Canvas) */
const RECIPE_GLASS_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 32px -8px rgba(0,0,0,0.45)',
  WebkitBackdropFilter: 'blur(20px)',
  backdropFilter: 'blur(20px)',
};

export type IngredientRow = {
  /** Stabil über Portionen (p-0, s-1, u-2), damit Zustand erhalten bleibt. */
  id: string;
  /** Angezeigter / für SmartCart genutzter Text (portionsskalierter String). */
  name: string;
  /** true = „Vorhanden“; false = „Fehlt noch“ (entspricht `isMissing === true`). */
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

/**
 * Lesbarer Text über Hero (mobil / kleine Shell): Gradient über dem Foto.
 */
export function RecipeDetailHeroAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_top,#0F0914_0%,rgba(15,9,20,0.72)_26%,rgba(15,9,20,0.4)_48%,transparent_82%)]',
        className
      )}
      aria-hidden
    />
  );
}

/** Ab md: Foto nur Textur – schwarz + Neon-Ambient (CookIQ-Cockpit). */
export function RecipeDetailHeroDesktopLayers() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-10 hidden bg-black/90 md:block" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 z-[11] hidden md:block"
        style={{
          background:
            'radial-gradient(ellipse 78% 58% at 50% 44%, rgba(168,85,247,0.26) 0%, rgba(236,72,153,0.14) 38%, rgba(249,115,22,0.1) 56%, transparent 74%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[12] hidden opacity-[0.95] md:block"
        style={{
          background:
            'radial-gradient(ellipse 44% 38% at 50% 50%, rgba(249,115,22,0.15) 0%, rgba(236,72,153,0.09) 48%, transparent 70%)',
        }}
        aria-hidden
      />
    </>
  );
}

const RECIPE_SHARE_HEADER_BTN =
  'inline-flex items-center justify-center rounded-full border border-white/10 bg-black/30 p-2 text-white backdrop-blur-md transition-colors hover:bg-black/40';

/** Teilen oben rechts; `fixedToViewport` für DashboardShell (volle Viewport-Kante). */
export function RecipeDetailShareHeaderButton({
  recipeName,
  fixedToViewport = false,
}: {
  recipeName: string;
  fixedToViewport?: boolean;
}) {
  const [shareToast, setShareToast] = useState<{ message: string } | null>(null);

  useEffect(() => {
    if (!shareToast) return;
    const t = setTimeout(() => setShareToast(null), 3000);
    return () => clearTimeout(t);
  }, [shareToast]);

  const handleShare = () => {
    const text = `${recipeName} – ${typeof window !== 'undefined' ? window.location.href : ''}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator
        .share({
          title: recipeName,
          text: recipeName,
          url: typeof window !== 'undefined' ? window.location.href : undefined,
        })
        .catch(() => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(text);
            setShareToast({ message: 'Link kopiert' });
          }
        });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setShareToast({ message: 'Link kopiert' });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleShare();
        }}
        className={cn(
          RECIPE_SHARE_HEADER_BTN,
          fixedToViewport
            ? 'fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-50'
            : 'absolute top-4 right-4 z-50'
        )}
        aria-label="Teilen"
      >
        <Share2 className="h-5 w-5 shrink-0" strokeWidth={2} />
      </button>
      {shareToast ? (
        <div
          className="fixed left-1/2 z-[90] max-w-[min(90%,24rem)] -translate-x-1/2 animate-in rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white shadow-lg fade-in duration-200"
          style={{ bottom: 'max(6.5rem, calc(4.5rem + env(safe-area-inset-bottom, 0px)))' }}
          role="status"
        >
          {shareToast.message}
        </div>
      ) : null}
    </>
  );
}

export function RecipeDetailView({
  recipe,
  resultId,
  onBack,
  fromWeekPlan = false,
  onSaveToCollection,
  embedHeroInParent = false,
}: RecipeDetailViewProps) {
  // Original-Servings aus Recipe (normalerweise 2)
  const originalServings = 2;
  const [servings, setServings] = useState(originalServings);
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [preflightIngredients, setPreflightIngredients] = useState<RecipeIngredient[]>([]);
  /** Welche Zutaten im „Einkaufen“-Modal angezeigt werden: alle (vom Einkaufen-Button) oder nur fehlende (vom Auf Einkaufsliste-Button). */
  const [addToListIngredients, setAddToListIngredients] = useState<string[]>([]);
  /** Alle Zutaten mit `isAvailable` (true = Vorhanden, false = Fehlt noch / isMissing); SmartCart nutzt nur „Fehlt noch“. */
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

  const portionsStepper = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setServings(Math.max(1, servings - 1))}
          disabled={servings <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-white/80 transition-all hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Weniger Portionen"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="min-w-[5.5ch] text-center text-sm font-bold tabular-nums text-white">
          {servings} Pers.
        </span>
        <button
          type="button"
          onClick={() => setServings(Math.min(8, servings + 1))}
          disabled={servings >= 8}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-white/80 transition-all hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Mehr Portionen"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {servings !== originalServings ? (
        <button
          type="button"
          onClick={() => setServings(originalServings)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Original
        </button>
      ) : null}
    </div>
  );

  const availableIngredients = useMemo(
    () => ingredientRows.filter((r) => r.isAvailable),
    [ingredientRows]
  );
  const missingIngredients = useMemo(
    () => ingredientRows.filter((r) => !r.isAvailable),
    [ingredientRows]
  );

  function toggleIngredient(rowId: string) {
    setIngredientRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, isAvailable: !row.isAvailable } : row
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
        <div className="relative z-20 overflow-hidden rounded-[32px] border border-white/[0.08] shadow-tier1" style={RECIPE_GLASS_STYLE}>
          <div className="h-1.5 w-full bg-white/[0.08]" aria-hidden>
            <div
              className="h-full bg-orange-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex min-h-[50vh] flex-col p-6 sm:p-8">
            <button
              type="button"
              onClick={() => setCookingMode(false)}
              className="mb-4 self-start text-sm font-medium text-white/45 transition-colors hover:text-white/90"
            >
              ← Rezept
            </button>
            {/* Schritt-Indikator: Editorial – Wasserzeichen + Label */}
            <div className="relative">
              <span className="pointer-events-none absolute right-4 top-4 select-none text-6xl font-black text-orange-400/20 tabular-nums md:text-8xl">
                {String(currentStep + 1).padStart(2, '0')}
              </span>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/35">
                Schritt {currentStep + 1} von {totalSteps}
              </p>
            </div>

            {/* Anleitungstext – groß und lesbar */}
            <p className="mb-8 mt-12 flex-1 text-xl font-medium leading-relaxed text-white/90 md:text-2xl">
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
                'mb-6 inline-flex items-center gap-2 self-start rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
                completedSteps.has(currentStep)
                  ? 'border-orange-500 bg-orange-500 text-white'
                  : 'border-white/[0.1] bg-white/[0.06] text-white/50 hover:border-orange-400/40 hover:text-orange-300'
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              {completedSteps.has(currentStep) ? 'Erledigt' : 'Als erledigt markieren'}
            </button>

            {/* Navigation – Fat Finger friendly */}
            <div className="mt-auto flex gap-4 border-t border-white/[0.06] pt-8">
              <button
                type="button"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="h-14 flex-1 rounded-full bg-white/[0.08] font-semibold text-white/80 transition-colors hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
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

  const recipeHeroForeground = (
    <>
      {fromWeekPlan && onSaveToCollection && (
        <div className="mb-6 flex justify-end md:mb-4 md:w-full md:justify-center">
          <button
            type="button"
            onClick={onSaveToCollection}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-glow-orange"
          >
            <ChefHat className="h-4 w-4" />
            In Meine Rezepte speichern
          </button>
        </div>
      )}
      <div className="relative z-20 flex flex-col gap-8 md:items-center md:justify-center md:gap-6 md:text-center lg:flex-row lg:items-start lg:justify-between lg:gap-8 lg:text-left">
        <div className="min-w-0 flex-1 md:max-w-2xl md:mx-auto lg:mx-0">
          <div className="flex items-start gap-4 md:justify-center lg:justify-start">
            {!embedHeroInParent && !heroImageUrl ? (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.08]">
                <UtensilsCrossed className="h-7 w-7 text-orange-400/70" strokeWidth={1.5} aria-hidden />
              </div>
            ) : null}
            <div className="min-w-0 flex-1 space-y-4">
              <h1 className="text-3xl font-bold leading-[1.15] tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.92)] md:text-4xl lg:text-4xl">
                {recipe.recipeName}
              </h1>
              <div className="flex flex-wrap gap-2 md:justify-center lg:justify-start">
                {recipe.stats?.time ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white shadow-[0_2px_14px_rgba(0,0,0,0.55)] backdrop-blur-md">
                    <Clock className="h-4 w-4 shrink-0 text-orange-400" strokeWidth={2} aria-hidden />
                    {recipe.stats.time}
                  </span>
                ) : null}
                {adjustedCalories ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white shadow-[0_2px_14px_rgba(0,0,0,0.55)] backdrop-blur-md">
                    <Flame className="h-4 w-4 shrink-0 text-pink-400" strokeWidth={2} aria-hidden />
                    {adjustedCalories}
                    {servings !== originalServings ? ' / Portion' : ''}
                  </span>
                ) : null}
                {recipe.stats?.difficulty ? (
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-sm text-white shadow-[0_2px_14px_rgba(0,0,0,0.55)] backdrop-blur-md">
                    <ChefHat className="h-4 w-4 shrink-0 text-violet-400" strokeWidth={2} aria-hidden />
                    {recipe.stats.difficulty}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="w-full shrink-0 md:max-w-sm md:mx-auto lg:mx-0 lg:w-auto lg:max-w-none lg:min-w-[220px]">
          <button
            type="button"
            onClick={() => setCookingMode(true)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3.5 font-bold text-white shadow-[0_0_28px_rgba(249,115,22,0.28)] transition-all hover:brightness-105 hover:shadow-[0_0_36px_rgba(249,115,22,0.38)]"
          >
            <Play className="h-4 w-4 shrink-0" />
            Zubereitung starten
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="animate-in slide-in-from-bottom-10 fade-in duration-700 ease-out pb-44 md:pb-40">
      {/* Full-bleed Bild + Gradient; Titel überlappt unten (ohne embed) */}
      {!embedHeroInParent && (
        <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 -mt-[max(0.5rem,env(safe-area-inset-top))] overflow-hidden md:-mt-6">
          <div className="relative w-full bg-[#0F0914] md:bg-[#0F0914] md:min-h-[min(52vh,520px)]">
            {heroImageUrl ? (
              <>
                <img
                  src={heroImageUrl}
                  alt={recipe.recipeName}
                  className="absolute top-0 inset-x-0 z-0 h-[55vh] w-full object-cover md:h-full md:min-h-[min(52vh,520px)] md:opacity-10"
                />
                <div
                  className="pointer-events-none absolute top-0 inset-x-0 z-10 h-[55vh] w-full bg-[linear-gradient(to_top,#0F0914_0%,rgba(15,9,20,0.72)_26%,rgba(15,9,20,0.4)_48%,transparent_82%)] md:hidden"
                  aria-hidden
                />
                <RecipeDetailHeroDesktopLayers />
              </>
            ) : (
              <>
                <div
                  className="absolute top-0 inset-x-0 z-0 flex h-[55vh] w-full items-center justify-center bg-[#0F0914] md:hidden"
                  aria-hidden
                >
                  <UtensilsCrossed className="h-24 w-24 text-orange-400/25" strokeWidth={1.5} />
                </div>
                <div
                  className="pointer-events-none absolute inset-0 z-[1] hidden min-h-[min(52vh,520px)] bg-[#0F0914] md:block"
                  aria-hidden
                />
                <RecipeDetailHeroDesktopLayers />
              </>
            )}
            {fromWeekPlan ? (
              <button
                type="button"
                onClick={onBack}
                className="absolute left-4 top-4 z-30 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-colors hover:bg-black/40 md:bg-black/40 md:backdrop-blur-md"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Zurück
              </button>
            ) : null}
            <RecipeDetailShareHeaderButton recipeName={recipe.recipeName} fixedToViewport={false} />
            <div className="relative z-20 mx-auto w-full max-w-5xl px-4 pt-[min(25vh,18rem)] pb-8 md:flex md:min-h-[min(52vh,520px)] md:items-center md:justify-center md:px-6 md:pb-12 md:pt-12">
              {recipeHeroForeground}
            </div>
          </div>
        </div>
      )}

      {embedHeroInParent ? (
        <div
          className={cn(
            'relative z-20 mx-auto w-full max-w-5xl px-4 sm:px-4 md:px-6',
            '-mt-[min(40vh,360px)] md:-mt-[min(34vh,300px)]',
            'pt-[min(22vh,200px)] md:flex md:min-h-[min(36vh,320px)] md:items-center md:justify-center md:pt-10 lg:-mt-[min(38vh,340px)] lg:pt-12'
          )}
        >
          <div className="relative z-20 w-full pb-8 md:pb-12">{recipeHeroForeground}</div>
        </div>
      ) : null}

      {/* Zutaten + Zubereitung – mehr Whitespace, FAB für Einkaufen/Kalender */}
      <div
        className={cn(
          'max-w-5xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-start px-4 sm:px-6 md:px-8',
          !embedHeroInParent ? 'md:mt-0 md:border-0 md:pt-10 lg:pt-12' : 'md:mt-12'
        )}
      >
        <div className="md:col-span-4 md:sticky md:top-24">
          {ingredientRows.length > 0 ? (
            <>
              {availableIngredients.length > 0 && (
                <>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-white">Zutaten (Vorhanden)</h2>
                    {portionsStepper}
                  </div>
                  <p className="mb-6 text-sm text-white/45">
                    für {servings} {servings === 1 ? 'Person' : 'Personen'} · Tippen zum Umschalten
                  </p>
                  <div className="mb-8 flex flex-col gap-3">
                    {availableIngredients.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => toggleIngredient(row.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left shadow-sm transition-all hover:border-orange-400/25 hover:bg-white/[0.05] active:scale-[0.99]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400/90" aria-hidden />
                          </span>
                          <span className="text-sm font-medium leading-relaxed text-white/85">
                            {formatIngredientDisplay(row.name)}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-white/25" aria-hidden />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {missingIngredients.length > 0 ? (
                <>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h2 className="flex min-w-0 flex-1 items-center gap-2 text-lg font-bold text-white">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-400/[0.12]">
                        <AlertCircle className="h-5 w-5 shrink-0 text-amber-400/80" aria-hidden />
                      </span>
                      Fehlt noch
                    </h2>
                    {availableIngredients.length === 0 ? portionsStepper : null}
                  </div>
                  <p className="mb-6 text-sm text-white/45">
                    für {servings} {servings === 1 ? 'Person' : 'Personen'} · Tippen zum Umschalten
                  </p>
                  <div className="flex flex-col gap-3">
                    {missingIngredients.map((row) => (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => toggleIngredient(row.id)}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left shadow-sm transition-all hover:border-amber-400/30 hover:bg-white/[0.05] active:scale-[0.99]"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400/[0.12]">
                            <Circle className="h-5 w-5 text-amber-400/80" strokeWidth={2} aria-hidden />
                          </span>
                          <span className="text-sm font-medium leading-relaxed text-white/85">
                            {formatIngredientDisplay(row.name)}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-white/25" aria-hidden />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                availableIngredients.length > 0 && (
                  <p className="mt-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-200/90">
                    Für die Einkaufsliste ist nichts mehr offen – oder du hast alles als vorhanden markiert.
                  </p>
                )
              )}
            </>
          ) : (
            <p className="text-sm text-white/45">Keine Zutaten hinterlegt.</p>
          )}
        </div>

        <div className="md:col-span-8">
          <h2 className="mb-8 text-lg font-bold text-white">Zubereitung</h2>
          <ol className="space-y-8 md:space-y-10">
            {recipe.instructions.map((step, index) => (
              <li key={index} className="flex items-start gap-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-400/20 bg-orange-400/[0.1] text-sm font-bold text-orange-300/90">
                  {index + 1}
                </div>
                <p className="flex-1 pt-1 text-lg leading-relaxed text-white/70">{step}</p>
              </li>
            ))}
          </ol>
          {cookingTime > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-8">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-white/60">
                <Clock className="h-5 w-5 shrink-0 text-orange-400/80" />
                Gesamt-Kochzeit: {cookingTime} Minuten
              </span>
              <button
                type="button"
                onClick={() => alert(`Timer für ${cookingTime} Minuten – Feature kommt gleich!`)}
                className="rounded-full border border-orange-400/25 bg-orange-400/[0.1] px-5 py-2.5 text-sm font-semibold text-orange-200/90 transition-colors hover:bg-orange-400/[0.15]"
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
          <div className="flex gap-5 rounded-[32px] border border-orange-400/20 bg-gradient-to-br from-orange-500/10 to-amber-500/5 p-6 shadow-sm md:p-8">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/[0.15]">
              <Lightbulb className="h-6 w-6 text-orange-300/90" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="mb-2 text-sm font-bold text-white">Profi-Tipp</p>
              <p className="italic leading-relaxed text-white/60">{recipe.chefTip}</p>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar – über Mobile-Nav (z-50), nicht am Viewport-Boden */}
      <div
        className={cn(
          'fixed left-1/2 flex w-[90%] max-w-md -translate-x-1/2 items-center gap-2 rounded-[32px] border border-white/[0.1] bg-white/[0.08] p-2 shadow-2xl backdrop-blur-xl',
          'z-[60] max-md:bottom-[max(6rem,calc(4.5rem+env(safe-area-inset-bottom,0px)))]',
          'md:bottom-8 md:z-50'
        )}
      >
        <button
          type="button"
          onClick={() => setIsCalendarModalOpen(true)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-white/[0.08] text-white/80 shadow-sm transition-all hover:bg-white/[0.12] active:scale-95"
          aria-label="Im Kalender planen"
        >
          <CalendarDays className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (missingIngredients.length === 0) {
              setToast({
                message:
                  'Alles als vorhanden markiert – tippe Zutaten an, die du noch einkaufen musst, oder schiebe sie nach „Fehlt noch“.',
              });
              return;
            }
            const rows: RecipeIngredient[] = missingIngredients.map((r) => {
              const p = parseIngredient(r.name);
              return {
                id: r.id,
                name: p.name,
                amount: p.amount,
                unit: p.unit ? p.unit : null,
                rawLine: r.name,
              };
            });
            setPreflightIngredients(rows);
            setIsPreFlightOpen(true);
          }}
          className="flex min-h-[3.5rem] flex-1 items-center justify-center gap-2 rounded-full bg-rose-500 px-4 py-4 text-center text-base font-bold text-white shadow-glow-rose transition-all hover:bg-rose-600 active:scale-[0.98]"
        >
          <ShoppingBasket className="w-5 h-5 shrink-0" aria-hidden />
          Einkaufen
        </button>
      </div>

      <PreFlightModal
        isOpen={isPreFlightOpen}
        ingredients={preflightIngredients}
        onCancel={() => setIsPreFlightOpen(false)}
        onConfirm={(selected) => {
          setAddToListIngredients(selected.map((s) => s.rawLine));
          setIsPreFlightOpen(false);
          setIsAddToListOpen(true);
        }}
      />

      {/* Auf Einkaufsliste setzen – Modal + Toast */}
      <AddToShoppingListModal
          isOpen={isAddToListOpen}
          onClose={() => setIsAddToListOpen(false)}
          ingredients={addToListIngredients}
          recipeName={recipe.recipeName}
          onAdded={handleAddToListSuccess}
        />

      {/* Im Kalender planen – Modal */}
      {isCalendarModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-modal-title"
        >
          <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#1a1025] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1 text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 id="calendar-modal-title" className="mb-4 text-xl font-bold text-white">
              Wann kochen?
            </h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="schedule-date" className="mb-1 block text-sm font-medium text-white/60">
                  Datum
                </label>
                <input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-white focus:border-white/[0.15] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-white/60">Mahlzeit</label>
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
                        'flex-1 rounded-xl border-2 py-2 text-sm font-medium transition-all',
                        scheduleMealType === type.id
                          ? 'border-orange-400/40 bg-orange-500/20 text-orange-200'
                          : 'border-transparent bg-white/[0.06] text-white/50 hover:bg-white/[0.1]'
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
