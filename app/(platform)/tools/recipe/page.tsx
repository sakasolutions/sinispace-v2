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
import { WorkspaceSelect } from '@/components/ui/workspace-select';
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
    <div className="flex justify-between items-center border-b border-white/5 bg-white/5 p-3 rounded-t-xl mb-4">
      <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Dein Rezept</span>
      <div className="flex gap-1.5">
        <button
          onClick={handleCopy}
          className="h-8 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
          title="In Zwischenablage kopieren"
        >
          {copied ? (
            <>
              <span className="text-green-400">✓</span>
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
          className="h-8 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
          title="Zu SiniChat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Zu SiniChat</span>
        </button>

        <Link
          href={chatLink}
          className="h-8 px-2 rounded-md bg-zinc-800/50 hover:bg-zinc-700/70 text-zinc-200 hover:text-white border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 text-xs font-medium"
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
      className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-sm font-semibold text-white hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 min-h-[44px]"
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
  const [workspaceId, setWorkspaceId] = useState<string>('');
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
    if ((activeTab === 'my-recipes' || activeTab === 'week-planner') && workspaceId) {
      loadMyRecipes();
    }
  }, [activeTab, workspaceId]);

  const loadMyRecipes = async () => {
    if (!workspaceId) return;
    setIsLoadingRecipes(true);
    try {
      // Auto-Cleanup: Alte Results (30 Tage) löschen
      await cleanupOldResults();
      
      const result = await getWorkspaceResults(workspaceId, 50);
      if (result.success && result.results) {
        // Filtere nur Recipe-Results
        const recipeResults = result.results
          .filter(r => r.toolId === 'recipe')
          .map(r => {
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
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
      <BackButton />
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Gourmet-Planer</h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-1 sm:mt-2">
          Dein Smart-Chef für den Kühlschrank.
        </p>
      </div>

      {/* Tab-System */}
      <div className="mb-6 flex gap-2 border-b border-white/10 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'create'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          Neues Rezept
        </button>
        <button
          onClick={() => setActiveTab('my-recipes')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'my-recipes'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          Meine Rezepte
        </button>
        <button
          onClick={() => setActiveTab('week-planner')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'week-planner'
              ? 'border-orange-500 text-orange-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-300'
          }`}
        >
          Wochenplaner
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'create' ? (
        <>
          <div className="mt-3 p-3 rounded-md bg-orange-500/10 border border-orange-500/20 text-sm text-orange-300 mb-6">
            💡 <strong>Tipp:</strong> Gib einfach ein, was im Kühlschrank ist. Die KI erstellt daraus ein perfektes Rezept mit Nährwerten.
          </div>

      {/* MOBILE FIRST: flex-col auf Mobile, md:grid auf Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Gericht-Typ
              </label>
              <div className="flex flex-wrap gap-2">
                {mealTypeOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setMealType(option.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                      mealType === option.value
                        ? 'bg-orange-500/20 border-2 border-orange-500/50 text-orange-300'
                        : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="mealType" value={mealType} />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Anzahl Personen
              </label>
              <div className="flex items-center gap-3 bg-zinc-800/50 border border-white/10 rounded-lg p-2 w-fit">
                <button
                  type="button"
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  disabled={servings <= 1}
                  className="w-8 h-8 rounded-md bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-700 hover:text-white hover:border-orange-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-white min-w-[80px] text-center">
                  {servings} {servings === 1 ? 'Person' : 'Personen'}
                </span>
                <button
                  type="button"
                  onClick={() => setServings(servings + 1)}
                  className="w-8 h-8 rounded-md bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-700 hover:text-white hover:border-orange-500/30 transition-all flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <input type="hidden" name="servings" value={servings} />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Was hast du im Kühlschrank?
              </label>
              <textarea
                name="ingredients"
                required
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="z.B. Eier, Tomaten, Reis..."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 resize-none transition-all min-h-[150px]"
                rows={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Darf eingekauft werden?
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShoppingMode('strict')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    shoppingMode === 'strict'
                      ? 'bg-orange-500/20 border-2 border-orange-500/50 text-orange-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                >
                  Nein, Reste verwerten 🦊
                </button>
                <button
                  type="button"
                  onClick={() => setShoppingMode('shopping')}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    shoppingMode === 'shopping'
                      ? 'bg-orange-500/20 border-2 border-orange-500/50 text-orange-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                >
                  Ja, fehlendes ergänzen 🛒
                </button>
              </div>
              <input type="hidden" name="shoppingMode" value={shoppingMode} />
              {shoppingMode === 'shopping' && (
                <p className="text-xs text-zinc-400 mt-2">
                  Die KI schlägt fehlende Zutaten für ein besseres Gericht vor.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Filter & Präferenzen
              </label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleFilter(option.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                      filters.includes(option.value)
                        ? 'bg-orange-500/20 border-2 border-orange-500/50 text-orange-300'
                        : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {/* Hidden inputs für FormData */}
              {filters.map((filter) => (
                <input key={filter} type="hidden" name="filters" value={filter} />
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Workspace</label>
              <WorkspaceSelect value={workspaceId} onChange={setWorkspaceId} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
            </div>

            <SubmitButton />
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm text-red-400">{state.error}</p>
          )}
        </div>

        {/* RECHTE SEITE: ERGEBNIS */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-h-[300px] sm:min-h-[400px] overflow-hidden">
          {state?.result && state.result.includes('🔒 Premium Feature') ? (
            <div className="p-4 sm:p-5 md:p-6">
              <div className="prose prose-sm max-w-none text-white prose-invert">
                <div dangerouslySetInnerHTML={{ __html: state.result.replace(/\n/g, '<br />') }} />
              </div>
            </div>
          ) : recipe ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ActionButtons recipe={recipe} />
              
              <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto">
                {/* RECIPE CARD */}
                <div className="rounded-xl border border-orange-500/20 bg-zinc-900/80 backdrop-blur-xl p-5 sm:p-6 shadow-lg">
                  {/* HEADER */}
                  <div className="mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{recipe.recipeName}</h2>
                  </div>

                  {/* BADGES: Zeit, Schwierigkeit & Personen */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-full px-3 py-1.5 text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {recipe.stats?.time}
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-full px-3 py-1.5 text-xs font-medium">
                      <ChefHat className="w-3.5 h-3.5" />
                      {recipe.stats?.difficulty}
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-full px-3 py-1.5 text-xs font-medium">
                      <Users className="w-3.5 h-3.5" />
                      {servings} {servings === 1 ? 'Person' : 'Personen'}
                    </div>
                  </div>

                  {/* NUTRITION GRID */}
                  <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-white/10">
                    <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full px-3 py-1.5 text-xs font-medium">
                      🔥 {recipe.stats?.calories}
                    </div>
                  </div>

                  {/* ZUTATEN-LISTE (Checkbox-Style) */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Zutaten</h3>
                    <ul className="space-y-2">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-start gap-3 text-zinc-300 group cursor-pointer hover:text-white transition-colors">
                          <div className="mt-1.5 w-5 h-5 rounded border-2 border-orange-500/30 bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 group-hover:border-orange-500/50 transition-all">
                            <CheckCircle2 className="w-3 h-3 text-orange-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-sm sm:text-base">{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {recipe.shoppingList && recipe.shoppingList.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-white mb-3">Das fehlt noch (Einkaufsliste):</h3>
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                        <ul className="space-y-1 text-sm text-zinc-200">
                          {recipe.shoppingList.map((ingredient, index) => (
                            <li key={index}>• {ingredient}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* ZUBEREITUNG */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Zubereitung</h3>
                    <ol className="space-y-3">
                      {recipe.instructions.map((step, index) => (
                        <li key={index} className="flex gap-3 text-zinc-300">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-300 text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-sm sm:text-base leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* TIP */}
                  {recipe.chefTip && (
                    <div className="pt-4 border-t border-white/10">
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                        <p className="text-sm text-orange-200 font-medium mb-1">💡 Profi-Tipp</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{recipe.chefTip}</p>
                      </div>
                    </div>
                  )}

                  {/* Einkaufsliste Button */}
                  {recipe.shoppingList && recipe.shoppingList.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <button
                        onClick={() => setIsShoppingListOpen(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-lg text-orange-300 font-medium transition-colors"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        Dir fehlen Zutaten? → Einkaufsliste erstellen
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* FEEDBACK BUTTON */}
              <div className="p-4 sm:p-5 md:p-6 border-t border-white/5">
                <FeedbackButton 
                  toolId="recipe" 
                  toolName="Gourmet-Planer"
                  resultId={recipe ? `recipe-${Date.now()}` : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <ChefHat className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Warte auf Input...</p>
              <p className="text-xs mt-1 text-zinc-600">Das generierte Rezept erscheint hier</p>
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
            {!workspaceId ? (
              <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 text-center">
                <p className="text-zinc-400 mb-4">Bitte wähle einen Workspace aus, um deine Rezepte zu sehen.</p>
                <WorkspaceSelect value={workspaceId} onChange={setWorkspaceId} />
              </div>
            ) : isLoadingRecipes ? (
              <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-400 mb-2" />
                <p className="text-zinc-400">Lade Rezepte...</p>
              </div>
            ) : myRecipes.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 text-center">
                <ChefHat className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
                <p className="text-zinc-400">Noch keine Rezepte gespeichert.</p>
                <p className="text-sm text-zinc-500 mt-2">Erstelle dein erstes Rezept im Tab "Neues Rezept"!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myRecipes.map((result) => {
                  const r = result.recipe as Recipe;
                  return (
                    <div
                      key={result.id}
                      className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-5 hover:border-orange-500/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedRecipe({
                        recipe: r,
                        resultId: result.id,
                        createdAt: new Date(result.createdAt)
                      })}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-white line-clamp-2">{r.recipeName || 'Rezept'}</h3>
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Rezept editieren
                              alert('Edit-Feature kommt gleich!');
                            }}
                            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                            title="Rezept anpassen"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecipe(result.id);
                            }}
                            className="p-1.5 rounded-md hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {r.stats && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {r.stats.time && (
                            <span className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs">
                              ⏱️ {r.stats.time}
                            </span>
                          )}
                          {r.stats.calories && (
                            <span className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-300 text-xs">
                              🔥 {r.stats.calories}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-zinc-500 mb-4">
                        {new Date(result.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </p>

                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedRecipe({
                            recipe: r,
                            resultId: result.id,
                            createdAt: new Date(result.createdAt)
                          })}
                          className="flex-1 px-3 py-2 rounded-md bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 text-sm font-medium transition-colors"
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
                              // Shopping List wird in Detail-View geöffnet
                            }}
                            className="flex-1 px-3 py-2 rounded-md bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-300 text-sm font-medium transition-colors flex items-center justify-center gap-1"
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
          workspaceId={workspaceId}
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
