'use client';

import { useState, useMemo, useEffect } from 'react';
import { Plus, X, ShoppingCart, Sparkles, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, RefreshCw, Lock, ArrowRight } from 'lucide-react';
import { ShoppingListModal } from '@/components/ui/shopping-list-modal';
import { PremiumOnboardingModal } from './premium-onboarding-modal';
import { 
  autoPlanWeek, 
  getWeeklyPlan, 
  saveDayFeedback, 
  getAutoPlanTrialCount,
  getPremiumStatus,
  getMealPreferences
} from '@/actions/meal-planning-actions';
import { useRouter } from 'next/navigation';

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
  dateKey: string;
  recipe: { recipe: Recipe; resultId: string; feedback: 'positive' | 'negative' | null } | null;
};

interface WeekPlannerProps {
  myRecipes: Array<{ recipe: Recipe; id: string; createdAt: Date }>;
  workspaceId: string;
  isPremium?: boolean;
}

export function WeekPlanner({ myRecipes, workspaceId, isPremium: initialIsPremium }: WeekPlannerProps) {
  const router = useRouter();
  const [currentWeek, setCurrentWeek] = useState(() => {
    const date = new Date();
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date);
    monday.setDate(diff);
    return monday;
  });
  
  const [weekPlan, setWeekPlan] = useState<Record<string, { recipe: Recipe; resultId: string; feedback: 'positive' | 'negative' | null }>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(initialIsPremium || false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAutoPlanning, setIsAutoPlanning] = useState(false);
  const [trialCount, setTrialCount] = useState({ count: 0, remaining: 0 });
  const [hasPreferences, setHasPreferences] = useState(false);

  // Lade Premium-Status und Trial-Count
  useEffect(() => {
    async function loadData() {
      const premium = await getPremiumStatus();
      setIsPremium(premium);
      
      if (!premium) {
        const trial = await getAutoPlanTrialCount();
        setTrialCount(trial);
      }
      
      const prefs = await getMealPreferences();
      setHasPreferences(!!prefs);
    }
    loadData();
  }, []);

  // Lade gespeicherten Wochenplan
  useEffect(() => {
    async function loadPlan() {
      const savedPlan = await getWeeklyPlan(currentWeek);
      if (savedPlan && savedPlan.planData) {
        // Transformiere Plan-Format: Finde Rezepte aus myRecipes basierend auf resultId
        const transformedPlan: Record<string, { recipe: Recipe; resultId: string; feedback: 'positive' | 'negative' | null }> = {};
        
        type PlanEntry = { recipeId: string; resultId: string; feedback: 'positive' | 'negative' | null };
        const planData = savedPlan.planData as Record<string, PlanEntry>;
        
        Object.entries(planData).forEach(([dateKey, planEntry]) => {
          const recipeResult = myRecipes.find(r => r.id === planEntry.resultId);
          if (recipeResult) {
            transformedPlan[dateKey] = {
              recipe: recipeResult.recipe,
              resultId: planEntry.resultId,
              feedback: planEntry.feedback || null,
            };
          }
        });
        
        setWeekPlan(transformedPlan);
      }
    }
    loadPlan();
  }, [currentWeek, myRecipes]);

  // Berechne Wochentage
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentWeek);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);

    const days: WeekDay[] = [];
    const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      const planEntry = weekPlan[dateKey];
      
      days.push({
        date,
        dayName: dayNames[i],
        dateKey,
        recipe: planEntry ? {
          recipe: planEntry.recipe,
          resultId: planEntry.resultId,
          feedback: planEntry.feedback || null,
        } : null,
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
      [dateKey]: { recipe, resultId, feedback: null },
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

  // Auto-Planning
  const handleAutoPlan = async () => {
    if (!isPremium && trialCount.remaining === 0) {
      router.push('/settings');
      return;
    }

    if (!hasPreferences) {
      setIsOnboardingOpen(true);
      return;
    }

    setIsAutoPlanning(true);
    try {
      const result = await autoPlanWeek(currentWeek, workspaceId);
      if (result.error === 'PREMIUM_REQUIRED') {
        router.push('/settings');
      } else if (result.error) {
        console.error('[WEEK-PLANNER] ❌ Auto-Planning Fehler:', result.error);
        alert(`Fehler: ${result.error}`);
      } else if (result.plan) {
        // Transformiere Plan-Format: Finde Rezepte aus myRecipes basierend auf resultId
        const transformedPlan: Record<string, { recipe: Recipe; resultId: string; feedback: 'positive' | 'negative' | null }> = {};
        
        Object.entries(result.plan).forEach(([dateKey, planEntry]) => {
          const recipeResult = myRecipes.find(r => r.id === planEntry.resultId);
          if (recipeResult) {
            transformedPlan[dateKey] = {
              recipe: recipeResult.recipe,
              resultId: planEntry.resultId,
              feedback: planEntry.feedback || null,
            };
          }
        });
        
        setWeekPlan(transformedPlan);
        // Reload trial count
        if (!isPremium) {
          const trial = await getAutoPlanTrialCount();
          setTrialCount(trial);
        }
      }
    } catch (error) {
      console.error('Error auto-planning:', error);
      alert('Fehler bei der automatischen Planung');
    } finally {
      setIsAutoPlanning(false);
    }
  };

  // Feedback speichern
  const handleFeedback = async (dateKey: string, feedback: 'positive' | 'negative') => {
    const current = weekPlan[dateKey];
    if (!current) return;

    setWeekPlan(prev => ({
      ...prev,
      [dateKey]: { ...prev[dateKey]!, feedback },
    }));

    try {
      await saveDayFeedback(currentWeek, dateKey, feedback);
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  // Master Einkaufsliste: Konsolidiere alle Zutaten der Woche
  const masterShoppingList = useMemo(() => {
    const allIngredients: Record<string, { amount: number; unit: string }> = {};
    
    weekDays.forEach(day => {
      if (day.recipe) {
        const ingredientsToUse = day.recipe.recipe.shoppingList && day.recipe.recipe.shoppingList.length > 0
          ? day.recipe.recipe.shoppingList
          : day.recipe.recipe.ingredients;
        
        ingredientsToUse.forEach(ingredient => {
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

    return Object.entries(allIngredients).map(([key, data]) => {
      const name = key.replace(/(g|kg|ml|l|stk|stück|el|tl)$/i, '').trim();
      const unit = data.unit;
      
      if (unit === 'g' && data.amount >= 1000) {
        return `${(data.amount / 1000).toFixed(1)}kg ${name}`;
      }
      
      const rounded = data.amount < 1 ? data.amount.toFixed(2) : Math.round(data.amount * 10) / 10;
      return `${rounded}${unit ? ' ' + unit : ''} ${name}`;
    });
  }, [weekDays]);

  // Format Datum
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const canAutoPlan = isPremium || trialCount.remaining > 0;

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
          onClick={handleAutoPlan}
          disabled={isAutoPlanning || (!canAutoPlan && !hasPreferences)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium transition-colors ${
            canAutoPlan
              ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700'
              : 'bg-zinc-700 opacity-50 cursor-not-allowed'
          }`}
        >
          {isAutoPlanning ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Plane Woche...
            </>
          ) : !canAutoPlan ? (
            <>
              <Lock className="w-5 h-5" />
              Premium erforderlich
            </>
          ) : !hasPreferences ? (
            <>
              <Sparkles className="w-5 h-5" />
              Präferenzen einrichten
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Woche auto-planen {!isPremium && trialCount.remaining > 0 && `(${trialCount.remaining} übrig)`}
            </>
          )}
        </button>
      </div>

      {/* Trial Info */}
      {!isPremium && trialCount.remaining > 0 && (
        <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-3 text-sm text-violet-300">
          🎁 Du hast noch {trialCount.remaining} kostenlose Auto-Planung{trialCount.remaining > 1 ? 'en' : ''}. 
          <button onClick={() => router.push('/settings')} className="ml-2 underline hover:text-violet-200">
            Upgrade für unbegrenzt
          </button>
        </div>
      )}

      {/* 7-Tage Kalender-Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          return (
            <div
              key={day.dateKey}
              className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 min-h-[200px]"
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{day.dayName}</h3>
                  <p className="text-xs text-zinc-500">{formatDate(day.date)}</p>
                </div>
                {day.recipe && (
                  <button
                    onClick={() => removeRecipeFromDay(day.dateKey)}
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
                  
                  {/* Feedback Buttons (Premium) */}
                  {isPremium && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFeedback(day.dateKey, 'positive')}
                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          day.recipe.feedback === 'positive'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                        title="Gefällt mir"
                      >
                        <ThumbsUp className="w-3 h-3 inline mr-1" />
                        👍
                      </button>
                      <button
                        onClick={() => handleFeedback(day.dateKey, 'negative')}
                        className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          day.recipe.feedback === 'negative'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                        title="Gefällt mir nicht"
                      >
                        <ThumbsDown className="w-3 h-3 inline mr-1" />
                        👎
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setSelectedDay(day.dateKey)}
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

      {/* Premium Onboarding Modal */}
      <PremiumOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={() => {
          setHasPreferences(true);
          handleAutoPlan();
        }}
      />
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
