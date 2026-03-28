'use client';

import React from 'react';
import { Clock, Flame, Edit, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RecipeCardRecipe = {
  recipeName: string;
  stats?: { time?: string; calories?: string | number; difficulty?: string; protein?: number; carbs?: number; fat?: number };
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
  /** Glas-Morphismus wie CookIQ-Dark */
  glass?: boolean;
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
  glass = false,
}: RecipeCardProps) {
  const ThemeIcon = theme.Icon;

  const menuButton = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onMenuToggle();
      }}
      className="rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/45"
      aria-label="Mehr Optionen"
    >
      <MoreVertical className="h-4 w-4" />
    </button>
  );

  const menuDropdown = isMenuOpen ? (
    <>
      <div
        className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded-xl border border-white/[0.08] bg-[#1a1025] py-1 shadow-lg backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            onMenuToggle();
            alert('Edit-Feature kommt gleich!');
          }}
          className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-white/80 hover:bg-white/[0.06]"
        >
          <Edit className="h-4 w-4" />
          Bearbeiten
        </button>
        <button
          type="button"
          onClick={() => {
            onMenuToggle();
            onDelete();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm font-medium text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
          Löschen
        </button>
      </div>
      <div className="fixed inset-0 z-[5]" aria-hidden onClick={onMenuToggle} />
    </>
  ) : null;

  /** Sammlung: Split-List-View — immer horizontal (Thumbnail links, Text rechts) */
  if (glass) {
    return (
      <div
        data-result-id={resultId}
        className="group relative flex cursor-pointer flex-row items-center overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.03] p-3 backdrop-blur-md transition-all duration-300 hover:border-white/[0.09]"
        onClick={onSelect}
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl md:h-32 md:w-32">
          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt="" className="h-full w-full rounded-xl object-cover" />
          ) : (
            <>
              <div className={cn('absolute inset-0 rounded-xl', theme.gradient)} aria-hidden />
              <div className="pointer-events-none absolute inset-0 rounded-xl bg-white/0 transition-colors group-hover:bg-white/10" aria-hidden />
              <ThemeIcon
                className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-md md:h-12 md:w-12"
                strokeWidth={2}
                aria-hidden
              />
            </>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-center pl-4 pr-10">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-white md:text-lg">
            {recipe.recipeName || 'Rezept'}
          </h3>
          <div className="mt-2 flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
            {recipe.stats?.time ? (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {recipe.stats.time}
              </span>
            ) : null}
            {recipe.stats?.calories != null ? (
              <span className="inline-flex items-center gap-1">
                <Flame className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                {typeof recipe.stats.calories === 'number' ? `${recipe.stats.calories} kcal` : recipe.stats.calories}
              </span>
            ) : null}
          </div>
          {(showVeganBadge || showHighProteinBadge) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {showVeganBadge && (
                <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300/90">
                  Veggie
                </span>
              )}
              {showHighProteinBadge && (
                <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-200/90">
                  Protein
                </span>
              )}
            </div>
          )}
          {recipe.imageCredit ? (
            <p className="mt-2 line-clamp-1 text-[9px] font-medium text-white/30">Photo: {recipe.imageCredit}</p>
          ) : null}
        </div>

        <div className="absolute right-3 top-3 z-20">
          {menuButton}
          {menuDropdown}
        </div>
      </div>
    );
  }

  return (
    <div
      data-result-id={resultId}
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl',
        theme.shadow,
        'shadow-sm'
      )}
      onClick={onSelect}
    >
      <div className="relative flex h-44 shrink-0 items-center justify-center overflow-hidden">
        {recipe.imageUrl ? (
          <>
            <img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/35 to-transparent"
              aria-hidden
            />
          </>
        ) : (
          <>
            <div className={cn('absolute inset-0', theme.gradient)} aria-hidden />
            <div className="pointer-events-none absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/10" aria-hidden />
            <ThemeIcon className="relative z-10 h-16 w-16 shrink-0 text-white drop-shadow-md" strokeWidth={2} aria-hidden />
          </>
        )}
        <div className="absolute right-2 top-2 z-10">
          {menuButton}
          {menuDropdown}
        </div>
      </div>
      <div className="flex min-h-0 flex-grow flex-col p-4 sm:p-5">
        <h3 className="mb-3 line-clamp-2 text-lg font-bold leading-tight text-white">{recipe.recipeName || 'Rezept'}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {recipe.stats?.time && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/50">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {recipe.stats.time}
            </span>
          )}
          {recipe.stats?.calories != null && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.06] bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-white/50">
              <Flame className="h-3.5 w-3.5 shrink-0" />
              {typeof recipe.stats.calories === 'number' ? `${recipe.stats.calories} kcal` : recipe.stats.calories}
            </span>
          )}
          {showVeganBadge && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300/90">
              Veggie
            </span>
          )}
          {showHighProteinBadge && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300/90">
              High Protein
            </span>
          )}
        </div>
        {recipe.imageCredit ? (
          <p className="mt-3 line-clamp-1 text-[9px] font-medium text-white/30">Photo: {recipe.imageCredit}</p>
        ) : null}
      </div>
    </div>
  );
}
