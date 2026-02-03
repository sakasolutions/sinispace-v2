'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, X, ShoppingCart, Sparkles, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, RefreshCw, Lock, CheckCircle2, Info, ChevronDown, ChefHat, Trash2, Repeat } from 'lucide-react';
import { ShoppingListModal } from '@/components/ui/shopping-list-modal';
import { PremiumOnboardingModal } from './premium-onboarding-modal';
import { AlternativeRecipesModal } from './alternative-recipes-modal';
import { RecipeDetailView } from './recipe-detail-view';
import { 
  autoPlanWeek, 
  getWeeklyPlan, 
  saveDayFeedback, 
  saveWeeklyPlan,
  getAutoPlanTrialCount,
  getPremiumStatus,
  getMealPreferences
} from '@/actions/meal-planning-actions';
import { saveResult } from '@/actions/workspace-actions';
import { saveRecipeToCollection } from '@/actions/recipe-collection-actions';
import { useRouter } from 'next/navigation';

// Type Definitions
interface WeekPlanError {
  error: string;
  message?: string;
}

interface WeekPlanSuccess {
  success: boolean;
  plan: Record<string, {
    recipeId: string;
    resultId: string;
    feedback: 'positive' | 'negative' | null;
    recipe: any;
  }>;
}

type WeekPlanResult = WeekPlanError | WeekPlanSuccess;

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
  workspaceId?: string;
  isPremium?: boolean;
  onBackToCockpit?: () => void;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function WeekPlanner({ myRecipes, workspaceId, isPremium: initialIsPremium, onBackToCockpit }: WeekPlannerProps) {
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
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [skipNextLoad, setSkipNextLoad] = useState(false);
  const [planningProgress, setPlanningProgress] = useState<{ current: number; total: number } | null>(null);
  const [trialCount, setTrialCount] = useState({ count: 0, remaining: 0 });
  const [hasPreferences, setHasPreferences] = useState(false);
  const [alternativeModal, setAlternativeModal] = useState<{ day: string; dateKey: string; recipe: any } | null>(null);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<{ recipe: Recipe; resultId: string; dateKey: string; day: string } | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

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
  const loadPlan = useCallback(async () => {
    if (isAutoPlanning) {
      return;
    }

    setIsLoadingPlan(true);
    try {
      const savedPlan = await getWeeklyPlan(currentWeek);
      
      if (savedPlan && savedPlan.planData) {
        const transformedPlan: Record<string, { recipe: Recipe; resultId: string; feedback: 'positive' | 'negative' | null }> = {};
        const planData = savedPlan.planData as Record<string, { recipeId: string; resultId: string; feedback: 'positive' | 'negative' | null; recipe?: any }>;
        
        for (const [dateKey, planEntry] of Object.entries(planData)) {
          if (planEntry.recipe && typeof planEntry.recipe === 'object' && planEntry.recipe.recipeName) {
            transformedPlan[dateKey] = {
              recipe: planEntry.recipe as Recipe,
              resultId: planEntry.resultId,
              feedback: planEntry.feedback || null,
            };
          } else {
            const recipeResult = myRecipes.find(r => r.id === planEntry.resultId);
            if (recipeResult) {
              transformedPlan[dateKey] = {
                recipe: recipeResult.recipe,
                resultId: planEntry.resultId,
                feedback: planEntry.feedback || null,
              };
            }
          }
        }
        
        setWeekPlan(transformedPlan);
      } else {
        setWeekPlan({});
      }
    } catch (error) {
      console.error('[WEEK-PLANNER] ❌ Fehler beim Laden:', error);
    } finally {
      setIsLoadingPlan(false);
    }
  }, [currentWeek, myRecipes, isAutoPlanning]);

  useEffect(() => {
    if (skipNextLoad) {
      setSkipNextLoad(false);
      return;
    }
    if (!isAutoPlanning && !isLoadingPlan && Object.keys(weekPlan).length === 0) {
      loadPlan();
    }
  }, [currentWeek, myRecipes, isAutoPlanning, isLoadingPlan, skipNextLoad, loadPlan, weekPlan]);

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

    setIsOnboardingOpen(true);
  };

  // Wochenplan speichern
  const handleSavePlan = async () => {
    if (Object.keys(weekPlan).length === 0) {
      alert('Kein Wochenplan zum Speichern vorhanden');
      return;
    }

    setIsSavingPlan(true);
    try {
      const planDataForDB: Record<string, { recipeId: string; resultId: string; feedback: 'positive' | 'negative' | null; recipe?: any }> = {};
      
      Object.entries(weekPlan).forEach(([dateKey, planEntry]) => {
        planDataForDB[dateKey] = {
          recipeId: planEntry.resultId,
          resultId: planEntry.resultId,
          feedback: planEntry.feedback,
          recipe: planEntry.recipe,
        };
      });

      const result = await saveWeeklyPlan(currentWeek, planDataForDB, workspaceId);
      if (result.error) {
        alert(`Fehler beim Speichern: ${result.error}`);
      } else {
        alert('✅ Wochenplan erfolgreich gespeichert!');
        await loadPlan();
      }
    } catch (error) {
      console.error('[WEEK-PLANNER] ❌ Error saving plan:', error);
      alert('Fehler beim Speichern des Wochenplans');
    } finally {
      setIsSavingPlan(false);
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

    if (feedback === 'positive') {
      try {
        const result = await saveDayFeedback(currentWeek, dateKey, feedback);
        if (result.error) {
          setWeekPlan(prev => ({
            ...prev,
            [dateKey]: { ...prev[dateKey]!, feedback: null },
          }));
          alert('Fehler beim Speichern des Feedbacks');
        } else {
          await loadPlan();
        }
      } catch (error) {
        console.error('[WEEK-PLANNER] ❌ Error saving feedback:', error);
        setWeekPlan(prev => ({
          ...prev,
          [dateKey]: { ...prev[dateKey]!, feedback: null },
        }));
        alert('Fehler beim Speichern des Feedbacks');
      }
    } else {
      setWeekPlan(prev => ({
        ...prev,
        [dateKey]: { ...prev[dateKey]!, feedback: null },
      }));
      
      const day = weekDays.find(d => d.dateKey === dateKey);
      if (day && day.recipe) {
        setAlternativeModal({
          day: day.dayName,
          dateKey: dateKey,
          recipe: day.recipe.recipe,
        });
      }
    }
  };

  // Master Einkaufsliste
  const masterShoppingList = useMemo(() => {
    const allIngredients: Record<string, { amount: number; unit: string }> = {};
    
    weekDays.forEach(day => {
      if (day.recipe) {
        const ingredientsToUse = day.recipe.recipe.shoppingList && day.recipe.recipe.shoppingList.length > 0
          ? day.recipe.recipe.shoppingList
          : day.recipe.recipe.ingredients;
        
        ingredientsToUse.forEach(ingredient => {
          const match = ingredient.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|Stk|Stück|EL|TL|Glas|Bund|Packung)?\s*(.*)$/i);
          if (match) {
            const amount = parseFloat(match[1].replace(',', '.'));
            let unit = match[2] || '';
            const name = match[3].trim() || ingredient;
            
            if (unit) {
              unit = unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase();
            }
            
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  const canAutoPlan = isPremium || trialCount.remaining > 0;

  // Rezept-Detail View
  if (selectedRecipeDetail) {
    return (
      <RecipeDetailView
        recipe={selectedRecipeDetail.recipe}
        resultId={selectedRecipeDetail.resultId}
        createdAt={new Date()}
        onBack={() => setSelectedRecipeDetail(null)}
        fromWeekPlan={true}
        onSaveToCollection={async () => {
          const result = await saveRecipeToCollection(selectedRecipeDetail.resultId);
          if (result.error) {
            alert(`Fehler: ${result.error}`);
          } else {
            alert('✅ Rezept wurde in "Meine Rezepte" gespeichert!');
            setSelectedRecipeDetail(null);
          }
        }}
      />
    );
  }

  const kw = getWeekNumber(weekDays[0].date);
  const formatDayHeader = (date: Date) =>
    date.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const plannedCount = weekDays.filter((d) => d.recipe).length;
  const dateRangeStr = `${weekDays[0].date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} – ${weekDays[6].date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

  return (
    <div className="pb-28">
      {/* Navigation: Glass-Button Cockpit + Info */}
      <div className="flex items-center justify-between mb-6">
        {onBackToCockpit ? (
          <button
            type="button"
            onClick={onBackToCockpit}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium bg-white/80 backdrop-blur-md shadow-sm border border-gray-100 text-gray-700 hover:bg-white transition-colors"
            aria-label="Zurück zum Cockpit"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            Cockpit
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => setShowInfoModal(true)}
          className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Info"
        >
          <Info className="w-5 h-5" />
        </button>
      </div>

      {/* Stage: Titel + Subtitle + Fortschritt + Woche-Navigation (größerer Bereich) */}
      <div className="mb-10 pt-2 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Dein Wochenplan
            </h1>
            <p className="text-base text-gray-500 mt-2">
              KW {kw} • {dateRangeStr}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 text-sm font-semibold bg-white/90 border border-gray-100 shadow-sm ring-2 ring-violet-200/80">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-xs font-bold">
                {plannedCount}
              </span>
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">/7 geplant</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => navigateWeek('prev')}
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Vorherige Woche"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => navigateWeek('next')}
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                aria-label="Nächste Woche"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Trial Info */}
      {!isPremium && trialCount.remaining > 0 && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 mb-6">
          🎁 Du hast noch {trialCount.remaining} kostenlose Auto-Planung{trialCount.remaining > 1 ? 'en' : ''}.
          <button onClick={() => router.push('/settings')} className="ml-2 font-medium underline hover:text-violet-900">
            Upgrade für unbegrenzt
          </button>
        </div>
      )}

      {/* Vertical Stack: 7 Tage als Accordion-Karten */}
      <div className="space-y-3">
        {weekDays.map((day) => {
          const dateKey = day.dateKey;
          const isOpen = openDay === dateKey;
          return (
            <div
              key={dateKey}
              className="rounded-3xl bg-white border border-gray-100 shadow-[0_4px_24px_rgba(0,0,0,0.06)] overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenDay(isOpen ? null : dateKey)}
                className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-gray-50/80 transition-colors"
              >
                <span className="font-semibold text-gray-900">
                  {formatDayHeader(day.date)}
                </span>
                <span className="flex items-center gap-2 min-w-0">
                  {day.recipe ? (
                    <span className="text-sm text-gray-600 truncate">
                      {day.recipe.recipe.recipeName}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">Leer</span>
                  )}
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-0 border-t border-gray-100">
                  {day.recipe ? (
                    <div className="pt-4 space-y-4">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedRecipeDetail({
                            recipe: day.recipe!.recipe,
                            resultId: day.recipe!.resultId,
                            dateKey: day.dateKey,
                            day: day.dayName,
                          })
                        }
                        className="w-full rounded-2xl overflow-hidden bg-gradient-to-br from-orange-50 to-rose-50 border border-orange-100 text-left"
                      >
                        <div className="aspect-[16/10] flex items-center justify-center">
                          <ChefHat className="w-14 h-14 text-orange-300" />
                        </div>
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 line-clamp-2">
                            {day.recipe.recipe.recipeName}
                          </h3>
                          {day.recipe.recipe.stats?.calories && (
                            <p className="text-sm text-gray-600 mt-1">
                              {day.recipe.recipe.stats.calories} kcal
                            </p>
                          )}
                        </div>
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => removeRecipeFromDay(dateKey)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-sm font-medium transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Löschen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const currentRecipe = day.recipe!.recipe;
                            setAlternativeModal({
                              day: day.dayName,
                              dateKey: dateKey,
                              recipe: currentRecipe,
                            });
                            setOpenDay(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-violet-50 hover:border-violet-200 hover:text-violet-700 text-sm font-medium transition-colors"
                        >
                          <Repeat className="w-4 h-4" />
                          Austauschen
                        </button>
                      </div>
                      {isPremium && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleFeedback(dateKey, 'positive')}
                            className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                              day.recipe.feedback === 'positive'
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5 inline mr-1" />
                            Passt
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAlternativeModal({
                                day: day.dayName,
                                dateKey: dateKey,
                                recipe: day.recipe!.recipe,
                              });
                              setOpenDay(null);
                            }}
                            className="flex-1 px-3 py-2 rounded-xl text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          >
                            <ThumbsDown className="w-3.5 h-3.5 inline mr-1" />
                            Alternative
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDay(dateKey);
                          setOpenDay(null);
                        }}
                        className="w-full min-h-[120px] flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 hover:border-violet-300 hover:bg-violet-50/50 text-gray-500 hover:text-violet-600 transition-colors py-6"
                      >
                        <Plus className="w-8 h-8" />
                        <span className="text-sm font-medium">Rezept hinzufügen</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Master Einkaufsliste (inline, nicht sticky) */}
      {masterShoppingList.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setIsShoppingListOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-800 font-medium transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            Wocheneinkauf erstellen ({masterShoppingList.length} Zutaten)
          </button>
        </div>
      )}

      {/* Sticky Footer: Woche auto-planen + Plan speichern */}
      <div className="fixed bottom-0 left-0 right-0 z-30 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-sm border-t border-gray-100">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            type="button"
            onClick={handleAutoPlan}
            disabled={isAutoPlanning}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-white font-semibold transition-all shadow-lg ${
              isAutoPlanning
                ? 'bg-gray-300 cursor-not-allowed'
                : canAutoPlan || !hasPreferences
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-700 hover:to-fuchsia-600 shadow-violet-500/25'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {isAutoPlanning ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                {planningProgress ? (
                  <span>Generiere… {planningProgress.current}/{planningProgress.total}</span>
                ) : (
                  <span>Plane Woche…</span>
                )}
              </>
            ) : !canAutoPlan ? (
              <>
                <Lock className="w-5 h-5" />
                Premium
              </>
            ) : !hasPreferences ? (
              <>
                <Sparkles className="w-5 h-5" />
                Präferenzen
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Woche auto-planen
                {!isPremium && trialCount.remaining > 0 && (
                  <span className="text-white/90 text-sm">({trialCount.remaining})</span>
                )}
              </>
            )}
          </button>
          {Object.keys(weekPlan).length > 0 && (
            <button
              type="button"
              onClick={handleSavePlan}
              disabled={isSavingPlan}
              className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-semibold transition-colors shrink-0"
            >
              {isSavingPlan ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Speichern
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Info-Modal */}
      {showInfoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-sm p-5 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-gray-700 font-medium">
              Plane hier deine Mahlzeiten für die Woche. Die KI hilft dir dabei!
            </p>
            <button
              type="button"
              onClick={() => setShowInfoModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
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

      {masterShoppingList.length > 0 && (
        <ShoppingListModal
          isOpen={isShoppingListOpen}
          onClose={() => setIsShoppingListOpen(false)}
          ingredients={masterShoppingList}
          recipeName="Wocheneinkauf"
        />
      )}

      <PremiumOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onComplete={async () => {
          const prefs = await getMealPreferences();
          setHasPreferences(!!prefs);
          setIsOnboardingOpen(false);
          
          setIsAutoPlanning(true);
          setPlanningProgress({ current: 0, total: 7 });
          try {
            const progressInterval = setInterval(() => {
              setPlanningProgress(prev => prev ? { ...prev, current: Math.min(prev.current + 1, prev.total) } : null);
            }, 2000);
            
            const result = await autoPlanWeek(currentWeek, workspaceId);
            clearInterval(progressInterval);
            setPlanningProgress(null);
            
            if ('error' in result) {
              if (result.error === 'PREMIUM_REQUIRED') {
                router.push('/settings');
              } else {
                alert(`Fehler: ${result.error}`);
              }
            } else if ('plan' in result && result.plan) {
              const transformedPlan: Record<string, { recipe: Recipe; resultId: string; feedback: 'positive' | 'negative' | null }> = {};
              
              Object.entries(result.plan).forEach(([dateKey, planEntry]) => {
                if ('recipe' in planEntry && planEntry.recipe) {
                  transformedPlan[dateKey] = {
                    recipe: planEntry.recipe as Recipe,
                    resultId: planEntry.resultId,
                    feedback: planEntry.feedback || null,
                  };
                } else {
                  const recipeResult = myRecipes.find(r => r.id === planEntry.resultId);
                  if (recipeResult) {
                    transformedPlan[dateKey] = {
                      recipe: recipeResult.recipe,
                      resultId: planEntry.resultId,
                      feedback: planEntry.feedback || null,
                    };
                  }
                }
              });
              
              setSkipNextLoad(true);
              setWeekPlan(transformedPlan);
              
              if (!isPremium) {
                const trial = await getAutoPlanTrialCount();
                setTrialCount(trial);
              }
              
              setTimeout(() => {
                setSkipNextLoad(false);
              }, 3000);
            }
          } catch (error) {
            console.error('[WEEK-PLANNER] ❌ Error:', error);
            alert('Fehler bei der automatischen Planung');
          } finally {
            setIsAutoPlanning(false);
          }
        }}
      />

      {alternativeModal && (
        <AlternativeRecipesModal
          isOpen={!!alternativeModal}
          onClose={() => setAlternativeModal(null)}
          onSelect={async (recipe, resultId) => {
            if (!resultId) {
              const saved = await saveResult(
                'recipe',
                'Gourmet-Planer',
                JSON.stringify(recipe),
                workspaceId,
                recipe.recipeName,
                JSON.stringify({ source: 'week-planning-alternative', day: alternativeModal.day })
              );
              if (saved.success && saved.result) {
                resultId = saved.result.id;
              } else {
                alert('Fehler beim Speichern des Rezepts.');
                return;
              }
            }

            setWeekPlan(prev => ({
              ...prev,
              [alternativeModal.dateKey]: {
                recipe,
                resultId,
                feedback: null,
              },
            }));

            setAlternativeModal(null);
          }}
          currentRecipe={alternativeModal.recipe}
          day={alternativeModal.day}
          workspaceId={workspaceId}
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
