'use client';

import React from 'react';
import { generateRecipe } from '@/actions/recipe-ai';
import { useActionState } from 'react';
import { useState, useEffect, useMemo } from 'react';
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
import { generateWeekDraft, regenerateSingleMealDraft, saveWeeklyPlan, generateAndSaveFullRecipe, generateMasterShoppingList } from '@/actions/week-planner-ai';
import { getCurrentWeekMeals } from '@/actions/calendar-actions';
import { DashboardShell } from '@/components/platform/dashboard-shell';

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
  const [isGeneratingSmartCart, setIsGeneratingSmartCart] = useState(false);
  const [customWeekPrompt, setCustomWeekPrompt] = useState('');
  const [rollingMealId, setRollingMealId] = useState<string | null>(null);
  const router = useRouter();

  const quickFilters = [
    '💪 High Protein',
    '🥦 Low Carb',
    '🌱 Vegetarisch',
    '⏱️ Unter 30 Min',
    '👨‍👩‍👧 Familienfreundlich',
    '💰 Günstig',
  ];

  /** Filter-Chips für Sammlung: Alle, Hauptgericht, Frühstück, Dessert, Salat, Veggie */
  const COLLECTION_CATEGORIES = [
    { id: 'Alle', label: 'Alle' },
    { id: 'Hauptgericht', label: 'Hauptgericht' },
    { id: 'Frühstück', label: 'Frühstück' },
    { id: 'Dessert', label: 'Dessert' },
    { id: 'Salat', label: 'Salat' },
    { id: 'Veggie', label: 'Veggie' },
  ];

  // Aktiven Wochenplan aus Kalender wiederherstellen (nach Reload)
  useEffect(() => {
    console.log('[CookIQ] Fetch gestartet: getCurrentWeekMeals');
    getCurrentWeekMeals().then((result) => {
      const { plan, queryFrom, queryTo } = result;
      console.log('Gesuchtes Datum:', queryFrom || '(kein Zeitraum)', queryTo ? `– ${queryTo}` : '');
      console.log('[CookIQ] Gruppierter Plan:', plan);
      const hasEvents = Array.isArray(plan) && plan.length > 0 && plan.some((d) => d.meals?.length > 0);
      if (!hasEvents) return;
      setActiveWeekPlan((prev) => (prev != null && prev.length > 0 ? prev : plan));
    });
  }, []);

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

    for (let offset = 0; offset < 2; offset++) {
      const idx = (dayIndex + offset) % 7;
      const dayObj = plan[idx] as { day?: string; meals?: Array<{ type?: string; title?: string; time?: string; calories?: string }> } | undefined;
      const meals = dayObj?.meals ?? [];
      if (meals.length === 0) continue;
      let meal = meals.find((m) => mealTypeOrder[0] === m.type) ?? meals.find((m) => mealTypeOrder[1] === m.type) ?? meals.find((m) => mealTypeOrder[2] === m.type) ?? meals[0];
      const dayLabel = dayObj?.day ?? dayNames[idx];
      const mealTypeLabel = mealLabels[meal.type as string] ?? 'Gericht';
      const subtext = [meal.calories, meal.time].filter(Boolean).join(' • ') || '—';
      return {
        dayLabel,
        mealTypeLabel,
        title: meal.title?.trim() || 'Gericht',
        subtext,
        isTomorrow: offset === 1,
      };
    }
    return null;
  }, [activeWeekPlan]);

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
        selectedWeekFilters,
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
        <div className="min-h-screen w-full bg-gradient-to-b from-rose-50 via-white to-white" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
          <DashboardShell
            headerVariant="default"
            headerBackground={
              <div className="relative w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url(/assets/images/cooking-action.webp)' }}>
                <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-800/60 to-gray-900/60 z-0" aria-hidden />
              </div>
            }
            title={
              <>
                <button
                  type="button"
                  onClick={() => {
                    setShowCockpit(true);
                    setActiveTab('create');
                    setWizardStep(1);
                  }}
                  className="group inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full transition-all text-sm font-medium border border-white/10 mb-3"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Zurück zur Übersicht
                </button>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-white mb-1 mt-0" style={{ letterSpacing: '-0.3px' }}>
                  {activeTab === 'my-recipes' ? 'Meine Sammlung' : 'Rezept Generator'}
                </h1>
              </>
            }
            subtitle={
              <>
                <p className="text-white/90 text-lg md:text-xl">
                  {activeTab === 'my-recipes' ? 'Deine kulinarischen Schätze.' : 'Dein Smart-Chef für den Kühlschrank.'}
                </p>
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
          onAdded={(count, listName) => {
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
          <div className="relative z-[101] w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            {/* Close Button (nur im Setup & Lab anzeigen) */}
            {plannerPhase !== 'loading' && (
              <button
                type="button"
                onClick={() => {
                  setIsWeekPlannerOpen(false);
                  setTimeout(() => setPlannerPhase('setup'), 300);
                }}
                className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Schließen"
              >
                ✕
              </button>
            )}

            {/* --- PHASE 1: SETUP --- */}
            {plannerPhase === 'setup' && (
              <div className="animate-in fade-in duration-300">
                <h3 id="week-planner-modal-title" className="text-2xl font-bold mb-2 text-gray-800">Woche planen</h3>
                <p className="text-sm text-gray-500 mb-1">Was soll dein Smart-Chef für dich vorbereiten?</p>
                <p className="text-xs text-gray-400 mb-6">Plan startet immer am kommenden Montag (Mo–So).</p>

                {/* Mahlzeiten-Auswahl */}
                <div className="mb-6">
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
                        <span className="text-xl" aria-hidden>{meal.icon}</span>
                        {meal.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schnell-Filter (Smart Chips) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Ernährung & Fokus</label>
                  <div className="flex flex-wrap gap-2">
                    {quickFilters.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setSelectedWeekFilters((prev) =>
                          prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
                        )}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                          selectedWeekFilters.includes(filter)
                            ? 'bg-orange-100 text-orange-700 border-2 border-orange-300 scale-105'
                            : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weitere Wünsche (Optional) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Weitere Wünsche? (Optional)</label>
                  <textarea
                    value={customWeekPrompt}
                    onChange={(e) => setCustomWeekPrompt(e.target.value)}
                    placeholder="z.B. Mittwoch etwas mit Kürbis, am Wochenende etwas Aufwendigeres..."
                    className="w-full border-2 border-orange-100 rounded-xl p-4 focus:outline-none focus:border-orange-500 bg-orange-50/30 font-medium resize-none h-28"
                    rows={4}
                  />
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={async () => {
                    setPlannerPhase('loading');
                    const res = await generateWeekDraft(weekMeals, selectedWeekFilters, customWeekPrompt || '');
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
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-[85vh]">
                <div className="shrink-0 mb-6 pt-2 px-2 flex justify-between items-start">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                      <CalendarDays className="w-6 h-6 text-green-500" />
                      Deine Woche
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Hier ist dein aktueller Speiseplan.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Möchtest du diesen Wochenplan wirklich verwerfen?')) {
                        setActiveWeekPlan(null);
                        setIsWeekPlannerOpen(false);
                      }
                    }}
                    className="text-xs font-semibold text-red-400 hover:text-red-600 bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Plan löschen
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-8 pb-8">
                  {weekDraft.map((dayPlan, idx) => (
                    <div key={idx} className="relative">
                      <div className="flex items-center gap-2 mb-4 sticky top-0 bg-white/90 backdrop-blur-sm py-2 z-10">
                        <h4 className="font-bold text-lg text-gray-800 border-b-2 border-green-500 pb-0.5">
                          {dayPlan.day}
                        </h4>
                      </div>

                      <div className="space-y-3 pl-2 border-l-2 border-gray-100 ml-2">
                        {dayPlan.meals.map((meal: { type: string; title: string; time?: string; calories?: string }, mIdx: number) => (
                          <div key={mIdx} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between border border-gray-100 group relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-emerald-500" aria-hidden />

                            <div className="pl-3">
                              <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest block mb-1.5">
                                {meal.type === 'breakfast' ? 'Frühstück' : meal.type === 'lunch' ? 'Mittagessen' : 'Abendessen'}
                              </span>
                              <p className="font-bold text-gray-800 text-base leading-tight mb-2 pr-4">{meal.title}</p>

                              <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {meal.time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Flame className="w-3.5 h-3.5 text-orange-400" /> {meal.calories}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
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
                                className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                                  savedRecipeIds.includes(`${dayPlan.day}-${meal.title}`)
                                    ? 'text-pink-500 bg-pink-50'
                                    : 'text-gray-400 hover:text-pink-500 hover:bg-pink-50'
                                }`}
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
                                className="p-2.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all text-sm font-bold flex items-center gap-1.5 disabled:opacity-50 w-[85px] justify-center"
                              >
                                {loadingRecipeId === `${dayPlan.day}-${meal.title}` ? (
                                  <div className="w-4 h-4 border-2 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
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

                <div className="shrink-0 pt-4 mt-2 bg-white">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsGeneratingSmartCart(true);
                      const res = await generateMasterShoppingList(weekDraft);
                      setIsGeneratingSmartCart(false);
                      if (res?.success) {
                        setIsWeekPlannerOpen(false);
                        router.push('/tools/shopping-list');
                      } else {
                        alert('Fehler beim Erstellen der Einkaufsliste.');
                      }
                    }}
                    disabled={isGeneratingSmartCart}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl py-4 font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                  >
                    {isGeneratingSmartCart ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analysiere {weekDraft.reduce((acc, day) => acc + day.meals.length, 0)} Gerichte...
                      </>
                    ) : (
                      <>🛒 Zutaten für die Woche einkaufen</>
                    )}
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
                      <div className="space-y-3 pl-2 border-l-2 border-orange-100/50 ml-2">
                        {dayPlan.meals.map((meal: { type: string; title: string; calories: string; time: string }, mIdx: number) => (
                          <div key={mIdx} className="bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between border border-gray-100 group relative overflow-hidden">
                            {/* Dezenter Farb-Akzent am linken Rand */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-300 to-orange-500" aria-hidden />

                            <div className="pl-3">
                              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest block mb-1.5">
                                {meal.type === 'breakfast' ? 'Frühstück' : meal.type === 'lunch' ? 'Mittagessen' : 'Abendessen'}
                              </span>
                              <p className="font-bold text-gray-800 text-base leading-tight mb-2 pr-4">{meal.title}</p>

                              <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" /> {meal.time}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Flame className="w-3.5 h-3.5 text-orange-400" /> {meal.calories}
                                </span>
                              </div>
                            </div>

                            {/* Actions Container */}
                            <div className="flex items-center shrink-0 ml-2 gap-1">
                              {/* SWAP / MOVE Button (mit nativem Select Overlay) */}
                              <div className="relative group/swap">
                                <button
                                  type="button"
                                  className="p-3 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 pointer-events-none sm:pointer-events-auto"
                                  title="Auf anderen Tag verschieben"
                                  tabIndex={-1}
                                >
                                  <ArrowRightLeft className="w-5 h-5" />
                                </button>
                                <select
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                  value=""
                                  onChange={(e) => {
                                    const targetIdx = parseInt(e.target.value, 10);
                                    if (!Number.isNaN(targetIdx)) handleSwapMeal(idx, mIdx, targetIdx);
                                    e.currentTarget.value = '';
                                  }}
                                  aria-label="Gericht auf anderen Tag verschieben"
                                >
                                  <option value="" disabled>Verschieben nach...</option>
                                  {weekDraft.map((d, dIdx) => (
                                    <option key={dIdx} value={dIdx} disabled={dIdx === idx}>
                                      {d.day}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* RE-ROLL Button */}
                              <button
                                type="button"
                                onClick={() => handleReRollMeal(idx, mIdx, dayPlan.day, meal.type, meal.title)}
                                disabled={rollingMealId === `${dayPlan.day}-${meal.type}`}
                                className="p-3 text-gray-300 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-100 disabled:text-orange-500"
                                title="Gericht neu generieren"
                              >
                                <RefreshCw
                                  className={`w-5 h-5 ${rollingMealId === `${dayPlan.day}-${meal.type}` ? 'animate-spin text-orange-500' : ''}`}
                                />
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
                        }

                        setActiveWeekPlan(weekDraft);
                        setIsWeekPlannerOpen(false);
                        setPlannerPhase('setup');
                      } catch (error) {
                        console.error('Kritischer Fehler beim Aufruf von saveWeeklyPlan:', error);
                        setActiveWeekPlan(weekDraft);
                        setIsWeekPlannerOpen(false);
                        setPlannerPhase('setup');
                      }
                    }}
                    className="w-full bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl py-4 font-bold shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Rocket className="w-5 h-5 text-orange-400" />
                    Plan finalisieren & speichern
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
