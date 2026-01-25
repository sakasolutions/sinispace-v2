'use client';

import { useState } from 'react';
import { ArrowLeft, Clock, Users, ChefHat, ShoppingCart, Minus, Plus, AlertCircle } from 'lucide-react';
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
  onCookAgain: (recipe: Recipe, servings: number) => void;
}

export function RecipeDetailView({ recipe, resultId, createdAt, onBack, onCookAgain }: RecipeDetailViewProps) {
  const [servings, setServings] = useState(2);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [showMissingIngredients, setShowMissingIngredients] = useState(false);

  // Parse Zutaten-Mengen für Portionen-Anpassung
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

  const adjustedIngredients = recipe.ingredients.map(ing => 
    adjustIngredientForServings(ing, 2, servings)
  );

  // Parse Kochzeit für Timer
  const parseTime = (timeStr: string) => {
    const match = timeStr.match(/(\d+)\s*Min/i);
    return match ? parseInt(match[1]) : 0;
  };

  const cookingTime = parseTime(recipe.stats?.time || '');

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header mit Zurück-Button */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zu Meine Rezepte
        </button>

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
              {recipe.stats?.calories && (
                <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                  🔥 {recipe.stats.calories}
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

      {/* Smart "Nochmal kochen" Panel */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Nochmal kochen</h2>
          <button
            onClick={() => onCookAgain(recipe, servings)}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors"
          >
            Rezept anpassen
          </button>
        </div>

        {/* Portionen-Slider */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Anzahl Personen: <span className="text-orange-400 font-bold">{servings}</span>
          </label>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setServings(Math.max(1, servings - 1))}
              disabled={servings <= 1}
              className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              <Minus className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <input
                type="range"
                min="1"
                max="8"
                value={servings}
                onChange={(e) => setServings(parseInt(e.target.value))}
                className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
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
              className="w-10 h-10 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 hover:bg-zinc-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* "Was fehlt mir?" Button */}
        {recipe.shoppingList && recipe.shoppingList.length > 0 && (
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={() => {
                setShowMissingIngredients(!showMissingIngredients);
                if (!showMissingIngredients) {
                  setIsShoppingListOpen(true);
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 font-medium transition-colors"
            >
              <AlertCircle className="w-5 h-5" />
              Was fehlt mir? ({recipe.shoppingList.length} Zutaten)
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
          <ul className="space-y-2">
            {adjustedIngredients.map((ingredient, index) => (
              <li key={index} className="text-zinc-300 flex items-start gap-2">
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

      {/* Shopping List Modal */}
      {recipe.shoppingList && recipe.shoppingList.length > 0 && (
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
