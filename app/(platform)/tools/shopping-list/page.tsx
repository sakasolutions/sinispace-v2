'use client';

import { useState, useEffect, useCallback } from 'react';
import { BackButton } from '@/components/ui/back-button';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  ListChecks,
  ShoppingCart,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  loadLists,
  saveLists,
  generateId,
  defaultList,
  type ShoppingItem,
  type ShoppingList,
} from '@/lib/shopping-lists-storage';
import {
  getCategoryIcon,
  getCategoryLabel,
  normalizeItemName,
  SHOPPING_CATEGORIES,
} from '@/lib/shopping-list-categories';
import { analyzeShoppingItem } from '@/actions/shopping-list-ai';

/** Smart Input & Paste Magic: Einzel-Item vs. Liste (Umbrüche/Kommas) */
function splitInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function processChunk(
  raw: string,
  listId: string,
  setLists: React.Dispatch<React.SetStateAction<ShoppingList[]>>
) {
  const id = generateId();
  setLists((prev) =>
    prev.map((l) =>
      l.id !== listId
        ? l
        : {
            ...l,
            items: [
              ...l.items,
              {
                id,
                text: raw,
                checked: false,
                status: 'analyzing' as const,
                rawInput: raw,
              },
            ],
          }
    )
  );

  analyzeShoppingItem(raw).then((res) => {
    setLists((prev) => {
      const list = prev.find((l) => l.id === listId);
      if (!list) return prev;
      const idx = list.items.findIndex((i) => i.id === id);
      if (idx < 0) return prev;
      const item = list.items[idx]!;

      if (res.error) {
        const done: ShoppingItem =
          res.error === 'PREMIUM_REQUIRED'
            ? { ...item, status: 'done', text: item.rawInput ?? item.text }
            : { ...item, status: 'error' };
        return prev.map((l) =>
          l.id !== listId ? l : { ...l, items: list.items.map((it, i) => (i === idx ? done : it)) }
        );
      }

      const data = res.data!;
      const norm = normalizeItemName(data.name);
      const other = list.items.find(
        (i) =>
          !i.checked &&
          i.status === 'done' &&
          i.id !== id &&
          normalizeItemName(i.text) === norm
      );

      if (other) {
        const q = (data.quantity ?? 1) + (other.quantity ?? 1);
        const p = (data.estimatedPrice ?? 0) + (other.estimatedPrice ?? 0);
        const updated = { ...other, quantity: q, estimatedPrice: p };
        const items = list.items
          .filter((it) => it.id !== id)
          .map((it) => (it.id === other.id ? updated : it));
        return prev.map((l) => (l.id !== listId ? l : { ...l, items }));
      }

      const updated: ShoppingItem = {
        ...item,
        text: data.name,
        category: data.category,
        quantity: data.quantity,
        unit: data.unit,
        estimatedPrice: data.estimatedPrice,
        status: 'done',
        rawInput: raw,
      };
      const items = list.items.map((it, i) => (i === idx ? updated : it));
      return prev.map((l) => (l.id !== listId ? l : { ...l, items }));
    });
  });
}

