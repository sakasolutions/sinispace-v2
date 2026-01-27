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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'sinispace-shopping-lists';

type ShoppingItem = { id: string; text: string; checked: boolean };
type ShoppingList = { id: string; name: string; items: ShoppingItem[] };

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function defaultList(): ShoppingList {
  return { id: generateId(), name: 'Allgemein', items: [] };
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

  const save = useCallback((next: ShoppingList[]) => {
    if (next.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (_) {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ShoppingList[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLists(parsed);
          setActiveListId(parsed[0].id);
          setHydrated(true);
          return;
        }
      }
    } catch (_) {}
    const def = defaultList();
    setLists([def]);
    setActiveListId(def.id);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || lists.length === 0) return;
    save(lists);
  }, [lists, hydrated, save]);

  const addList = (name: string) => {
    const trimmed = (name.trim() || 'Neue Liste').slice(0, 80);
    const next: ShoppingList = { id: generateId(), name: trimmed, items: [] };
    setLists((prev) => [...prev, next]);
    setActiveListId(next.id);
    setModalNewList(false);
    setPendingName('');
  };

  const renameList = (id: string, name: string) => {
    const trimmed = (name.trim() || 'Liste').slice(0, 80);
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: trimmed } : l)));
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
      if (activeListId === id) setActiveListId(next[0].id);
      setLists(next);
    }
    setModalDeleteList(null);
  };

  const addItem = (listId: string, text: string) => {
    const trimmed = text.trim().slice(0, 500);
    if (!trimmed) return;
    const item: ShoppingItem = { id: generateId(), text: trimmed, checked: false };
    setLists((prev) =>
      prev.map((l) => (l.id === listId ? { ...l, items: [...l.items, item] } : l))
    );
    setNewItemInput('');
  };

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
        l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l
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
          Mehrere Listen verwalten – Supermarkt, Drogerie, Geburtstag & mehr.
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:gap-6 md:items-start">
        {/* Sidebar (Desktop) / Top-Tabs (Mobile) */}
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

        {/* Main Area */}
        <div className="flex-1 min-w-0 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
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
                        addItem(activeList.id, newItemInput);
                      }
                    }}
                    placeholder="Was brauchst du?"
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => addItem(activeList.id, newItemInput)}
                    disabled={!newItemInput.trim()}
                    className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center hover:from-orange-600 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/25"
                    title="Hinzufügen"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {activeList.items.filter((i) => !i.checked).length === 0 &&
                activeList.items.filter((i) => i.checked).length === 0 ? (
                  <div className="p-8 sm:p-12 text-center">
                    <ShoppingCart className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">Noch keine Einträge.</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Tippe oben etwas ein und klicke auf +.
                    </p>
                  </div>
                ) : (
                  <>
                    {activeList.items
                      .filter((i) => !i.checked)
                      .map((item) => (
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
                          <span className="flex-1 text-gray-900 font-medium">{item.text}</span>
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
                    {activeList.items.filter((i) => i.checked).length > 0 && (
                      <div className="bg-gray-50/80">
                        <div className="px-4 sm:px-6 py-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Erledigt
                          </span>
                        </div>
                        {activeList.items
                          .filter((i) => i.checked)
                          .map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-gray-100/80 transition-colors group"
                            >
                              <button
                                type="button"
                                onClick={() => toggleItem(activeList.id, item.id)}
                                className="w-6 h-6 rounded-md border-2 border-orange-500 bg-orange-500 flex items-center justify-center shrink-0 hover:bg-orange-600 hover:border-orange-600 transition-colors"
                                aria-label="Rückgängig"
                              >
                                <Check className="w-3.5 h-3.5 text-white" />
                              </button>
                              <span className="flex-1 text-gray-500 line-through">{item.text}</span>
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

      {/* Modal: Neue Liste */}
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

      {/* Modal: Umbenennen */}
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
                if (e.key === 'Enter') renameList(modalRename, pendingName);
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
                onClick={() => renameList(modalRename, pendingName)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium text-sm hover:from-orange-600 hover:to-pink-600 transition-colors shadow-md shadow-orange-500/25"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Liste löschen */}
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
