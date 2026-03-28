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
    // „Fehlt noch“-Zutaten: alle standardmäßig angehakt
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
      className="fixed inset-0 z-[75] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A]/80 shadow-2xl backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="smartcart-modal-title"
      >
        <div className="flex items-center justify-between border-b border-white/10 p-5">
          <h2 id="smartcart-modal-title" className="text-lg font-bold tracking-tight text-white">
            Zutaten in den SmartCart
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/5 p-2 text-white transition-colors hover:bg-white/10"
            aria-label="Schließen"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-white/55">
            Zutaten auswählen (abwählen, wenn du sie schon hast):
          </p>

          <div className="max-h-[45vh] space-y-0.5 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-2 pr-1 scrollbar-thin">
            {ingredients.map((ing, idx) => {
              const isChecked = selected.has(ing);
              return (
                <button
                  key={`${ing}-${idx}`}
                  type="button"
                  onClick={() => toggle(ing)}
                  className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-white/[0.06]"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-shadow ${
                      isChecked
                        ? 'border-transparent bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                        : 'border border-white/20 bg-white/5'
                    }`}
                    aria-hidden
                  >
                    {isChecked ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
                  </span>
                  <span
                    className={`min-w-0 flex-1 text-sm ${
                      isChecked ? 'font-medium text-white' : 'text-gray-400'
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
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/50">
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
                triggerClassName="!rounded-xl !border-white/10 !bg-white/[0.03] !pl-10 !text-white focus:!border-orange-400/40 focus:!ring-orange-500/25"
              />
            )}
            {!loading && isNewList && (
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Name der neuen Liste (z.B. Party, Wochenende)"
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder:text-white/30 transition-all focus:border-orange-400/40 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
            )}
          </div>
        </div>

        <div className="border-t border-white/10 p-5">
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={selectedCount === 0 || saving || loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3.5 font-semibold text-white shadow-[0_0_20px_rgba(236,72,153,0.3)] transition-all hover:from-orange-600 hover:to-pink-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
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
