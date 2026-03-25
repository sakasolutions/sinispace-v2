'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, ListChecks, Loader2 } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import { appendToList, defaultList, type ShoppingList } from '@/lib/shopping-lists-storage';
import { getShoppingLists, saveShoppingLists } from '@/actions/shopping-list-actions';
import { formatIngredientDisplay } from '@/lib/format-ingredient';

const NEW_LIST_VALUE = '__new__';

export type AddToShoppingListSuccessPayload = {
  count: number;
  listName: string;
  /** Im Modal abgewählte Zutaten („habe ich schon“) – werden nicht in den SmartCart übernommen. */
  uncheckedIngredients: string[];
};

export interface AddToShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: string[];
  onAdded?: (payload: AddToShoppingListSuccessPayload) => void;
}

export function AddToShoppingListModal({
  isOpen,
  onClose,
  ingredients,
  onAdded,
}: AddToShoppingListModalProps) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(ingredients));
  const [selectedListId, setSelectedListId] = useState<string>(NEW_LIST_VALUE);
  const [newListName, setNewListName] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setSelected(new Set(ingredients));
    setNewListName('');
    setLoading(true);
    getShoppingLists()
      .then((loaded) => {
        if (loaded.length === 0) {
          const def = defaultList();
          setLists([def]);
          setSelectedListId(def.id);
        } else {
          setLists(loaded);
          setSelectedListId(loaded[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [isOpen, ingredients]);

  if (!isOpen) return null;

  const toggle = (ing: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ing)) next.delete(ing);
      else next.add(ing);
      return next;
    });
  };

  const handleSubmit = async () => {
    const toAdd = Array.from(selected).map((ing) => formatIngredientDisplay(ing.trim()));
    if (toAdd.length === 0) return;

    const listId = selectedListId === NEW_LIST_VALUE ? NEW_LIST_VALUE : selectedListId;
    const { lists: next, listName, appendedCount } = appendToList(
      lists,
      listId,
      toAdd,
      selectedListId === NEW_LIST_VALUE ? newListName || undefined : undefined
    );
    setSaving(true);
    const { success } = await saveShoppingLists(next);
    setSaving(false);
    if (!success) return;
    const uncheckedIngredients = ingredients.filter((ing) => !selected.has(ing));
    onAdded?.({ count: appendedCount, listName, uncheckedIngredients });
    onClose();
  };

  const selectedCount = selected.size;
  const isNewList = selectedListId === NEW_LIST_VALUE;
  const listOptions: { value: string; label: string }[] = [
    ...lists.map((l) => ({ value: l.id, label: l.name })),
    { value: NEW_LIST_VALUE, label: '+ Neue Liste erstellen' },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-[#1a1025] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] p-4">
          <h2 className="text-lg font-bold text-white">Zutaten in den SmartCart</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06] text-white/50 transition-colors hover:bg-white/[0.1] hover:text-white/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <p className="text-sm text-white/60">
            Zutaten auswählen (abwählen, wenn du sie schon hast):
          </p>

          <div className="max-h-[45vh] divide-y divide-white/[0.06] overflow-y-auto rounded-xl border border-white/[0.06] bg-white/[0.02] pr-2 scrollbar-thin">
            {ingredients.map((ing, i) => {
              const isSelected = selected.has(ing);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(ing)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <div
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors ${
                      isSelected
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                        : 'border-2 border-white/25 bg-white/[0.04]'
                    }`}
                  >
                    {isSelected && <Check className="h-4 w-4 text-white" strokeWidth={2.5} />}
                  </div>
                  <span
                    className={`min-w-0 flex-1 text-sm ${
                      isSelected ? 'font-medium text-white/90' : 'text-white/35 line-through'
                    }`}
                  >
                    {formatIngredientDisplay(ing)}
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-white/70">
              Zu welcher Liste hinzufügen?
            </label>
            {loading ? (
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white/50">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Listen laden …</span>
              </div>
            ) : (
              <CustomSelect
                value={selectedListId}
                onChange={(v) => setSelectedListId(v)}
                options={listOptions}
                placeholder="Liste auswählen"
                theme="dark"
                variant="dropdown"
                dropdownInPortal
                icon={ListChecks}
                triggerClassName="!border-white/[0.08] !bg-white/[0.04] pl-10 focus:!border-orange-400/50 focus:!ring-orange-500/20"
              />
            )}
            {!loading && isNewList && (
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Name der neuen Liste (z.B. Party, Wochenende)"
                className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-white placeholder:text-white/25 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.06] p-4">
          <button
            onClick={() => handleSubmit()}
            disabled={selectedCount === 0 || saving || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ListChecks className="h-4 w-4" />
            )}
            {saving
              ? 'Wird gespeichert …'
              : selectedCount === 0
                ? 'Hinzufügen'
                : `${selectedCount} ${selectedCount === 1 ? 'Zutat' : 'Zutaten'} hinzufügen`}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
