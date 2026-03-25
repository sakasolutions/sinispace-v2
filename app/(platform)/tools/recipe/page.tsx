'use client';

import React from 'react';
import { generateRecipe } from '@/actions/recipe-ai';
import { useActionState } from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Copy, MessageSquare, Loader2, Clock, ChefHat, CheckCircle2, Check, Users, Minus, Plus, Share2, ShoppingCart, Edit, Trash2, ListPlus, LayoutDashboard, Sparkles, Refrigerator, ArrowLeft, ChevronRight, Utensils, UtensilsCrossed, Salad, Coffee, Cake, Droplets, Wine, LeafyGreen, Sprout, WheatOff, Flame, Timer, Fish, Beef, Star, Milk, Dumbbell, TrendingDown, Leaf, Moon, Search, MoreVertical, Wheat, Sandwich, Soup, Croissant, Carrot, Egg, Pizza, Drumstick, CalendarDays, RefreshCw, Rocket, ArrowRightLeft, Heart } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFormStatus, createPortal } from 'react-dom';
import { WhatIsThisModal } from '@/components/ui/what-is-this-modal';
import { FeedbackButton } from '@/components/ui/feedback-button';
import { cn } from '@/lib/utils';
import { toolInfoMap } from '@/lib/tool-info';

/** Gleiche Glass-Karten-Styles wie Home (GourmetCockpit / Dashboard) */
const DASHBOARD_CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.16)',
  border: '1px solid rgba(255,255,255,0.22)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.08), 0 16px 48px -12px rgba(0,0,0,0.06)',
  WebkitBackdropFilter: 'blur(8px)',
  backdropFilter: 'blur(8px)',
};
import { getWorkspaceResults, deleteResult, cleanupOldResults, getResultById } from '@/actions/workspace-actions';
import { ShoppingListModal } from '@/components/ui/shopping-list-modal';
import { AddToShoppingListModal } from '@/components/recipe/add-to-shopping-list-modal';
import { RecipeDetailView, type RecipeDetailRecipe } from '@/components/recipe/recipe-detail-view';
import { RecipeCard } from '@/components/recipe/recipe-card';
import { GourmetCockpit, type GourmetCockpitProps } from '@/components/recipe/gourmet-cockpit';
import {
  generateWeekDraft,
  regenerateSingleMealDraft,
  saveWeeklyPlan,
  activateWeeklyPlan,
  generateAndSaveFullRecipe,
  generateSmartShoppingList,
} from '@/actions/week-planner-ai';
import { getCurrentWeekMeals } from '@/actions/calendar-actions';
import { getShoppingLists, saveShoppingLists } from '@/actions/shopping-list-actions';
import { appendStructuredItemsToList, defaultList, type ShoppingList } from '@/lib/shopping-lists-storage';
import { parseIngredient, formatIngredientDisplay } from '@/lib/format-ingredient';
import { getCategoryLabel, normalizeSmartCartCategory, sortCategoriesBySupermarktRoute } from '@/lib/shopping-list-categories';
import { DashboardShell } from '@/components/platform/dashboard-shell';

const PANTRY_NEW_LIST_VALUE = '__new__';

/** API-/State-Wert für schnelle Küche (Schritt 1), wird in effectiveWeekPlannerFilters gemerged */
const WEEK_PLANNER_TIME_FILTER = '⏱️ Unter 30 Min';

type WeekPlannerChipGroup = 'green' | 'blue' | 'orange' | 'neutral';

type WeekPlannerFilterChip = {
  value: string;
  emoji: string;
  label: string;
  group: WeekPlannerChipGroup;
};

const WEEK_PLANNER_DIET_CHIPS: WeekPlannerFilterChip[] = [
  { value: '🥬 Vegetarisch', emoji: '🥬', label: 'Vegetarisch', group: 'green' },
  { value: '🌱 Vegan', emoji: '🌱', label: 'Vegan', group: 'green' },
  { value: '🐟 Pescetarisch', emoji: '🐟', label: 'Pescetarisch', group: 'blue' },
  { value: '💪 High Protein', emoji: '💪', label: 'High Protein', group: 'orange' },
  { value: '🥦 Low Carb', emoji: '🥦', label: 'Low Carb', group: 'orange' },
  { value: '🚫 Glutenfrei', emoji: '🚫', label: 'Glutenfrei', group: 'neutral' },
];

const WEEK_PLANNER_VIBE_CHIPS: WeekPlannerFilterChip[] = [
  { value: '👨‍👩‍👧 Familienfreundlich', emoji: '👨‍👩‍👧', label: 'Familienfreundlich', group: 'neutral' },
  { value: '💰 Günstig', emoji: '💰', label: 'Günstig', group: 'neutral' },
];

function weekPlannerFilterChipClassNames(group: WeekPlannerChipGroup, selected: boolean): string {
  const base =
    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200';
  switch (group) {
    case 'green':
      return cn(
        base,
        selected
          ? 'bg-green-100 text-green-900 border-2 border-green-400 shadow-sm'
          : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100/70 hover:border-green-300'
      );
    case 'blue':
      return cn(
        base,
        selected
          ? 'bg-blue-100 text-blue-900 border-2 border-blue-400 shadow-sm'
          : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100/70 hover:border-blue-300'
      );
    case 'orange':
      return cn(
        base,
        selected
          ? 'bg-orange-100 text-orange-900 border-2 border-orange-400 shadow-sm'
          : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100/70 hover:border-orange-300'
      );
    case 'neutral':
    default:
      return cn(
        base,
        selected
          ? 'bg-slate-200 text-slate-900 border-2 border-slate-400 shadow-sm'
          : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
      );
  }
}

/**
 * Kalorien-Zeile nur bei echten Werten – versteckt leere Strings, "-", Unicode-Striche und Text-Platzhalter wie "🔥 -".
 */
function shouldShowMealCalories(calories: string | number | null | undefined): boolean {
  if (calories == null) return false;
  const raw = String(calories).trim();
  if (raw === '') return false;
  const core = raw
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    .replace(/\uFE0F/g, '')
    .replace(/🔥/g, '')
    .replace(/-/g, '')
    .replace(/\s/g, '');
  return core.length > 0;
}

/** Erweiterter Rezept-Typ (CookIQ Tier 1: Makros, SmartCart-Trennung). Kompatibel mit RecipeDetailView. */
type Recipe = RecipeDetailRecipe & {
  /** Von der KI gesetzt: pasta, pizza, burger, soup, salad, vegetable, meat, chicken, fish, egg, dessert, breakfast */
  categoryIcon?: string;
  /** Unsplash-Foto-URL (neu generierte Rezepte); null bei Legacy. */
  imageUrl?: string | null;
  /** Fotografen-Name für Bildnachweis. */
  imageCredit?: string | null;
};

