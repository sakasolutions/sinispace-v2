'use client';

import { generateRecipe } from '@/actions/recipe-ai';
import { useActionState } from 'react';
import { useState, useEffect } from 'react';
import { Copy, MessageSquare, Loader2, Clock, ChefHat, CheckCircle2, Users, Minus, Plus, Share2, ShoppingCart, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { WhatIsThisModal } from '@/components/ui/what-is-this-modal';
import { FeedbackButton } from '@/components/ui/feedback-button';
import { toolInfoMap } from '@/lib/tool-info';
import { BackButton } from '@/components/ui/back-button';
import { getWorkspaceResults, deleteResult, cleanupOldResults } from '@/actions/workspace-actions';
import { ShoppingListModal } from '@/components/ui/shopping-list-modal';
import { RecipeDetailView } from '@/components/recipe/recipe-detail-view';
import { WeekPlanner } from '@/components/recipe/week-planner';

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
    <div className="flex justify-between items-center border-b-2 border-gray-200 bg-gray-100 px-4 py-3 rounded-t-xl mb-4">
      <span className="text-xs uppercase tracking-wider text-gray-700 font-semibold">Dein Rezept</span>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="h-8 px-3 rounded-lg bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border-2 border-gray-300 hover:border-gray-400 transition-all flex items-center gap-1.5 text-xs font-semibold"
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
          className="h-8 px-3 rounded-lg bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border-2 border-gray-300 hover:border-gray-400 transition-all flex items-center gap-1.5 text-xs font-semibold"
          title="Zu SiniChat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Zu SiniChat</span>
        </button>
        <Link
          href={chatLink}
          className="h-8 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-500 hover:border-orange-600 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-orange-500/25"
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3.5 text-sm font-bold text-white hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 min-h-[48px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Rezept wird gezaubert...</span>
        </>
      ) : (
        <>
          <ChefHat className="w-4 h-4" />
          <span>Rezept zaubern 🍳</span>
        </>
      )}
    </button>
  );
}

