'use client';

import { useState, useMemo } from 'react';
import { ArrowLeft, Clock, Users, ChefHat, ShoppingCart, Minus, Plus, AlertCircle, RotateCcw, Play, CheckCircle2 } from 'lucide-react';
import { ShoppingListModal } from '@/components/ui/shopping-list-modal';

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

interface RecipeDetailViewProps {
  recipe: Recipe;
  resultId: string;
  createdAt: Date;
  onBack: () => void;
}

export function RecipeDetailView({ recipe, resultId, createdAt, onBack }: RecipeDetailViewProps) {
  // Original-Servings aus Recipe (normalerweise 2)
  const originalServings = 2;
  const [servings, setServings] = useState(originalServings);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [showMissingIngredients, setShowMissingIngredients] = useState(false);
  const [cookingMode, setCookingMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Parse Zutaten-Mengen für Portionen-Anpassung (verbessert)
  const parseIngredient = (ingredient: string) => {
    // Versuche Mengen zu extrahieren (z.B. "500g Hackfleisch" → 500)
    const match = ingredient.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|Stk|Stück|EL|TL|Tasse|Tassen)?\s*(.*)$/i);
    if (match) {
      const amount = parseFloat(match[1].replace(',', '.'));
      const unit = match[2] || '';
      const name = match[3].trim();
      return { amount, unit, name, original: ingredient };
    }
    return { amount: null, unit: '', name: ingredient, original: ingredient };
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

  // Kalorien pro Portion anpassen
  const adjustedCalories = useMemo(() => {
    if (!recipe.stats?.calories) return null;
    const match = recipe.stats.calories.match(/(\d+)/);
    if (match) {
      const originalCalories = parseInt(match[1]);
      const ratio = servings / originalServings;
      const newCalories = Math.round(originalCalories * ratio);
      return `${newCalories} kcal`;
    }
    return recipe.stats.calories;
  }, [recipe.stats?.calories, servings, originalServings]);

  // Smart "Was fehlt mir?" - Priorität: Hauptzutaten > Gewürze (mit angepassten Mengen)
  const prioritizedMissingIngredients = useMemo(() => {
    if (!adjustedShoppingList || adjustedShoppingList.length === 0) return [];
    
    // Kategorisiere Zutaten nach Priorität (mit angepassten Mengen)
    const mainIngredients = adjustedShoppingList.filter(ing => {
      const lower = ing.toLowerCase();
      return lower.includes('fleisch') || lower.includes('hack') || lower.includes('huhn') || 
             lower.includes('fisch') || lower.includes('reis') || lower.includes('nudeln') ||
             lower.includes('kartoffel') || lower.includes('tomate') || lower.includes('zwiebel') ||
             lower.includes('paprika') || lower.includes('käse') || lower.includes('milch');
    });
    
    const spices = adjustedShoppingList.filter(ing => {
      const lower = ing.toLowerCase();
      return lower.includes('salz') || lower.includes('pfeffer') || lower.includes('gewürz') ||
             lower.includes('paprika') || lower.includes('kümmel') || lower.includes('oregano');
    });
    
    // Priorität: Hauptzutaten zuerst, dann Rest
    return [...mainIngredients, ...adjustedShoppingList.filter(ing => 
      !mainIngredients.includes(ing) && !spices.includes(ing)
    ), ...spices];
  }, [adjustedShoppingList]);

  // Parse Kochzeit für Timer
  const parseTime = (timeStr: string) => {
    const match = timeStr.match(/(\d+)\s*Min/i);
    return match ? parseInt(match[1]) : 0;
  };

  const cookingTime = parseTime(recipe.stats?.time || '');

  // Kochmodus: Step-by-Step View
  if (cookingMode) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
          <button onClick={() => setCookingMode(false)} className="hover:text-white transition-colors">
            Rezept
          </button>
          <span>/</span>
          <span className="text-white">Kochmodus</span>
        </div>

        {/* Step-by-Step Anleitung */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">{recipe.recipeName}</h2>
            <p className="text-zinc-400">
              Schritt {currentStep + 1} von {recipe.instructions.length}
            </p>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-300 text-xl font-bold">
                {currentStep + 1}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Schritt {currentStep + 1}</h3>
              </div>
              <button
                onClick={() => {
                  const newCompleted = new Set(completedSteps);
                  if (newCompleted.has(currentStep)) {
                    newCompleted.delete(currentStep);
                  } else {
                    newCompleted.add(currentStep);
                  }
                  setCompletedSteps(newCompleted);
                }}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                  completedSteps.has(currentStep)
                    ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                    : 'bg-zinc-800 border border-white/10 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
            <p className="text-lg text-zinc-300 leading-relaxed pl-16">
              {recipe.instructions[currentStep]}
            </p>
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="flex-1 px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              Zurück
            </button>
            {currentStep < recipe.instructions.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex-1 px-4 py-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
              >
                Weiter
              </button>
            ) : (
              <button
                onClick={() => {
                  setCookingMode(false);
                  setCurrentStep(0);
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
              >
                Fertig! 🎉
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="mb-4 flex items-center gap-2 text-sm text-zinc-400">
        <button onClick={onBack} className="hover:text-white transition-colors">
          Meine Rezepte
        </button>
        <span>/</span>
        <span className="text-white">{recipe.recipeName}</span>
        {isShoppingListOpen && (
          <>
            <span>/</span>
            <span className="text-white">Einkaufsliste</span>
          </>
        )}
      </div>

      {/* Header mit Rezept-Info */}
      <div className="mb-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-8 h-8 text-orange-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">{recipe.recipeName}</h1>
            <div className="flex flex-wrap gap-3 items-center">
              {recipe.stats?.time && (
                <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                  <Clock className="w-4 h-4" />
                  {recipe.stats.time}
                </div>
              )}
              {adjustedCalories && (
                <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                  🔥 {adjustedCalories} {servings !== originalServings && `(pro Portion)`}
                </div>
              )}
              {recipe.stats?.difficulty && (
                <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                  {recipe.stats.difficulty}
                </div>
              )}
              <div className="text-xs text-zinc-500">
                {new Date(createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Smart "Nochmal kochen" Panel - In-Place Bearbeitung */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Rezept anpassen</h2>
          <div className="flex gap-2">
            {servings !== originalServings && (
              <button
                onClick={() => setServings(originalServings)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors flex items-center gap-1.5"
                title="Original-Portionen wiederherstellen"
              >
                <RotateCcw className="w-4 h-4" />
                Original
              </button>
            )}
            <button
              onClick={() => setCookingMode(true)}
              className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Jetzt kochen
            </button>
          </div>
        </div>

        {/* Portionen-Slider - Touch-friendly mit Live-Updates */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Anzahl Personen: <span className="text-orange-400 font-bold text-lg">{servings}</span>
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setServings(Math.max(1, servings - 1))}
              disabled={servings <= 1}
              className="w-12 h-12 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center touch-manipulation"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <input
                type="range"
                min="1"
                max="8"
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value))}
                className="w-full h-3 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500 touch-manipulation"
                style={{ transition: 'none' }}
              />
              <div className="flex justify-between text-xs text-zinc-500 mt-1">
                <span>1</span>
                <span>4</span>
                <span>8</span>
              </div>
            </div>
            <button
              onClick={() => setServings(Math.min(8, servings + 1))}
              disabled={servings >= 8}
              className="w-12 h-12 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center touch-manipulation"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Smart "Was fehlt mir?" Button - Priorität */}
        {prioritizedMissingIngredients.length > 0 && (
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => {
                setIsShoppingListOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 font-medium transition-colors"
            >
              <AlertCircle className="w-5 h-5" />
              {prioritizedMissingIngredients.length <= 3 
                ? `Was fehlt mir? (${prioritizedMissingIngredients.length} wichtige Zutaten)`
                : `${prioritizedMissingIngredients.length} Zutaten fehlen`}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zutaten-Liste (mit angepassten Mengen) */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-semibold text-white">Zutaten für {servings} {servings === 1 ? 'Person' : 'Personen'}</h2>
          </div>
          <ul className="space-y-2 transition-all duration-200">
            {adjustedIngredients.map((ingredient, index) => (
              <li key={index} className="text-zinc-300 flex items-start gap-2 transition-all duration-200">
                <span className="text-orange-400 mt-1">•</span>
                <span className="text-sm leading-relaxed">{ingredient}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Zubereitung */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Zubereitung</h2>
          <ol className="space-y-4">
            {recipe.instructions.map((step, index) => (
              <li key={index} className="flex gap-3 text-zinc-300">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-300 text-sm font-bold">
                  {index + 1}
                </span>
                <span className="text-sm leading-relaxed flex-1">{step}</span>
              </li>
            ))}
          </ol>

          {/* Timer-Integration */}
          {cookingTime > 0 && (
            <div className="mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-orange-300">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Gesamt-Kochzeit: {cookingTime} Minuten</span>
              </div>
              <button
                onClick={() => {
                  // TODO: Timer starten
                  alert(`Timer für ${cookingTime} Minuten starten - Feature kommt gleich!`);
                }}
                className="mt-2 px-4 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 text-orange-300 text-sm font-medium transition-colors"
              >
                ⏱️ Timer starten
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profi-Tipp */}
      {recipe.chefTip && (
        <div className="mt-6 rounded-xl border border-orange-500/20 bg-orange-500/10 p-4">
          <p className="text-sm text-orange-200 font-medium mb-1">💡 Profi-Tipp</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{recipe.chefTip}</p>
        </div>
      )}

      {/* Shopping List Modal - mit "Zurück zum Rezept" */}
      {prioritizedMissingIngredients.length > 0 && (
        <ShoppingListModal
          isOpen={isShoppingListOpen}
          onClose={() => setIsShoppingListOpen(false)}
          ingredients={prioritizedMissingIngredients}
          recipeName={recipe.recipeName}
          showBackToRecipe={true}
          onBackToRecipe={() => setIsShoppingListOpen(false)}
        />
      )}
    </div>
  );
}
