'use client';

import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Clock, Users, ChefHat, ShoppingCart, Minus, Plus, AlertCircle, RotateCcw, Play, CheckCircle2, ListPlus, Lightbulb, Flame } from 'lucide-react';
import { ShoppingListModal } from '@/components/ui/shopping-list-modal';
import { AddToShoppingListModal } from '@/components/recipe/add-to-shopping-list-modal';

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
  fromWeekPlan?: boolean; // Kommt aus Wochenplan?
  onSaveToCollection?: () => void;
}

/** Glass-Elemente: einheitliche Handschrift wie Dashboard/Gourmet (mobil + Desktop) */
const RECIPE_GLASS_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  border: '1px solid rgba(255,255,255,0.5)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 12px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.06)',
  WebkitBackdropFilter: 'blur(12px)',
  backdropFilter: 'blur(12px)',
};

export function RecipeDetailView({ recipe, resultId, createdAt, onBack, fromWeekPlan = false, onSaveToCollection }: RecipeDetailViewProps) {
  // Original-Servings aus Recipe (normalerweise 2)
  const originalServings = 2;
  const [servings, setServings] = useState(originalServings);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [showMissingIngredients, setShowMissingIngredients] = useState(false);
  const [cookingMode, setCookingMode] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const toggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

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

  // Kochmodus: Step-by-Step View – Glass-Karte
  if (cookingMode) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => setCookingMode(false)} className="hover:text-gray-900 transition-colors font-medium">
            Rezept
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium">Kochmodus</span>
        </div>

        <div className="rounded-2xl overflow-hidden p-6 sm:p-8" style={RECIPE_GLASS_STYLE}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{recipe.recipeName}</h2>
            <p className="text-gray-500">Schritt {currentStep + 1} von {recipe.instructions.length}</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white text-xl font-bold">
                {currentStep + 1}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Schritt {currentStep + 1}</h3>
              </div>
              <button
                onClick={() => {
                  const newCompleted = new Set(completedSteps);
                  if (newCompleted.has(currentStep)) newCompleted.delete(currentStep);
                  else newCompleted.add(currentStep);
                  setCompletedSteps(newCompleted);
                }}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors border ${
                  completedSteps.has(currentStep)
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-orange-300 hover:text-orange-500'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
            <p className="text-lg text-gray-800 leading-relaxed pl-16">{recipe.instructions[currentStep]}</p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="flex-1 px-4 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors"
            >
              Zurück
            </button>
            {currentStep < recipe.instructions.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium transition-colors shadow-lg shadow-orange-500/30"
              >
                Weiter
              </button>
            ) : (
              <button
                onClick={() => { setCookingMode(false); setCurrentStep(0); }}
                className="flex-1 px-4 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium transition-colors"
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
    <div className="animate-in slide-in-from-bottom-10 fade-in duration-700 ease-out px-4 md:px-6 pb-16">
      {/* Breadcrumb oben, dezent */}
      <div className="max-w-5xl mx-auto mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={onBack} className="hover:text-slate-900 transition-colors font-medium">
            {fromWeekPlan ? 'Wochenplaner' : 'Meine Rezepte'}
          </button>
          <span>/</span>
          <span className="text-slate-700 font-medium truncate max-w-[200px]">{recipe.recipeName}</span>
        </div>
        {fromWeekPlan && onSaveToCollection && (
          <button
            onClick={onSaveToCollection}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-medium shadow-lg shadow-orange-500/25 flex items-center gap-2"
          >
            <ChefHat className="w-4 h-4" />
            In Meine Rezepte speichern
          </button>
        )}
      </div>

      {/* Hero Card – überlappt Header, Glas + Schatten */}
      <div className="relative z-20 -mt-24 mx-4 md:mx-auto max-w-5xl bg-white/90 backdrop-blur-xl shadow-2xl rounded-[40px] border border-white/50 p-6 md:p-10">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4 text-center">{recipe.recipeName}</h1>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {recipe.stats?.time && (
            <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 rounded-full px-4 py-1 text-sm font-medium">
              <Clock className="w-4 h-4" />
              {recipe.stats.time}
            </span>
          )}
          {adjustedCalories && (
            <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-700 rounded-full px-4 py-1 text-sm font-medium">
              <Flame className="w-4 h-4" />
              {adjustedCalories} {servings !== originalServings && '(pro Portion)'}
            </span>
          )}
          {recipe.stats?.difficulty && (
            <span className="bg-orange-50 text-orange-700 rounded-full px-4 py-1 text-sm font-medium">
              {recipe.stats.difficulty}
            </span>
          )}
          <span className="bg-slate-100 text-slate-600 rounded-full px-4 py-1 text-xs font-medium">
            {new Date(createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
        </div>

        {/* Jetzt kochen – Orange-Gradient, volle Breite */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <button
            onClick={() => setCookingMode(true)}
            className="w-full sm:w-auto sm:min-w-[200px] px-6 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/30 hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Jetzt kochen
          </button>
        </div>

        {/* Portionen-Slider – Orange */}
        <div className="border-t border-slate-100 pt-6">
          <h2 className="text-lg font-bold text-slate-800 mb-3">Rezept anpassen</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setServings(Math.max(1, servings - 1))}
              disabled={servings <= 1}
              className="w-11 h-11 rounded-full bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="flex-1 min-w-0">
              <input
                type="range"
                min="1"
                max="8"
                step={1}
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value))}
                className="slider-recipe w-full h-2 cursor-pointer touch-manipulation block"
                style={{ transition: 'none' }}
              />
              <div className="relative w-full mt-1 h-4 flex items-center" aria-hidden>
                <span className="absolute text-xs text-slate-400" style={{ left: '0%' }}>1</span>
                <span className="absolute text-xs text-slate-400 -translate-x-1/2" style={{ left: 'calc(100% * 3 / 7)' }}>4</span>
                <span className="absolute text-xs text-slate-400" style={{ left: '100%', transform: 'translateX(-100%)' }}>8</span>
              </div>
            </div>
            <button
              onClick={() => setServings(Math.min(8, servings + 1))}
              disabled={servings >= 8}
              className="w-11 h-11 rounded-full bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-2 text-sm font-bold text-slate-800">Anzahl Personen: {servings}</p>
          {servings !== originalServings && (
            <button
              onClick={() => setServings(originalServings)}
              className="mt-2 text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              Original wiederherstellen
            </button>
          )}

          {prioritizedMissingIngredients.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-2">
              <button
                onClick={() => setIsShoppingListOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 font-medium text-sm hover:bg-orange-100 transition-colors"
              >
                <AlertCircle className="w-4 h-4" />
                Was fehlt mir?
              </button>
              <button
                onClick={() => setIsAddToListOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                <ListPlus className="w-4 h-4" />
                Auf Einkaufsliste
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content-Grid: Zutaten (4) | Zubereitung (8) */}
      <div className="max-w-5xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Links: Zutaten – Gourmet-Checkboxen */}
        <div className="md:col-span-4 bg-orange-50/50 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-slate-800">Zutaten für {servings} {servings === 1 ? 'Person' : 'Personen'}</h2>
          </div>
          <ul className="space-y-3">
            {adjustedIngredients.map((ingredient, index) => {
              const checked = checkedIngredients.has(index);
              return (
                <li key={index} className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => toggleIngredient(index)}
                    className={cn(
                      'mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                      checked ? 'bg-gradient-to-br from-orange-500 to-amber-500 border-orange-500 text-white' : 'border-orange-300 bg-white'
                    )}
                    aria-label={checked ? 'Abhaken' : 'Abhaken'}
                  >
                    {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                  </button>
                  <span className={cn('text-sm leading-relaxed', checked ? 'text-slate-400 line-through' : 'text-slate-800')}>
                    {ingredient}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Rechts: Zubereitung – nummerierte Schritte */}
        <div className="md:col-span-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Zubereitung</h2>
          <ol className="space-y-4">
            {recipe.instructions.map((step, index) => (
              <li key={index} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <span className="text-slate-800 text-sm leading-relaxed flex-1 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
          {cookingTime > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-slate-700">Gesamt-Kochzeit: {cookingTime} Minuten</span>
              <button
                onClick={() => alert(`Timer für ${cookingTime} Minuten – Feature kommt gleich!`)}
                className="ml-2 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-700 text-sm font-medium border border-orange-200 hover:bg-orange-100"
              >
                Timer starten
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profi-Tipp – Veredelung, kein Warn-Look */}
      {recipe.chefTip && (
        <div className="max-w-5xl mx-auto mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-6 flex gap-4">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-800 mb-1">Profi-Tipp</p>
            <p className="text-sm text-slate-800 leading-relaxed">{recipe.chefTip}</p>
          </div>
        </div>
      )}

      {/* Export-Modal (WhatsApp/Copy) */}
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

      {/* Auf Einkaufsliste setzen – Modal + Toast */}
      {prioritizedMissingIngredients.length > 0 && (
        <AddToShoppingListModal
          isOpen={isAddToListOpen}
          onClose={() => setIsAddToListOpen(false)}
          ingredients={prioritizedMissingIngredients}
          onAdded={(count, listName) => {
            setToast({
              message: `${count} ${count === 1 ? 'Zutat' : 'Zutaten'} zu „${listName}“ hinzugefügt`,
            });
          }}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-medium shadow-lg animate-in fade-in duration-200"
          role="status"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
