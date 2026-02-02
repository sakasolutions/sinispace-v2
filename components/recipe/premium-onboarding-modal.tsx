'use client';

import { useState } from 'react';
import { X, Sparkles, Check, ArrowRight, Loader2 } from 'lucide-react';
import { saveMealPreferences } from '@/actions/meal-planning-actions';
import { generateMealPlan } from '@/actions/week-planning-ai';
import { useRouter } from 'next/navigation';

interface PremiumOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function PremiumOnboardingModal({ isOpen, onClose, onComplete }: PremiumOnboardingModalProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Präferenzen State
  const [dietType, setDietType] = useState<string>('alles');
  const [meatSelection, setMeatSelection] = useState<string[]>([]); // Neu: Fleisch-Auswahl
  const [allergies, setAllergies] = useState<string[]>([]);
  const [householdSize, setHouseholdSize] = useState(2);
  const [budgetRange, setBudgetRange] = useState<string>('medium');
  const [mealTypes, setMealTypes] = useState<string[]>(['abendessen']);
  const [mealPrep, setMealPrep] = useState(false);
  const [cookingTime, setCookingTime] = useState<string>('normal'); // Neu: Kochzeit-Präferenz
  const [preferredCuisines, setPreferredCuisines] = useState<string[]>([]);
  const [dislikedIngredients, setDislikedIngredients] = useState<string[]>([]);

  const commonAllergies = ['Nüsse', 'Gluten', 'Laktose', 'Eier', 'Fisch', 'Soja'];
  const commonCuisines = ['Mediterran', 'Asiatisch', 'Deutsch', 'Italienisch', 'Mexikanisch', 'Indisch'];
  const commonDisliked = ['Pilze', 'Oliven', 'Kapern', 'Anchovis', 'Rosenkohl'];
  const meatOptions = ['Hähnchen', 'Rind', 'Schwein', 'Fisch', 'Lamm', 'Pute'];

  const toggleArray = (arr: string[], item: string) => {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await saveMealPreferences({
        dietType,
        allergies,
        householdSize,
        budgetRange,
        mealTypes,
        mealPrep,
        cookingLevel: cookingTime === 'schnell' ? 'anfänger' : cookingTime === 'normal' ? 'fortgeschritten' : 'profi',
        preferredCuisines,
        dislikedIngredients,
        meatSelection,
        cookingTime,
      });

      const result = await generateMealPlan({
        dietType,
        allergies,
        householdSize,
        budgetRange,
        cookingTime,
        preferredCuisines,
        dislikedIngredients,
        meatSelection,
      });

      if (!result.success) {
        if (result.error === 'PREMIUM_REQUIRED') {
          onClose();
          router.push('/settings');
          return;
        }
        alert(result.message ?? result.error ?? 'Plan konnte nicht erstellt werden.');
        return;
      }

      onComplete();
      onClose();
      router.push('/calendar?plan=success');
    } catch (error) {
      console.error('Error saving preferences / generating plan:', error);
      alert('Fehler beim Speichern oder bei der Planerstellung.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Diät & Allergien</h3>
                <p className="text-sm text-zinc-400 mb-4">Damit wir passende Rezepte für dich finden</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Diät-Typ</label>
                    <select
                      value={dietType}
                      onChange={(e) => {
                        setDietType(e.target.value);
                        // Wenn vegetarisch/vegan, leere Fleisch-Auswahl
                        if (e.target.value === 'vegetarisch' || e.target.value === 'vegan') {
                          setMeatSelection([]);
                        }
                      }}
                      className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="alles">Alles</option>
                      <option value="vegetarisch">Vegetarisch</option>
                      <option value="vegan">Vegan</option>
                      <option value="low-carb">Low-Carb</option>
                      <option value="high-protein">High-Protein</option>
                      <option value="keto">Keto</option>
                    </select>
                  </div>

                  {dietType !== 'vegetarisch' && dietType !== 'vegan' && (
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">Fleisch-Auswahl</label>
                      <p className="text-xs text-zinc-500 mb-2">Welche Fleischsorten magst du?</p>
                      <div className="flex flex-wrap gap-2">
                        {meatOptions.map((meat) => (
                          <button
                            key={meat}
                            onClick={() => setMeatSelection(toggleArray(meatSelection, meat))}
                            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                              meatSelection.includes(meat)
                                ? 'bg-violet-600 text-white'
                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                            }`}
                          >
                            {meatSelection.includes(meat) && <Check className="w-3 h-3 inline mr-1" />}
                            {meat}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Allergien</label>
                    <div className="flex flex-wrap gap-2">
                      {commonAllergies.map((allergy) => (
                        <button
                          key={allergy}
                          onClick={() => setAllergies(toggleArray(allergies, allergy))}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            allergies.includes(allergy)
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {allergies.includes(allergy) && <Check className="w-3 h-3 inline mr-1" />}
                          {allergy}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Nicht gemochte Zutaten</label>
                    <div className="flex flex-wrap gap-2">
                      {commonDisliked.map((ingredient) => (
                        <button
                          key={ingredient}
                          onClick={() => setDislikedIngredients(toggleArray(dislikedIngredients, ingredient))}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            dislikedIngredients.includes(ingredient)
                              ? 'bg-red-600 text-white'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {dislikedIngredients.includes(ingredient) && <X className="w-3 h-3 inline mr-1" />}
                          {ingredient}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Haushalt & Budget</h3>
                <p className="text-sm text-zinc-400 mb-4">Für optimale Portionsgrößen und Kosten</p>

                <div className="space-y-4">
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
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Budget pro Woche</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['low', 'medium', 'high'].map((range) => (
                        <button
                          key={range}
                          onClick={() => setBudgetRange(range)}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                            budgetRange === range
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {range === 'low' && '💰 ~30€'}
                          {range === 'medium' && '💰💰 ~50€'}
                          {range === 'high' && '💰💰💰 ~80€'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Mahlzeiten</label>
                    <div className="space-y-2">
                      {['abendessen', 'lunch', 'frühstück'].map((type) => (
                        <label key={type} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={mealTypes.includes(type)}
                            onChange={() => setMealTypes(toggleArray(mealTypes, type))}
                            className="w-4 h-4 rounded border-white/20 text-violet-600 focus:ring-violet-500"
                          />
                          <span className="text-sm text-white capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mealPrep}
                        onChange={(e) => setMealPrep(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-white">Meal-Prep (Größere Portionen für mehrere Tage)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Koch-Level & Präferenzen</h3>
                <p className="text-sm text-zinc-400 mb-4">Für passende Rezept-Komplexität</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Kochzeit-Präferenz</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'schnell', label: 'Schnell', desc: '<30 Min' },
                        { value: 'normal', label: 'Normal', desc: '30-60 Min' },
                        { value: 'aufwendig', label: 'Aufwendig', desc: '>60 Min' },
                      ].map((time) => (
                        <button
                          key={time.value}
                          onClick={() => setCookingTime(time.value)}
                          className={`px-4 py-3 rounded-lg text-sm transition-colors ${
                            cookingTime === time.value
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          <div className="font-medium">{time.label}</div>
                          <div className="text-xs opacity-75">{time.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">Bevorzugte Küchen</label>
                    <div className="flex flex-wrap gap-2">
                      {commonCuisines.map((cuisine) => (
                        <button
                          key={cuisine}
                          onClick={() => setPreferredCuisines(toggleArray(preferredCuisines, cuisine))}
                          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                            preferredCuisines.includes(cuisine)
                              ? 'bg-violet-600 text-white'
                              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          {preferredCuisines.includes(cuisine) && <Check className="w-3 h-3 inline mr-1" />}
                          {cuisine}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
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
              disabled={loading}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generiere Plan...
                </>
              ) : (
                'Fertig & Starten'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
