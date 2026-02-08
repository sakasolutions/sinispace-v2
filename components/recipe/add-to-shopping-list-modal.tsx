'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, ListChecks, Loader2 } from 'lucide-react';
import { CustomSelect } from '@/components/ui/custom-select';
import { appendToList, defaultList, type ShoppingList } from '@/lib/shopping-lists-storage';
import { getShoppingLists, saveShoppingLists } from '@/actions/shopping-list-actions';
import { formatIngredientDisplay } from '@/lib/format-ingredient';

const NEW_LIST_VALUE = '__new__';

export interface AddToShoppingListModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: string[];
  onAdded?: (count: number, listName: string) => void;
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
    const toAdd = Array.from(selected);
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
    onAdded?.(appendedCount, listName);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Zutaten hinzufügen zu …</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-220px)] space-y-4">
          <p className="text-sm text-gray-600">
            Fehlende Zutaten auswählen (abwählen, wenn du sie schon hast):
          </p>

          <div className="space-y-0 rounded-xl border border-gray-100 overflow-hidden">
            {ingredients.map((ing, i) => {
              const isSelected = selected.has(ing);
              return (
                <button
                  key={i}
                  onClick={() => toggle(ing)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-b-0 ${
                    isSelected ? 'bg-orange-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                      isSelected ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className={`text-sm ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                    {formatIngredientDisplay(ing)}
                  </span>
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zu welcher Liste hinzufügen?
            </label>
            {loading ? (
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Listen laden …</span>
              </div>
            ) : (
              <CustomSelect
                value={selectedListId}
                onChange={(v) => setSelectedListId(v)}
                options={listOptions}
                placeholder="Liste wählen…"
                theme="light"
                variant="dropdown"
                dropdownInPortal
                icon={ListChecks}
              />
            )}
            {!loading && isNewList && (
              <input
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="Name der neuen Liste (z.B. Party, Wochenende)"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
              />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => handleSubmit()}
            disabled={selectedCount === 0 || saving || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/25"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ListChecks className="w-4 h-4" />
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
