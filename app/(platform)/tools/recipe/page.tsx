'use client';

import { generateRecipe } from '@/actions/recipe-ai';
import { useActionState } from 'react';
import { useState, useEffect } from 'react';
import { Copy, MessageSquare, Loader2, Clock, ChefHat, CheckCircle2, Check, Users, Minus, Plus, Share2, ShoppingCart, Edit, Trash2, ListPlus, LayoutDashboard, Sparkles, Refrigerator, ArrowLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { WhatIsThisModal } from '@/components/ui/what-is-this-modal';
import { FeedbackButton } from '@/components/ui/feedback-button';
import { cn } from '@/lib/utils';
import { toolInfoMap } from '@/lib/tool-info';
import { getWorkspaceResults, deleteResult, cleanupOldResults, getResultById } from '@/actions/workspace-actions';
import { ShoppingListModal } from '@/components/ui/shopping-list-modal';
import { AddToShoppingListModal } from '@/components/recipe/add-to-shopping-list-modal';
import { RecipeDetailView } from '@/components/recipe/recipe-detail-view';
import { WeekPlanner } from '@/components/recipe/week-planner';
import { GourmetCockpit } from '@/components/recipe/gourmet-cockpit';

type Recipe = {
  recipeName: string;
  stats: {
    time: string;
    calories: string;
    difficulty: string;
  };
  ingredients: string[];
  shoppingList: string[];
  instructions: string[];
  chefTip: string;
};

function ActionButtons({ recipe }: { recipe: Recipe }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const hasMissing = recipe.shoppingList && recipe.shoppingList.length > 0;
  const ingredientsText = hasMissing ? recipe.shoppingList.join(', ') : recipe.ingredients.join(', ');
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
          title={hasMissing ? 'Einkaufsliste an Partner senden' : 'Rezept an Partner senden'}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {hasMissing ? 'Einkaufsliste senden' : 'Rezept senden'}
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
          <span>Rezept wird gezaubert...</span>
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
  // @ts-ignore
  const [state, formAction] = useActionState(generateRecipe, null);

  const [showCockpit, setShowCockpit] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'my-recipes' | 'week-planner'>('create');
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
        if (!content.stats) (content as Recipe).stats = { time: '', calories: '', difficulty: '' };
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
            calories: legacy.calories || '',
            difficulty: legacy.difficulty || '',
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

  // Lade "Meine Rezepte" wenn Tab gewechselt wird (auch für Wochenplaner)
  useEffect(() => {
    if (activeTab === 'my-recipes' || activeTab === 'week-planner') {
      loadMyRecipes();
    }
  }, [activeTab]);

  const loadMyRecipes = async () => {
    setIsLoadingRecipes(true);
    try {
      // Auto-Cleanup: Alte Results (30 Tage) löschen
      await cleanupOldResults();
      
      // Lade alle Recipe-Results (ohne Workspace-Filter)
      const result = await getWorkspaceResults(undefined, 50);
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

  const mealTypeOptions = [
    { id: 'main', label: '🥘 Hauptgericht', value: 'Hauptgericht' },
    { id: 'salad', label: '🥗 Salat / Bowl', value: 'Salat / Bowl' },
    { id: 'breakfast', label: '🥪 Frühstück / Snack', value: 'Frühstück / Snack' },
    { id: 'dessert', label: '🍰 Dessert', value: 'Dessert' },
    { id: 'sauce', label: '🥣 Soße / Dip', value: 'Soße / Dip' },
    { id: 'drink', label: '🥤 Drink / Shake', value: 'Drink / Shake' },
  ];

  const filterGroups: { label: string; options: { value: string; label: string }[] }[] = [
    {
      label: 'Basis',
      options: [
        { value: 'Fleisch & Gemüse', label: 'Fleisch & Gemüse' },
        { value: 'Vegetarisch', label: 'Vegetarisch 🌱' },
        { value: 'Vegan', label: 'Vegan 🌿' },
        { value: 'Pescetarisch', label: 'Pescetarisch 🐟' },
      ],
    },
    {
      label: 'Lifestyle & Religion',
      options: [
        { value: 'Halal', label: 'Halal ☪️' },
        { value: 'Koscher', label: 'Koscher ✡️' },
        { value: 'Glutenfrei', label: 'Glutenfrei 🌾' },
        { value: 'Laktosefrei', label: 'Laktosefrei 🥛' },
      ],
    },
    {
      label: 'Ziele',
      options: [
        { value: 'High Protein', label: 'High Protein 💪' },
        { value: 'Low Carb', label: 'Low Carb 📉' },
        { value: 'Keto', label: 'Keto 🥑' },
        { value: 'Unter 600 kcal', label: 'Unter 600 kcal 🔥' },
      ],
    },
    {
      label: 'Situation',
      options: [
        { value: 'Schnell', label: 'Zeit sparen (Schnell) ⚡' },
        { value: 'Familienfreundlich', label: 'Familienfreundlich 👨‍👩‍👧‍👦' },
        { value: 'Date Night', label: 'Date Night 🍷' },
      ],
    },
  ];

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
            onWochePlanen={() => {
              setShowCockpit(false);
              setActiveTab('week-planner');
            }}
            onMeineGerichte={() => {
              setShowCockpit(false);
              setActiveTab('my-recipes');
            }}
            onAICreator={() => {
              setShowCockpit(false);
              setActiveTab('create');
            }}
          />
        </div>
      ) : activeTab === 'week-planner' ? (
        /* Planer-Modus: nur WeekPlanner */
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
          <WeekPlanner
            myRecipes={myRecipes}
            workspaceId={undefined}
            onBackToCockpit={() => setShowCockpit(true)}
            onRequestNewRecipe={() => {
              setShowCockpit(false);
              setActiveTab('create');
            }}
          />
        </div>
      ) : (
        /* Create / Meine Rezepte: Golden Standard – Header 1:1 wie Dashboard, kein max-w um Header */
        <div className="min-h-screen w-full bg-gradient-to-b from-rose-50 via-white to-white" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
          {/* Header: 1:1 Standard wie Dashboard & Gourmet-Cockpit (Helfer-Standard) */}
          <header
            className={cn(
              'relative z-[1] min-h-[280px]',
              'w-full max-w-[100vw] -mx-0 sm:-mx-4 md:w-[calc(100%+3rem)] md:-mx-6 lg:w-[calc(100%+4rem)] lg:-mx-8',
              '-mt-[max(0.5rem,env(safe-area-inset-top))] md:-mt-6 lg:-mt-8'
            )}
          >
            {/* Layer 0: cooking-action Bild + Overlay (nur Rezept-Generator) */}
            <div
              className="absolute top-0 left-0 w-full h-[280px] z-0 overflow-hidden rounded-b-[40px] bg-cover bg-center"
              style={{ backgroundImage: 'url(/assets/images/cooking-action.webp)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-orange-950/80 via-orange-900/70 to-amber-900/60 z-0" aria-hidden />
            </div>
            {/* Layer 1: Inhalt – klare Hierarchie, linksbündig */}
            <div className="relative z-10 pt-8 px-6 md:px-8 pb-24">
              <div className="flex flex-col items-start gap-4">
                <Link
                  href="/tools/recipe"
                  className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full transition-all text-sm font-medium border border-white/10"
                >
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  Zurück zur Übersicht
                </Link>
                <div className="mt-2">
                  <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Rezept Generator</h1>
                  <p className="text-orange-50 text-lg md:text-xl opacity-90">Dein Smart-Chef für den Kühlschrank.</p>
                </div>
              </div>
            </div>
          </header>

          {/* Content: 1:1 wie Dashboard – gleicher Overlap (-mt-20), gleiches Padding (pb-32) */}
          <div className="relative z-10 mx-auto max-w-7xl w-full px-3 sm:px-4 md:px-6 lg:px-8 pb-32 md:pb-32 -mt-20">
          {/* Tab-System – Segmented Control (Gourmet Orange) */}
          <div className="mb-4 inline-flex p-1 rounded-full bg-gray-100/50 overflow-x-auto scrollbar-hide">
            {(['create', 'my-recipes', 'week-planner'] as const).map((tab) => {
              const labels = { create: 'Neues Rezept', 'my-recipes': 'Meine Rezepte', 'week-planner': 'Wochenplaner' };
              const active = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); if (tab === 'create') setWizardStep(1); }}
                  className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                    active
                      ? 'bg-white text-orange-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
      {activeTab === 'create' ? (
        <>
      {/* Gourmet Wizard: Premium-Glas-Karte (Frosted Glass), satt über Header */}
      <div className="relative z-20 -mt-16 md:-mt-20 mx-4 md:mx-auto max-w-3xl bg-white/70 backdrop-blur-[40px] border border-white/80 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-[40px] p-6 sm:p-8 overflow-hidden">
        {/* Innen-Schein: Lichtreflexion am oberen Rand */}
        <div className="inset-0 bg-gradient-to-b from-white/40 to-transparent rounded-[40px] pointer-events-none absolute" aria-hidden />
        {/* Progress Bar – Glowing Glass Tube */}
        <div className="mb-6">
          <div className="h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-1 bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(249,115,22,0.6)]"
              style={{ width: wizardStep === 1 ? '33%' : wizardStep === 2 ? '66%' : '100%' }}
            />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mt-3">
            {wizardStep === 1 && 'Schritt 1/3: Die Basis'}
            {wizardStep === 2 && 'Schritt 2/3: Der Kühlschrank'}
            {wizardStep === 3 && 'Schritt 3/3: Feinschliff'}
          </h2>
        </div>

        <form action={formAction} className="flex flex-col">
          <input type="hidden" name="mealType" value={mealType} />
          <input type="hidden" name="servings" value={servings} />
          <input type="hidden" name="shoppingMode" value={shoppingMode} />
          {filters.map((f) => (
            <input key={f} type="hidden" name="filters" value={f} />
          ))}

          {/* Step 1: Die Basis */}
          {wizardStep === 1 && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <section>
                <h3 className="text-gray-700 font-semibold mb-3 block">Gericht-Typ</h3>
                <div className="grid grid-cols-2 gap-3">
                  {mealTypeOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setMealType(option.value)}
                      className={`rounded-2xl p-4 text-left transition-all backdrop-blur-md shadow-sm ${
                        mealType === option.value
                          ? 'bg-orange-500/10 border border-orange-500/50 text-orange-700 font-bold shadow-[inset_0_0_15px_rgba(249,115,22,0.1)]'
                          : 'bg-white/30 border border-white/40 text-gray-600 hover:bg-white/50'
                      }`}
                    >
                      <span className="text-sm font-medium block">{option.label}</span>
                    </button>
                  ))}
                </div>
              </section>
              <section>
                <h3 className="text-gray-700 font-semibold mb-3 block">Anzahl Personen</h3>
                <div className="inline-flex items-center gap-0 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    disabled={servings <= 1}
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-white/40 hover:bg-white/60 text-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Minus className="w-6 h-6" />
                  </button>
                  <span className="text-2xl font-bold text-gray-800 min-w-[140px] text-center py-3 px-4">
                    {servings} {servings === 1 ? 'Person' : 'Personen'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setServings(servings + 1)}
                    className="flex items-center justify-center w-14 h-14 rounded-full bg-white/40 hover:bg-white/60 text-orange-600 transition-all"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
              </section>
              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-700"
                >
                  Weiter zu den Zutaten
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Der Kühlschrank */}
          {wizardStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <section>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-gray-700 font-semibold block">Was hast du da?</label>
                  <Refrigerator className="w-5 h-5 text-orange-500 shrink-0" aria-hidden />
                </div>
                <textarea
                  name="ingredients"
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  placeholder="z.B. Eier, Tomaten, Nudeln... (leer = Überraschung)"
                  className="w-full rounded-2xl bg-white/40 border border-white/30 text-gray-900 placeholder:text-gray-500 focus:bg-white/60 focus:border-orange-300 focus:ring-4 focus:ring-orange-500/10 p-4 text-lg resize-none transition-all min-h-[220px]"
                  rows={6}
                />
              </section>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Schnell hinzufügen</p>
                <div className="flex flex-wrap gap-2">
                  {['Tomaten', 'Eier', 'Nudeln', 'Zwiebeln', 'Käse', 'Reis', 'Hackfleisch', 'Paprika', 'Kartoffeln'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setIngredients(prev => prev ? `${prev}, ${tag}` : tag)}
                      className="px-3 py-1.5 rounded-full bg-white/30 backdrop-blur-md border border-white/40 shadow-sm text-gray-600 text-sm hover:bg-white/50 transition-all"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>
              {ingredients.trim().length > 0 && (
                <section className="pt-4 border-t border-gray-100">
                  <h3 className="text-gray-700 font-semibold mb-2 block">Darf eingekauft werden?</h3>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => setShoppingMode('strict')}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all backdrop-blur-md shadow-sm ${shoppingMode === 'strict' ? 'bg-orange-500/10 border border-orange-500/50 text-orange-700 font-bold shadow-[inset_0_0_15px_rgba(249,115,22,0.1)]' : 'bg-white/30 border border-white/40 text-gray-600 hover:bg-white/50'}`}>
                      Nein, Reste verwerten 🦊
                    </button>
                    <button type="button" onClick={() => setShoppingMode('shopping')}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all backdrop-blur-md shadow-sm ${shoppingMode === 'shopping' ? 'bg-orange-500/10 border border-orange-500/50 text-orange-700 font-bold shadow-[inset_0_0_15px_rgba(249,115,22,0.1)]' : 'bg-white/30 border border-white/40 text-gray-600 hover:bg-white/50'}`}>
                      Ja, fehlendes ergänzen 🛒
                    </button>
                  </div>
                </section>
              )}
              <div className="flex justify-between pt-4">
                <button type="button" onClick={() => setWizardStep(1)} className="text-gray-600 font-medium hover:text-gray-800">
                  Zurück
                </button>
                <button type="button" onClick={() => setWizardStep(3)} className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:text-orange-700">
                  Weiter zum Feinschliff
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Feinschliff */}
          {wizardStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <section>
                <h3 className="text-gray-700 font-semibold mb-3 block">Diät & Filter</h3>
                <div className="space-y-4">
                  {filterGroups.map((group) => (
                    <div key={group.label}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{group.label}</p>
                      <div className="flex flex-wrap gap-2">
                        {group.options.map((option) => {
                          const isActive = filters.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => toggleFilter(option.value)}
                              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all backdrop-blur-md shadow-sm ${
                                isActive ? 'bg-orange-500/10 border border-orange-500/50 text-orange-700 font-bold shadow-[inset_0_0_15px_rgba(249,115,22,0.1)]' : 'bg-white/30 border border-white/40 text-gray-600 hover:bg-white/50'
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <div className="space-y-4 pt-6">
                <button type="button" onClick={() => setWizardStep(2)} className="text-gray-600 font-medium hover:text-gray-800">
                  Zurück
                </button>
                <SubmitButton inspirationMode={ingredients.trim().length === 0} />
              </div>
            </div>
          )}
        </form>

        {state?.error && (
          <p className="mt-4 text-sm font-semibold text-red-600">{state.error}</p>
        )}

        <div className="flex flex-col md:grid md:grid-cols-2 gap-8 md:gap-12 mt-8">
          <div className="h-fit min-h-0" />
          {/* RECHTE SEITE: ERGEBNIS – nur sichtbar wenn Platz (Desktop) oder unter Wizard */}
        <div className="rounded-xl border border-gray-100 bg-white min-h-[300px] sm:min-h-[400px] overflow-hidden">
          {state?.result && state.result.includes('🔒 Premium Feature') ? (
            <div className="p-4 sm:p-5 md:p-6">
              <div className="prose prose-sm max-w-none text-gray-800 prose-p:text-gray-700 prose-a:text-orange-600 font-medium">
                <div dangerouslySetInnerHTML={{ __html: state.result.replace(/\n/g, '<br />') }} />
              </div>
            </div>
          ) : recipe ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ActionButtons recipe={recipe} />
              
              <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto">
                {/* RECIPE CARD – Weiß, klar, Orange-Akzente */}
                <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-5 sm:p-6">
                  <div className="mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{recipe.recipeName}</h2>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-full px-3 py-1.5 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {recipe.stats?.time}
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-full px-3 py-1.5 text-xs font-semibold">
                      <ChefHat className="w-3.5 h-3.5" />
                      {recipe.stats?.difficulty}
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-800 border border-orange-200 rounded-full px-3 py-1.5 text-xs font-semibold">
                      <Users className="w-3.5 h-3.5" />
                      {servings} {servings === 1 ? 'Person' : 'Personen'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-100">
                    <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-3 py-1.5 text-xs font-semibold">
                      🔥 {recipe.stats?.calories}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Zutaten</h3>
                    <ul className="space-y-2">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-start gap-3 text-gray-800 font-medium group cursor-pointer hover:text-gray-900 transition-colors">
                          <div className="mt-1.5 w-5 h-5 rounded border border-orange-200 bg-orange-50 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 group-hover:border-orange-300 transition-all">
                            <CheckCircle2 className="w-3 h-3 text-orange-600 opacity-70 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-sm sm:text-base">{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {recipe.shoppingList && recipe.shoppingList.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-3">Das fehlt noch (Einkaufsliste)</h3>
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                        <ul className="space-y-1 text-sm text-gray-800 font-medium">
                          {recipe.shoppingList.map((ingredient, index) => (
                            <li key={index}>• {ingredient}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Zubereitung</h3>
                    <ol className="space-y-3">
                      {recipe.instructions.map((step, index) => (
                        <li key={index} className="flex gap-3 text-gray-800 font-medium">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-800 text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-sm sm:text-base leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {recipe.chefTip && (
                      <div className="pt-4 border-t border-gray-100">
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                        <p className="text-sm text-orange-900 font-bold mb-1">💡 Profi-Tipp</p>
                        <p className="text-sm text-gray-800 leading-relaxed font-medium">{recipe.chefTip}</p>
                      </div>
                    </div>
                  )}

                  {recipe.shoppingList && recipe.shoppingList.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                      <button
                        onClick={() => setIsShoppingListOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white border border-orange-500 rounded-xl font-semibold transition-all"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Dir fehlen Zutaten? → Einkaufsliste erstellen
                      </button>
                      <button
                        onClick={() => setIsAddToListOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium transition-colors"
                      >
                        <ListPlus className="w-5 h-5" />
                        Auf Einkaufsliste setzen
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 sm:p-5 md:p-6 border-t border-gray-100 bg-gray-50/50">
                <FeedbackButton 
                  toolId="recipe" 
                  toolName="Gourmet-Planer"
                  resultId={recipe ? `recipe-${Date.now()}` : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 sm:p-8 md:p-10 bg-gradient-to-b from-orange-50/90 to-amber-50/70">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-4">
                <ChefHat className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Dein Rezept wartet</h3>
              <p className="text-sm text-gray-700 font-medium text-center max-w-[240px] mb-6">
                Gib Zutaten ein und klicke auf „Rezept zaubern“. Das Ergebnis erscheint hier.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1.5 rounded-full bg-white border border-orange-200 text-orange-700 text-xs font-semibold">🍳 Hauptgericht</span>
                <span className="px-3 py-1.5 rounded-full bg-white border border-orange-200 text-orange-700 text-xs font-semibold">🥗 Salat</span>
                <span className="px-3 py-1.5 rounded-full bg-white border border-orange-200 text-orange-700 text-xs font-semibold">🥪 Snack</span>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      </>
      ) : activeTab === 'my-recipes' ? (
        selectedRecipe ? (
          /* Rezept-Detail-View */
          <RecipeDetailView
            recipe={selectedRecipe.recipe}
            resultId={selectedRecipe.resultId}
            createdAt={selectedRecipe.createdAt}
            onBack={() => setSelectedRecipe(null)}
          />
        ) : (
          /* Meine Rezepte Tab */
          <div className="space-y-4">
            {isLoadingRecipes ? (
              <div className="rounded-xl border border-gray-100 bg-white p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                <p className="text-gray-700 font-semibold">Lade Rezepte…</p>
              </div>
            ) : myRecipes.length === 0 ? (
              <div className="rounded-xl border border-gray-100 bg-white p-6 text-center">
                <ChefHat className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-800 font-semibold">Noch keine Rezepte gespeichert.</p>
                <p className="text-sm text-gray-600 mt-2 font-medium">Erstelle dein erstes Rezept im Tab „Neues Rezept“.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRecipes.map((result) => {
                  const r = result.recipe as Recipe;
                  return (
                    <div
                      key={result.id}
                      className="rounded-xl border border-gray-100 bg-white p-5 hover:border-orange-200 transition-all cursor-pointer"
                      onClick={() => setSelectedRecipe({
                        recipe: r,
                        resultId: result.id,
                        createdAt: new Date(result.createdAt)
                      })}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{r.recipeName || 'Rezept'}</h3>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              alert('Edit-Feature kommt gleich!');
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                            title="Rezept anpassen"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecipe(result.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {r.stats && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {r.stats.time && (
                            <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-800 text-xs font-semibold border border-orange-200">
                              ⏱️ {r.stats.time}
                            </span>
                          )}
                          {r.stats.calories && (
                            <span className="px-2 py-1 rounded-full bg-orange-50 text-orange-800 text-xs font-semibold border border-orange-200">
                              🔥 {r.stats.calories}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-600 font-medium mb-4">
                        {new Date(result.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedRecipe({
                            recipe: r,
                            resultId: result.id,
                            createdAt: new Date(result.createdAt)
                          })}
                          className="flex-1 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white border border-orange-500 text-sm font-semibold transition-all"
                        >
                          Rezept öffnen
                        </button>
                        {r.shoppingList && r.shoppingList.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecipe({
                                recipe: r,
                                resultId: result.id,
                                createdAt: new Date(result.createdAt)
                              });
                            }}
                            className="flex-1 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 hover:border-gray-300 text-sm font-semibold flex items-center justify-center gap-1 transition-all"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            Einkaufen
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
            ) : null}

          </div>
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
    </>
  );
}
