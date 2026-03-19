'use client';

import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Clock, Users, ChefHat, ShoppingCart, Minus, Plus, AlertCircle, RotateCcw, Play, CheckCircle2, Lightbulb, Flame, Share2, ShoppingBasket, UtensilsCrossed, CalendarDays, X } from 'lucide-react';
import { AddToShoppingListModal } from '@/components/recipe/add-to-shopping-list-modal';
import { scheduleSingleRecipe } from '@/actions/calendar-actions';
import { cn } from '@/lib/utils';
import { parseIngredient, formatIngredientDisplay } from '@/lib/format-ingredient';

export type RecipeDetailRecipe = {
  recipeName: string;
  stats: {
    time: string;
    calories: string | number;
    difficulty: string;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
  ingredients: string[];
  shoppingList: string[];
  instructions: string[];
  chefTip: string;
  imageUrl?: string | null;
  imageCredit?: string | null;
};

interface RecipeDetailViewProps {
  recipe: RecipeDetailRecipe;
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
  const [isAddToListOpen, setIsAddToListOpen] = useState(false);
  /** Welche Zutaten im „Einkaufen“-Modal angezeigt werden: alle (vom Einkaufen-Button) oder nur fehlende (vom Auf Einkaufsliste-Button). */
  const [addToListIngredients, setAddToListIngredients] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const [cookingMode, setCookingMode] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduleMealType, setScheduleMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('dinner');
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleScheduleRecipe = async () => {
    setIsScheduling(true);
    const res = await scheduleSingleRecipe(
      resultId,
      recipe.recipeName,
      scheduleDate,
      scheduleMealType
    );
    setIsScheduling(false);
    if (res?.success) {
      setIsCalendarModalOpen(false);
      setToast({ message: 'Rezept im Kalender geplant!' });
    } else {
      setToast({ message: res?.error ?? 'Konnte nicht gespeichert werden.' });
    }
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

  // Kalorien pro Portion anpassen (unterstützt Zahl oder String wie "450 kcal")
  const adjustedCalories = useMemo(() => {
    if (recipe.stats?.calories == null) return null;
    const raw = recipe.stats.calories;
    let originalCalories: number;
    if (typeof raw === 'number') {
      originalCalories = raw;
    } else {
      const match = String(raw).match(/(\d+)/);
      if (!match) return raw as string;
      originalCalories = parseInt(match[1], 10);
    }
    const ratio = servings / originalServings;
    const newCalories = Math.round(originalCalories * ratio);
    return `${newCalories} kcal`;
  }, [recipe.stats?.calories, servings, originalServings]);

  // Parse Kochzeit für Timer
  const parseTime = (timeStr: string) => {
    const match = timeStr.match(/(\d+)\s*Min/i);
    return match ? parseInt(match[1]) : 0;
  };

  const cookingTime = parseTime(recipe.stats?.time || '');

  // Kochmodus: Immersive Focus – Card ohne Extra-Overlap, Progress-Bar für Fortschritt
  if (cookingMode) {
    const totalSteps = recipe.instructions.length;
    const progressPercent = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
    return (
      <div className="px-4 md:px-6 pb-28 max-w-4xl mx-auto">
        <div className="relative z-20 rounded-[40px] overflow-hidden shadow-2xl" style={RECIPE_GLASS_STYLE}>
          <div className="h-1.5 w-full bg-gray-100" aria-hidden>
            <div
              className="h-full bg-orange-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="p-6 sm:p-8 flex flex-col min-h-[50vh]">
            <button
              type="button"
              onClick={() => setCookingMode(false)}
              className="self-start text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
            >
              ← Rezept
            </button>
            {/* Schritt-Indikator: Editorial – Wasserzeichen + Label */}
            <div className="relative">
              <span className="text-6xl md:text-8xl font-black text-orange-100/50 absolute top-4 right-4 pointer-events-none select-none tabular-nums">
                {String(currentStep + 1).padStart(2, '0')}
              </span>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                Schritt {currentStep + 1} von {totalSteps}
              </p>
            </div>

            {/* Anleitungstext – groß und lesbar */}
            <p className="text-xl md:text-2xl text-gray-800 font-medium leading-relaxed mt-12 mb-8 flex-1">
              {recipe.instructions[currentStep]}
            </p>

            {/* Erledigt-Button (optional, dezent) */}
            <button
              type="button"
              onClick={() => {
                const newCompleted = new Set(completedSteps);
                if (newCompleted.has(currentStep)) newCompleted.delete(currentStep);
                else newCompleted.add(currentStep);
                setCompletedSteps(newCompleted);
              }}
              className={cn(
                'self-start mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors border',
                completedSteps.has(currentStep)
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-orange-300 hover:text-orange-600'
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              {completedSteps.has(currentStep) ? 'Erledigt' : 'Als erledigt markieren'}
            </button>

            {/* Navigation – Fat Finger friendly */}
            <div className="flex gap-4 mt-auto pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0}
                className="flex-1 h-14 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Zurück
              </button>
              {currentStep < totalSteps - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="flex-1 h-14 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold shadow-lg shadow-orange-500/20 transition-colors"
                >
                  Weiter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setCookingMode(false); setCurrentStep(0); }}
                  className="flex-1 h-14 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold transition-colors"
                >
                  Fertig! 🎉
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-10 fade-in duration-700 ease-out px-4 md:px-6 pb-28">
      {/* Hero Card – kein eigenes -mt (Shell hat bereits -mt-20 + pt-9), Oberkante wie Dashboard-Karten */}
      <div className="relative z-20 mx-4 md:mx-auto max-w-5xl rounded-[40px] p-6 md:p-10 shadow-2xl" style={RECIPE_GLASS_STYLE}>
        {/* Nur Wochenplan: In Sammlung speichern (Zurück nur in der Shell oben) */}
        {fromWeekPlan && onSaveToCollection && (
          <div className="flex justify-end mb-4">
            <button
              onClick={onSaveToCollection}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-medium shadow-lg shadow-orange-500/25 flex items-center gap-2"
            >
              <ChefHat className="w-4 h-4" />
              In Meine Rezepte speichern
            </button>
          </div>
        )}
        {/* Hero: Mobile Vertical Stack / Desktop Split mit Bottom Align */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          {/* Linke Seite: Content & Vibe */}
          <div className="flex-1 min-w-0">
            {/* Mobile: Zeile 1 = Thumbnail + Datum/Meta, Zeile 2 = Titel */}
            <div className="flex flex-col md:hidden">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-white/50 bg-gray-100">
                  {recipe.imageUrl ? (
                    <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <UtensilsCrossed className="w-8 h-8" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">
                    Generiert am {new Date(createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-500">
                    {recipe.stats?.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        {recipe.stats.time}
                      </span>
                    )}
                    {recipe.stats?.time && (adjustedCalories || recipe.stats?.difficulty) && <span className="text-gray-300">•</span>}
                    {adjustedCalories && (
                      <span className="flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        {adjustedCalories}
                      </span>
                    )}
                    {adjustedCalories && recipe.stats?.difficulty && <span className="text-gray-300">•</span>}
                    {recipe.stats?.difficulty && (
                      <span className="flex items-center gap-1">
                        <ChefHat className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                        {recipe.stats.difficulty}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <h1 className="w-full mt-4 mb-4 text-2xl font-bold text-gray-900 leading-tight">{recipe.recipeName}</h1>
            </div>
            {/* Desktop: Thumbnail + Text-Block nebeneinander */}
            <div className="hidden md:flex flex-row items-start gap-5">
              <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden shadow-sm border border-white/50 bg-gray-100">
                {recipe.imageUrl ? (
                  <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <UtensilsCrossed className="w-12 h-12" strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">
                  Generiert am {new Date(createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-2">{recipe.recipeName}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-gray-500">
                  {recipe.stats?.time && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                      {recipe.stats.time}
                    </span>
                  )}
                  {recipe.stats?.time && (adjustedCalories || recipe.stats?.difficulty) && <span className="text-gray-300">•</span>}
                  {adjustedCalories && (
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                      {adjustedCalories}{servings !== originalServings ? ' (pro Portion)' : ''}
                    </span>
                  )}
                  {adjustedCalories && recipe.stats?.difficulty && <span className="text-gray-300">•</span>}
                  {recipe.stats?.difficulty && (
                    <span className="flex items-center gap-1.5">
                      <ChefHat className="w-4 h-4 text-orange-500 shrink-0" />
                      {recipe.stats.difficulty}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rechte Seite: Action Dock (Desktop unten bündig, Stepper rechtsbündig) */}
          <div className="flex flex-col gap-4 items-stretch md:items-end shrink-0 w-full md:w-auto">
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <button
                onClick={() => setCookingMode(true)}
                className="w-full md:w-auto md:min-w-0 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                Zubereitung starten
              </button>
              <button
                type="button"
                onClick={() => {
                  const text = `${recipe.recipeName} – ${window.location.href}`;
                  if (navigator.share) {
                    navigator.share({ title: recipe.recipeName, text: recipe.recipeName, url: window.location.href }).catch(() => {
                      navigator.clipboard.writeText(text);
                      setToast({ message: 'Link kopiert' });
                    });
                  } else {
                    navigator.clipboard.writeText(text);
                    setToast({ message: 'Link kopiert' });
                  }
                }}
                className="w-full md:w-auto px-4 py-3 rounded-xl text-gray-500 font-medium hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 border-none shadow-none"
              >
                <Share2 className="w-4 h-4" />
                Teilen
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 justify-center md:justify-end">
              <div className="inline-flex items-center gap-4 bg-gray-50 rounded-full px-4 py-2">
                <button
                  type="button"
                  onClick={() => setServings(Math.max(1, servings - 1))}
                  disabled={servings <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-gray-900 font-bold min-w-[4ch] tabular-nums">{servings} Pers.</span>
                <button
                  type="button"
                  onClick={() => setServings(Math.min(8, servings + 1))}
                  disabled={servings >= 8}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-600 hover:bg-white hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {servings !== originalServings && (
                <button
                  type="button"
                  onClick={() => setServings(originalServings)}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Original
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content: Zutaten (sticky) | Zubereitung – Editorial Layout */}
      <div className="max-w-5xl mx-auto mt-10 grid grid-cols-1 md:grid-cols-12 gap-12 items-start">
        {/* Linke Spalte: Zutaten (sticky auf Desktop) – getrennt: Vorhanden / Fehlt noch */}
        <div className="md:col-span-4 md:sticky md:top-24">
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setAddToListIngredients(adjustedShoppingList.length > 0 ? adjustedShoppingList : adjustedIngredients);
                setIsAddToListOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl bg-rose-50 text-rose-600 text-sm font-semibold hover:bg-rose-100 transition-colors border-0 shadow-none"
            >
              <ShoppingBasket className="w-4 h-4 shrink-0" />
              <span className="leading-tight text-center">Einkaufen</span>
            </button>
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-xl bg-purple-50 text-purple-600 text-sm font-semibold hover:bg-purple-100 transition-colors border-0 shadow-none"
            >
              <CalendarDays className="w-4 h-4 shrink-0" />
              <span className="leading-tight text-center text-xs sm:text-sm">Im Kalender planen</span>
            </button>
          </div>

          {adjustedShoppingList.length > 0 ? (
            <>
              {adjustedIngredients.length > 0 && (
                <>
                  <h2 className="text-lg font-bold text-gray-900 mb-3">Zutaten (Vorhanden)</h2>
                  <p className="text-sm text-gray-500 mb-2">für {servings} {servings === 1 ? 'Person' : 'Personen'}</p>
                  <ul className="divide-y divide-gray-100 mb-6">
                    {adjustedIngredients.map((ingredient, index) => (
                      <li key={index} className="flex items-start gap-2 py-2.5">
                        <span className="text-gray-400 mt-0.5 shrink-0">•</span>
                        <span className="text-sm text-gray-800 leading-relaxed">{formatIngredientDisplay(ingredient)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" aria-hidden />
                Fehlt noch
              </h2>
              <p className="text-sm text-gray-500 mb-2">für {servings} {servings === 1 ? 'Person' : 'Personen'}</p>
              <ul className="divide-y divide-gray-100">
                {adjustedShoppingList.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-2 py-2.5">
                    <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                    <span className="text-sm text-gray-800 leading-relaxed">{formatIngredientDisplay(ingredient)}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-gray-900 mb-3">Zutaten</h2>
              <p className="text-sm text-gray-500 mb-2">für {servings} {servings === 1 ? 'Person' : 'Personen'}</p>
              <ul className="divide-y divide-gray-100">
                {adjustedIngredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-2 py-2.5">
                    <span className="text-gray-400 mt-0.5 shrink-0">•</span>
                    <span className="text-sm text-gray-800 leading-relaxed">{formatIngredientDisplay(ingredient)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Rechte Spalte: Zubereitung */}
        <div className="md:col-span-8">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Zubereitung</h2>
          <ol>
            {recipe.instructions.map((step, index) => (
              <li key={index} className="flex gap-4 mb-8 last:mb-0">
                <span className="flex-shrink-0 text-3xl font-bold text-orange-500/80 tabular-nums mr-0 w-10 text-right">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="text-gray-700 text-lg leading-relaxed flex-1 pt-0.5">{step}</p>
              </li>
            ))}
          </ol>
          {cookingTime > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 text-gray-600">
                <Clock className="w-5 h-5 text-orange-500 shrink-0" />
                Gesamt-Kochzeit: {cookingTime} Minuten
              </span>
              <button
                type="button"
                onClick={() => alert(`Timer für ${cookingTime} Minuten – Feature kommt gleich!`)}
                className="px-4 py-2 rounded-xl bg-orange-100 text-orange-700 text-sm font-medium hover:bg-orange-200 transition-colors"
              >
                Timer starten
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profi-Tipp – Border-Card */}
      {recipe.chefTip && (
        <div className="max-w-5xl mx-auto mt-10 border-l-4 border-orange-500 bg-orange-50/30 p-6 rounded-r-xl flex gap-4">
          <Lightbulb className="w-6 h-6 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-gray-800 mb-1">Profi-Tipp</p>
            <p className="text-gray-700 italic leading-relaxed">{recipe.chefTip}</p>
          </div>
        </div>
      )}

      {/* Auf Einkaufsliste setzen – Modal + Toast */}
      <AddToShoppingListModal
          isOpen={isAddToListOpen}
          onClose={() => setIsAddToListOpen(false)}
          ingredients={addToListIngredients}
          onAdded={(count) => {
            setToast({
              message: count ? `${count} ${count === 1 ? 'Zutat' : 'Zutaten'} hinzugefügt` : 'Zutaten hinzugefügt',
            });
          }}
        />

      {/* Im Kalender planen – Modal */}
      {isCalendarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 relative">
            <button
              type="button"
              onClick={() => setIsCalendarModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 id="calendar-modal-title" className="text-xl font-bold mb-4 text-gray-800">Wann kochen?</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="schedule-date" className="block text-sm font-medium text-gray-600 mb-1">Datum</label>
                <input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:border-purple-500 bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Mahlzeit</label>
                <div className="flex gap-2">
                  {[
                    { id: 'breakfast' as const, label: 'Frühstück' },
                    { id: 'lunch' as const, label: 'Mittag' },
                    { id: 'dinner' as const, label: 'Abends' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setScheduleMealType(type.id)}
                      className={cn(
                        'flex-1 py-2 rounded-xl text-sm font-medium transition-all border-2',
                        scheduleMealType === type.id
                          ? 'bg-purple-100 text-purple-700 border-purple-200'
                          : 'bg-gray-50 text-gray-500 border-transparent hover:bg-gray-100'
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleScheduleRecipe}
                disabled={isScheduling}
                className="w-full mt-4 bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 text-white rounded-xl py-3 font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {isScheduling ? 'Wird geplant...' : 'Im Kalender eintragen'}
              </button>
            </div>
          </div>
        </div>
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
