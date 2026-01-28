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
  sortCategoriesBySupermarktRoute,
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

function formatQtyDisplay(item: ShoppingItem): string {
  const q = item.quantity;
  const u = item.unit?.trim() || null;
  if (q != null && u) return `${q} ${u}`;
  if (q != null) return `${q}`;
  if (u) return u;
  return '';
}

function parseQtyInput(raw: string): { quantity: number | null; unit: string | null } {
  const s = raw.trim();
  if (!s) return { quantity: null, unit: null };
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(\S*)$/);
  if (!m) return { quantity: null, unit: null };
  const q = parseFloat(m[1]!.replace(',', '.'));
  const u = m[2]?.trim() || null;
  if (Number.isNaN(q)) return { quantity: null, unit: null };
  return { quantity: q, unit: u || null };
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
        const qA = data.quantity ?? null;
        const qO = other.quantity ?? null;
        if (qA != null && qO != null) {
          const q = qA + qO;
          const updated = { ...other, quantity: q, unit: other.unit ?? data.unit ?? null };
          const items = list.items
            .filter((it) => it.id !== id)
            .map((it) => (it.id === other.id ? updated : it));
          return prev.map((l) => (l.id !== listId ? l : { ...l, items }));
        }
      }

      const updated: ShoppingItem = {
        ...item,
        text: data.name,
        category: data.category,
        quantity: data.quantity ?? null,
        unit: data.unit ?? null,
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
  const [editingQtyItemId, setEditingQtyItemId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState('');

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
    setEditingQtyItemId((id) => (id === itemId ? null : id));
    setLists((prev) =>
      prev.map((l) =>
        l.id !== listId ? l : { ...l, items: l.items.filter((i) => i.id !== itemId) }
      )
    );
  };

  const updateItemQty = (
    listId: string,
    itemId: string,
    quantity: number | null,
    unit: string | null
  ) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id !== listId
          ? l
          : {
              ...l,
              items: l.items.map((i) =>
                i.id !== itemId ? i : { ...i, quantity, unit }
              ),
            }
      )
    );
    setEditingQtyItemId(null);
    setEditingQtyValue('');
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

  const grouped = unchecked.reduce<Record<string, ShoppingItem[]>>((acc, it) => {
    const cat = it.category ?? 'sonstiges';
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(it);
    return acc;
  }, {});

  const sortedCategories = sortCategoriesBySupermarktRoute(Object.keys(grouped));

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
          Smart Input & KI-Kategorien. Einzel-Item oder Liste einfügen (z.B. aus WhatsApp). Mengen
          nur, wenn du sie angibst.
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
                          {items.map((item) => {
                            const hasQty = item.quantity != null || (item.unit?.trim() ?? '') !== '';
                            const isEditingQty = editingQtyItemId === item.id;
                            const qtyDisplay = formatQtyDisplay(item);
                            const displayLabel =
                              item.quantity != null && !(item.unit?.trim())
                                ? `${item.quantity}x ${item.text}`
                                : hasQty
                                  ? `${qtyDisplay} ${item.text}`.trim()
                                  : item.text;
                            return (
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
                                <div className="flex-1 min-w-0 flex items-center gap-2">
                                  {item.status === 'analyzing' ? (
                                    <span className="text-gray-500 italic">Analysiere …</span>
                                  ) : item.status === 'error' ? (
                                    <span className="text-gray-700">{item.text}</span>
                                  ) : isEditingQty ? (
                                    <>
                                      <input
                                        type="text"
                                        value={editingQtyValue}
                                        onChange={(e) => setEditingQtyValue(e.target.value)}
                                        onBlur={() => {
                                          const { quantity, unit } = parseQtyInput(editingQtyValue);
                                          updateItemQty(activeList.id, item.id, quantity, unit);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            const { quantity, unit } = parseQtyInput(editingQtyValue);
                                            updateItemQty(activeList.id, item.id, quantity, unit);
                                          }
                                          if (e.key === 'Escape') {
                                            setEditingQtyItemId(null);
                                            setEditingQtyValue('');
                                          }
                                        }}
                                        placeholder="z.B. 3 oder 500g"
                                        className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                                        autoFocus
                                      />
                                      <span className="text-gray-900 font-medium">{item.text}</span>
                                    </>
                                  ) : (
                                    <>
                                      {hasQty ? (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingQtyItemId(item.id);
                                            setEditingQtyValue(qtyDisplay);
                                          }}
                                          className="text-gray-500 hover:text-orange-500 hover:underline text-left shrink-0"
                                        >
                                          {item.quantity != null && !(item.unit?.trim())
                                            ? `${item.quantity}x`
                                            : qtyDisplay}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingQtyItemId(item.id);
                                            setEditingQtyValue('');
                                          }}
                                          className="text-gray-400 hover:text-orange-500 text-left text-sm shrink-0"
                                        >
                                          + Menge
                                        </button>
                                      )}
                                      <span className="text-gray-900 font-medium">
                                        {hasQty ? item.text : displayLabel}
                                      </span>
                                    </>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    deleteItem(activeList.id, item.id);
                                  }}
                                  className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all shrink-0"
                                  title="Entfernen"
                                  aria-label="Entfernen"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
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
                        {checked.map((item) => {
                          const hasQty = item.quantity != null || (item.unit?.trim() ?? '') !== '';
                          const qtyD = formatQtyDisplay(item);
                          const erledigtLabel = hasQty
                            ? (item.quantity != null && !(item.unit?.trim())
                              ? `${item.quantity}x ${item.text}`
                              : `${qtyD} ${item.text}`.trim())
                            : item.text;
                          return (
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
                              <span className="flex-1 text-gray-500 line-through">{erledigtLabel}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  deleteItem(activeList!.id, item.id);
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all shrink-0"
                                title="Entfernen"
                                aria-label="Entfernen"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
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