function ActionButtons({ recipe }: { recipe: Recipe }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const hasMissing = recipe.shoppingList && recipe.shoppingList.length > 0;
  const ingredientsText = hasMissing && recipe.shoppingList ? recipe.shoppingList.join(', ') : recipe.ingredients.join(', ');
  const chatLink = `/tools/difficult?chain=gourmet&mode=${hasMissing ? 'shopping' : 'strict'}&recipe=${encodeURIComponent(recipe.recipeName)}&ingredients=${encodeURIComponent(ingredientsText)}`;

  const handleCopy = async () => {
    try {
      let recipeText = `${recipe.recipeName}\n\nZutaten:\n${recipe.ingredients.map(i => `- ${i}`).join('\n')}\n\nZubereitung:\n${recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
      if (recipe.chefTip) {
        recipeText += `\n\n💡 Profi-Tipp: ${recipe.chefTip}`;
      }
      await navigator.clipboard.writeText(recipeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
    }
  };

  const handleGoToChat = () => {
    router.push('/chat');
  };

  return (
    <div className="flex justify-between items-center border-b border-gray-100 bg-gray-50/80 px-4 py-3 rounded-t-xl mb-4">
      <span className="text-xs uppercase tracking-wider text-gray-700 font-semibold">Dein Rezept</span>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="h-8 px-3 rounded-lg bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="In Zwischenablage kopieren"
        >
          {copied ? (
            <>
              <span className="text-green-600">✓</span>
              <span className="hidden sm:inline">Kopiert!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kopieren</span>
            </>
          )}
        </button>
        <button
          onClick={handleGoToChat}
          className="h-8 px-3 rounded-lg bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="Zu SiniChat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Zu SiniChat</span>
        </button>
        <Link
          href={chatLink}
          className="h-8 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white border border-orange-500 transition-all flex items-center gap-1.5 text-xs font-semibold"
          title={hasMissing ? 'SmartCart an Partner senden' : 'Rezept an Partner senden'}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {hasMissing ? 'SmartCart senden' : 'Rezept senden'}
          </span>
        </Link>
      </div>
    </div>
  );
}

function SubmitButton({ inspirationMode }: { inspirationMode: boolean }) {
  const { pending } = useFormStatus();
  const label = inspirationMode ? 'Inspiriere mich' : 'Rezept aus Zutaten zaubern';
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-4 rounded-xl text-lg font-bold text-white shadow-lg shadow-orange-500/20 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-transform flex items-center justify-center gap-2"
    >
      {pending ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chefkoch denkt nach...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-5 h-5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

export default function RecipePage() {
  const searchParams = useSearchParams();
  const openResultId = searchParams.get('open');
  /** Kalender „Rezept generieren“: Mahlzeitentitel ins Zutaten-/Prompt-Feld (Schritt 1). */
  const recipePrefillQuery = searchParams.get('query');
  const tabParam = searchParams.get('tab');
  // @ts-ignore
  const [state, formAction] = useActionState(generateRecipe, null);

  const [showCockpit, setShowCockpit] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'my-recipes'>('create');
  const [ingredients, setIngredients] = useState('');
  const [shoppingMode, setShoppingMode] = useState<'strict' | 'shopping'>('strict');
  const [mealType, setMealType] = useState('Hauptgericht');
  const [servings, setServings] = useState(2);
  const [filters, setFilters] = useState<string[]>([]);
  const [myRecipes, setMyRecipes] = useState<any[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);
  const [addToListToast, setAddToListToast] = useState<{ message: string } | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<{ recipe: Recipe; resultId: string; createdAt: Date } | null>(null);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [collectionSearch, setCollectionSearch] = useState('');
  const [collectionCategory, setCollectionCategory] = useState<string>('Alle');
  const [collectionMenuOpen, setCollectionMenuOpen] = useState<string | null>(null);
  const [isMagicModalOpen, setIsMagicModalOpen] = useState(false);
  const [isMagicGenerating, setIsMagicGenerating] = useState(false);
  const [magicQuery, setMagicQuery] = useState('');
  const [isWeekPlannerOpen, setIsWeekPlannerOpen] = useState(false);
  const [weekMeals, setWeekMeals] = useState({
    breakfast: false,
    lunch: false,
    dinner: true,
  });
  const [isPlanningWeek, setIsPlanningWeek] = useState(false);
  const [selectedWeekFilters, setSelectedWeekFilters] = useState<string[]>([]);
  const [plannerPhase, setPlannerPhase] = useState<'setup' | 'loading' | 'lab' | 'committing' | 'active-view'>('setup');
  const [weekDraft, setWeekDraft] = useState<any[]>([]);
  const [activeWeekPlan, setActiveWeekPlan] = useState<any[] | null>(null);
  const [loadingRecipeId, setLoadingRecipeId] = useState<string | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>([]);
  /** SmartCart Pantry Check: Review-Modal vor dem Anlegen der Liste */
  const [isPantryModalOpen, setIsPantryModalOpen] = useState(false);
  const [isGeneratingGroceries, setIsGeneratingGroceries] = useState(false);
  const [groceryList, setGroceryList] = useState<
    { item: string; amount: string; category: string; checked: boolean }[]
  >([]);
  const [pantrySmartCartLists, setPantrySmartCartLists] = useState<ShoppingList[]>([]);
  const [pantrySelectedListId, setPantrySelectedListId] = useState<string>('');
  const [pantryNewListName, setPantryNewListName] = useState('');
  const [isPantryListsLoading, setIsPantryListsLoading] = useState(false);
  const [isSavingPantryToSmartCart, setIsSavingPantryToSmartCart] = useState(false);
  const [isActivatingWeeklyPlan, setIsActivatingWeeklyPlan] = useState(false);
  const [customWeekPrompt, setCustomWeekPrompt] = useState('');
  const [rollingMealId, setRollingMealId] = useState<string | null>(null);
  /** 3-Schritte-Assistent nur in Phase „setup“ des Wochenplan-Modals (nicht mit Rezept-Wizard `wizardStep` verwechseln). */
  const [weekPlannerSetupStep, setWeekPlannerSetupStep] = useState<1 | 2 | 3>(1);
  /** Schritt 1: Zeitpräferenz → wird mit `⏱️ Unter 30 Min` in die API-Filter gemerged. */
  const [weekTimePreference, setWeekTimePreference] = useState<'quick' | 'normal'>('normal');
  const router = useRouter();

  const collectMealTitlesForPantry = useCallback(() => {
    const plan = weekDraft?.length ? weekDraft : activeWeekPlan ?? [];
    if (!Array.isArray(plan)) return [];
    return plan.flatMap((day: { meals?: { title?: string }[] }) =>
      Array.isArray(day?.meals)
        ? day.meals
            .map((m) => (typeof m?.title === 'string' ? m.title.trim() : ''))
            .filter((t) => t.length > 0)
        : []
    );
  }, [weekDraft, activeWeekPlan]);

  const groupedPantryByCategory = useMemo(() => {
    const m = new Map<string, { row: (typeof groceryList)[number]; index: number }[]>();
    groceryList.forEach((row, index) => {
      const cat = normalizeSmartCartCategory(row.category);
      const arr = m.get(cat) ?? [];
      arr.push({ row, index });
      m.set(cat, arr);
    });
    const keys = sortCategoriesBySupermarktRoute([...m.keys()]);
    return keys.map((k) => [k, m.get(k)!] as const);
  }, [groceryList]);

  const pantryCheckedCount = useMemo(() => groceryList.filter((g) => g.checked).length, [groceryList]);

  const planForCalendarActivation = useMemo(() => {
    const plan = weekDraft?.length ? weekDraft : activeWeekPlan ?? [];
    if (!Array.isArray(plan) || plan.length === 0) return null;
    const hasMeals = plan.some(
      (d: { meals?: unknown[] }) => Array.isArray(d?.meals) && d.meals.length > 0
    );
    return hasMeals ? plan : null;
  }, [weekDraft, activeWeekPlan]);

  /** SmartCart-Listen laden, sobald das Pantry-Modal geöffnet wird (für Ziel-Dropdown). */
  useEffect(() => {
    if (!isPantryModalOpen) return;
    let cancelled = false;
    setIsPantryListsLoading(true);
    getShoppingLists()
      .then((loaded) => {
        if (cancelled) return;
        const next = loaded.length > 0 ? loaded : [defaultList()];
        setPantrySmartCartLists(next);
        setPantrySelectedListId((prev) =>
          prev && next.some((l) => l.id === prev) ? prev : next[0].id
        );
        setPantryNewListName('');
      })
      .catch(() => {
        if (!cancelled) {
          const def = defaultList();
          setPantrySmartCartLists([def]);
          setPantrySelectedListId(def.id);
        }
      })
      .finally(() => {
        if (!cancelled) setIsPantryListsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isPantryModalOpen]);

  /** Alle Filter inkl. Zeit aus Schritt 1 – für generateWeekDraft / regenerateSingleMealDraft */
  const effectiveWeekPlannerFilters = useMemo(() => {
    const base = selectedWeekFilters.filter((f) => f !== WEEK_PLANNER_TIME_FILTER);
    if (weekTimePreference === 'quick') {
      return [...base, WEEK_PLANNER_TIME_FILTER];
    }
    return base;
  }, [selectedWeekFilters, weekTimePreference]);

  /** Filter-Chips für Sammlung: Alle, Hauptgericht, Frühstück, Dessert, Salat, Veggie */
  const COLLECTION_CATEGORIES = [
    { id: 'Alle', label: 'Alle' },
    { id: 'Hauptgericht', label: 'Hauptgericht' },
    { id: 'Frühstück', label: 'Frühstück' },
    { id: 'Dessert', label: 'Dessert' },
    { id: 'Salat', label: 'Salat' },
    { id: 'Veggie', label: 'Veggie' },
  ];

  /** Kalender → activeWeekPlan (inkl. imageUrl). Läuft beim ersten Render und wenn sich showCockpit ändert (z. B. zurück zur Übersicht → frische Daten). */
  useEffect(() => {
    let cancelled = false;
    console.log('[CookIQ] Fetch gestartet: getCurrentWeekMeals');
    getCurrentWeekMeals().then((result) => {
      if (cancelled) return;
      const { plan, queryFrom, queryTo } = result;
      console.log('Gesuchtes Datum:', queryFrom || '(kein Zeitraum)', queryTo ? `– ${queryTo}` : '');
      console.log('[CookIQ] Gruppierter Plan:', plan);
      const hasEvents = Array.isArray(plan) && plan.length > 0 && plan.some((d) => d.meals?.length > 0);
      if (!hasEvents) {
        setActiveWeekPlan(null);
        return;
      }
      setActiveWeekPlan(plan);
    });
    return () => {
      cancelled = true;
    };
  }, [showCockpit]);

  /** Wochenplan-Modal geöffnet → Assistent immer bei Schritt 1 starten */
  useEffect(() => {
    if (!isWeekPlannerOpen) return;
    setWeekPlannerSetupStep(1);
  }, [isWeekPlannerOpen]);

  // Heutiges oder nächstes Gericht für die Full-Width-Karte "Aktive Woche"
  const todayMealSpotlight = useMemo(() => {
    const plan = activeWeekPlan;
    if (!plan || !Array.isArray(plan) || plan.length === 0) return null;
    const dayIndex = (new Date().getDay() + 6) % 7;
    const hour = new Date().getHours();
    const mealTypeOrder: Array<'breakfast' | 'lunch' | 'dinner'> =
      hour < 8 ? ['breakfast', 'lunch', 'dinner'] : hour < 12 ? ['lunch', 'dinner', 'breakfast'] : ['dinner', 'lunch', 'breakfast'];
    const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const mealLabels: Record<string, string> = { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen' };

    const pickMealForSpotlight = (
      meals: Array<{
        type?: string;
        title?: string;
        time?: string;
        calories?: string;
        imageUrl?: string | null;
      }>
    ) => {
      const byOrder =
        meals.find((m) => mealTypeOrder[0] === m.type) ??
        meals.find((m) => mealTypeOrder[1] === m.type) ??
        meals.find((m) => mealTypeOrder[2] === m.type) ??
        meals[0];
      const hasImg = (m: (typeof meals)[0]) =>
        typeof m?.imageUrl === 'string' && m.imageUrl.trim().length > 0;
      if (byOrder && hasImg(byOrder)) return byOrder;
      const anyWithImage = meals.find((m) => hasImg(m));
      if (anyWithImage) return anyWithImage;
      return byOrder;
    };

    for (let offset = 0; offset < 2; offset++) {
      const idx = (dayIndex + offset) % 7;
      const dayObj = plan[idx] as {
        day?: string;
        meals?: Array<{
          type?: string;
          title?: string;
          time?: string;
          calories?: string;
          imageUrl?: string | null;
        }>;
      } | undefined;
      const meals = dayObj?.meals ?? [];
      if (meals.length === 0) continue;
      const meal = pickMealForSpotlight(meals);
      if (!meal) continue;
      const dayLabel = dayObj?.day ?? dayNames[idx];
      const mealTypeLabel = mealLabels[meal.type as string] ?? 'Gericht';
      const isPlaceholder = (s: string | undefined) => !s || s.trim() === '' || s.trim() === '—' || s.trim() === '-';
      const timeRaw = meal.time?.trim();
      const calRaw = meal.calories?.trim();
      const displayTime = !isPlaceholder(timeRaw) ? timeRaw! : null;
      let displayCalories: string | null = null;
      if (!isPlaceholder(calRaw)) {
        const c = calRaw!;
        displayCalories = /\d/.test(c) && !/kcal/i.test(c) ? `${c} kcal`.replace(/\s+/g, ' ') : c;
      }
      const imageUrl =
        typeof meal.imageUrl === 'string' && meal.imageUrl.trim().length > 0 ? meal.imageUrl.trim() : null;
      return {
        dayLabel,
        mealTypeLabel,
        title: meal.title?.trim() || 'Gericht',
        subtext: [displayCalories, displayTime].filter(Boolean).join(' • ') || '',
        isTomorrow: offset === 1,
        imageUrl,
        displayTime,
        displayCalories,
      };
    }
    return null;
  }, [activeWeekPlan]);

  /** Rezept-Detail: dynamisches Header-Bild in der DashboardShell (kein zweites Bild in RecipeDetailView). */
  const recipeDetailHeroUrl = useMemo(() => {
    const u = selectedRecipe?.recipe?.imageUrl;
    return typeof u === 'string' && u.trim().length > 0 ? u.trim() : null;
  }, [selectedRecipe]);

  // ?tab=my-recipes: Direkt zum Tab (z. B. von GourmetCockpit-Links)
  useEffect(() => {
    if (tabParam === 'my-recipes') {
      setShowCockpit(false);
      setActiveTab('my-recipes');
    }
  }, [tabParam]);

  // ?open=resultId: Rezept direkt öffnen (z. B. von Kalender „Jetzt kochen“)
  useEffect(() => {
    if (!openResultId) return;
    setShowCockpit(false);
    setActiveTab('my-recipes');
    getResultById(openResultId).then((result) => {
      if (!result?.content) return;
      try {
        const content = JSON.parse(result.content) as Recipe;
        const legacy = content as Record<string, unknown>;
        if (!content.recipeName && legacy.title) (content as Recipe).recipeName = legacy.title as string;
        if (!content.ingredients && Array.isArray(legacy.ingredients)) (content as Recipe).ingredients = legacy.ingredients as string[];
        if (!content.instructions && Array.isArray(legacy.steps)) (content as Recipe).instructions = legacy.steps as string[];
        if (!content.stats) (content as Recipe).stats = { time: '', calories: '', difficulty: '', protein: undefined, carbs: undefined, fat: undefined };
        if (!Array.isArray(content.shoppingList)) (content as Recipe).shoppingList = (legacy.missingIngredients as string[]) ?? [];
        if (!content.chefTip) (content as Recipe).chefTip = (legacy.tip as string) ?? '';
        setSelectedRecipe({
          recipe: content,
          resultId: result.id,
          createdAt: new Date(result.createdAt),
        });
      } catch {
        // ignore parse error
      }
    });
  }, [openResultId]);

  useEffect(() => {
    if (openResultId || !recipePrefillQuery) return;
    let text = recipePrefillQuery;
    try {
      text = decodeURIComponent(recipePrefillQuery);
    } catch {
      /* ungültige Kodierung: Rohstring nutzen */
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    setIngredients(trimmed);
    setShowCockpit(false);
    setActiveTab('create');
    setWizardStep(1);
  }, [openResultId, recipePrefillQuery]);

  useEffect(() => {
    if (!addToListToast) return;
    const t = setTimeout(() => setAddToListToast(null), 3000);
    return () => clearTimeout(t);
  }, [addToListToast]);

  // Parse Recipe aus State
  let recipe: Recipe | null = null;
  if (state?.result && !state.error) {
    try {
      // Prüfe ob es die Upsell-Nachricht ist (Markdown)
      if (state.result.includes('🔒 Premium Feature')) {
        recipe = null; // Zeige Upsell-Nachricht
      } else {
        recipe = JSON.parse(state.result) as Recipe;
        // Fallbacks für ältere Antworten
        const legacy: any = recipe as any;
        if (!recipe.recipeName && legacy.title) {
          recipe.recipeName = legacy.title;
        }
        if (!recipe.ingredients && Array.isArray(legacy.ingredients)) {
          recipe.ingredients = legacy.ingredients;
        }
        if (!recipe.instructions && Array.isArray(legacy.steps)) {
          recipe.instructions = legacy.steps;
        }
        if (!recipe.stats) {
          recipe.stats = {
            time: legacy.time || '',
            calories: legacy.calories ?? '',
            difficulty: legacy.difficulty || '',
            protein: legacy.stats?.protein,
            carbs: legacy.stats?.carbs,
            fat: legacy.stats?.fat,
          };
        }
        if (!Array.isArray(recipe.shoppingList)) {
          recipe.shoppingList = legacy.missingIngredients || [];
        }
        if (!recipe.chefTip) {
          recipe.chefTip = legacy.tip || '';
        }
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  }

  // Sofortiger Redirect zum Rezept (kein Erfolgs-Modal) – nur für Wizard-Submit, nicht für Magic-Modal
  useEffect(() => {
    if (state?.resultId && !state?.error && !isMagicGenerating) {
      setIsMagicModalOpen(false);
      router.push('/tools/recipe?open=' + state.resultId);
    }
  }, [state?.resultId, state?.error, router, isMagicGenerating]);

  const handleMagicSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsMagicGenerating(true);
    const formData = new FormData(e.currentTarget);
    setMagicQuery((formData.get('magicPrompt') as string) || '');

    try {
      const res = await generateRecipe(null, formData);
      if (res?.resultId) {
        setIsMagicModalOpen(false);
        router.push('/tools/recipe?open=' + res.resultId);
      }
      if (res?.error) {
        console.error('Magic-Rezept Fehler:', res.error);
      }
    } catch (error) {
      console.error('Fehler bei der Generierung:', error);
    } finally {
      setIsMagicGenerating(false);
    }
  };

  // Lade "Meine Rezepte" wenn Tab gewechselt wird
  useEffect(() => {
    if (activeTab === 'my-recipes') {
      loadMyRecipes();
    }
  }, [activeTab]);

  const loadMyRecipes = async () => {
    setIsLoadingRecipes(true);
    try {
      // Auto-Cleanup: Alte Results (30 Tage) löschen
      await cleanupOldResults();
      
      // Lade alle Recipe-Results (ohne Workspace-Filter)
      const result = await getWorkspaceResults(undefined, 200);
      if (result.success && result.results) {
        // Filtere nur Recipe-Results
        const recipeResults = result.results
          .filter((r: { toolId: string }) => r.toolId === 'recipe')
          .map((r: { toolId: string; content: string } & Record<string, unknown>) => {
            try {
              const content = JSON.parse(r.content);
              return {
                ...r,
                recipe: content,
              };
            } catch {
              return null;
            }
          })
          .filter(Boolean);
        setMyRecipes(recipeResults);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rezepte:', error);
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  const handleDeleteRecipe = async (resultId: string) => {
    if (!confirm('Rezept wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return;
    }

    try {
      const result = await deleteResult(resultId);
      if (result.success) {
        // Rezept aus Liste entfernen
        setMyRecipes(prev => prev.filter(r => r.id !== resultId));
        // Wenn gelöschtes Rezept gerade angezeigt wird, zurück zur Liste
        if (selectedRecipe && selectedRecipe.resultId === resultId) {
          setSelectedRecipe(null);
        }
      } else {
        alert('Fehler beim Löschen: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      alert('Fehler beim Löschen des Rezepts');
    }
  };

  const toggleFilter = (filter: string) => {
    setFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  /** mealType / Kategorie aus Result-Metadata für Sammlung-Filter */
  const getRecipeCategory = (result: { metadata?: string | null; recipe?: Recipe }) => {
    try {
      const meta = result.metadata ? JSON.parse(result.metadata) as { mealType?: string; filters?: string[] } : {};
      const mealType = (meta.mealType || '').trim();
      const filters = meta.filters || [];
      if (filters.some((f: string) => /vegetarisch|vegan/i.test(f))) return 'Veggie';
      if (/hauptgericht/i.test(mealType)) return 'Hauptgericht';
      if (/frühstück|snack/i.test(mealType)) return 'Frühstück';
      if (/dessert/i.test(mealType)) return 'Dessert';
      if (/salat|bowl/i.test(mealType)) return 'Salat';
      if (mealType) return mealType;
    } catch {
      // ignore
    }
    const name = (result.recipe?.recipeName || '').toLowerCase();
    if (/salat|bowl/i.test(name)) return 'Salat';
    if (/frühstück|müsli|porridge|omelett|eier/i.test(name)) return 'Frühstück';
    if (/dessert|kuchen|kekse|eis|creme/i.test(name)) return 'Dessert';
    if (/vegetarisch|vegan|veggie/i.test(name)) return 'Veggie';
    return 'Hauptgericht';
  };

  /** Hybrid: Zuerst categoryIcon (KI), fehlt er → Keyword-Fallback auf Titel (Legacy-Rezepte). */
  type RecipeTheme = { gradient: string; Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; shadow: string };
  const DEFAULT_THEME: RecipeTheme = { gradient: 'bg-gradient-to-br from-slate-500 to-gray-700', Icon: ChefHat, shadow: 'shadow-slate-500/20' };
  const CATEGORY_ICON_THEMES: Record<string, RecipeTheme> = {
    pasta: { gradient: 'bg-gradient-to-br from-yellow-500 to-amber-500', Icon: Wheat, shadow: 'shadow-amber-500/20' },
    pizza: { gradient: 'bg-gradient-to-br from-orange-500 to-red-600', Icon: Pizza, shadow: 'shadow-orange-500/25' },
    burger: { gradient: 'bg-gradient-to-br from-amber-600 to-orange-700', Icon: Sandwich, shadow: 'shadow-amber-500/25' },
    soup: { gradient: 'bg-gradient-to-br from-orange-400 to-amber-500', Icon: Soup, shadow: 'shadow-orange-500/20' },
    salad: { gradient: 'bg-gradient-to-br from-emerald-400 to-green-600', Icon: Salad, shadow: 'shadow-emerald-500/20' },
    vegetable: { gradient: 'bg-gradient-to-br from-green-400 to-emerald-600', Icon: Carrot, shadow: 'shadow-green-500/20' },
    meat: { gradient: 'bg-gradient-to-br from-rose-500 to-red-600', Icon: Beef, shadow: 'shadow-rose-500/20' },
    chicken: { gradient: 'bg-gradient-to-br from-amber-500 to-yellow-600', Icon: Drumstick, shadow: 'shadow-amber-500/20' },
    fish: { gradient: 'bg-gradient-to-br from-sky-400 to-blue-600', Icon: Fish, shadow: 'shadow-sky-500/20' },
    egg: { gradient: 'bg-gradient-to-br from-yellow-400 to-orange-400', Icon: Egg, shadow: 'shadow-amber-500/20' },
    dessert: { gradient: 'bg-gradient-to-br from-pink-400 to-rose-400', Icon: Cake, shadow: 'shadow-pink-500/20' },
    breakfast: { gradient: 'bg-gradient-to-br from-amber-300 to-orange-400', Icon: Coffee, shadow: 'shadow-amber-500/20' },
  };

  function getRecipeTheme(recipe: Recipe): RecipeTheme {
    const icon = recipe.categoryIcon?.trim();
    if (icon && CATEGORY_ICON_THEMES[icon]) return CATEGORY_ICON_THEMES[icon];
    const title = (recipe.recipeName || (recipe as { title?: string }).title || '').toLowerCase();
    const has = (keywords: string[]) => keywords.some((kw) => title.includes(kw));
    if (has(['kuchen', 'mousse', 'dessert', 'süß', 'schoko', 'torte'])) return CATEGORY_ICON_THEMES.dessert;
    if (has(['pasta', 'pizza', 'burger', 'brot', 'nudel', 'lasagne', 'spaghetti'])) return CATEGORY_ICON_THEMES.pasta;
    if (has(['suppe', 'curry', 'eintopf', 'chili', 'ramen'])) return CATEGORY_ICON_THEMES.soup;
    if (has(['salat', 'bowl', 'insalata'])) return { gradient: 'bg-gradient-to-br from-emerald-400 to-green-600', Icon: LeafyGreen, shadow: 'shadow-emerald-500/20' };
    if (has(['schnitzel', 'steak', 'hähnchen', 'chicken', 'fleisch', 'hack', 'rind', 'wurst', 'braten'])) return CATEGORY_ICON_THEMES.meat;
    if (has(['lachs', 'fisch', 'garnele', 'sushi', 'thunfisch'])) return CATEGORY_ICON_THEMES.fish;
    if (has(['paprika', 'kartoffel', 'vegan', 'vegetarisch', 'zucchini', 'gemüse', 'auflauf', 'gratin'])) return CATEGORY_ICON_THEMES.vegetable;
    if (has(['ei', 'eier', 'omelett', 'frittata', 'rührei', 'pancake'])) return CATEGORY_ICON_THEMES.egg;
    return DEFAULT_THEME;
  }

  const filteredCollectionRecipes = useMemo(() => {
    let list = myRecipes;
    if (collectionSearch.trim()) {
      const q = collectionSearch.trim().toLowerCase();
      list = list.filter((r: { recipe: Recipe }) => (r.recipe?.recipeName || '').toLowerCase().includes(q));
    }
    if (collectionCategory !== 'Alle') {
      list = list.filter((r: Record<string, unknown>) => getRecipeCategory(r as { metadata?: string | null; recipe?: Recipe }) === collectionCategory);
    }
    return list;
  }, [myRecipes, collectionSearch, collectionCategory]);

  const mealTypeOptions: { id: string; label: string; value: string; Icon: typeof Utensils }[] = [
    { id: 'main', label: 'Hauptgericht', value: 'Hauptgericht', Icon: Utensils },
    { id: 'salad', label: 'Salat / Bowl', value: 'Salat / Bowl', Icon: Salad },
    { id: 'breakfast', label: 'Frühstück / Snack', value: 'Frühstück / Snack', Icon: Coffee },
    { id: 'dessert', label: 'Dessert', value: 'Dessert', Icon: Cake },
    { id: 'sauce', label: 'Soße / Dip', value: 'Soße / Dip', Icon: Droplets },
    { id: 'drink', label: 'Drink / Shake', value: 'Drink / Shake', Icon: Wine },
  ];

  /** Filter: zwei Gruppen mit Lucide-Icons, keine Emojis */
  const filterGroups: { groupLabel: string; options: { value: string; label: string; Icon: typeof Utensils; iconColor: string }[] }[] = [
    {
      groupLabel: 'Ernährung & Allergien',
      options: [
        { value: 'Fleisch & Gemüse', label: 'Fleisch & Gemüse', Icon: Beef, iconColor: 'text-slate-600' },
        { value: 'Vegetarisch', label: 'Vegetarisch', Icon: LeafyGreen, iconColor: 'text-emerald-500' },
        { value: 'Vegan', label: 'Vegan', Icon: Sprout, iconColor: 'text-emerald-600' },
        { value: 'Pescetarisch', label: 'Pescetarisch', Icon: Fish, iconColor: 'text-sky-500' },
        { value: 'Halal', label: 'Halal', Icon: Moon, iconColor: 'text-slate-600' },
        { value: 'Koscher', label: 'Koscher', Icon: Star, iconColor: 'text-amber-500' },
        { value: 'Glutenfrei', label: 'Glutenfrei', Icon: WheatOff, iconColor: 'text-amber-500' },
        { value: 'Laktosefrei', label: 'Laktosefrei', Icon: Milk, iconColor: 'text-slate-500' },
        { value: 'High Protein', label: 'High Protein', Icon: Dumbbell, iconColor: 'text-rose-500' },
        { value: 'Low Carb', label: 'Low Carb', Icon: TrendingDown, iconColor: 'text-emerald-600' },
        { value: 'Keto', label: 'Keto', Icon: Leaf, iconColor: 'text-green-600' },
        { value: 'Unter 600 kcal', label: 'Unter 600 kcal', Icon: Flame, iconColor: 'text-red-500' },
      ],
    },
    {
      groupLabel: 'Situation & Zeit',
      options: [
        { value: 'Schnell', label: 'Schnell', Icon: Timer, iconColor: 'text-blue-500' },
        { value: 'Familienfreundlich', label: 'Familienfreundlich', Icon: Users, iconColor: 'text-indigo-500' },
        { value: 'Date Night', label: 'Date Night', Icon: Wine, iconColor: 'text-rose-500' },
      ],
    },
  ];

  const handleReRollMeal = async (
    dayIndex: number,
    mealIndex: number,
    day: string,
    mealType: string,
    oldTitle: string
  ) => {
    const mealId = `${day}-${mealType}`;
    setRollingMealId(mealId);
    try {
      const res = await regenerateSingleMealDraft(
        day,
        mealType,
        effectiveWeekPlannerFilters,
        customWeekPrompt || '',
        oldTitle
      );
      if (res?.success && res.meal) {
        setWeekDraft((prev) => {
          const newDraft = [...prev];
          if (newDraft[dayIndex]?.meals) {
            newDraft[dayIndex] = { ...newDraft[dayIndex], meals: [...newDraft[dayIndex].meals] };
            newDraft[dayIndex].meals[mealIndex] = { ...res.meal, type: res.meal.type };
          }
          return newDraft;
        });
      } else if (res && !res.success) {
        setAddToListToast({ message: res.error });
      }
    } finally {
      setRollingMealId(null);
    }
  };

  const handleSwapMeal = (sourceDayIdx: number, mealIdx: number, targetDayIdx: number) => {
    if (sourceDayIdx === targetDayIdx) return;

    setWeekDraft((prev) => {
      const newDraft = JSON.parse(JSON.stringify(prev)) as typeof prev;
      const sourceMeal = newDraft[sourceDayIdx].meals[mealIdx];
      if (!sourceMeal) return prev;

      const targetMealIdx = newDraft[targetDayIdx].meals.findIndex((m: { type: string }) => m.type === sourceMeal.type);

      if (targetMealIdx !== -1) {
        const targetMeal = newDraft[targetDayIdx].meals[targetMealIdx];
        newDraft[targetDayIdx].meals[targetMealIdx] = { ...sourceMeal };
        newDraft[sourceDayIdx].meals[mealIdx] = { ...targetMeal };
      } else {
        newDraft[targetDayIdx].meals.push({ ...sourceMeal });
        newDraft[sourceDayIdx].meals.splice(mealIdx, 1);
        const order: Record<string, number> = { breakfast: 1, lunch: 2, dinner: 3 };
        newDraft[targetDayIdx].meals.sort(
          (a: { type: string }, b: { type: string }) => (order[a.type] ?? 0) - (order[b.type] ?? 0)
        );
      }

      return newDraft;
    });
  };

  const handleOpenRecipe = async (day: string, meal: { title: string; type?: string; time?: string; calories?: string }) => {
    const recipeId = `${day}-${meal.title}`;
    setLoadingRecipeId(recipeId);

    const res = await generateAndSaveFullRecipe(
      meal.title,
      meal.calories ?? '',
      meal.time ?? ''
    );

    setLoadingRecipeId(null);

    if (res?.success && res.recipe && res.resultId) {
      const recipe = res.recipe as Recipe;
      setSelectedRecipe({
        recipe,
        resultId: res.resultId,
        createdAt: new Date(),
      });
      setShowCockpit(false);
      setActiveTab('my-recipes');
      setIsWeekPlannerOpen(false);
    } else {
      alert('Fehler beim Laden des Rezepts.');
    }
  };

  return (
    <>
      {/* Cockpit (Landing) – Header bricht auf Desktop aus (data-header-full-bleed verhindert overflow-x-hidden im Layout) */}
      {showCockpit ? (
        <div data-header-full-bleed className="min-h-screen w-full relative overflow-x-visible">
          <GourmetCockpit
            onVorschlagGenerieren={() => {
              setShowCockpit(false);
              setActiveTab('create');
              setIngredients('');
            }}
            onMagicWunsch={() => setIsMagicModalOpen(true)}
            activeWeekPlan={activeWeekPlan}
            todayMealSpotlight={todayMealSpotlight}
            onWochePlanen={() => {
              setPlannerPhase('setup');
              setIsWeekPlannerOpen(true);
            }}
            onAktiveWocheAnsehen={() => {
              if (activeWeekPlan?.length) {
                setWeekDraft(activeWeekPlan);
                setPlannerPhase('active-view');
                setIsWeekPlannerOpen(true);
              }
            }}
          />
        </div>
      ) : (
        /* Create / Meine Rezepte: DashboardShell für einheitliches Header/Overlap */
        <div
          className="min-h-screen w-full bg-canvas"
          style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
        >
          <DashboardShell
            headerVariant="default"
            layer0HeightClass={
              activeTab === 'my-recipes' && selectedRecipe && recipeDetailHeroUrl
                ? 'h-[min(35vh,380px)] min-h-[220px]'
                : undefined
            }
            headerMinHeightClass={
              activeTab === 'my-recipes' && selectedRecipe && recipeDetailHeroUrl
                ? 'min-h-[min(35vh,380px)]'
                : undefined
            }
            headerBackground={
              activeTab === 'my-recipes' && selectedRecipe && recipeDetailHeroUrl ? (
                <div className="relative w-full h-full bg-gray-900">
                  <img
                    src={recipeDetailHeroUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[55%] bg-gradient-to-t from-black/75 via-black/25 to-transparent"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black/35 via-transparent to-transparent"
                    aria-hidden
                  />
                </div>
              ) : (
                <div className="relative w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url(/assets/images/cooking-action.webp)' }}>
                  <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-800/60 to-gray-900/60 z-0" aria-hidden />
                </div>
              )
            }
            title={
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedRecipe) {
                      setSelectedRecipe(null);
                      return;
                    }
                    setShowCockpit(true);
                    setActiveTab('create');
                    setWizardStep(1);
                  }}
                  className="group inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full transition-all text-sm font-medium border border-white/10 mb-3"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  {selectedRecipe ? 'Zurück zur Sammlung' : 'Zurück zur Übersicht'}
                </button>
                {selectedRecipe ? (
                  <h1 className="sr-only">{selectedRecipe.recipe.recipeName}</h1>
                ) : (
                  <h1
                    className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-white mb-1 mt-0 drop-shadow-md"
                    style={{ letterSpacing: '-0.3px' }}
                  >
                    {activeTab === 'my-recipes' ? 'Meine Sammlung' : 'Rezept Generator'}
                  </h1>
                )}
              </>
            }
            subtitle={
              <>
                {!selectedRecipe && (
                <p className="text-white/90 text-lg md:text-xl drop-shadow-sm">
                  {activeTab === 'my-recipes'
                    ? 'Deine kulinarischen Schätze.'
                    : 'Dein Smart-Chef für den Kühlschrank.'}
                </p>
                )}
                {activeTab === 'create' && (
                  <>
                    <p className="text-white/70 text-sm font-medium mt-2" style={{ letterSpacing: '0.05em' }}>
                      Schritt {wizardStep} von 3
                    </p>
                    {wizardStep === 1 && <p className="text-white/90 text-sm font-bold mt-1">Gerichttyp wählen</p>}
                  </>
                )}
              </>
            }
          >
      {activeTab === 'create' ? (
        <React.Fragment>
        <form action={formAction} id="recipe-wizard-form" className="contents">
          <input type="hidden" name="mealType" value={mealType} />
          <input type="hidden" name="servings" value={servings} />
          <input type="hidden" name="shoppingMode" value={shoppingMode} />
          {filters.map((f) => (
            <input key={f} type="hidden" name="filters" value={f} />
          ))}

          {/* Erste Cards: Oberkante bei Main+36px (pt-9 in Shell), Titel im Header */}
          <div className="space-y-6 md:space-y-8">
            {wizardStep === 1 && (
              <section key="step1" aria-labelledby="meal-type-heading">
                <h2 id="meal-type-heading" className="sr-only">Gerichttyp wählen</h2>
                <div className="grid grid-cols-2 gap-3 md:gap-3 md:max-w-2xl md:mx-auto">
                  {mealTypeOptions.map((option) => {
                    const isActive = mealType === option.value;
                    const Icon = option.Icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setMealType(option.value)}
                        className={cn(
                          'group relative flex flex-col justify-between h-full items-start min-h-[132px] md:min-h-[100px] rounded-xl md:rounded-2xl overflow-hidden p-3 sm:p-3.5 text-left block w-full transition-all duration-300 cursor-pointer active:scale-[0.98]',
                          'hover:scale-[1.02]',
                          isActive
                            ? 'border-0 bg-orange-500/20 text-orange-700 backdrop-blur-md shadow-[inset_0_0_15px_rgba(249,115,22,0.2)] scale-[1.02]'
                            : 'border-2 border-transparent'
                        )}
                        style={!isActive ? DASHBOARD_CARD_STYLE : undefined}
                      >
                        <div className="flex w-full justify-between items-start gap-1.5">
                          <div className={cn(
                            'w-11 h-11 md:w-10 md:h-10 rounded-[14px] flex items-center justify-center shrink-0',
                            'bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30',
                            isActive && 'shadow-orange-500/40'
                          )}>
                            <Icon className="w-5 h-5 md:w-4 md:h-4 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                          </div>
                          {isActive && (
                            <span className="rounded-full bg-orange-500/80 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 shrink-0" aria-hidden>
                              Ausgewählt
                            </span>
                          )}
                        </div>
                        <div className="w-full text-left mt-1">
                          <h3 className={cn('font-semibold text-sm md:text-[0.9375rem] leading-tight line-clamp-2', isActive ? 'text-orange-700' : 'text-gray-900')}>
                            {option.label}
                          </h3>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Step 2: Nur Personenanzahl – Karte ragt wie Step 1 in den Header (kein Extra-Abstand) */}
            {wizardStep === 2 && (
              <section className="relative z-20 animate-in fade-in slide-in-from-right-4 duration-300" key="step2">
              <div className="max-w-md mx-auto">
                <div
                  className="rounded-2xl overflow-hidden p-6 sm:p-8 flex flex-col items-center justify-center min-h-[200px]"
                  style={DASHBOARD_CARD_STYLE}
                >
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 mb-4">Für wie viele Personen?</h3>
                  <div className="inline-flex items-center justify-between rounded-full p-2 gap-2 min-w-[200px]" style={DASHBOARD_CARD_STYLE}>
                    <button
                      type="button"
                      onClick={() => setServings(Math.max(1, servings - 1))}
                      disabled={servings <= 1}
                      className="flex items-center justify-center w-12 h-12 rounded-full bg-white/90 shadow-sm text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    <span className="font-bold text-2xl text-gray-900 min-w-[100px] text-center">
                      {servings} {servings === 1 ? 'Person' : 'Personen'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setServings(servings + 1)}
                      className="flex items-center justify-center w-12 h-12 rounded-full bg-white/90 shadow-sm text-orange-600 hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              </div>
              </section>
            )}

            {/* Step 3: Nur Zutaten + Optionen – erste Karte ragt wie Step 1/2 in den Header */}
            {wizardStep === 3 && (
              <section className="relative z-20 animate-in fade-in slide-in-from-right-4 duration-300" key="step3">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="rounded-2xl overflow-hidden p-5 sm:p-6" style={DASHBOARD_CARD_STYLE}>
                  <div className="flex items-center gap-2 mb-3">
                    <Refrigerator className="w-5 h-5 text-orange-500 shrink-0" aria-hidden />
                    <h3 className="font-semibold text-[1.0625rem] text-gray-900">Was hast du da?</h3>
                  </div>
                  <textarea
                    name="ingredients"
                    value={ingredients}
                    onChange={(e) => setIngredients(e.target.value)}
                    placeholder="z.B. Eier, Tomaten, Nudeln… (leer = Überraschung)"
                    className="w-full rounded-xl bg-white/50 border border-white/40 text-gray-900 placeholder:text-gray-500 focus:bg-white/70 focus:border-orange-300 focus:ring-2 focus:ring-orange-500/20 p-4 text-base resize-none transition-all min-h-[160px]"
                    rows={4}
                  />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-3 mb-2">Schnell hinzufügen</p>
                  <div className="flex flex-wrap gap-2">
                    {['Tomaten', 'Eier', 'Nudeln', 'Zwiebeln', 'Käse', 'Reis', 'Hackfleisch', 'Paprika', 'Kartoffeln'].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setIngredients(prev => prev ? `${prev}, ${tag}` : tag)}
                        className="px-3 py-1.5 rounded-full bg-white/40 border border-white/50 text-gray-700 text-sm font-medium hover:bg-white/60 active:scale-95 transition-all"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                  {ingredients.trim().length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/30">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Darf eingekauft werden?</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setShoppingMode('strict')}
                          className={cn(
                            'px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95',
                            shoppingMode === 'strict' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/40 border border-white/50 text-gray-700 hover:bg-white/60'
                          )}>
                          Reste verwerten
                        </button>
                        <button type="button" onClick={() => setShoppingMode('shopping')}
                          className={cn(
                            'px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-95',
                            shoppingMode === 'shopping' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/40 border border-white/50 text-gray-700 hover:bg-white/60'
                          )}>
                          Fehlendes ergänzen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Filter als zweite Karte – Gruppen mit Icons, Tier-1-Chip-Design */}
                <div className="rounded-2xl overflow-hidden p-5 sm:p-6" style={DASHBOARD_CARD_STYLE}>
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 mb-4">Diät & Filter</h3>
                  <div className="space-y-4">
                    {filterGroups.map((group) => (
                      <div key={group.groupLabel}>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">{group.groupLabel}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.options.map((option) => {
                            const isActive = filters.includes(option.value);
                            const Icon = option.Icon;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => toggleFilter(option.value)}
                                className={cn(
                                  'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95',
                                  isActive
                                    ? 'bg-orange-50 border border-orange-200 text-orange-700 shadow-sm'
                                    : 'bg-white/50 border border-white/40 text-slate-600 hover:bg-white/60'
                                )}
                              >
                                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-orange-600' : option.iconColor)} aria-hidden />
                                <span>{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              </section>
            )}
          </div>

          {state?.error && (
            <p className="mt-4 mx-4 text-sm font-semibold text-red-600 text-center">{state.error}</p>
          )}

          {/* CTA unter den Auswahlkarten – Breite passt zur Card drüber (Step 2: max-w-md, Step 1/3: max-w-2xl) */}
          <div className="mt-8 pt-6 pb-8 px-4 sm:px-6 md:px-8">
            <div className={cn('mx-auto flex flex-col sm:flex-row gap-3 items-stretch sm:items-center', wizardStep === 2 ? 'max-w-md' : 'max-w-2xl')}>
              {wizardStep > 1 && (
                <button
                  type="button"
                  onClick={() => setWizardStep((s) => s - 1 as 1 | 2 | 3)}
                  className="order-2 sm:order-1 w-full sm:w-auto sm:min-w-[7rem] md:min-w-[8rem] h-12 sm:h-12 rounded-xl px-5 py-3.5 bg-gray-100/95 backdrop-blur-md border border-gray-200/80 text-gray-800 font-semibold shadow-md shadow-gray-300/40 hover:bg-gray-200/95 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center"
                >
                  Zurück
                </button>
              )}
              <div className={cn('flex-1 flex min-w-0', wizardStep > 1 ? 'order-1 sm:order-2' : '')}>
                {wizardStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep((s) => s + 1 as 1 | 2 | 3)}
                    className="relative w-full h-12 sm:h-12 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 bg-gradient-to-r from-orange-500/90 to-amber-500/90 text-white font-bold backdrop-blur-md border border-white/30 shadow-lg shadow-orange-500/30 hover:scale-[1.02] hover:from-orange-400/95 hover:to-amber-400/95 transition-all active:scale-[0.98] before:absolute before:inset-0 before:rounded-xl before:bg-white/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:pointer-events-none before:z-0"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {wizardStep === 1 ? 'Weiter' : 'Weiter zu Zutaten'}
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  </button>
                ) : (
                  <div className="w-full">
                    <SubmitButton inspirationMode={ingredients.trim().length === 0} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Ergebnisfeld nur für Premium-Upsell (bei Erfolg: Redirect zu ?open=resultId) */}
        {state?.result && state.result.includes('🔒 Premium Feature') && (
        <div className="flex flex-col md:grid md:grid-cols-2 gap-8 md:gap-12 mt-8">
          <div className="h-fit min-h-0" />
          <div className="rounded-xl border border-gray-100 bg-white min-h-[200px] overflow-hidden">
            <div className="p-4 sm:p-5 md:p-6">
              <div className="prose prose-sm max-w-none text-gray-800 prose-p:text-gray-700 prose-a:text-orange-600 font-medium">
                <div dangerouslySetInnerHTML={{ __html: state.result.replace(/\n/g, '<br />') }} />
              </div>
            </div>
          </div>
        </div>
        )}
      </React.Fragment>
      ) : activeTab === 'my-recipes' ? (
        selectedRecipe ? (
          <RecipeDetailView
            recipe={selectedRecipe.recipe}
            resultId={selectedRecipe.resultId}
            createdAt={selectedRecipe.createdAt}
            onBack={() => setSelectedRecipe(null)}
            embedHeroInParent
          />
        ) : (
          /* Meine Sammlung: Command Center (schwebende Karte) + Grid */
          <div className="space-y-6">
            {/* Schwebende Karte: ragt in den Header, Suche + Filter */}
            <div className="relative z-20 -mt-8 mx-auto max-w-5xl px-4 sm:px-6">
              <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl p-6">
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white shadow-sm px-4 py-3 focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-orange-500 transition-shadow">
                  <Search className="w-5 h-5 text-gray-400 shrink-0" aria-hidden />
                  <input
                    type="search"
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    placeholder="Suche nach Pizza, Pasta oder Zutaten..."
                    className="flex-1 min-w-0 bg-white text-gray-900 placeholder-gray-400 text-sm font-medium outline-none border-0 focus:ring-0 p-0"
                    aria-label="Rezepte durchsuchen"
                  />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {COLLECTION_CATEGORIES.map((cat) => {
                    const isActive = collectionCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCollectionCategory(cat.id)}
                        className={cn(
                          'rounded-full px-4 py-1.5 text-sm font-medium transition-all border border-transparent',
                          isActive
                            ? 'bg-orange-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        )}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Grid */}
            {isLoadingRecipes ? (
              <div className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-8 text-center shadow-sm">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-500 mb-3" />
                <p className="text-slate-700 font-semibold">Lade Rezepte…</p>
              </div>
            ) : myRecipes.length === 0 ? (
              <div className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-10 text-center shadow-sm">
                <ChefHat className="w-14 h-14 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-800 font-semibold">Noch keine Rezepte gespeichert.</p>
                <p className="text-sm text-slate-600 mt-2 font-medium">Erstelle dein erstes Rezept in der Übersicht.</p>
              </div>
            ) : filteredCollectionRecipes.length === 0 ? (
              <div className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-md p-8 text-center shadow-sm">
                <Search className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                <p className="text-slate-800 font-semibold">Keine Rezepte passen zu Suche oder Filter.</p>
                <p className="text-sm text-slate-600 mt-1">Ändere die Suche oder wähle „Alle“.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {filteredCollectionRecipes.map((result: { id: string; recipe: Recipe; createdAt: string; metadata?: string | null }) => {
                  const r = result.recipe as Recipe;
                  const isMenuOpen = collectionMenuOpen === result.id;
                  const mealType = (() => {
                    try {
                      const meta = result.metadata ? JSON.parse(result.metadata) as { mealType?: string; filters?: string[] } : {};
                      return meta.mealType || '';
                    } catch { return ''; }
                  })();
                  const metaFilters = (() => {
                    try {
                      const meta = result.metadata ? JSON.parse(result.metadata) as { filters?: string[] } : {};
                      return meta.filters || [];
                    } catch { return []; }
                  })();
                  const theme = getRecipeTheme(r);
                  const titleAndFilters = `${r.recipeName || ''} ${metaFilters.join(' ')}`.toLowerCase();
                  const showVeganBadge = titleAndFilters.includes('vegan') || titleAndFilters.includes('vegetarisch');
                  const showHighProteinBadge = titleAndFilters.includes('high protein');
                  return (
                    <RecipeCard
                      key={result.id}
                      recipe={r}
                      theme={theme}
                      resultId={result.id}
                      isMenuOpen={collectionMenuOpen === result.id}
                      onMenuToggle={() => setCollectionMenuOpen(collectionMenuOpen === result.id ? null : result.id)}
                      onSelect={() => setSelectedRecipe({
                        recipe: r,
                        resultId: result.id,
                        createdAt: new Date(result.createdAt)
                      })}
                      onDelete={() => handleDeleteRecipe(result.id)}
                      showVeganBadge={showVeganBadge}
                      showHighProteinBadge={showHighProteinBadge}
                      glass
                    />
                  );
                })}
              </div>
            )}
          </div>
        )
      ) : null}

          </DashboardShell>
        </div>
      )}

      {/* Shopping List Modal (Export) */}
      {recipe && recipe.shoppingList && recipe.shoppingList.length > 0 && (
        <ShoppingListModal
          isOpen={isShoppingListOpen}
          onClose={() => setIsShoppingListOpen(false)}
          ingredients={recipe.shoppingList}
          recipeName={recipe.recipeName}
        />
      )}

      {/* Auf Einkaufsliste setzen – Modal + Toast */}
      {recipe && recipe.shoppingList && recipe.shoppingList.length > 0 && (
        <AddToShoppingListModal
          isOpen={isAddToListOpen}
          onClose={() => setIsAddToListOpen(false)}
          ingredients={recipe.shoppingList}
          onAdded={({ count, listName }) => {
            setAddToListToast({
              message: `${count} ${count === 1 ? 'Zutat' : 'Zutaten'} zu „${listName}“ hinzugefügt`,
            });
          }}
        />
      )}

      {addToListToast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium shadow-lg animate-in fade-in duration-200"
          role="status"
        >
          {addToListToast.message}
        </div>
      )}

      {/* Magic-Input-Modal: Wunschgericht */}
      {isMagicModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="magic-modal-title">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 relative">
            {!isMagicGenerating && (
              <button
                type="button"
                onClick={() => setIsMagicModalOpen(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
                aria-label="Schließen"
              >
                ✕
              </button>
            )}

            {isMagicGenerating ? (
              <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in duration-300">
                <div className="text-5xl animate-bounce mb-4" aria-hidden>👨‍🍳</div>
                <h3 id="magic-modal-title" className="text-xl font-bold text-gray-800 mb-2">Chefkoch denkt nach...</h3>
                <p className="text-sm text-gray-500 mb-6 px-4">
                  Kreiere das perfekte Rezept für <br /><span className="font-semibold text-orange-500">&quot;{magicQuery}&quot;</span>
                </p>
                <div className="w-10 h-10 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" aria-hidden />
              </div>
            ) : (
              <div className="animate-in fade-in duration-300">
                <h3 id="magic-modal-title" className="text-xl font-bold mb-2 text-gray-800">Worauf hast du Lust?</h3>
                <p className="text-sm text-gray-500 mb-6">Beschreibe dein Wunschgericht. Unsere KI zaubert das perfekte Rezept daraus.</p>

                <form onSubmit={handleMagicSubmit}>
                  <input type="hidden" name="mealType" value="Wunschgericht" />
                  <input type="hidden" name="servings" value="2" />
                  <input type="hidden" name="ingredients" value="" />
                  <input type="hidden" name="shoppingMode" value="strict" />
                  <div className="relative">
                    <input
                      type="text"
                      name="magicPrompt"
                      placeholder="z.B. Hausgemachter Döner..."
                      className="w-full border-2 border-orange-100 rounded-xl pl-4 pr-12 py-4 focus:outline-none focus:border-orange-500 bg-orange-50/30 font-medium"
                      autoFocus
                      required
                    />
                    <button
                      type="submit"
                      disabled={isMagicGenerating}
                      className="absolute right-2 top-2 bottom-2 aspect-square bg-gradient-to-br from-orange-400 to-pink-500 text-white rounded-lg flex items-center justify-center shadow-md hover:scale-105 transition-transform disabled:opacity-70 disabled:pointer-events-none"
                      aria-label="Rezept zaubern"
                    >
                      ✨
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Wochenplaner Setup-Modal (Tier 1 Phase 1) – per Portal für korrekte Darstellung auf Mobile */}
      {isWeekPlannerOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="week-planner-modal-title">
          <div
            className={cn(
              'relative z-[101] w-full max-w-md bg-white rounded-3xl shadow-2xl max-h-[90vh]',
              plannerPhase === 'active-view'
                ? 'flex flex-col min-h-0 overflow-hidden p-0'
                : 'overflow-y-auto p-6'
            )}
          >
            {/* Close: absolut nur wenn nicht active-view (dort sitzt X im Sticky-Header) */}
            {plannerPhase !== 'loading' && plannerPhase !== 'active-view' && (
              <button
                type="button"
                onClick={() => {
                  setIsWeekPlannerOpen(false);
                  setWeekPlannerSetupStep(1);
                  setTimeout(() => setPlannerPhase('setup'), 300);
                }}
                className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100"
                aria-label="Schließen"
              >
                ✕
              </button>
            )}

            {/* --- PHASE 1: SETUP (3-Schritte-Assistent) --- */}
            {plannerPhase === 'setup' && (
              <div className="animate-in fade-in duration-300 flex flex-col min-h-0">
                <div className="mb-4">
                  <h3 id="week-planner-modal-title" className="text-2xl font-bold mb-1 text-gray-800">
                    Woche planen
                  </h3>
                  <p className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
                    Schritt {weekPlannerSetupStep} von 3
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {weekPlannerSetupStep === 1 && 'Basis: Mahlzeiten & Zeitaufwand'}
                    {weekPlannerSetupStep === 2 && 'Ernährung & Fokus'}
                    {weekPlannerSetupStep === 3 && 'Stimmung & persönliche Wünsche'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Plan startet am kommenden Montag (Mo–So).</p>
                </div>

                {/* Schritt 1: Mahlzeiten + Zeitaufwand */}
                {weekPlannerSetupStep === 1 && (
                  <div className="space-y-6 mb-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Welche Mahlzeiten?</label>
                      <div className="flex gap-2">
                        {[
                          { id: 'breakfast', label: 'Frühstück', icon: '🥐' },
                          { id: 'lunch', label: 'Mittag', icon: '🥗' },
                          { id: 'dinner', label: 'Abends', icon: '🍽️' },
                        ].map((meal) => (
                          <button
                            key={meal.id}
                            type="button"
                            onClick={() => setWeekMeals((prev) => ({ ...prev, [meal.id]: !prev[meal.id as keyof typeof prev] }))}
                            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-2xl text-sm font-medium transition-all ${
                              weekMeals[meal.id as keyof typeof weekMeals]
                                ? 'bg-orange-100 text-orange-700 border-2 border-orange-300 shadow-sm transform scale-105'
                                : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:bg-gray-100'
                            }`}
                          >
                            <span className="text-xl" aria-hidden>
                              {meal.icon}
                            </span>
                            {meal.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Zeitaufwand</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          type="button"
                          onClick={() => setWeekTimePreference('quick')}
                          className={cn(
                            'flex-1 rounded-2xl border-2 py-3 px-4 text-left text-sm font-semibold transition-all',
                            weekTimePreference === 'quick'
                              ? 'border-orange-400 bg-orange-50 text-orange-800'
                              : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          Schnelle Küche (&lt;30 Min)
                        </button>
                        <button
                          type="button"
                          onClick={() => setWeekTimePreference('normal')}
                          className={cn(
                            'flex-1 rounded-2xl border-2 py-3 px-4 text-left text-sm font-semibold transition-all',
                            weekTimePreference === 'normal'
                              ? 'border-orange-400 bg-orange-50 text-orange-800'
                              : 'border-transparent bg-gray-50 text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          Normal
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Schritt 2: Ernährung */}
                {weekPlannerSetupStep === 2 && (
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Ernährung &amp; Fokus</label>
                    <div className="flex flex-wrap gap-2.5">
                      {WEEK_PLANNER_DIET_CHIPS.map((chip) => {
                        const isSelected = selectedWeekFilters.includes(chip.value);
                        return (
                          <button
                            key={chip.value}
                            type="button"
                            onClick={() =>
                              setSelectedWeekFilters((prev) =>
                                prev.includes(chip.value) ? prev.filter((f) => f !== chip.value) : [...prev, chip.value]
                              )
                            }
                            className={weekPlannerFilterChipClassNames(chip.group, isSelected)}
                          >
                            <span className="text-base leading-none shrink-0" aria-hidden>
                              {chip.emoji}
                            </span>
                            <span>{chip.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Schritt 3: Vibe + Freitext */}
                {weekPlannerSetupStep === 3 && (
                  <div className="space-y-6 mb-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Stimmung</label>
                      <div className="flex flex-wrap gap-2.5">
                        {WEEK_PLANNER_VIBE_CHIPS.map((chip) => {
                          const isSelected = selectedWeekFilters.includes(chip.value);
                          return (
                            <button
                              key={chip.value}
                              type="button"
                              onClick={() =>
                                setSelectedWeekFilters((prev) =>
                                  prev.includes(chip.value) ? prev.filter((f) => f !== chip.value) : [...prev, chip.value]
                                )
                              }
                              className={weekPlannerFilterChipClassNames(chip.group, isSelected)}
                            >
                              <span className="text-base leading-none shrink-0" aria-hidden>
                                {chip.emoji}
                              </span>
                              <span>{chip.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Weitere Wünsche? (Optional)</label>
                      <textarea
                        value={customWeekPrompt}
                        onChange={(e) => setCustomWeekPrompt(e.target.value)}
                        placeholder="z.B. Mittwoch etwas mit Kürbis, am Wochenende etwas Aufwendigeres..."
                        className="w-full border-2 border-orange-100 rounded-xl p-4 focus:outline-none focus:border-orange-500 bg-orange-50/30 font-medium resize-none h-28"
                        rows={4}
                      />
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="mt-auto pt-4 flex flex-col gap-3 border-t border-gray-100">
                  {weekPlannerSetupStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setWeekPlannerSetupStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : s))}
                      className="w-full py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                      Zurück
                    </button>
                  )}
                  {weekPlannerSetupStep < 3 && (
                    <button
                      type="button"
                      onClick={() => setWeekPlannerSetupStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : s))}
                      disabled={weekPlannerSetupStep === 1 && !weekMeals.breakfast && !weekMeals.lunch && !weekMeals.dinner}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 px-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-45 disabled:pointer-events-none disabled:shadow-none"
                    >
                      Weiter
                      <ChevronRight className="w-5 h-5 shrink-0" />
                    </button>
                  )}
                  {weekPlannerSetupStep === 3 && (
                    <button
                      type="button"
                      onClick={async () => {
                        setPlannerPhase('loading');
                        const res = await generateWeekDraft(weekMeals, effectiveWeekPlannerFilters, customWeekPrompt || '');
                        if (res?.success && res.draft) {
                          setWeekDraft(res.draft);
                          setPlannerPhase('lab');
                        } else {
                          const errMsg = res && !res.success ? res.error : 'Plan konnte nicht erstellt werden.';
                          setAddToListToast({ message: errMsg });
                          setPlannerPhase('setup');
                        }
                      }}
                      disabled={!weekMeals.breakfast && !weekMeals.lunch && !weekMeals.dinner}
                      className="w-full bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 text-white rounded-xl py-4 font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100"
                    >
                      ✨ Wochenplan zaubern
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* --- PHASE 2: LOADING --- */}
            {plannerPhase === 'loading' && (
              <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in duration-300">
                <div className="text-6xl animate-bounce mb-6" aria-hidden>👨‍🍳</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Dein Speiseplan entsteht...</h3>
                <p className="text-sm text-gray-500 mb-8 px-4">
                  Unsere KI analysiert deine Wünsche und stellt 7 perfekte Tage zusammen.
                </p>
                <div className="w-12 h-12 border-4 border-orange-100 border-t-orange-500 rounded-full animate-spin" aria-hidden />
              </div>
            )}

            {/* --- PHASE 4: COMMITTING (Speichern) --- */}
            {plannerPhase === 'committing' && (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in zoom-in-95 duration-300">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-orange-400 blur-2xl opacity-20 rounded-full animate-pulse" aria-hidden />
                  <Rocket className="w-20 h-20 text-orange-500 animate-bounce relative z-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-3 tracking-tight">Raketenstart...</h3>
                <p className="text-sm text-gray-500 mb-8 px-6 max-w-xs mx-auto leading-relaxed">
                  Dein Wochenplan wird gespeichert und die Termine werden in deinen Kalender eingetragen.
                </p>
                <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full w-1/2 bg-gradient-to-r from-orange-400 to-pink-500 rounded-full animate-pulse" aria-hidden />
                </div>
              </div>
            )}

            {/* --- PHASE 5: AKTIVE WOCHE (Lese-Ansicht) --- */}
            {plannerPhase === 'active-view' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col flex-1 min-h-0">
                <div className="sticky top-0 z-20 shrink-0 bg-white border-b border-gray-100 pt-6 pb-5 px-6">
                  <div className="flex justify-between items-start w-full gap-2 min-w-0">
                    <div className="min-w-0 flex-1 pr-1">
                      <div className="flex items-center gap-3 min-w-0">
                        <CalendarDays className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 shrink-0" />
                        <h3
                          id="week-planner-modal-title"
                          className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight leading-tight shrink-0"
                        >
                          Deine Woche
                        </h3>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 leading-relaxed">Hier ist dein aktueller Speiseplan.</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 self-start">
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Möchtest du diesen Wochenplan wirklich verwerfen?')) {
                            setActiveWeekPlan(null);
                            setIsWeekPlannerOpen(false);
                          }
                        }}
                        className="text-sm font-medium text-rose-500 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition whitespace-nowrap"
                      >
                        Plan löschen
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsWeekPlannerOpen(false);
                          setWeekPlannerSetupStep(1);
                          setTimeout(() => setPlannerPhase('setup'), 300);
                        }}
                        className="text-gray-500 hover:text-gray-800 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 -mr-2"
                        aria-label="Schließen"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-thin space-y-8 pb-24 px-6 pt-4 bg-gray-50/50 rounded-b-3xl">
                  {weekDraft.map((dayPlan, idx) => (
                    <div key={idx} className="relative">
                      <div className="mt-8 mb-4">
                        <h4 className="text-xl font-bold text-gray-900">
                          {dayPlan.day}
                        </h4>
                      </div>

                      <div className="space-y-4">
                        {dayPlan.meals.map((meal: { type: string; title: string; time?: string; calories?: string; imageUrl?: string | null }, mIdx: number) => (
                          <div
                            key={mIdx}
                            className="flex flex-col bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:shadow-[0_12px_34px_rgb(0,0,0,0.08)] transition-shadow border border-black/5 overflow-hidden"
                          >
                            <div className="relative w-full h-48 bg-gray-50">
                              {meal.imageUrl && String(meal.imageUrl).trim() ? (
                                <img src={meal.imageUrl.trim()} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300" aria-hidden>
                                  <UtensilsCrossed className="w-10 h-10" strokeWidth={1.5} />
                                </div>
                              )}
                              <span className="absolute top-0 left-0 m-3 px-2 py-1 bg-black/40 backdrop-blur-md text-white rounded-md text-xs font-medium tracking-wider uppercase">
                                {meal.type === 'breakfast' ? 'Frühstück' : meal.type === 'lunch' ? 'Mittagessen' : 'Abendessen'}
                              </span>
                            </div>

                            <div className="p-4 flex flex-col gap-2 min-w-0">
                              {(() => {
                                const timeOk = meal.time != null && String(meal.time).trim() !== '';
                                const calOk = shouldShowMealCalories(meal.calories);
                                if (!timeOk && !calOk) return null;
                                return (
                                  <div className="flex items-center gap-3 text-sm text-gray-500 font-medium flex-wrap">
                                    {timeOk ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        <Clock className="w-4 h-4 shrink-0" />
                                        {String(meal.time).trim()}
                                      </span>
                                    ) : null}
                                    {calOk ? (
                                      <span className="inline-flex items-center gap-1.5">
                                        <Flame className="w-4 h-4 text-orange-400 shrink-0" aria-hidden />
                                        {String(meal.calories).trim()}
                                      </span>
                                    ) : null}
                                  </div>
                                );
                              })()}
                              <p className="text-lg font-semibold text-gray-900 line-clamp-2 leading-tight">
                                {meal.title}
                              </p>
                            </div>

                            <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 flex items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const rId = `${dayPlan.day}-${meal.title}`;
                                  if (savedRecipeIds.includes(rId)) return;
                                  setSavingRecipeId(rId);
                                  const res = await generateAndSaveFullRecipe(meal.title, meal.calories ?? '', meal.time ?? '');
                                  setSavingRecipeId(null);
                                  if (res?.success) {
                                    setSavedRecipeIds((prev) => [...prev, rId]);
                                  }
                                }}
                                disabled={
                                  savingRecipeId === `${dayPlan.day}-${meal.title}` ||
                                  savedRecipeIds.includes(`${dayPlan.day}-${meal.title}`)
                                }
                                className={`h-10 w-10 rounded-xl transition-colors flex items-center justify-center ${
                                  savedRecipeIds.includes(`${dayPlan.day}-${meal.title}`)
                                    ? 'text-rose-500 bg-rose-50/80'
                                    : 'text-gray-400 hover:text-rose-500'
                                } disabled:opacity-60`}
                                title="In Sammlung speichern"
                              >
                                {savingRecipeId === `${dayPlan.day}-${meal.title}` ? (
                                  <div className="w-4 h-4 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
                                ) : (
                                  <Heart
                                    className="w-[18px] h-[18px]"
                                    fill={savedRecipeIds.includes(`${dayPlan.day}-${meal.title}`) ? 'currentColor' : 'none'}
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRecipe(dayPlan.day, meal)}
                                disabled={loadingRecipeId === `${dayPlan.day}-${meal.title}`}
                                className="h-10 px-4 rounded-xl text-sm font-bold flex items-center gap-1.5 justify-center text-orange-600 bg-white border border-orange-100 hover:bg-orange-50 hover:border-orange-200 transition-all disabled:opacity-50 shadow-sm"
                              >
                                {loadingRecipeId === `${dayPlan.day}-${meal.title}` ? (
                                  <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin" />
                                ) : (
                                  <>Rezept <span className="text-lg leading-none">›</span></>
                                )}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="shrink-0 z-20 bg-white border-t border-gray-100 px-6 pt-4 pb-6">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsPantryModalOpen(true);
                      setIsGeneratingGroceries(true);
                      setGroceryList([]);
                      const titles = collectMealTitlesForPantry();
                      if (titles.length === 0) {
                        setIsGeneratingGroceries(false);
                        setIsPantryModalOpen(false);
                        setAddToListToast({ message: 'Keine Gerichte im Plan – nichts zu einkaufen.' });
                        return;
                      }
                      const res = await generateSmartShoppingList(titles);
                      setIsGeneratingGroceries(false);
                      if (res.success) {
                        setGroceryList(
                          res.ingredients.map((i) => ({
                            ...i,
                            category: normalizeSmartCartCategory(i.category),
                            checked: true,
                          }))
                        );
                      } else {
                        setIsPantryModalOpen(false);
                        setAddToListToast({ message: res.error || 'Einkaufsliste konnte nicht erstellt werden.' });
                      }
                    }}
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-2xl py-4 font-bold shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    🛒 Zutaten für die Woche einkaufen
                  </button>
                </div>
              </div>
            )}

            {/* --- PHASE 3: DAS LABOR (Entwurf) --- */}
            {plannerPhase === 'lab' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-[80vh]">
                {/* Header */}
                <div className="shrink-0 mb-6 pt-2">
                  <h3 className="text-2xl font-bold text-gray-800 tracking-tight">Dein Wochenplan</h3>
                  <p className="text-sm text-gray-500 mt-1">Prüfe den Entwurf. Tausche einzelne Gerichte einfach aus.</p>
                </div>

                {/* Scrollbarer Bereich für die Tage */}
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-8 pb-8 min-h-0">
                  {weekDraft.map((dayPlan, idx) => (
                    <div key={idx} className="relative">
                      {/* Tages-Header mit Icon */}
                      <div className="flex items-center gap-2 mb-4 sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10">
                        <CalendarDays className="w-5 h-5 text-orange-500" />
                        <h4 className="font-bold text-lg text-gray-800">
                          {dayPlan.day}
                        </h4>
                      </div>

                      {/* Mahlzeiten */}
                      <div className="space-y-3 pl-2 border-l border-orange-100/60 ml-2">
                        {dayPlan.meals.map((meal: { type: string; title: string; calories: string; time: string; imageUrl?: string | null }, mIdx: number) => (
                          <div
                            key={mIdx}
                            className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 group relative overflow-hidden flex flex-col"
                          >
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-200/90 via-orange-200/75 to-amber-100/70" aria-hidden />

                            {/* Zeile 1: Bild + Infos */}
                            <div className="pl-3 pr-3 pt-3.5 pb-3 flex gap-3 min-w-0">
                              <div className="w-20 h-20 shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100/80 shadow-sm">
                                {meal.imageUrl && String(meal.imageUrl).trim() ? (
                                  <img src={meal.imageUrl.trim()} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-300" aria-hidden>
                                    <UtensilsCrossed className="w-8 h-8" strokeWidth={1.5} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1 flex flex-col gap-1">
                                <span className="text-[10px] font-bold text-orange-500/95 uppercase tracking-widest">
                                  {meal.type === 'breakfast' ? 'Frühstück' : meal.type === 'lunch' ? 'Mittagessen' : 'Abendessen'}
                                </span>
                                {(() => {
                                  const timeOk = meal.time != null && String(meal.time).trim() !== '';
                                  const calOk = shouldShowMealCalories(meal.calories);
                                  if (!timeOk && !calOk) return null;
                                  return (
                                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium flex-wrap">
                                      {timeOk ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Clock className="w-3.5 h-3.5 shrink-0" />
                                          {String(meal.time).trim()}
                                        </span>
                                      ) : null}
                                      {calOk ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" aria-hidden />
                                          {String(meal.calories).trim()}
                                        </span>
                                      ) : null}
                                    </div>
                                  );
                                })()}
                                <p className="font-bold text-gray-800 text-[15px] sm:text-base leading-snug line-clamp-2 pr-0.5">
                                  {meal.title}
                                </p>
                              </div>
                            </div>

                            {/* Zeile 2: Verschieben + Neu würfeln */}
                            <div className="border-t border-gray-100/90 px-2 py-2 flex items-center justify-between gap-2 bg-gray-50/40">
                              <div className="relative group/swap flex-1 min-w-0 flex justify-start">
                                <button
                                  type="button"
                                  className="w-full max-w-[160px] min-h-[40px] px-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50/80 rounded-xl transition-all text-xs font-semibold flex items-center justify-center gap-1.5 border border-transparent hover:border-blue-100"
                                  title="Auf anderen Tag verschieben"
                                  tabIndex={-1}
                                >
                                  <ArrowRightLeft className="w-4 h-4 shrink-0" />
                                  <span className="truncate">Verschieben</span>
                                </button>
                                <select
                                  className="absolute inset-0 w-full max-w-[160px] opacity-0 cursor-pointer z-10"
                                  value=""
                                  onChange={(e) => {
                                    const targetIdx = parseInt(e.target.value, 10);
                                    if (!Number.isNaN(targetIdx)) handleSwapMeal(idx, mIdx, targetIdx);
                                    e.currentTarget.value = '';
                                  }}
                                  aria-label="Gericht auf anderen Tag verschieben"
                                >
                                  <option value="" disabled>
                                    Verschieben nach…
                                  </option>
                                  {weekDraft.map((d, dIdx) => (
                                    <option key={dIdx} value={dIdx} disabled={dIdx === idx}>
                                      {d.day}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleReRollMeal(idx, mIdx, dayPlan.day, meal.type, meal.title)}
                                disabled={rollingMealId === `${dayPlan.day}-${meal.type}`}
                                className="min-h-[40px] px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 justify-center text-orange-600 bg-white/80 border border-orange-100/80 hover:bg-orange-50/90 transition-all disabled:opacity-70 shrink-0"
                                title="Gericht neu generieren"
                              >
                                <RefreshCw
                                  className={`w-4 h-4 shrink-0 ${rollingMealId === `${dayPlan.day}-${meal.type}` ? 'animate-spin text-orange-500' : ''}`}
                                />
                                Neu
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer / Commit Action */}
                <div className="shrink-0 pt-4 mt-2 bg-white">
                  <button
                    type="button"
                    onClick={async () => {
                      setPlannerPhase('committing');

                      try {
                        const res = await saveWeeklyPlan(weekDraft);
                        console.log('Antwort vom Backend:', res);
                        if (res?.success && 'savedFrom' in res) {
                          console.log('Gespeichertes Datum:', res.savedFrom, '–', res.savedTo);
                          const restored = await getCurrentWeekMeals();
                          console.log('[CookIQ] Nach Speichern aus DB geladen:', restored.plan);
                          const ok =
                            Array.isArray(restored.plan) &&
                            restored.plan.some((d) => d.meals?.length > 0);
                          setActiveWeekPlan(ok ? restored.plan : weekDraft);
                          setIsWeekPlannerOpen(false);
                          setPlannerPhase('setup');
                        } else {
                          setPlannerPhase('lab');
                          alert(
                            typeof res === 'object' && res && 'error' in res && res.error
                              ? String(res.error)
                              : 'Wochenplan konnte nicht gespeichert werden.'
                          );
                        }
                      } catch (error) {
                        console.error('Kritischer Fehler beim Aufruf von saveWeeklyPlan:', error);
                        setPlannerPhase('lab');
                        alert('Wochenplan konnte nicht gespeichert werden.');
                      }
                    }}
                    className="w-full bg-slate-900 text-white rounded-2xl py-4 font-bold shadow-[0_8px_28px_-6px_rgba(15,23,42,0.4)] hover:bg-slate-800 hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ring-1 ring-slate-800/80"
                  >
                    <CalendarDays className="w-5 h-5 text-rose-400 shrink-0" aria-hidden />
                    Woche ab Montag speichern
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {isPantryModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pantry-modal-title"
            onClick={() => {
              if (!isGeneratingGroceries && !isSavingPantryToSmartCart && !isActivatingWeeklyPlan) {
                setIsPantryModalOpen(false);
                setGroceryList([]);
              }
            }}
          >
            <div
              className="relative w-full max-w-md max-h-[88vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100/80 animate-in fade-in zoom-in-95 duration-200 sm:max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
                <h2 id="pantry-modal-title" className="text-xl font-bold text-gray-900 tracking-tight">
                  Zutaten-Check
                </h2>
                <button
                  type="button"
                  disabled={isGeneratingGroceries || isActivatingWeeklyPlan}
                  onClick={() => {
                    if (isSavingPantryToSmartCart || isActivatingWeeklyPlan) return;
                    setIsPantryModalOpen(false);
                    setGroceryList([]);
                  }}
                  className="p-2 min-h-[44px] min-w-[44px] rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors disabled:opacity-40"
                  aria-label="Schließen"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
                {isGeneratingGroceries ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-rose-400/20 blur-2xl rounded-full animate-pulse" aria-hidden />
                      <Loader2 className="w-12 h-12 text-rose-500 animate-spin relative z-10" aria-hidden />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">KI berechnet benötigte Zutaten…</p>
                    <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
                      Deine Wochengerichte werden analysiert und zu einer klugen Einkaufsliste zusammengefasst.
                    </p>
                    <div className="w-full mt-8 space-y-3" aria-hidden>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 rounded-xl bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 animate-pulse" />
                      ))}
                    </div>
                  </div>
                ) : groceryList.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-12">Keine Zutaten geladen.</p>
                ) : (
                  <div className="space-y-8 pb-2">
                    {groupedPantryByCategory.map(([category, entries]) => (
                      <div key={category}>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 px-0.5">
                          {getCategoryLabel(category)}
                        </h3>
                        <ul className="space-y-2">
                          {entries.map(({ row, index }) => (
                            <li key={`${category}-${index}`}>
                              <label className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-3 cursor-pointer hover:bg-gray-50 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-rose-500/30">
                                <input
                                  type="checkbox"
                                  checked={row.checked}
                                  onChange={() =>
                                    setGroceryList((prev) =>
                                      prev.map((g, i) => (i === index ? { ...g, checked: !g.checked } : g))
                                    )
                                  }
                                  className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-gray-300 text-rose-600 focus:ring-rose-500 focus:ring-offset-0 accent-rose-600"
                                />
                                <span className="min-w-0 flex-1">
                                  <span className="block text-sm font-semibold text-gray-900">{row.item}</span>
                                  <span className="block text-xs text-gray-500 mt-0.5">{row.amount}</span>
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-gray-100 bg-white px-5 pt-4 pb-5 sm:pb-6 space-y-4">
                {!isGeneratingGroceries && planForCalendarActivation ? (
                  <button
                    type="button"
                    disabled={isActivatingWeeklyPlan || isSavingPantryToSmartCart}
                    onClick={async () => {
                      if (!planForCalendarActivation) return;
                      setIsActivatingWeeklyPlan(true);
                      try {
                        const res = await activateWeeklyPlan(JSON.stringify(planForCalendarActivation));
                        if (res.success) {
                          setAddToListToast({ message: 'Dein Plan für nächste Woche steht!' });
                          setIsPantryModalOpen(false);
                          setGroceryList([]);
                          const restored = await getCurrentWeekMeals();
                          const ok =
                            Array.isArray(restored.plan) &&
                            restored.plan.some((d) => d.meals?.length > 0);
                          setActiveWeekPlan(ok ? restored.plan : planForCalendarActivation);
                          setWeekDraft([]);
                        } else {
                          const errText = 'error' in res && res.error ? String(res.error) : 'Kalender konnte nicht aktualisiert werden.';
                          setAddToListToast({
                            message: `Fehler: ${errText}`,
                          });
                        }
                      } catch (e) {
                        console.error('[CookIQ] activateWeeklyPlan:', e);
                        setAddToListToast({
                          message: `Fehler: ${e instanceof Error ? e.message : 'Kalender konnte nicht aktualisiert werden.'}`,
                        });
                      } finally {
                        setIsActivatingWeeklyPlan(false);
                      }
                    }}
                    className="w-full rounded-2xl py-4 font-bold transition-all inline-flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:pointer-events-none bg-slate-900 text-white hover:bg-slate-800 shadow-[0_8px_28px_-6px_rgba(15,23,42,0.45)] hover:shadow-[0_12px_32px_-8px_rgba(15,23,42,0.4)] active:scale-[0.99] ring-1 ring-slate-800/80"
                  >
                    {isActivatingWeeklyPlan ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden />
                        Kalender wird aktualisiert…
                      </>
                    ) : (
                      <>
                        <CalendarDays className="w-5 h-5 shrink-0 text-rose-400" aria-hidden />
                        Woche ab Montag aktivieren
                      </>
                    )}
                  </button>
                ) : null}

                {!isGeneratingGroceries && groceryList.length > 0 ? (
                  <div className="space-y-2">
                    <label htmlFor="pantry-list-select" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      In welche Liste speichern?
                    </label>
                    {isPantryListsLoading ? (
                      <div className="h-11 rounded-xl bg-gray-100 animate-pulse" aria-hidden />
                    ) : (
                      <>
                        <select
                          id="pantry-list-select"
                          value={pantrySelectedListId}
                          onChange={(e) => setPantrySelectedListId(e.target.value)}
                          disabled={isSavingPantryToSmartCart}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-300 disabled:opacity-50"
                        >
                          {pantrySmartCartLists.map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.name}
                            </option>
                          ))}
                          <option value={PANTRY_NEW_LIST_VALUE}>+ Neue Liste erstellen…</option>
                        </select>
                        {pantrySelectedListId === PANTRY_NEW_LIST_VALUE ? (
                          <input
                            type="text"
                            value={pantryNewListName}
                            onChange={(e) => setPantryNewListName(e.target.value)}
                            placeholder="Name der neuen Liste (optional)"
                            disabled={isSavingPantryToSmartCart}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-300 disabled:opacity-50"
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={
                    isGeneratingGroceries ||
                    pantryCheckedCount === 0 ||
                    isPantryListsLoading ||
                    isSavingPantryToSmartCart ||
                    isActivatingWeeklyPlan
                  }
                  onClick={async () => {
                    const checked = groceryList.filter((g) => g.checked);
                    if (checked.length === 0) return;
                    const structured = checked.map((g) => {
                      const a = g.amount.trim();
                      const n = g.item.trim();
                      const line = a ? `${a} ${n}`.replace(/\s+/g, ' ').trim() : n;
                      const parsed = parseIngredient(line);
                      return {
                        text: formatIngredientDisplay(line),
                        category: normalizeSmartCartCategory(g.category),
                        quantity: parsed.amount,
                        unit: parsed.unit ? parsed.unit.trim() || null : null,
                      };
                    });
                    setIsSavingPantryToSmartCart(true);
                    try {
                      const listId =
                        pantrySelectedListId === PANTRY_NEW_LIST_VALUE
                          ? PANTRY_NEW_LIST_VALUE
                          : pantrySelectedListId;
                      const { lists: next, listName, appendedCount } = appendStructuredItemsToList(
                        pantrySmartCartLists,
                        listId,
                        structured,
                        pantrySelectedListId === PANTRY_NEW_LIST_VALUE
                          ? pantryNewListName.trim() || undefined
                          : undefined
                      );
                      const res = await saveShoppingLists(next);
                      if (!res.success) {
                        setAddToListToast({
                          message: res.error || 'SmartCart konnte nicht gespeichert werden.',
                        });
                        return;
                      }
                      setPantrySmartCartLists(next);
                      setAddToListToast({
                        message: `${appendedCount} Zutat${appendedCount === 1 ? '' : 'en'} in „${listName || 'Liste'}“ gelegt.`,
                      });
                      setIsPantryModalOpen(false);
                      setGroceryList([]);
                      router.push('/tools/shopping-list');
                    } finally {
                      setIsSavingPantryToSmartCart(false);
                    }
                  }}
                  className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:pointer-events-none text-white rounded-2xl py-3.5 sm:py-4 font-bold shadow-md shadow-rose-500/20 transition-all inline-flex items-center justify-center gap-2"
                >
                  {isSavingPantryToSmartCart ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden />
                      Speichern…
                    </>
                  ) : (
                    <>{pantryCheckedCount} Zutaten in SmartCart legen</>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
