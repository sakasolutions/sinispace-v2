'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, X } from 'lucide-react';
import { PANTRY_STAPLES } from '@/lib/shopping-lists-storage';
import { formatIngredientDisplay } from '@/lib/format-ingredient';

export type RecipeIngredient = {
  id: string;
  name: string;
  amount: number | null;
  unit: string | null;
  /** Originalzeile für SmartCart / parseIngredient */
  rawLine: string;
};

function isPantryStaple(ing: RecipeIngredient): boolean {
  const n = (ing.name ?? '').toLowerCase();
  return PANTRY_STAPLES.some((staple) => n.includes(staple));
}

export interface PreFlightModalProps {
  isOpen: boolean;
  ingredients: RecipeIngredient[];
  onConfirm: (selectedIngredients: RecipeIngredient[]) => void;
  onCancel: () => void;
}

/**
 * Vor dem Import: User wählt, was wirklich eingekauft werden soll (Staples standardmäßig abgewählt).
 */
export function PreFlightModal({ isOpen, ingredients, onConfirm, onCancel }: PreFlightModalProps) {
  /** IDs der Zutaten, die auf die Einkaufsliste sollen */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen || ingredients.length === 0) return;
    const next = new Set<string>();
    for (const ing of ingredients) {
      if (!isPantryStaple(ing)) next.add(ing.id);
    }
    setSelectedIds(next);
  }, [isOpen, ingredients]);

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const handleConfirm = () => {
    const selected = ingredients.filter((i) => selectedIds.has(i.id));
    onConfirm(selected);
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A]/90 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="preflight-modal-title"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 id="preflight-modal-title" className="text-lg font-bold tracking-tight text-white">
            Lass uns kurz deinen Vorrat checken
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-white/5 p-2 text-white transition-colors hover:bg-white/10"
            aria-label="Abbrechen"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <p className="border-b border-white/5 px-5 py-3 text-sm text-white/55">
          Grün = auf die Einkaufsliste · Grau = habe ich schon im Vorrat
        </p>

        <div className="max-h-[50vh] space-y-0.5 overflow-y-auto p-3">
          {ingredients.map((ing) => {
            const onList = selectedIds.has(ing.id);
            return (
              <button
                key={ing.id}
                type="button"
                onClick={() => toggle(ing.id)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/[0.06]"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-shadow ${
                    onList
                      ? 'border-transparent bg-emerald-500/90 shadow-[0_0_10px_rgba(16,185,129,0.45)]'
                      : 'border border-white/20 bg-white/5'
                  }`}
                  aria-hidden
                >
                  {onList ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
                </span>
                <span
                  className={`min-w-0 flex-1 text-sm ${onList ? 'font-medium text-white' : 'text-gray-400'}`}
                >
                  {formatIngredientDisplay(ing.rawLine)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-white/10 p-5">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3.5 font-semibold text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all hover:from-orange-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {selectedCount} {selectedCount === 1 ? 'Zutat' : 'Zutaten'} zur Liste hinzufügen
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
