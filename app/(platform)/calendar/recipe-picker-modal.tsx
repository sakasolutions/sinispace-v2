'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCalendarRecipes, type CalendarRecipe } from '@/actions/calendar-actions';

type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  slot: MealSlot;
  defaultTime: string;
  onSelect: (recipe: Pick<CalendarRecipe, 'id' | 'resultId' | 'recipeName' | 'stats'>, slot: MealSlot, date: string, time: string) => void;
};

export function RecipePickerModal({ isOpen, onClose, date, slot, defaultTime, onSelect }: Props) {
  const [recipes, setRecipes] = useState<CalendarRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      getCalendarRecipes().then((res) => {
        setRecipes(res.recipes || []);
        setIsLoading(false);
      });
    }
  }, [isOpen]);

  const handleSelect = (recipe: CalendarRecipe) => {
    onSelect(recipe, slot, date, defaultTime);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-labelledby="recipe-picker-title"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 id="recipe-picker-title" className="text-lg font-semibold text-gray-900">
            Aus meinen Rezepten hinzufügen
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Schließen">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <p className="px-4 pb-3 text-sm text-gray-500">
          {SLOT_LABELS[slot]} am {new Date(date + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : recipes.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Noch keine Rezepte gespeichert</p>
              <p className="text-sm text-gray-400 mt-1">
                Erstelle Rezepte im Gourmet-Planer, um sie hier zu sehen
              </p>
              <a
                href="/tools/recipe"
                className="inline-block mt-4 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
              >
                Zum Gourmet-Planer
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  onClick={() => handleSelect(recipe)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-xl border border-orange-100',
                    'bg-orange-50/50 hover:bg-orange-50 transition-colors text-left'
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                    <ChefHat className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{recipe.recipeName}</div>
                    <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                      {recipe.stats?.time && <span>{recipe.stats.time}</span>}
                      {recipe.stats?.calories && <span>{recipe.stats.calories} kcal</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
