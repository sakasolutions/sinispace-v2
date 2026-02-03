'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, ShoppingCart, Sparkles, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, RefreshCw, Lock, CheckCircle2, Info, ChevronDown, ChefHat, Trash2, Repeat, Search, CalendarCheck } from 'lucide-react';
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
import { saveWeeklyPlan as syncWeekPlanToCalendar } from '@/actions/calendar-actions';
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
  onRequestNewRecipe?: () => void;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function WeekPlanner({ myRecipes, workspaceId, isPremium: initialIsPremium, onBackToCockpit, onRequestNewRecipe }: WeekPlannerProps) {
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
  const [isSyncingToCalendar, setIsSyncingToCalendar] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);
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

  // In Kalender übernehmen (Sync)
  const handleSyncToCalendar = async () => {
    const entries = Object.entries(weekPlan).filter(([, v]) => v?.recipe);
    if (entries.length === 0) return;

    setIsSyncingToCalendar(true);
    try {
      const planData = entries.map(([dateKey, entry]) => ({
        date: dateKey,
        resultId: entry.resultId,
        title: entry.recipe.recipeName,
        mealType: 'dinner' as const,
      }));
      const result = await syncWeekPlanToCalendar(planData);
      if (result && 'error' in result && result.error) {
        alert(`Sync fehlgeschlagen: ${result.error}`);
        return;
      }
      const confetti = (await import('canvas-confetti')).default;
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 55, origin: { x: 0 } }), 200);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1 } }), 400);
      setSyncToast('Wochenplan ist im Kalender! 🎉');
      setTimeout(() => {
        setSyncToast(null);
        router.push('/calendar');
      }, 2500);
    } catch (error) {
      console.error('[WEEK-PLANNER] Sync to calendar:', error);
      alert('Fehler beim Übernehmen in den Kalender');
    } finally {
      setIsSyncingToCalendar(false);
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
  const formatWeekdaySlot = (date: Date) =>
    date.toLocaleDateString('de-DE', { weekday: 'short' }).slice(0, 2).toUpperCase();
  const formatDateSmall = (date: Date) =>
    date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  const plannedCount = weekDays.filter((d) => d.recipe).length;
  const dateRangeStr = `${weekDays[0].date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} – ${weekDays[6].date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

  return (
    <div className="pb-40">
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

      {/* Vertical Stack: 7 Tage als Slots mit Stagger-Animation */}
      <motion.div
        className="space-y-3"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
      >
        {weekDays.map((day, index) => {
          const dateKey = day.dateKey;
          const isOpen = openDay === dateKey;
          return (
            <motion.div
              key={dateKey}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
              className="rounded-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() =>
                  day.recipe
                    ? setOpenDay(isOpen ? null : dateKey)
                    : (setSelectedDay(dateKey), setOpenDay(null))
                }
                className="w-full flex items-stretch gap-3 text-left rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
              >
                {/* Datums-Spalte: Wochentag + Datum */}
                <div className="flex flex-col justify-center shrink-0 w-14 sm:w-16 py-3 pl-3">
                  <span className="text-gray-800 font-black text-xl leading-tight uppercase tracking-tight">
                    {formatWeekdaySlot(day.date)}
                  </span>
                  <span className="text-gray-400 text-xs font-medium mt-0.5">
                    {formatDateSmall(day.date)}
                  </span>
                </div>

                {/* Slot-Bereich: Empty oder Filled */}
                <div className="flex-1 min-w-0 flex items-center">
                  {day.recipe ? (
                    /* Filled State: satt wirkende Vorschau */
                    <div className="w-full h-24 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden flex items-center gap-3 pr-3">
                      <div className="h-full w-24 shrink-0 bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center">
                        <ChefHat className="w-10 h-10 text-orange-400" />
                      </div>
                      <div className="min-w-0 flex-1 py-2">
                        <p className="font-bold text-gray-900 truncate line-clamp-2 text-sm sm:text-base">
                          {day.recipe.recipe.recipeName}
                        </p>
                        {day.recipe.recipe.stats?.calories && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {day.recipe.recipe.stats.calories} kcal
                          </p>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  ) : (
                    /* Empty State: Setzkasten-Slot */
                    <div className="group w-full h-24 rounded-2xl bg-gray-50/80 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 hover:scale-[1.01] transition-all duration-200">
                      <Plus className="w-8 h-8 text-gray-300 group-hover:text-violet-500 transition-colors" />
                      <span className="text-xs font-medium text-gray-400 group-hover:text-violet-600 transition-colors">
                        Planen
                      </span>
                    </div>
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-3 pb-4 pt-2 border-t border-gray-100 mt-2">
                  {day.recipe ? (
                    <div className="space-y-4">
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
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDay(dateKey);
                          setOpenDay(null);
                        }}
                        className="group w-full h-24 flex flex-col items-center justify-center gap-1 rounded-2xl bg-gray-50/80 border-2 border-dashed border-gray-200 hover:border-violet-400 hover:bg-violet-50/50 hover:scale-[1.01] transition-all duration-200 cursor-pointer"
                      >
                        <Plus className="w-8 h-8 text-gray-300 group-hover:text-violet-500 transition-colors" />
                        <span className="text-sm font-medium text-gray-500 group-hover:text-violet-600 transition-colors">
                          Rezept hinzufügen
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

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

      {/* Toast: Sync-Erfolg */}
      {syncToast && (
        <div className="fixed top-4 left-4 right-4 z-[60] flex justify-center pointer-events-none">
          <div className="rounded-xl bg-gray-900 text-white px-5 py-3 shadow-lg font-medium animate-in fade-in slide-in-from-top-2 duration-300">
            {syncToast}
          </div>
        </div>
      )}

      {/* Sticky Footer: über Navbar schwebend (bottom-nav ~80px), mit Schatten */}
      <div className="fixed bottom-[90px] left-0 right-0 z-50 p-4 pb-0 bg-transparent pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto flex flex-wrap gap-3 rounded-2xl bg-white/95 backdrop-blur-md border border-gray-100 shadow-lg p-4">
          <button
            type="button"
            onClick={handleAutoPlan}
            disabled={isAutoPlanning}
            className={`flex-1 min-w-0 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-white font-semibold transition-all shadow-lg ${
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
            <>
              <button
                type="button"
                onClick={handleSyncToCalendar}
                disabled={isSyncingToCalendar}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold shadow-lg shadow-orange-500/25 transition-all shrink-0"
              >
                {isSyncingToCalendar ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CalendarCheck className="w-5 h-5" />
                    In Kalender übernehmen
                  </>
                )}
              </button>
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
            </>
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
            setSelectedDay(null);
          }}
          onRequestNewRecipe={onRequestNewRecipe}
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

