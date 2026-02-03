'use client';

import { useState } from 'react';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import { saveMealPreferences } from '@/actions/meal-planning-actions';
import { useRouter } from 'next/navigation';

interface PremiumOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const NUTRITION_GOALS = [
  { id: 'ausgewogen', label: 'Ausgewogen' },
  { id: 'high_protein', label: 'High Protein' },
  { id: 'low_carb', label: 'Low Carb' },
  { id: 'vegetarisch', label: 'Vegetarisch' },
] as const;

const COOKING_RHYTHMS = [
  { id: 'daily_fresh', label: 'Täglich frisch', desc: '7 verschiedene Gerichte' },
  { id: 'quick_dirty', label: 'Quick & Dirty', desc: 'Unter der Woche nur <20 Min' },
  { id: 'meal_prep', label: 'Meal Prep', desc: 'Größere Portionen für 2 Tage' },
] as const;

const MEAL_STRUCTURE_OPTIONS = [
  { id: 'frühstück', label: 'Frühstück' },
  { id: 'mittagessen', label: 'Mittagessen' },
  { id: 'abendessen', label: 'Abendessen' },
] as const;

export function PremiumOnboardingModal({ isOpen, onClose, onComplete }: PremiumOnboardingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Schritt 1: Ziel & Budget
  const [nutritionGoal, setNutritionGoal] = useState<string>('ausgewogen');
  const [householdSize, setHouseholdSize] = useState(2);
  const [budgetRange, setBudgetRange] = useState<string>('medium');

  // Schritt 2: Zeit-Management
  const [cookingRhythm, setCookingRhythm] = useState<string>('daily_fresh');

  // Schritt 3: Mahlzeiten-Struktur
  const [mealTypes, setMealTypes] = useState<string[]>(['abendessen']);

  const toggleMealType = (id: string) => {
    setMealTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Map nutritionGoal -> dietType for backend
      const dietType =
        nutritionGoal === 'vegetarisch'
          ? 'vegetarisch'
          : nutritionGoal === 'high_protein'
            ? 'high-protein'
            : nutritionGoal === 'low_carb'
              ? 'low-carb'
              : 'alles';

      await saveMealPreferences({
        dietType,
        householdSize,
        budgetRange,
        mealTypes,
        mealPrep: cookingRhythm === 'meal_prep',
        cookingTime: cookingRhythm === 'quick_dirty' ? 'schnell' : 'normal',
        preferredCuisines: [],
        cookingRhythm,
      });
      onComplete();
      onClose();
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Fehler beim Speichern der Präferenzen');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Premium Wochenplaner</h2>
              <p className="text-sm text-zinc-400">Schritt {step} von 3</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Schritt 1: Ziel & Budget (Makro) */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Ziel & Budget</h3>
                <p className="text-sm text-zinc-400 mb-4">Ernährungs-Ziel und Budget pro Woche</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Ernährungs-Ziel</label>
                    <div className="flex flex-wrap gap-2">
                      {NUTRITION_GOALS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setNutritionGoal(g.id)}
                          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                            nutritionGoal === g.id
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {nutritionGoal === g.id && <Check className="w-4 h-4 inline mr-1.5 -mt-0.5" />}
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Haushaltsgröße: {householdSize} {householdSize === 1 ? 'Person' : 'Personen'}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={householdSize}
                      onChange={(e) => setHouseholdSize(Number(e.target.value))}
                      className="w-full accent-violet-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Budget pro Woche</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'low', label: '~30€' },
                        { value: 'medium', label: '~50€' },
                        { value: 'high', label: '~80€' },
                      ].map((range) => (
                        <button
                          key={range.value}
                          type="button"
                          onClick={() => setBudgetRange(range.value)}
                          className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                            budgetRange === range.value
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {range.value === 'low' && '💰'}
                          {range.value === 'medium' && '💰💰'}
                          {range.value === 'high' && '💰💰💰'}
                          <span className="block mt-0.5">{range.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schritt 2: Zeit-Management (Koch-Rhythmus) */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Zeit-Management</h3>
                <p className="text-sm text-zinc-400 mb-4">Wie möchtest du kochen?</p>

                <div className="space-y-3">
                  {COOKING_RHYTHMS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setCookingRhythm(r.id)}
                      className={`w-full flex items-center justify-between gap-4 p-4 rounded-xl text-left transition-colors ${
                        cookingRhythm === r.id
                          ? 'bg-violet-600 text-white border border-violet-500'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-transparent'
                      }`}
                    >
                      <span className="font-medium">{r.label}</span>
                      <span className="text-sm opacity-90">{r.desc}</span>
                      {cookingRhythm === r.id && <Check className="w-5 h-5 shrink-0" />}
                    </button>
                  ))}
                </div>
                {cookingRhythm === 'meal_prep' && (
                  <p className="mt-3 text-xs text-zinc-500">
                    Die KI plant z. B. Mo & Di das gleiche Gericht (einmal kochen, zweimal essen).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Schritt 3: Mahlzeiten-Struktur */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Mahlzeiten-Struktur</h3>
                <p className="text-sm text-zinc-400 mb-4">Was soll geplant werden?</p>

                <div className="space-y-2">
                  {MEAL_STRUCTURE_OPTIONS.map((m) => (
                    <label
                      key={m.id}
                      className="flex items-center gap-3 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={mealTypes.includes(m.id)}
                        onChange={() => toggleMealType(m.id)}
                        className="w-5 h-5 rounded border-white/20 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-white font-medium">{m.label}</span>
                    </label>
                  ))}
                </div>
                {mealTypes.length === 0 && (
                  <p className="mt-2 text-sm text-amber-400">Bitte mindestens eine Mahlzeit wählen.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-white/10">
          <button
            onClick={step > 1 ? () => setStep(step - 1) : onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            {step > 1 ? 'Zurück' : 'Abbrechen'}
          </button>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium transition-colors flex items-center gap-2"
            >
              Weiter <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={loading || mealTypes.length === 0}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Speichere...' : 'Fertig & Starten'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
