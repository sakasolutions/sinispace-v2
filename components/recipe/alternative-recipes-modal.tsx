'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { generateAlternativeRecipes } from '@/actions/week-planning-ai';
import { getMealPreferences } from '@/actions/meal-planning-actions';

interface AlternativeRecipesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (recipe: any, resultId: string) => void;
  currentRecipe: any;
  day: string;
  workspaceId?: string;
}

export function AlternativeRecipesModal({
  isOpen,
  onClose,
  onSelect,
  currentRecipe,
  day,
  workspaceId,
}: AlternativeRecipesModalProps) {
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const preferences = await getMealPreferences();
      if (!preferences) {
        setError('Keine Präferenzen gefunden');
        return;
      }

      const result = await generateAlternativeRecipes(day, currentRecipe, preferences, workspaceId);
      if (result.error) {
        setError(result.error);
      } else if (result.alternatives) {
        setAlternatives(result.alternatives);
      }
    } catch (err) {
      console.error('Error generating alternatives:', err);
      setError('Fehler bei der Generierung');
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-generate beim Öffnen
  useEffect(() => {
    if (isOpen && alternatives.length === 0 && !isGenerating) {
      handleGenerate();
    }
  }, [isOpen]);

  // Reset beim Schließen
  useEffect(() => {
    if (!isOpen) {
      setAlternatives([]);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-zinc-900 border border-white/10 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Alternative Rezepte</h2>
              <p className="text-sm text-zinc-400">Für {day}</p>
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
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-4" />
              <p className="text-zinc-400">Generiere 3 Alternativen...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white"
              >
                Erneut versuchen
              </button>
            </div>
          ) : alternatives.length > 0 ? (
            <div className="space-y-4">
              {alternatives.map((alt, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-white/10 bg-zinc-800/50 hover:bg-zinc-800 hover:border-violet-500/30 transition-colors cursor-pointer"
                  onClick={async () => {
                    // Rezept wird in onSelect gespeichert
                    onSelect(alt, '');
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-white">{alt.recipeName}</h3>
                    {alt.cuisine && (
                      <span className="px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs">
                        {alt.cuisine}
                      </span>
                    )}
                  </div>
                  
                  {alt.reason && (
                    <p className="text-sm text-zinc-400 mb-3">{alt.reason}</p>
                  )}

                  {alt.stats && (
                    <div className="flex gap-3 text-sm text-zinc-400">
                      {alt.stats.time && <span>⏱️ {alt.stats.time}</span>}
                      {alt.stats.calories && <span>🔥 {alt.stats.calories}</span>}
                      {alt.stats.difficulty && <span>📊 {alt.stats.difficulty}</span>}
                    </div>
                  )}

                  {alt.ingredients && alt.ingredients.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-zinc-500 mb-1">Zutaten:</p>
                      <p className="text-sm text-zinc-300 line-clamp-2">
                        {alt.ingredients.slice(0, 3).join(', ')}
                        {alt.ingredients.length > 3 && '...'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <button
                onClick={handleGenerate}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium"
              >
                Alternativen generieren
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
