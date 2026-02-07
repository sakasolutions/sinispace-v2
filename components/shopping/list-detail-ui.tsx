'use client';

import { cn } from '@/lib/utils';
import { Check, Plus, ChevronDown } from 'lucide-react';

/** Dashboard-consistent card surface: radius, shadow, border (no green outline) */
const CARD_CLASS =
  'rounded-2xl border border-gray-100 bg-white overflow-hidden';
const CARD_SHADOW =
  'shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_-4px_rgba(0,0,0,0.08)]';

/** Glass-Style wie Dashboard-Karten (Hero-Bereich) + seitlicher Schatten gegen abgehackte Optik */
const GLASS_CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.16)',
  border: '1px solid rgba(255,255,255,0.22)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 0 20px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.08), 0 16px 48px -12px rgba(0,0,0,0.06)',
  WebkitBackdropFilter: 'blur(8px)',
  backdropFilter: 'blur(8px)',
};

/** 1) Sticky Top Action Bar – single row, one container */
export function StickyListBar({
  left,
  right,
  className,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky top-0 z-20 flex items-center justify-between gap-3 py-3 px-4 min-h-[52px]',
        CARD_CLASS,
        CARD_SHADOW,
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">{left}</div>
      <div className="shrink-0">{right}</div>
    </div>
  );
}

/** 2) Summary Card – progress + primary CTA (Glass-Style wie Dashboard-Karten) */
export function SummaryCard({
  progressLabel,
  progressPercent,
  storeMode,
  onToggleStoreMode,
  className,
}: {
  progressLabel: string;
  progressPercent: number;
  storeMode: boolean;
  onToggleStoreMode: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl overflow-hidden',
        className
      )}
      style={GLASS_CARD_STYLE}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-sm font-medium text-gray-700 shrink-0">
          {progressLabel}
        </span>
        <div className="flex-1 min-w-[80px] max-w-[140px] h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-600 to-rose-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onToggleStoreMode}
        className={cn(
          'shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold transition-all shadow-md',
          storeMode
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            : 'bg-gradient-to-r from-orange-600 to-rose-500 text-white hover:from-orange-700 hover:to-rose-600 shadow-orange-500/25'
        )}
      >
        {storeMode ? 'Beenden' : 'Einkauf starten'}
      </button>
    </div>
  );
}

/** 3) Quick Add Card – input row + add button + helper line (Glass-Style) */
export function QuickAddCard({
  inputSlot,
  addButton,
  helperText,
  frequentChips,
  className,
}: {
  inputSlot: React.ReactNode;
  addButton: React.ReactNode;
  helperText?: string;
  frequentChips?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'p-4 rounded-2xl overflow-hidden',
        className
      )}
      style={GLASS_CARD_STYLE}
    >
      <div className="flex gap-2 items-stretch">
        <div className="flex-1 min-w-0">{inputSlot}</div>
        <div className="shrink-0 flex items-center">{addButton}</div>
      </div>
      {frequentChips}
      {helperText && (
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
}

/** 4) Category Card – header (icon, title, count) + item rows (Glass-Style) */
export function CategoryCard({
  title,
  count,
  icon,
  children,
  className,
}: {
  title: string;
  count: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl overflow-hidden',
        className
      )}
      style={GLASS_CARD_STYLE}
    >
      <div className="px-4 py-3 flex items-center gap-2 border-b border-white/20">
        {icon != null && (
          <span className="shrink-0 text-gray-500 opacity-90">{icon}</span>
        )}
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
          {title}
        </span>
        <span className="text-xs text-gray-500">{count}</span>
        <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 ml-auto" aria-hidden />
      </div>
      <div className="divide-y divide-white/20">{children}</div>
    </div>
  );
}

/** 5) Item Row – checkbox left, content middle, actions right; red accent when checked */
export function ItemRow({
  checkbox,
  children,
  actions,
  isChecked,
  className,
}: {
  checkbox: React.ReactNode;
  children: React.ReactNode;
  actions: React.ReactNode;
  isChecked?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 w-full min-h-[52px] py-3 px-4',
        isChecked && 'opacity-90',
        className
      )}
    >
      <div className="shrink-0">{checkbox}</div>
      <div className="flex-1 min-w-0">{children}</div>
      <div className="shrink-0 flex items-center gap-0.5">{actions}</div>
    </div>
  );
}

/** Checkbox for ItemRow – red gradient when checked */
export function ItemRowCheckbox({
  checked,
  isStriking,
  onToggle,
  storeMode,
  ariaLabel,
}: {
  checked: boolean;
  isStriking?: boolean;
  onToggle: () => void;
  storeMode?: boolean;
  ariaLabel: string;
}) {
  const size = storeMode ? 'w-8 h-8' : 'w-7 h-7';
  const iconSize = storeMode ? 'w-5 h-5' : 'w-4 h-4';
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'rounded-lg border-2 flex items-center justify-center shrink-0 transition-all duration-300',
        size,
        checked || isStriking
          ? 'border-transparent bg-gradient-to-br from-orange-500 to-rose-500 text-white'
          : 'border-gray-300 hover:border-orange-400 hover:bg-orange-50'
      )}
      aria-label={ariaLabel}
    >
      {(checked || isStriking) && <Check className={cn('text-white', iconSize)} />}
    </button>
  );
}

/** Quantity pill chip (e.g. "+ Menge" or "3x") */
export function QuantityPill({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick?: () => void;
  className?: string;
}) {
  const base =
    'px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ' +
    (onClick
      ? 'bg-gray-100 hover:bg-orange-100 text-gray-600 hover:text-orange-600 transition-colors'
      : 'bg-gray-100 text-gray-600');
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, className)}>
        {label}
      </button>
    );
  }
  return <span className={cn(base, className)}>{label}</span>;
}
