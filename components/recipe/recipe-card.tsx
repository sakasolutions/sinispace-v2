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

/** Dark glass — CookIQ Sammlung */
const GLASS_CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)',
  boxShadow: 'none',
  WebkitBackdropFilter: 'blur(12px)',
  backdropFilter: 'blur(12px)',
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
        className="absolute right-0 top-full z-20 mt-1 min-w-[140px] rounded-xl border border-white/[0.08] bg-[#1a1025] py-1 shadow-lg backdrop-blur-sm"
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

  return (
    <div
      data-result-id={resultId}
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-[24px] transition-all duration-300 hover:-translate-y-1',
        glass
          ? 'border border-white/[0.05]'
          : cn('border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl', theme.shadow, 'hover:shadow-xl shadow-sm')
      )}
      style={glass ? GLASS_CARD_STYLE : undefined}
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
      <div className={cn('flex min-h-0 flex-grow flex-col p-4 sm:p-5', glass && 'bg-white/[0.02]')}>
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