export default function ShoppingListPage() {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [newItemInput, setNewItemInput] = useState('');
  const [modalNewList, setModalNewList] = useState(false);
  const [modalRename, setModalRename] = useState<string | null>(null);
  const [modalDeleteList, setModalDeleteList] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState('');
  const [hydrated, setHydrated] = useState(false);

  const activeList = lists.find((l) => l.id === activeListId);

  useEffect(() => {
    const loaded = loadLists();
    if (loaded.length > 0) {
      setLists(loaded);
      setActiveListId(loaded[0]!.id);
    } else {
      const def = defaultList();
      setLists([def]);
      setActiveListId(def.id);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || lists.length === 0) return;
    saveLists(lists);
  }, [lists, hydrated]);

  const addList = (name: string) => {
    const trimmed = (name.trim() || 'Neue Liste').slice(0, 80);
    const next: ShoppingList = { id: generateId(), name: trimmed, items: [] };
    setLists((prev) => [...prev, next]);
    setActiveListId(next.id);
    setModalNewList(false);
    setPendingName('');
  };

  const renameList = (name: string) => {
    if (!modalRename) return;
    const trimmed = (name.trim() || 'Liste').slice(0, 80);
    setLists((prev) => prev.map((l) => (l.id === modalRename ? { ...l, name: trimmed } : l)));
    setModalRename(null);
    setPendingName('');
  };

  const deleteList = (id: string) => {
    const next = lists.filter((l) => l.id !== id);
    if (next.length === 0) {
      const def = defaultList();
      setLists([def]);
      setActiveListId(def.id);
    } else {
      if (activeListId === id) setActiveListId(next[0]!.id);
      setLists(next);
    }
    setModalDeleteList(null);
  };

  const submitSmartInput = useCallback(() => {
    const chunks = splitInput(newItemInput);
    if (chunks.length === 0 || !activeListId) return;
    setNewItemInput('');
    chunks.forEach((raw) => processChunk(raw, activeListId, setLists));
  }, [newItemInput, activeListId]);

  const toggleItem = (listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const items = l.items.map((i) =>
          i.id === itemId ? { ...i, checked: !i.checked } : i
        );
        const sorted = [...items].sort((a, b) => (a.checked ? 1 : 0) - (b.checked ? 1 : 0));
        return { ...l, items: sorted };
      })
    );
  };

  const deleteItem = (listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id !== listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l
      )
    );
  };

  const openRename = (list: ShoppingList) => {
    setPendingName(list.name);
    setModalRename(list.id);
  };

  const openDelete = (list: ShoppingList) => {
    setModalDeleteList(list.id);
  };

  const unchecked = activeList?.items.filter((i) => !i.checked) ?? [];
  const checked = activeList?.items.filter((i) => i.checked) ?? [];
  const totalEstimated = unchecked.reduce((sum, i) => sum + (i.estimatedPrice ?? 0), 0);

  const grouped = unchecked.reduce<Record<string, ShoppingItem[]>>((acc, it) => {
    const cat = it.category ?? 'sonstiges';
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(it);
    return acc;
  }, {});

  const sortedCategories = [...SHOPPING_CATEGORIES];

  if (!hydrated) {
    return (
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
        <BackButton href="/dashboard" className="text-gray-600 hover:text-gray-900 mb-4" />
        <div className="animate-pulse rounded-2xl bg-gray-100 h-64" />
      </div>
    );
  }

  return (
    <div
      className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8 md:pb-12"
      style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
    >
      <BackButton href="/dashboard" className="text-gray-600 hover:text-gray-900 mb-4" />

      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
          SiniSpace Einkaufslisten
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
          Smart Input, KI-Kategorien & Preis-Schätzung. Einzel-Item oder Liste einfügen (z.B. aus
          WhatsApp).
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:gap-6 md:items-start">
        <div className="md:w-56 lg:w-64 shrink-0 mb-4 md:mb-0">
          <div className="flex md:flex-col gap-2">
            <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2 md:pb-0 md:overflow-visible md:flex-col md:gap-1">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className={cn(
                    'flex items-center gap-2 group shrink-0 md:shrink-0 rounded-xl px-4 py-3 transition-all',
                    activeListId === list.id
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-md shadow-orange-500/25'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setActiveListId(list.id)}
                    className="flex-1 min-w-0 text-left flex items-center gap-2"
                  >
                    <ListChecks className="w-4 h-4 shrink-0" />
                    <span className="truncate font-medium text-sm">{list.name}</span>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openRename(list);
                      }}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        activeListId === list.id
                          ? 'hover:bg-white/20 text-white'
                          : 'hover:bg-gray-200 text-gray-500'
                      )}
                      title="Umbenennen"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDelete(list);
                      }}
                      className={cn(
                        'p-1.5 rounded-lg transition-colors',
                        activeListId === list.id
                          ? 'hover:bg-white/20 text-white'
                          : 'hover:bg-red-50 hover:text-red-600 text-gray-500'
                      )}
                      title="Liste löschen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setPendingName('');
                setModalNewList(true);
              }}
              className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              Neue Liste
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-0 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col">
          {activeList ? (
            <>
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{activeList.name}</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemInput}
                    onChange={(e) => setNewItemInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        submitSmartInput();
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = (e.clipboardData?.getData?.('text') ?? '').trim();
                      const chunks = splitInput(pasted);
                      if (chunks.length > 0 && activeListId) {
                        e.preventDefault();
                        e.stopPropagation();
                        chunks.forEach((raw) => processChunk(raw, activeListId, setLists));
                        setNewItemInput('');
                      }
                    }}
                    placeholder="Was brauchst du? (Einzel-Item oder Liste mit Kommas/Zeilen)"
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={submitSmartInput}
                    disabled={!splitInput(newItemInput).length}
                    className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center hover:from-orange-600 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/25"
                    title="Hinzufügen"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Tipp: Liste aus WhatsApp einfügen → Zeilen/Kommas werden erkannt, jedes Item wird
                  einzeln analysiert.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto">
                {unchecked.length === 0 && checked.length === 0 ? (
                  <div className="p-8 sm:p-12 text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Noch keine Einträge.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Tippe etwas ein oder füge eine Liste ein (z.B. aus WhatsApp).
                    </p>
                  </div>
                ) : (
                  <>
                    {sortedCategories.map((cat) => {
                      const items = grouped[cat] ?? [];
                      if (items.length === 0) return null;
                      const label = getCategoryLabel(cat);
                      const icon = getCategoryIcon(cat);
                      return (
                        <div key={cat} className="border-b border-gray-100 last:border-b-0">
                          <div className="px-4 sm:px-6 py-2 bg-gray-50/80 flex items-center gap-2">
                            <span className="text-lg" aria-hidden>
                              {icon}
                            </span>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                              {label}
                            </span>
                          </div>
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-gray-50/50 transition-colors group"
                            >
                              <button
                                type="button"
                                onClick={() => toggleItem(activeList.id, item.id)}
                                className="w-6 h-6 rounded-md border-2 border-gray-300 flex items-center justify-center shrink-0 hover:border-orange-400 hover:bg-orange-50 transition-colors"
                                aria-label="Abhaken"
                              />
                              <span className="text-lg shrink-0 flex items-center justify-center w-6" aria-hidden>
                                {item.status === 'analyzing' ? (
                                  <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                                ) : (
                                  getCategoryIcon(item.category)
                                )}
                              </span>
                              <div className="flex-1 min-w-0">
                                {item.status === 'analyzing' ? (
                                  <span className="text-gray-500 italic">Analysiere …</span>
                                ) : item.status === 'error' ? (
                                  <span className="text-gray-700">{item.text}</span>
                                ) : (
                                  <span className="text-gray-900 font-medium">
                                    {[item.quantity, item.unit].filter(Boolean).length > 0
                                      ? [item.quantity, item.unit, item.text].filter(Boolean).join(' ')
                                      : item.text}
                                  </span>
                                )}
                              </div>
                              {item.status === 'done' && typeof item.estimatedPrice === 'number' && (
                                <span className="text-sm text-gray-500 shrink-0">
                                  ca. {item.estimatedPrice.toFixed(2).replace('.', ',')} €
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => deleteItem(activeList.id, item.id)}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                title="Entfernen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {checked.length > 0 && (
                      <div className="bg-gray-50/80">
                        <div className="px-4 sm:px-6 py-2 flex items-center gap-2">
                          <span className="text-lg" aria-hidden>
                            ✓
                          </span>
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Erledigt
                          </span>
                        </div>
                        {checked.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-gray-100/80 transition-colors group"
                          >
                            <button
                              type="button"
                              onClick={() => toggleItem(activeList!.id, item.id)}
                              className="w-6 h-6 rounded-md border-2 border-orange-500 bg-orange-500 flex items-center justify-center shrink-0 hover:bg-orange-600 hover:border-orange-600 transition-colors"
                              aria-label="Rückgängig"
                            >
                              <Check className="w-3.5 h-3.5 text-white" />
                            </button>
                            <span className="text-lg shrink-0 opacity-50" aria-hidden>
                              {getCategoryIcon(item.category)}
                            </span>
                            <span className="flex-1 text-gray-500 line-through">{item.text}</span>
                            <button
                              type="button"
                              onClick={() => deleteItem(activeList!.id, item.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                              title="Entfernen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {unchecked.length > 0 && totalEstimated > 0 && (
                <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
                  <div className="text-right">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      Geschätzt (Summe)
                    </span>
                    <p className="text-lg font-bold text-gray-900">
                      ca. {totalEstimated.toFixed(2).replace('.', ',')} €
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 sm:p-12 text-center">
              <ListChecks className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Keine Liste ausgewählt.</p>
              <p className="text-sm text-gray-400 mt-1">
                Erstelle eine neue Liste oder wähle eine vorhandene.
              </p>
            </div>
          )}
        </div>
      </div>

      {modalNewList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setModalNewList(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Neue Liste</h3>
            <input
              type="text"
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addList(pendingName);
                if (e.key === 'Escape') setModalNewList(false);
              }}
              placeholder="z.B. Supermarkt, Drogerie…"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModalNewList(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => addList(pendingName)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium text-sm hover:from-orange-600 hover:to-pink-600 transition-colors shadow-md shadow-orange-500/25"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRename && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setModalRename(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4">Liste umbenennen</h3>
            <input
              type="text"
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameList(pendingName);
                if (e.key === 'Escape') setModalRename(null);
              }}
              placeholder="Name der Liste"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModalRename(null)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => renameList(pendingName)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium text-sm hover:from-orange-600 hover:to-pink-600 transition-colors shadow-md shadow-orange-500/25"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {modalDeleteList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setModalDeleteList(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">Liste löschen</h3>
            <p className="text-sm text-gray-600 mb-4">
              Möchtest du „{lists.find((l) => l.id === modalDeleteList)?.name}“ wirklich löschen?
              Alle Einträge gehen verloren.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setModalDeleteList(null)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => deleteList(modalDeleteList)}
                className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium text-sm transition-colors"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