export default function RecipePage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateRecipe, null);
  
  const [activeTab, setActiveTab] = useState<'create' | 'my-recipes' | 'week-planner'>('create');
  const [ingredients, setIngredients] = useState('');
  const [shoppingMode, setShoppingMode] = useState<'strict' | 'shopping'>('strict');
  const [mealType, setMealType] = useState('Hauptgericht');
  const [servings, setServings] = useState(2);
  const [filters, setFilters] = useState<string[]>([]);
  const [myRecipes, setMyRecipes] = useState<any[]>([]);
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(false);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<{ recipe: Recipe; resultId: string; createdAt: Date } | null>(null);

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

  const filterOptions = [
    { id: 'vegetarian', label: '🌱 Vegetarisch', value: 'Vegetarisch' },
    { id: 'high-protein', label: '💪 High Protein', value: 'High Protein' },
    { id: 'quick', label: '⏱ Schnell', value: 'Schnell' },
    { id: 'low-carb', label: '📉 Low Carb', value: 'Low Carb' },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
      <BackButton className="text-gray-600 hover:text-gray-900 mb-4" />
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Gourmet-Planer</h1>
        <p className="text-sm sm:text-base text-gray-700 mt-1 sm:mt-2 font-medium">
          Dein Smart-Chef für den Kühlschrank.
        </p>
      </div>

      {/* Tab-System – klare Kontraste, inaktive nicht blass */}
      <div className="mb-6 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {(['create', 'my-recipes', 'week-planner'] as const).map((tab) => {
          const labels = { create: 'Neues Rezept', 'my-recipes': 'Meine Rezepte', 'week-planner': 'Wochenplaner' };
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-orange-300 hover:text-gray-900 shadow-sm'
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
          <div className="mt-2 p-4 rounded-xl bg-orange-100 border-2 border-orange-300 text-sm text-orange-900 font-medium mb-6">
            💡 <strong>Tipp:</strong> Gib einfach ein, was im Kühlschrank ist. Daraus entsteht ein passendes Rezept inkl. Nährwerten.
          </div>

      {/* MOBILE FIRST: flex-col auf Mobile, md:grid auf Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE – klare Karten, kräftige Kontraste */}
        <div className="rounded-xl border-2 border-gray-300 bg-white p-4 sm:p-5 md:p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)] h-fit">
          <form action={formAction} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Gericht-Typ
              </label>
              <div className="flex flex-wrap gap-2">
                {mealTypeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMealType(option.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                      mealType === option.value
                        ? 'bg-orange-500 text-white border-2 border-orange-500 shadow-md shadow-orange-500/30'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="mealType" value={mealType} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Anzahl Personen
              </label>
              <div className="flex items-center gap-3 bg-gray-100 border-2 border-gray-300 rounded-xl p-2 w-fit">
                <button
                  type="button"
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  disabled={servings <= 1}
                  className="w-9 h-9 rounded-lg bg-white border-2 border-gray-300 text-gray-600 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center font-semibold"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-bold text-gray-900 min-w-[88px] text-center">
                  {servings} {servings === 1 ? 'Person' : 'Personen'}
                </span>
                <button
                  type="button"
                  onClick={() => setServings(servings + 1)}
                  className="w-9 h-9 rounded-lg bg-white border-2 border-gray-300 text-gray-600 hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700 transition-all flex items-center justify-center font-semibold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <input type="hidden" name="servings" value={servings} />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Was hast du im Kühlschrank?
              </label>
              <textarea
                name="ingredients"
                required
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="z.B. Eier, Tomaten, Reis..."
                className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none transition-all min-h-[150px]"
                rows={6}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Darf eingekauft werden?
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShoppingMode('strict')}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                    shoppingMode === 'strict'
                      ? 'bg-orange-500 text-white border-2 border-orange-500 shadow-md shadow-orange-500/30'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  Nein, Reste verwerten 🦊
                </button>
                <button
                  type="button"
                  onClick={() => setShoppingMode('shopping')}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                    shoppingMode === 'shopping'
                      ? 'bg-orange-500 text-white border-2 border-orange-500 shadow-md shadow-orange-500/30'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  Ja, fehlendes ergänzen 🛒
                </button>
              </div>
              <input type="hidden" name="shoppingMode" value={shoppingMode} />
              {shoppingMode === 'shopping' && (
                <p className="text-xs text-gray-600 mt-2 font-medium">
                  Es werden fehlende Zutaten für ein besseres Gericht vorgeschlagen.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Filter & Präferenzen
              </label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleFilter(option.value)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all min-h-[44px] ${
                      filters.includes(option.value)
                        ? 'bg-orange-500 text-white border-2 border-orange-500 shadow-md shadow-orange-500/30'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {filters.map((filter) => (
                <input key={filter} type="hidden" name="filters" value={filter} />
              ))}
            </div>

            <SubmitButton />
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm font-semibold text-red-600">{state.error}</p>
          )}
        </div>

        {/* RECHTE SEITE: ERGEBNIS – klare Card, Tiefe, Profi-Empty-State */}
        <div className="rounded-xl border-2 border-gray-300 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.08)] min-h-[300px] sm:min-h-[400px] overflow-hidden">
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
                <div className="rounded-xl border-2 border-gray-300 bg-gray-50 p-5 sm:p-6 shadow-sm">
                  <div className="mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">{recipe.recipeName}</h2>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 border-2 border-orange-300 rounded-full px-3 py-1.5 text-xs font-semibold">
                      <Clock className="w-3.5 h-3.5" />
                      {recipe.stats?.time}
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 border-2 border-orange-300 rounded-full px-3 py-1.5 text-xs font-semibold">
                      <ChefHat className="w-3.5 h-3.5" />
                      {recipe.stats?.difficulty}
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 border-2 border-orange-300 rounded-full px-3 py-1.5 text-xs font-semibold">
                      <Users className="w-3.5 h-3.5" />
                      {servings} {servings === 1 ? 'Person' : 'Personen'}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b-2 border-gray-200">
                    <div className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border-2 border-amber-300 rounded-full px-3 py-1.5 text-xs font-semibold">
                      🔥 {recipe.stats?.calories}
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Zutaten</h3>
                    <ul className="space-y-2">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-start gap-3 text-gray-800 font-medium group cursor-pointer hover:text-gray-900 transition-colors">
                          <div className="mt-1.5 w-5 h-5 rounded border-2 border-orange-300 bg-orange-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200 group-hover:border-orange-400 transition-all">
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
                      <div className="bg-orange-100 border-2 border-orange-300 rounded-xl p-3">
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
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-200 border-2 border-orange-300 flex items-center justify-center text-orange-800 text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-sm sm:text-base leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {recipe.chefTip && (
                    <div className="pt-4 border-t-2 border-gray-200">
                      <div className="bg-orange-100 border-2 border-orange-300 rounded-xl p-3">
                        <p className="text-sm text-orange-900 font-bold mb-1">💡 Profi-Tipp</p>
                        <p className="text-sm text-gray-800 leading-relaxed font-medium">{recipe.chefTip}</p>
                      </div>
                    </div>
                  )}

                  {recipe.shoppingList && recipe.shoppingList.length > 0 && (
                    <div className="mt-6 pt-4 border-t-2 border-gray-200">
                      <button
                        onClick={() => setIsShoppingListOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-500 rounded-xl font-semibold transition-all shadow-md shadow-orange-500/25"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Dir fehlen Zutaten? → Einkaufsliste erstellen
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 sm:p-5 md:p-6 border-t-2 border-gray-200 bg-gray-50/50">
                <FeedbackButton 
                  toolId="recipe" 
                  toolName="Gourmet-Planer"
                  resultId={recipe ? `recipe-${Date.now()}` : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 sm:p-8 md:p-10 bg-gradient-to-b from-orange-50/90 to-amber-50/70">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 border-2 border-orange-300 flex items-center justify-center mb-4">
                <ChefHat className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Dein Rezept wartet</h3>
              <p className="text-sm text-gray-700 font-medium text-center max-w-[240px] mb-6">
                Gib Zutaten ein und klicke auf „Rezept zaubern“. Das Ergebnis erscheint hier.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <span className="px-3 py-1.5 rounded-full bg-white border-2 border-orange-200 text-orange-700 text-xs font-semibold">🍳 Hauptgericht</span>
                <span className="px-3 py-1.5 rounded-full bg-white border-2 border-orange-200 text-orange-700 text-xs font-semibold">🥗 Salat</span>
                <span className="px-3 py-1.5 rounded-full bg-white border-2 border-orange-200 text-orange-700 text-xs font-semibold">🥪 Snack</span>
              </div>
            </div>
          )}
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
              <div className="rounded-xl border-2 border-gray-300 bg-white p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-500 mb-2" />
                <p className="text-gray-700 font-semibold">Lade Rezepte…</p>
              </div>
            ) : myRecipes.length === 0 ? (
              <div className="rounded-xl border-2 border-gray-300 bg-white p-6 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
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
                      className="rounded-xl border-2 border-gray-300 bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-orange-300 hover:shadow-lg transition-all cursor-pointer"
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
                            <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold border-2 border-orange-300">
                              ⏱️ {r.stats.time}
                            </span>
                          )}
                          {r.stats.calories && (
                            <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-semibold border-2 border-orange-300">
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
                          className="flex-1 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-500 text-sm font-semibold transition-all shadow-md shadow-orange-500/25"
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
                            className="flex-1 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 border-2 border-gray-300 text-gray-700 hover:border-gray-400 text-sm font-semibold flex items-center justify-center gap-1 transition-all"
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
            ) : activeTab === 'week-planner' ? (
              /* Wochenplaner Tab */
              <WeekPlanner
                myRecipes={myRecipes}
                workspaceId={undefined}
              />
            ) : null}

      {/* Shopping List Modal */}
      {recipe && recipe.shoppingList && recipe.shoppingList.length > 0 && (
        <ShoppingListModal
          isOpen={isShoppingListOpen}
          onClose={() => setIsShoppingListOpen(false)}
          ingredients={recipe.shoppingList}
          recipeName={recipe.recipeName}
        />
      )}
    </div>
  );
}
