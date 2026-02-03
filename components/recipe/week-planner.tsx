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

type SlotEntry = { recipe: Recipe; resultId: string; feedback: 'positive' | 'negative' | null };
type DayMeals = { breakfast?: SlotEntry; lunch?: SlotEntry; dinner?: SlotEntry };

type WeekDay = {
  date: Date;
  dayName: string;
  dateKey: string;
  meals: DayMeals;
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
  
  const [weekPlan, setWeekPlan] = useState<Record<string, DayMeals>>({});
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<'breakfast' | 'lunch' | 'dinner' | null>(null);
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(initialIsPremium || false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isAutoPlanning, setIsAutoPlanning] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [skipNextLoad, setSkipNextLoad] = useState(false);
  const [planningProgress, setPlanningProgress] = useState<{ current: number; total: number } | null>(null);
  const [trialCount, setTrialCount] = useState({ count: 0, remaining: 0 });
  const [hasPreferences, setHasPreferences] = useState(false);
  const [alternativeModal, setAlternativeModal] = useState<{ day: string; dateKey: string; slot: 'breakfast' | 'lunch' | 'dinner'; recipe: any } | null>(null);
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

  // Lade gespeicherten Wochenplan (Multi-Meal: planData[dateKey] = { breakfast?, lunch?, dinner?, snack? })
  const loadPlan = useCallback(async () => {
    if (isAutoPlanning) {
      return;
    }

    setIsLoadingPlan(true);
    try {
      const savedPlan = await getWeeklyPlan(currentWeek);

      if (savedPlan && savedPlan.planData) {
        const planData = savedPlan.planData as Record<string, { breakfast?: { recipe?: any; resultId: string; feedback?: string | null }; lunch?: { recipe?: any; resultId: string; feedback?: string | null }; dinner?: { recipe?: any; resultId: string; feedback?: string | null }; snack?: { recipe?: any; resultId: string; feedback?: string | null } }>;
        const transformedPlan: Record<string, DayMeals> = {};

        const resolveSlot = (slot: { recipe?: any; resultId: string; feedback?: string | null }): SlotEntry | undefined => {
          if (!slot?.resultId) return undefined;
          const feedback = (slot.feedback === 'positive' || slot.feedback === 'negative' ? slot.feedback : null) as 'positive' | 'negative' | null;
          if (slot.recipe && typeof slot.recipe === 'object' && slot.recipe.recipeName) {
            return { recipe: slot.recipe as Recipe, resultId: slot.resultId, feedback };
          }
          const recipeResult = myRecipes.find((r) => r.id === slot.resultId);
          if (recipeResult) return { recipe: recipeResult.recipe, resultId: slot.resultId, feedback };
          return undefined;
        };

        for (const [dateKey, dayMeals] of Object.entries(planData)) {
          const out: DayMeals = {};
          if (dayMeals?.breakfast) { const e = resolveSlot(dayMeals.breakfast); if (e) out.breakfast = e; }
          if (dayMeals?.lunch) { const e = resolveSlot(dayMeals.lunch); if (e) out.lunch = e; }
          if (dayMeals?.dinner) { const e = resolveSlot(dayMeals.dinner); if (e) out.dinner = e; }
          if (Object.keys(out).length) transformedPlan[dateKey] = out;
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

  // Berechne Wochentage (Multi-Meal: day.meals = { breakfast?, lunch?, dinner? })
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
      days.push({
        date,
        dayName: dayNames[i],
        dateKey,
        meals: weekPlan[dateKey] ?? {},
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

  // Rezept zu Tag + Slot hinzufügen
  const addRecipeToDay = (dateKey: string, slot: 'breakfast' | 'lunch' | 'dinner', recipe: Recipe, resultId: string) => {
    setWeekPlan(prev => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] ?? {}), [slot]: { recipe, resultId, feedback: null } },
    }));
    setSelectedDay(null);
    setSelectedSlot(null);
  };

  // Rezept von Tag + Slot entfernen
  const removeRecipeFromDay = (dateKey: string, slot: 'breakfast' | 'lunch' | 'dinner') => {
    setWeekPlan(prev => {
      const day = prev[dateKey];
      if (!day) return prev;
      const next = { ...day };
      delete next[slot];
      if (Object.keys(next).length === 0) {
        const out = { ...prev };
        delete out[dateKey];
        return out;
      }
      return { ...prev, [dateKey]: next };
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

  // Wochenplan speichern (Multi-Meal: DayMeals pro Tag)
  const handleSavePlan = async () => {
    if (Object.keys(weekPlan).length === 0) {
      alert('Kein Wochenplan zum Speichern vorhanden');
      return;
    }

    setIsSavingPlan(true);
    try {
      const planDataForDB: Record<string, { breakfast?: { recipeId: string; resultId: string; feedback: 'positive' | 'negative' | null; recipe?: any }; lunch?: { recipeId: string; resultId: string; feedback: 'positive' | 'negative' | null; recipe?: any }; dinner?: { recipeId: string; resultId: string; feedback: 'positive' | 'negative' | null; recipe?: any } }> = {};

      Object.entries(weekPlan).forEach(([dateKey, dayMeals]) => {
        const out: Record<string, any> = {};
        (['breakfast', 'lunch', 'dinner'] as const).forEach((slot) => {
          const entry = dayMeals[slot];
          if (entry) out[slot] = { recipeId: entry.resultId, resultId: entry.resultId, feedback: entry.feedback, recipe: entry.recipe };
        });
        if (Object.keys(out).length) planDataForDB[dateKey] = out;
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

  // In Kalender übernehmen (Sync) – alle Slots (breakfast, lunch, dinner)
  const handleSyncToCalendar = async () => {
    const planData: { date: string; resultId: string; title: string; mealType: 'breakfast' | 'lunch' | 'dinner' }[] = [];
    Object.entries(weekPlan).forEach(([dateKey, dayMeals]) => {
      (['breakfast', 'lunch', 'dinner'] as const).forEach((slot) => {
        const entry = dayMeals[slot];
        if (entry?.recipe) planData.push({ date: dateKey, resultId: entry.resultId, title: entry.recipe.recipeName, mealType: slot });
      });
    });
    if (planData.length === 0) return;

    setIsSyncingToCalendar(true);
    try {
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

  // Feedback speichern (pro Slot)
  const handleFeedback = async (dateKey: string, slot: 'breakfast' | 'lunch' | 'dinner', feedback: 'positive' | 'negative') => {
    const current = weekPlan[dateKey]?.[slot];
    if (!current) return;

    setWeekPlan(prev => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] ?? {}), [slot]: { ...prev[dateKey]![slot]!, feedback } },
    }));

    if (feedback === 'positive') {
      try {
        const result = await saveDayFeedback(currentWeek, dateKey, feedback, slot);
        if (result.error) {
          setWeekPlan(prev => ({ ...prev, [dateKey]: { ...(prev[dateKey] ?? {}), [slot]: { ...prev[dateKey]![slot]!, feedback: null } } }));
          alert('Fehler beim Speichern des Feedbacks');
        } else {
          await loadPlan();
        }
      } catch (error) {
        console.error('[WEEK-PLANNER] ❌ Error saving feedback:', error);
        setWeekPlan(prev => ({ ...prev, [dateKey]: { ...(prev[dateKey] ?? {}), [slot]: { ...prev[dateKey]![slot]!, feedback: null } } }));
        alert('Fehler beim Speichern des Feedbacks');
      }
    } else {
      setWeekPlan(prev => ({ ...prev, [dateKey]: { ...(prev[dateKey] ?? {}), [slot]: { ...prev[dateKey]![slot]!, feedback: null } } }));
      const day = weekDays.find(d => d.dateKey === dateKey);
      const slotEntry = day?.meals?.[slot];
      if (slotEntry) {
        setAlternativeModal({
          day: day.dayName,
          dateKey: dateKey,
          slot,
          recipe: slotEntry.recipe,
        });
      }
    }
  };

  // Master Einkaufsliste (alle Slots: breakfast, lunch, dinner)
  const masterShoppingList = useMemo(() => {
    const allIngredients: Record<string, { amount: number; unit: string }> = {};

    weekDays.forEach(day => {
      (['breakfast', 'lunch', 'dinner'] as const).forEach(slot => {
        const entry = day.meals[slot];
        if (!entry) return;
        const ingredientsToUse = entry.recipe.shoppingList && entry.recipe.shoppingList.length > 0
          ? entry.recipe.shoppingList
          : entry.recipe.ingredients;

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
  const plannedCount = weekDays.reduce((n, d) => n + (d.meals.breakfast ? 1 : 0) + (d.meals.lunch ? 1 : 0) + (d.meals.dinner ? 1 : 0), 0);
  const totalSlots = 7 * 3; // 7 Tage × 3 Mahlzeiten
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
              <span className="bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">/{totalSlots} geplant</span>
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
          const hasBreakfast = !!day.meals.breakfast;
          const hasLunch = !!day.meals.lunch;
          const hasDinner = !!day.meals.dinner;
          const hasAnyMeal = hasBreakfast || hasLunch || hasDinner;
          const slotConfig: { id: 'breakfast' | 'lunch' | 'dinner'; label: string; icon: string; borderClass: string; bgClass: string }[] = [
            { id: 'breakfast', label: 'Frühstück', icon: '🥐', borderClass: 'border-l-yellow-400', bgClass: 'from-yellow-50 to-amber-50' },
            { id: 'lunch', label: 'Mittag', icon: '🥗', borderClass: 'border-l-emerald-400', bgClass: 'from-emerald-50 to-green-50' },
            { id: 'dinner', label: 'Abend', icon: '🍝', borderClass: 'border-l-orange-500', bgClass: 'from-orange-50 to-rose-50' },
          ];
          return (
            <motion.div
              key={dateKey}
              variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }
              transition={{ duration: 0.25, delay: index * 0.05 }}
              className="rounded-2xl overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpenDay(isOpen ? null : dateKey)}
                className="w-full flex items-stretch gap-3 text-left rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2"
              >
                <div className="flex flex-col justify-center shrink-0 w-14 sm:w-16 py-3 pl-3">
                  <span className="text-gray-800 font-black text-xl leading-tight uppercase tracking-tight">
                    {formatWeekdaySlot(day.date)}
                  </span>
                  <span className="text-gray-400 text-xs font-medium mt-0.5">
                    {formatDateSmall(day.date)}
                  </span>
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2 pr-3">
                  {slotConfig.map(({ id, icon }) => (day.meals[id] ? (
                    <span key={id} className="text-lg shrink-0" title={id === 'breakfast' ? 'Frühstück' : id === 'lunch' ? 'Mittag' : 'Abend'}>{icon}</span>
                  ) : null))}
                  {!hasAnyMeal && (
                    <span className="text-sm text-gray-400">Noch nichts geplant</span>
                  )}
                  <ChevronDown className={`w-5 h-5 text-gray-400 shrink-0 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isOpen && (
                <div className="px-3 pb-4 pt-2 border-t border-gray-100 mt-2 space-y-3">
                  {slotConfig.map(({ id, label, icon, borderClass, bgClass }) => {
                    const entry = day.meals[id];
                    return (
                      <div key={id}>
                        <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
                        {entry ? (
                          <div className={`rounded-xl border border-gray-100 shadow-sm overflow-hidden flex items-center gap-3 bg-gradient-to-r ${bgClass} border-l-4 ${borderClass} pl-3 pr-3 py-2`}>
                            <div className="w-12 h-12 shrink-0 rounded-lg bg-white/80 flex items-center justify-center">
                              <ChefHat className="w-6 h-6 text-gray-500" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 text-sm truncate">{entry.recipe.recipeName}</p>
                              {entry.recipe.stats?.time && (
                                <p className="text-xs text-gray-500">⏱ {entry.recipe.stats.time}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecipeDetail({
                                    recipe: entry.recipe,
                                    resultId: entry.resultId,
                                    dateKey: day.dateKey,
                                    day: day.dayName,
                                  });
                                }}
                                className="p-2 rounded-lg text-gray-500 hover:bg-white/80 transition-colors"
                                aria-label="Details"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRecipeFromDay(dateKey, id)}
                                className="p-2 rounded-lg text-gray-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                                aria-label="Löschen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSelectedDay(dateKey); setSelectedSlot(id); setOpenDay(null); }}
                            className={`group w-full h-16 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center gap-2 bg-gray-50/80 hover:bg-gray-100/80 transition-all border-l-4 ${borderClass} pl-3`}
                          >
                            <Plus className="w-5 h-5 text-gray-400 group-hover:text-violet-500 transition-colors" />
                            <span className="text-sm font-medium text-gray-500 group-hover:text-violet-600 transition-colors">Hinzufügen</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
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
          mealType={selectedSlot ?? 'dinner'}
          onClose={() => { setSelectedDay(null); setSelectedSlot(null); }}
          recipes={myRecipes}
          onSelect={(recipe, resultId) => {
            addRecipeToDay(selectedDay, selectedSlot ?? 'dinner', recipe, resultId);
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
              const plan = result.plan as Record<string, { breakfast?: { recipe?: any; resultId: string; feedback?: string | null }; lunch?: { recipe?: any; resultId: string; feedback?: string | null }; dinner?: { recipe?: any; resultId: string; feedback?: string | null }; snack?: { recipe?: any; resultId: string; feedback?: string | null } }>;
              const transformedPlan: Record<string, DayMeals> = {};

              for (const [dateKey, dayMeals] of Object.entries(plan)) {
                const out: DayMeals = {};
                (['breakfast', 'lunch', 'dinner'] as const).forEach((slotKey) => {
                  const slot = dayMeals?.[slotKey];
                  if (!slot?.resultId) return;
                  let entry: SlotEntry | undefined;
                  if (slot.recipe && typeof slot.recipe === 'object' && slot.recipe.recipeName) {
                    entry = { recipe: slot.recipe as Recipe, resultId: slot.resultId, feedback: (slot.feedback === 'positive' || slot.feedback === 'negative' ? slot.feedback : null) as 'positive' | 'negative' | null };
                  } else {
                    const recipeResult = myRecipes.find(r => r.id === slot.resultId);
                    if (recipeResult) entry = { recipe: recipeResult.recipe, resultId: slot.resultId, feedback: (slot.feedback === 'positive' || slot.feedback === 'negative' ? slot.feedback : null) as 'positive' | 'negative' | null };
                  }
                  if (entry) out[slotKey] = entry;
                });
                if (Object.keys(out).length) transformedPlan[dateKey] = out;
              }

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

            const slot = alternativeModal.slot;
            setWeekPlan(prev => ({
              ...prev,
              [alternativeModal.dateKey]: {
                ...(prev[alternativeModal.dateKey] ?? {}),
                [slot]: { recipe, resultId, feedback: null },
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
const mealTypeLabels: Record<'breakfast' | 'lunch' | 'dinner', string> = {
  breakfast: 'Frühstück',
  lunch: 'Mittag',
  dinner: 'Abend',
};

function RecipeSelectionModal({
  isOpen,
  mealType = 'dinner',
  onClose,
  recipes,
  onSelect,
  onRequestNewRecipe,
}: {
  isOpen: boolean;
  mealType?: 'breakfast' | 'lunch' | 'dinner';
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
            <h2 className="text-lg font-semibold text-gray-900">Rezept für {mealTypeLabels[mealType]} auswählen</h2>
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
