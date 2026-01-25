'use client';

import { useState, useMemo } from 'react';
import { Plus, X, ShoppingCart, Calendar, Sparkles, Copy, ChevronLeft, ChevronRight } from 'lucide-react';
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

type WeekDay = {
  date: Date;
  dayName: string;
  recipe: { recipe: Recipe; resultId: string } | null;
};

interface WeekPlannerProps {
  myRecipes: Array<{ recipe: Recipe; id: string; createdAt: Date }>;
  workspaceId: string;
}

export function WeekPlanner({ myRecipes, workspaceId }: WeekPlannerProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [weekPlan, setWeekPlan] = useState<Record<string, { recipe: Recipe; resultId: string } | null>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);

  // Berechne Wochentage
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentWeek);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Montag als Start
    startOfWeek.setDate(diff);

    const days: WeekDay[] = [];
    const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      days.push({
        date,
        dayName: dayNames[i],
        recipe: weekPlan[dateKey] || null,
      });
    }
    
    return days;
  }, [currentWeek, weekPlan]);

  // Navigiere zu vorheriger/nächster Woche
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  // Rezept zu Tag hinzufügen
  const addRecipeToDay = (dateKey: string, recipe: Recipe, resultId: string) => {
    setWeekPlan(prev => ({
      ...prev,
      [dateKey]: { recipe, resultId },
    }));
    setSelectedDay(null);
  };

  // Rezept von Tag entfernen
  const removeRecipeFromDay = (dateKey: string) => {
    setWeekPlan(prev => {
      const newPlan = { ...prev };
      delete newPlan[dateKey];
      return newPlan;
    });
  };

  // Tag kopieren
  const copyDayToDay = (fromDateKey: string, toDateKey: string) => {
    const recipe = weekPlan[fromDateKey];
    if (recipe) {
      setWeekPlan(prev => ({
        ...prev,
        [toDateKey]: recipe,
      }));
    }
  };

  // Master Einkaufsliste: Konsolidiere alle Zutaten der Woche
  const masterShoppingList = useMemo(() => {
    const allIngredients: Record<string, { amount: number; unit: string }> = {};
    
    weekDays.forEach(day => {
      if (day.recipe) {
        // Verwende shoppingList falls vorhanden, sonst ingredients
        const ingredientsToUse = day.recipe.recipe.shoppingList && day.recipe.recipe.shoppingList.length > 0
          ? day.recipe.recipe.shoppingList
          : day.recipe.recipe.ingredients;
        
        ingredientsToUse.forEach(ingredient => {
          // Parse Menge (z.B. "500g Hackfleisch" → 500, "g", "Hackfleisch")
          const match = ingredient.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|Stk|Stück|EL|TL)?\s*(.*)$/i);
          if (match) {
            const amount = parseFloat(match[1].replace(',', '.'));
            const unit = match[2] || '';
            const name = match[3].trim() || ingredient;
            const key = `${name.toLowerCase()}${unit.toLowerCase()}`;
            
            if (allIngredients[key]) {
              allIngredients[key].amount += amount;
            } else {
              allIngredients[key] = { amount, unit };
            }
          } else {
            // Keine Menge gefunden, einfach zählen
            const key = ingredient.toLowerCase();
            if (allIngredients[key]) {
              allIngredients[key].amount += 1;
            } else {
              allIngredients[key] = { amount: 1, unit: '' };
            }
          }
        });
      }
    });

    // Konvertiere zu Array mit konsolidierten Mengen
    return Object.entries(allIngredients).map(([key, data]) => {
      const name = key.replace(/(g|kg|ml|l|stk|stück|el|tl)$/i, '').trim();
      const unit = data.unit;
      
      // Formatierung: Bei großen Mengen kg statt g
      if (unit === 'g' && data.amount >= 1000) {
        return `${(data.amount / 1000).toFixed(1)}kg ${name}`;
      }
      
      // Runde auf sinnvolle Werte
      const rounded = data.amount < 1 ? data.amount.toFixed(2) : Math.round(data.amount * 10) / 10;
      return `${rounded}${unit ? ' ' + unit : ''} ${name}`;
    });
  }, [weekDays]);

  // Format Datum
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Woche-Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateWeek('prev')}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-white">
            {weekDays[0].date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
          </h2>
          <p className="text-sm text-zinc-400">
            {formatDate(weekDays[0].date)} - {formatDate(weekDays[6].date)}
          </p>
        </div>
        <button
          onClick={() => navigateWeek('next')}
          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Smart Planning Button */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            // TODO: AI Auto-Planen
            alert('Auto-Planen Feature kommt gleich!');
          }}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium transition-colors"
        >
          <Sparkles className="w-5 h-5" />
          Woche auto-planen
        </button>
      </div>

      {/* 7-Tage Kalender-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dateKey = day.date.toISOString().split('T')[0];
          return (
            <div
              key={dateKey}
              className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 min-h-[200px]"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{day.dayName}</h3>
                  <p className="text-xs text-zinc-500">{formatDate(day.date)}</p>
                </div>
                {day.recipe && (
                  <button
                    onClick={() => removeRecipeFromDay(dateKey)}
                    className="p-1 rounded-md hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                    title="Rezept entfernen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {day.recipe ? (
                <div className="space-y-2">
                  <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <h4 className="text-sm font-medium text-white line-clamp-2 mb-1">
                      {day.recipe.recipe.recipeName}
                    </h4>
                    {day.recipe.recipe.stats?.time && (
                      <p className="text-xs text-zinc-400">⏱️ {day.recipe.recipe.stats.time}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      // Tag kopieren
                      const today = new Date().toISOString().split('T')[0];
                      copyDayToDay(dateKey, today);
                    }}
                    className="w-full text-xs px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                  >
                    Tag kopieren
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedDay(dateKey)}
                  className="w-full h-full min-h-[120px] flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-white/20 hover:border-orange-500/30 bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors"
                >
                  <Plus className="w-6 h-6 text-zinc-500" />
                  <span className="text-xs text-zinc-500">Rezept hinzufügen</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Master Einkaufsliste Button */}
      {masterShoppingList.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setIsShoppingListOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Wocheneinkauf erstellen ({masterShoppingList.length} Zutaten)
          </button>
        </div>
      )}

      {/* Rezept-Auswahl-Modal */}
      {selectedDay && (
        <RecipeSelectionModal
          isOpen={true}
          onClose={() => setSelectedDay(null)}
          recipes={myRecipes}
          onSelect={(recipe, resultId) => {
            addRecipeToDay(selectedDay, recipe, resultId);
          }}
        />
      )}

      {/* Master Shopping List Modal */}
      {masterShoppingList.length > 0 && (
        <ShoppingListModal
          isOpen={isShoppingListOpen}
          onClose={() => setIsShoppingListOpen(false)}
          ingredients={masterShoppingList}
          recipeName="Wocheneinkauf"
        />
      )}
    </div>
  );
}

// Rezept-Auswahl-Modal
function RecipeSelectionModal({
  isOpen,
  onClose,
  recipes,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  recipes: Array<{ recipe: Recipe; id: string; createdAt: Date }>;
  onSelect: (recipe: Recipe, resultId: string) => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Rezept auswählen</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {recipes.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">
              <p>Noch keine Rezepte gespeichert.</p>
              <p className="text-sm mt-2">Erstelle zuerst ein Rezept im Tab "Neues Rezept"!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recipes.map((result) => {
                const r = result.recipe;
                return (
                  <button
                    key={result.id}
                    onClick={() => {
                      onSelect(r, result.id);
                      onClose();
                    }}
                    className="p-4 rounded-lg border border-white/10 bg-zinc-800/50 hover:bg-zinc-800 hover:border-orange-500/30 text-left transition-colors"
                  >
                    <h3 className="text-sm font-medium text-white mb-1 line-clamp-2">
                      {r.recipeName}
                    </h3>
                    {r.stats?.time && (
                      <p className="text-xs text-zinc-400">⏱️ {r.stats.time}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
