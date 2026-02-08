'use client';

import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Clock, Users, ChefHat, ShoppingCart, Minus, Plus, AlertCircle, RotateCcw, Play, CheckCircle2, ListPlus } from 'lucide-react';
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
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={onBack} className="hover:text-gray-900 transition-colors font-medium">
            {fromWeekPlan ? 'Wochenplaner' : 'Meine Rezepte'}
          </button>
          <span>/</span>
          <span className="text-gray-900 font-medium truncate max-w-[200px]">{recipe.recipeName}</span>
          {isShoppingListOpen && (
            <>
              <span>/</span>
              <span className="text-gray-900 font-medium">Einkaufsliste</span>
            </>
          )}
        </div>
        {fromWeekPlan && onSaveToCollection && (
          <button
            onClick={onSaveToCollection}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/30"
          >
            <ChefHat className="w-4 h-4" />
            In Meine Rezepte speichern
          </button>
        )}
      </div>

      {/* Titel + Meta – Glass-Karte */}
      <div className="mb-6 rounded-2xl overflow-hidden p-5 sm:p-6" style={RECIPE_GLASS_STYLE}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-orange-500/90 to-amber-500/90 border border-white/50 flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-500/20">
            <ChefHat className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{recipe.recipeName}</h1>
            <div className="flex flex-wrap gap-3 items-center text-gray-600">
              {recipe.stats?.time && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Clock className="w-4 h-4 text-orange-500" />
                  {recipe.stats.time}
                </div>
              )}
              {adjustedCalories && (
                <div className="flex items-center gap-1.5 text-sm">
                  🔥 {adjustedCalories} {servings !== originalServings && `(pro Portion)`}
                </div>
              )}
              {recipe.stats?.difficulty && (
                <div className="flex items-center gap-1.5 text-sm">{recipe.stats.difficulty}</div>
              )}
              <div className="text-xs text-gray-500">
                {new Date(createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rezept anpassen – Glass-Karte (Slider + Jetzt kochen + Einkaufsliste) */}
      <div className="mb-8 rounded-2xl overflow-hidden p-5 sm:p-6" style={RECIPE_GLASS_STYLE}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900">Rezept anpassen</h2>
          <div className="flex flex-wrap gap-2">
            {servings !== originalServings && (
              <button
                onClick={() => setServings(originalServings)}
                className="px-3 py-1.5 rounded-full bg-white/60 hover:bg-white/80 border border-white/50 text-gray-600 text-sm font-medium transition-colors flex items-center gap-1.5"
                title="Original-Portionen wiederherstellen"
              >
                <RotateCcw className="w-4 h-4" />
                Original
              </button>
            )}
            <button
              onClick={() => setCookingMode(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium transition-colors flex items-center gap-2 shadow-lg shadow-orange-500/30"
            >
              <Play className="w-4 h-4" />
              Jetzt kochen
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setServings(Math.max(1, servings - 1))}
            disabled={servings <= 1}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/80 border border-white/60 text-gray-600 hover:border-orange-300 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 shadow-sm"
          >
            <Minus className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0 w-full">
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
              <span className="absolute text-xs text-gray-500" style={{ left: '0%' }}>1</span>
              <span className="absolute text-xs text-gray-500 -translate-x-1/2" style={{ left: 'calc(100% * 3 / 7)' }}>4</span>
              <span className="absolute text-xs text-gray-500" style={{ left: '100%', transform: 'translateX(-100%)' }}>8</span>
            </div>
          </div>
          <button
            onClick={() => setServings(Math.min(8, servings + 1))}
            disabled={servings >= 8}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/80 border border-white/60 text-gray-600 hover:border-orange-300 hover:text-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shrink-0 shadow-sm"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <p className="mt-2 text-sm font-bold text-gray-900">Anzahl Personen: {servings}</p>

        {prioritizedMissingIngredients.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/40 space-y-2">
            <button
              onClick={() => setIsShoppingListOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-orange-700 font-medium transition-colors bg-white/50 hover:bg-white/70 border border-orange-200/50"
            >
              <AlertCircle className="w-5 h-5" />
              {prioritizedMissingIngredients.length <= 3
                ? `Was fehlt mir? (${prioritizedMissingIngredients.length} wichtige Zutaten)`
                : `${prioritizedMissingIngredients.length} Zutaten fehlen`}
            </button>
            <button
              onClick={() => setIsAddToListOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/40 hover:bg-white/60 border border-white/50 text-gray-700 font-medium transition-colors"
            >
              <ListPlus className="w-5 h-5" />
              Auf Einkaufsliste setzen
            </button>
          </div>
        )}
      </div>

      {/* Zutaten + Zubereitung – zwei Glass-Karten (mobil gestapelt, Desktop nebeneinander) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl overflow-hidden p-5 sm:p-6" style={RECIPE_GLASS_STYLE}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-bold text-gray-900">Zutaten für {servings} {servings === 1 ? 'Person' : 'Personen'}</h2>
          </div>
          <ul className="space-y-2">
            {adjustedIngredients.map((ingredient, index) => (
              <li key={index} className="text-gray-800 flex items-start gap-2">
                <span className="text-orange-500 mt-1">•</span>
                <span className="text-sm leading-relaxed">{ingredient}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl overflow-hidden p-5 sm:p-6" style={RECIPE_GLASS_STYLE}>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Zubereitung</h2>
          <ol className="space-y-4">
            {recipe.instructions.map((step, index) => (
              <li key={index} className="flex gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                  {index + 1}
                </span>
                <span className="text-gray-800 text-sm leading-relaxed flex-1">{step}</span>
              </li>
            ))}
          </ol>

          {cookingTime > 0 && (
            <div className="mt-6 pt-4 border-t border-white/40">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <Clock className="w-5 h-5 text-orange-500" />
                Gesamt-Kochzeit: {cookingTime} Minuten
              </div>
              <button
                onClick={() => alert(`Timer für ${cookingTime} Minuten starten – Feature kommt gleich!`)}
                className="mt-2 px-4 py-2 rounded-xl bg-white/60 hover:bg-white/80 border border-orange-200/50 text-orange-700 text-sm font-medium transition-colors"
              >
                ⏱️ Timer starten
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profi-Tipp – Glass mit Orange-Stich */}
      {recipe.chefTip && (
        <div
          className="mt-6 rounded-2xl overflow-hidden p-4 sm:p-5 border border-orange-200/60"
          style={{
            background: 'rgba(255,237,213,0.6)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 12px rgba(0,0,0,0.04)',
            WebkitBackdropFilter: 'blur(12px)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <p className="text-xs font-black tracking-widest uppercase text-orange-700 mb-2">💡 Profi-Tipp</p>
          <p className="text-sm text-gray-800 leading-relaxed">{recipe.chefTip}</p>
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
