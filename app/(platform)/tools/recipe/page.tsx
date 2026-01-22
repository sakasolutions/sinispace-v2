'use client';

import { generateRecipe } from '@/actions/recipe-ai';
import { useActionState } from 'react';
import { useState } from 'react';
import { Copy, MessageSquare, Loader2, Clock, ChefHat, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';

type Recipe = {
  title: string;
  time: string;
  difficulty: string;
  calories: string;
  protein: string;
  ingredients: string[];
  steps: string[];
  tip: string;
};

function ActionButtons({ recipe }: { recipe: Recipe }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    try {
      let recipeText = `${recipe.title}\n\nZutaten:\n${recipe.ingredients.map(i => `- ${i}`).join('\n')}\n\nZubereitung:\n${recipe.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
      if (recipe.tip) {
        recipeText += `\n\n💡 Profi-Tipp: ${recipe.tip}`;
      }
      await navigator.clipboard.writeText(recipeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
    }
  };

  const handleGoToChat = () => {
    router.push('/chat');
  };

  return (
    <div className="flex justify-between items-center border-b border-white/5 bg-white/5 p-3 rounded-t-xl mb-4">
      <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Dein Rezept</span>
      <div className="flex gap-1.5">
        <button
          onClick={handleCopy}
          className="h-8 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
          title="In Zwischenablage kopieren"
        >
          {copied ? (
            <>
              <span className="text-green-400">✓</span>
              <span className="hidden sm:inline">Kopiert!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kopieren</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleGoToChat}
          className="h-8 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
          title="Zu SiniChat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Zu SiniChat</span>
        </button>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-amber-600 px-4 py-3 text-sm font-semibold text-white hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 min-h-[44px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Rezept wird gezaubert...</span>
        </>
      ) : (
        <>
          <ChefHat className="w-4 h-4" />
          <span>Rezept zaubern 🍳</span>
        </>
      )}
    </button>
  );
}

export default function RecipePage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateRecipe, null);
  
  const [ingredients, setIngredients] = useState('');
  const [filters, setFilters] = useState<string[]>([]);

  // Parse Recipe aus State
  let recipe: Recipe | null = null;
  if (state?.result && !state.error) {
    try {
      // Prüfe ob es die Upsell-Nachricht ist (Markdown)
      if (state.result.includes('🔒 Premium Feature')) {
        recipe = null; // Zeige Upsell-Nachricht
      } else {
        recipe = JSON.parse(state.result) as Recipe;
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  }

  const toggleFilter = (filter: string) => {
    setFilters(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };

  const filterOptions = [
    { id: 'vegetarian', label: '🌱 Vegetarisch', value: 'Vegetarisch' },
    { id: 'high-protein', label: '💪 High Protein', value: 'High Protein' },
    { id: 'quick', label: '⏱ Schnell', value: 'Schnell' },
    { id: 'low-carb', label: '📉 Low Carb', value: 'Low Carb' },
  ];

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Gourmet-Planer</h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-1 sm:mt-2">
          Dein Smart-Chef für den Kühlschrank.
        </p>
        <div className="mt-3 p-3 rounded-md bg-orange-500/10 border border-orange-500/20 text-sm text-orange-300">
          💡 <strong>Tipp:</strong> Gib einfach ein, was im Kühlschrank ist. Die KI erstellt daraus ein perfektes Rezept mit Nährwerten.
        </div>
      </div>

      {/* MOBILE FIRST: flex-col auf Mobile, md:grid auf Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Was hast du im Kühlschrank?
              </label>
              <textarea
                name="ingredients"
                required
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder="z.B. Eier, Tomaten, Reis..."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 resize-none transition-all min-h-[150px]"
                rows={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Filter & Präferenzen
              </label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleFilter(option.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                      filters.includes(option.value)
                        ? 'bg-orange-500/20 border-2 border-orange-500/50 text-orange-300'
                        : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {/* Hidden inputs für FormData */}
              {filters.map((filter) => (
                <input key={filter} type="hidden" name="filters" value={filter} />
              ))}
            </div>

            <SubmitButton />
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm text-red-400">{state.error}</p>
          )}
        </div>

        {/* RECHTE SEITE: ERGEBNIS */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-h-[300px] sm:min-h-[400px] overflow-hidden">
          {state?.result && state.result.includes('🔒 Premium Feature') ? (
            <div className="p-4 sm:p-5 md:p-6">
              <div className="prose prose-sm max-w-none text-white prose-invert">
                <div dangerouslySetInnerHTML={{ __html: state.result.replace(/\n/g, '<br />') }} />
              </div>
            </div>
          ) : recipe ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ActionButtons recipe={recipe} />
              
              <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto">
                {/* RECIPE CARD */}
                <div className="rounded-xl border border-orange-500/20 bg-zinc-900/80 backdrop-blur-xl p-5 sm:p-6 shadow-lg">
                  {/* HEADER */}
                  <div className="mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{recipe.title}</h2>
                  </div>

                  {/* BADGES: Zeit & Schwierigkeit */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-full px-3 py-1.5 text-xs font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {recipe.time}
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-300 border border-orange-500/20 rounded-full px-3 py-1.5 text-xs font-medium">
                      <ChefHat className="w-3.5 h-3.5" />
                      {recipe.difficulty}
                    </div>
                  </div>

                  {/* NUTRITION GRID */}
                  <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-white/10">
                    <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full px-3 py-1.5 text-xs font-medium">
                      🔥 {recipe.calories}
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full px-3 py-1.5 text-xs font-medium">
                      💪 {recipe.protein}
                    </div>
                  </div>

                  {/* ZUTATEN-LISTE (Checkbox-Style) */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Zutaten</h3>
                    <ul className="space-y-2">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={index} className="flex items-start gap-3 text-zinc-300 group cursor-pointer hover:text-white transition-colors">
                          <div className="mt-1.5 w-5 h-5 rounded border-2 border-orange-500/30 bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-500/20 group-hover:border-orange-500/50 transition-all">
                            <CheckCircle2 className="w-3 h-3 text-orange-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <span className="text-sm sm:text-base">{ingredient}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* ZUBEREITUNG */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Zubereitung</h3>
                    <ol className="space-y-3">
                      {recipe.steps.map((step, index) => (
                        <li key={index} className="flex gap-3 text-zinc-300">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-300 text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-sm sm:text-base leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* TIP */}
                  {recipe.tip && (
                    <div className="pt-4 border-t border-white/10">
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                        <p className="text-sm text-orange-200 font-medium mb-1">💡 Profi-Tipp</p>
                        <p className="text-sm text-zinc-300 leading-relaxed">{recipe.tip}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <ChefHat className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Warte auf Input...</p>
              <p className="text-xs mt-1 text-zinc-600">Das generierte Rezept erscheint hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