// Rezept-Auswahl-Modal: helles Bottom Sheet (Mobile) / zentriertes Modal (Desktop)
function RecipeSelectionModal({
  isOpen,
  onClose,
  recipes,
  onSelect,
  onRequestNewRecipe,
}: {
  isOpen: boolean;
  onClose: () => void;
  recipes: Array<{ recipe: Recipe; id: string; createdAt: Date }>;
  onSelect: (recipe: Recipe, resultId: string) => void;
  onRequestNewRecipe?: () => void;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'meine' | 'favoriten' | 'verlauf'>('meine');

  const filtered = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase().trim();
    return recipes.filter(
      (r) =>
        r.recipe.recipeName?.toLowerCase().includes(q) ||
        r.recipe.ingredients?.some((i) => i.toLowerCase().includes(q))
    );
  }, [recipes, search]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header + Suche */}
        <div className="shrink-0 p-4 border-b border-gray-100">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Rezept auswählen</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suche nach Lasagne..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 text-gray-900 placeholder:text-gray-400 transition-colors"
            />
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-3 p-1 rounded-lg bg-gray-100">
            {(
              [
                { id: 'meine' as const, label: 'Meine Rezepte' },
                { id: 'favoriten' as const, label: 'Favoriten' },
                { id: 'verlauf' as const, label: 'Verlauf' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4">
          {tab === 'meine' && (
            <>
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-gray-500 font-medium">
                    {recipes.length === 0 ? 'Noch keine Rezepte gespeichert.' : 'Keine Treffer für deine Suche.'}
                  </p>
                  {onRequestNewRecipe && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onRequestNewRecipe();
                      }}
                      className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white font-semibold shadow-lg shadow-violet-500/25 hover:from-violet-700 hover:to-fuchsia-600 transition-all"
                    >
                      <Sparkles className="w-5 h-5" />
                      Neues Rezept generieren
                    </button>
                  )}
                  {!onRequestNewRecipe && recipes.length === 0 && (
                    <p className="text-sm text-gray-400 mt-2">Erstelle zuerst ein Rezept im Tab &quot;Neues Rezept&quot;.</p>
                  )}
                </div>
              ) : (
                <ul className="space-y-2">
                  {filtered.map((result) => {
                    const r = result.recipe;
                    return (
                      <li key={result.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(r, result.id)}
                          className="w-full flex items-center gap-4 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-violet-50/50 hover:border-violet-200 transition-all text-left group"
                        >
                          <div className="w-16 h-16 shrink-0 rounded-xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center overflow-hidden">
                            <ChefHat className="w-8 h-8 text-orange-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 line-clamp-2">{r.recipeName}</p>
                            {r.stats?.time && (
                              <p className="text-sm text-gray-500 mt-0.5">⏱ {r.stats.time}</p>
                            )}
                          </div>
                          <div className="shrink-0 w-10 h-10 rounded-full bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center text-violet-600 transition-colors">
                            <Plus className="w-5 h-5" />
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
          {tab === 'favoriten' && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <p className="font-medium">Favoriten kommen bald.</p>
              <p className="text-sm mt-1">Nutze in der Zwischenzeit &quot;Meine Rezepte&quot;.</p>
            </div>
          )}
          {tab === 'verlauf' && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <p className="font-medium">Verlauf kommt bald.</p>
              <p className="text-sm mt-1">Nutze in der Zwischenzeit &quot;Meine Rezepte&quot;.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
