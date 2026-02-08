'use client';

import React from 'react';
import { Clock, Flame, Edit, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RecipeCardRecipe = {
  recipeName: string;
  stats?: { time?: string; calories?: string; difficulty?: string };
  imageUrl?: string | null;
  imageCredit?: string | null;
  [key: string]: unknown;
};

export type RecipeCardTheme = {
  gradient: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  shadow: string;
};

type RecipeCardProps = {
  recipe: RecipeCardRecipe;
  theme: RecipeCardTheme;
  resultId: string;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onSelect: () => void;
  onDelete: () => void;
  showVeganBadge?: boolean;
  showHighProteinBadge?: boolean;
};

export function RecipeCard({
  recipe,
  theme,
  resultId,
  isMenuOpen,
  onMenuToggle,
  onSelect,
  onDelete,
  showVeganBadge = false,
  showHighProteinBadge = false,
}: RecipeCardProps) {
  const ThemeIcon = theme.Icon;

  return (
    <div
      className={cn('group relative bg-white rounded-[24px] overflow-hidden flex flex-col border border-gray-100 transition-all duration-300 cursor-pointer hover:-translate-y-1', theme.shadow, 'hover:shadow-xl shadow-sm')}
      onClick={onSelect}
    >
      {/* Header: echtes Bild (Unsplash) oder Gradient-Fallback */}
      <div className="relative h-40 shrink-0 flex items-center justify-center overflow-hidden">
        {recipe.imageUrl ? (
          <>
            <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" aria-hidden />
            {recipe.imageCredit && (
              <span className="absolute bottom-1 left-2 text-[10px] text-white/80 pointer-events-none">Photo: {recipe.imageCredit}</span>
            )}
          </>
        ) : (
          <>
            <div className={cn('absolute inset-0', theme.gradient)} aria-hidden />
            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors pointer-events-none" aria-hidden />
            <ThemeIcon className="w-16 h-16 text-white drop-shadow-md shrink-0 relative z-10" strokeWidth={2} aria-hidden />
          </>
        )}
        {/* More-Menu oben rechts im Header */}
        <div className="absolute top-2 right-2 z-10">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle();
            }}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-sm text-white transition-colors"
            aria-label="Mehr Optionen"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {isMenuOpen && (
            <>
              <div className="absolute right-0 top-full mt-1 py-1 rounded-xl bg-white border border-gray-200 shadow-lg min-w-[140px] z-20" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    onMenuToggle();
                    alert('Edit-Feature kommt gleich!');
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onMenuToggle();
                    onDelete();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </button>
              </div>
              <div
                className="fixed inset-0 z-[5]"
                aria-hidden
                onClick={onMenuToggle}
              />
            </>
          )}
        </div>
      </div>
      {/* Body: Titel + Smart Badges */}
      <div className="p-5 flex flex-col flex-grow min-h-0">
        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-3 line-clamp-2">{recipe.recipeName || 'Rezept'}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {recipe.stats?.time && (
            <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-md border border-gray-100">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {recipe.stats.time}
            </span>
          )}
          {recipe.stats?.calories && (
            <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-600 text-xs font-medium px-2.5 py-1 rounded-md border border-gray-100">
              <Flame className="w-3.5 h-3.5 shrink-0" />
              {recipe.stats.calories}
            </span>
          )}
          {showVeganBadge && (
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-md border border-green-100">
              Veggie
            </span>
          )}
          {showHighProteinBadge && (
            <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium px-2.5 py-1 rounded-md border border-green-100">
              High Protein
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
