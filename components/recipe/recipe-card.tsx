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
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: 'none',
  WebkitBackdropFilter: 'blur(12px)',
  backdropFilter: 'blur(12px)',
};

function formatTimeMetric(time?: string): string {
  const t = time?.trim();
  if (!t) return '—';
  return t.replace(/\s+/g, ' ');
}

function formatKcalDisplay(cal: string | number | undefined): { value: string; showKcalSuffix: boolean } {
  if (cal == null) return { value: '—', showKcalSuffix: false };
  if (typeof cal === 'number' && Number.isFinite(cal)) return { value: String(cal), showKcalSuffix: true };
  const s = String(cal).trim();
  if (!s) return { value: '—', showKcalSuffix: false };
  if (/kcal/i.test(s)) {
    const num = s.match(/\d+/)?.[0];
    return { value: num ?? '—', showKcalSuffix: true };
  }
  const digits = s.match(/\d+/);
  return { value: digits ? digits[0] : s, showKcalSuffix: true };
}

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
  /** Tier-1 Cockpit: Metriken oben, Bild als abgedunkelte Textur, Titel unten */
  cockpit?: boolean;
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
  cockpit = false,
}: RecipeCardProps) {
  const ThemeIcon = theme.Icon;
  const timeStr = formatTimeMetric(recipe.stats?.time);
  const { value: kcalValue, showKcalSuffix } = formatKcalDisplay(recipe.stats?.calories);

  const menuButton = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onMenuToggle();
      }}
      className="rounded-full bg-black/40 p-1.5 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/55"
      aria-label="Mehr Optionen"
    >
      <MoreVertical className="h-4 w-4" />
    </button>
  );

  const menuDropdown = isMenuOpen ? (
    <>
      <div
        className="absolute right-0 top-full z-30 mt-1 min-w-[140px] rounded-xl border border-white/[0.08] bg-[#1a1025]/95 py-1 shadow-lg backdrop-blur-md"
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

  if (cockpit) {
    return (
      <div
        data-result-id={resultId}
        className={cn(
          'group relative flex min-h-[220px] cursor-pointer flex-col overflow-hidden rounded-[24px] border border-white/[0.06] transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.1]'
        )}
        style={GLASS_CARD_STYLE}
        onClick={onSelect}
      >
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {recipe.imageUrl ? (
            <img
              src={recipe.imageUrl}
              alt=""
              className="h-full w-full scale-110 object-cover opacity-90 blur-[1.5px] brightness-[0.38] saturate-[0.85]"
            />
          ) : (
            <div className={cn('h-full w-full scale-105 opacity-50', theme.gradient)} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/82 to-black/55" />
          <div className="absolute inset-0 bg-black/25" />
        </div>

        <div className="relative z-10 flex min-h-[220px] flex-col p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap gap-2">
              <div className="rounded-xl border border-brand-orange/40 bg-brand-orange/15 px-2.5 py-1.5 shadow-[0_0_16px_-6px_rgba(249,115,22,0.55)] backdrop-blur-md">
                <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-brand-orange/95">Zeit</span>
                <span className="block text-base font-black leading-tight tracking-tight text-white sm:text-lg">{timeStr}</span>
              </div>
              <div className="rounded-xl border border-brand-pink/40 bg-brand-pink/15 px-2.5 py-1.5 shadow-[0_0_16px_-6px_rgba(236,72,153,0.45)] backdrop-blur-md">
                <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-brand-pink/95">Kcal</span>
                <span className="block text-base font-black leading-tight tracking-tight text-white sm:text-lg">
                  {kcalValue}
                  {showKcalSuffix && kcalValue !== '—' ? (
                    <span className="text-sm font-bold text-white/80"> kcal</span>
                  ) : null}
                </span>
              </div>
            </div>
            <div className="relative z-20 shrink-0">
              {menuButton}
              {menuDropdown}
            </div>
          </div>

          <div className="mt-auto min-w-0 pt-8">
            <h3 className="line-clamp-2 text-left text-base font-black leading-snug tracking-tight text-white drop-shadow-md sm:text-lg">
              {recipe.recipeName || 'Rezept'}
            </h3>
            {(showVeganBadge || showHighProteinBadge) && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {showVeganBadge && (
                  <span className="rounded-md border border-emerald-500/25 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200/90">
                    Veggie
                  </span>
                )}
                {showHighProteinBadge && (
                  <span className="rounded-md border border-sky-500/25 bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-200/90">
                    Protein
                  </span>
                )}
              </div>
            )}
            {recipe.imageCredit ? (
              <p className="mt-2 line-clamp-1 text-left text-[9px] font-medium text-white/30">Photo: {recipe.imageCredit}</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer flex-col overflow-hidden rounded-[24px] transition-all duration-300 hover:-translate-y-1',
        glass
          ? 'border border-white/[0.06]'
          : cn('border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl', theme.shadow, 'hover:shadow-xl shadow-sm')
      )}
      style={glass ? GLASS_CARD_STYLE : undefined}
      onClick={onSelect}
    >
      <div className="relative flex h-40 shrink-0 items-center justify-center overflow-hidden">
        {recipe.imageUrl ? (
          <>
            <img src={recipe.imageUrl} alt="" className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden />
            {recipe.imageCredit && (
              <span className="pointer-events-none absolute bottom-1 left-2 text-[10px] text-white/80">Photo: {recipe.imageCredit}</span>
            )}
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
      <div className={cn('flex min-h-0 flex-grow flex-col p-5', glass && 'bg-white/[0.02]')}>
        <h3 className="mb-3 line-clamp-2 text-lg font-bold leading-tight text-white/90">{recipe.recipeName || 'Rezept'}</h3>
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
      </div>
    </div>
  );
}
