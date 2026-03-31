'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  ListChecks,
  ShoppingCart,
  Loader2,
  Leaf,
  Beef,
  Milk,
  Croissant,
  Wine,
  Package,
  Home,
  Snowflake,
  Share2,
  RotateCcw,
  HelpCircle,
  MoreVertical,
  Sparkles,
  Edit2,
  Bot,
  Smartphone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generateId,
  defaultList,
  mergeShoppingListsFromServer,
  mergeShoppingItemContainers,
  formatContainerTotalLabel,
  formatItemSourceLine,
  createManualShoppingItemFromParts,
  migrateShoppingLists,
  type ItemSource,
  type ShoppingItem,
  type ShoppingList,
} from '@/lib/shopping-lists-storage';
import {
  getShoppingLists,
  saveShoppingLists,
  getFrequentItems,
  searchFrequentItems,
  recordFrequentItem,
} from '@/actions/shopping-list-actions';
import {
  getCategoryTheme,
  normalizeItemName,
  sortCategoriesBySupermarktRoute,
} from '@/lib/shopping-list-categories';
import { parseQtyInputForShopping } from '@/lib/shopping-piece-quantity';
import { parseIngredient } from '@/lib/ingredient-parser';
import { parseSingleItem } from '@/actions/parseItem';
import { DashboardShell } from '@/components/platform/dashboard-shell';
import { WhatIsThisModal } from '@/components/ui/what-is-this-modal';
import {
  FloatingQuickAddCard,
  UnifiedListSheet,
  StickyCategoryHeader,
  UnifiedItemRow,
  UnifiedCheckbox,
  UnifiedQuantityBadge,
  StoreQtyPill,
} from '@/components/shopping/list-detail-ui';
import { SmartMergeAiLoader } from '@/components/shopping/smart-merge-ai-loader';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  Leaf,
  Beef,
  Milk,
  Croissant,
  Wine,
  Package,
  Home,
  Snowflake,
};

/** Teilt Rohtext in Zeilen/Chunks (für lokalen Fallback bei KI-Fehler). */
function splitInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function formatQtyDisplay(item: ShoppingItem): string {
  return formatContainerTotalLabel(item);
}

/** Lokaler Fallback-Chunk → Items (für `workingItems`-Sync in `processSmartInput`). */
function mergeFallbackChunkIntoItems(
  existing: ShoppingItem[],
  rawInput: string,
  onItemDone?: (displayText: string) => void
): ShoppingItem[] {
  const chunks = splitInput(rawInput);
  if (chunks.length === 0) return existing;
  const incoming: ShoppingItem[] = chunks.map((text) => {
    const parsed = parseIngredient(text);
    if (parsed.amount != null) {
      onItemDone?.(parsed.name);
      return createManualShoppingItemFromParts(parsed.name, parsed.amount, parsed.unit, 'sonstiges');
    }
    onItemDone?.(text);
    return createManualShoppingItemFromParts(text, null, null, 'sonstiges');
  });
  return mergeShoppingItemContainers(existing, incoming);
}

/** Fallback: Bei KI-Fehler oder leerer Antwort Items lokal splitten und als 'sonstiges' einfügen (kein Datenverlust). */
function addFallbackItems(
  rawInput: string,
  listId: string,
  setLists: React.Dispatch<React.SetStateAction<ShoppingList[]>>,
  onItemDone?: (displayText: string) => void
) {
  const chunks = splitInput(rawInput);
  if (chunks.length === 0) return;
  setLists((prev) =>
    prev.map((l) => {
      if (l.id !== listId) return l;
      return { ...l, items: mergeFallbackChunkIntoItems(l.items, rawInput, onItemDone) };
    })
  );
}

/** Echtzeit: `parseSingleItem` → Container-Merge (nur gleicher Name). */
async function processSmartInput(
  rawInput: string,
  listId: string,
  setLists: React.Dispatch<React.SetStateAction<ShoppingList[]>>,
  onItemDone?: (displayText: string) => void,
  onAiProcessing?: (loading: boolean) => void,
  itemsByListIdRef?: React.MutableRefObject<Record<string, ShoppingItem[]>>
): Promise<void> {
  const trimmed = rawInput.trim();
  if (!trimmed || !listId) return;

  const chunks = splitInput(trimmed);
  if (chunks.length === 0) return;

  onAiProcessing?.(true);
  try {
    for (const chunk of chunks) {
      const c = chunk.trim();
      if (!c) continue;
      try {
        const existingNames = (itemsByListIdRef?.current?.[listId] ?? []).map((i) => i.name);
        const res = await parseSingleItem(c, existingNames);
        if (res.data) {
          const { name, amount, unit, category, suggestedMergeTarget: rawSuggestion } = res.data;
          const nameTrim = name.trim();
          const unitTrim = String(unit ?? '').trim() || 'x';
          const suggestion = (rawSuggestion ?? '').trim();
          const suggestionMatchesExisting =
            suggestion.length > 0 &&
            (itemsByListIdRef?.current?.[listId] ?? []).some(
              (i) => normalizeItemName(i.name) === normalizeItemName(suggestion)
            );
          const suggestionDiffersFromNew =
            suggestion.length > 0 && normalizeItemName(suggestion) !== normalizeItemName(nameTrim);
          const suggestedMergeTarget =
            suggestionMatchesExisting && suggestionDiffersFromNew ? suggestion : undefined;

          const baseUnit: ShoppingItem['baseUnit'] =
            unitTrim === 'g' ? 'g' : unitTrim === 'ml' ? 'ml' : 'x';

          const inc: ShoppingItem = {
            id: generateId(),
            name: nameTrim,
            totalAmount: amount,
            baseUnit,
            unit: unitTrim,
            category,
            isChecked: false,
            sources: [
              {
                id: generateId(),
                type: 'manual',
                amount,
                originalUnit: unitTrim,
              },
            ],
            ...(suggestedMergeTarget ? { suggestedMergeTarget } : {}),
          };
          setLists((prev) =>
            prev.map((l) => {
              if (l.id !== listId) return l;
              const nextItems = mergeShoppingItemContainers(l.items, [inc]);
              if (itemsByListIdRef) itemsByListIdRef.current[listId] = nextItems;
              onItemDone?.(inc.name);
              return { ...l, items: nextItems };
            })
          );
        } else {
          setLists((prev) =>
            prev.map((l) => {
              if (l.id !== listId) return l;
              const nextItems = mergeFallbackChunkIntoItems(l.items, c, onItemDone);
              if (itemsByListIdRef) itemsByListIdRef.current[listId] = nextItems;
              return { ...l, items: nextItems };
            })
          );
        }
      } catch (error) {
        console.warn('parseSingleItem abgebrochen, Fallback:', error);
        setLists((prev) =>
          prev.map((l) => {
            if (l.id !== listId) return l;
            const nextItems = mergeFallbackChunkIntoItems(l.items, c, onItemDone);
            if (itemsByListIdRef) itemsByListIdRef.current[listId] = nextItems;
            return { ...l, items: nextItems };
          })
        );
      }
    }
  } finally {
    onAiProcessing?.(false);
  }
}

function capitalizeLabel(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatItemExport(item: ShoppingItem): string {
  const qtyD = formatQtyDisplay(item);
  return `${qtyD} ${item.name}`.trim();
}

function ShoppingItemNameStack({
  name,
  nameClassName,
  subLine,
  subLineClassName,
}: {
  name: string;
  nameClassName: string;
  subLine: string | null;
  subLineClassName?: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
      <span className={cn('block min-w-0 truncate', nameClassName)} title={name}>
        {name}
      </span>
      {subLine ? (
        <span
          className={cn(
            'mt-0.5 block min-w-0 truncate text-[11px] leading-tight text-gray-500',
            subLineClassName
          )}
          title={subLine}
        >
          {subLine}
        </span>
      ) : null}
    </div>
  );
}

function ShoppingItemSourcesSublist({ sources }: { sources: ItemSource[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-1 space-y-0.5 pl-2">
      {sources.map((s) => (
        <div key={s.id} className="text-[11px] leading-snug text-gray-500">
          ↳ {formatItemSourceLine(s)} (
          {s.type === 'manual' ? 'Zusätzlich' : s.recipeName ? `Für ${s.recipeName}` : 'Rezept'})
        </div>
      ))}
    </div>
  );
}

function SmartMergeSuggestionButton({
  targetLabel,
  onMerge,
}: {
  targetLabel: string;
  onMerge: () => void;
}) {
  const targetName = targetLabel
    ? targetLabel.charAt(0).toUpperCase() + targetLabel.slice(1)
    : targetLabel;
  return (
    <button
      type="button"
      onClick={onMerge}
      className="text-xs text-purple-400 font-medium mt-1 ml-6 flex items-center gap-1 hover:text-purple-300 transition-colors"
    >
      ✨ Mit &apos;{targetName}&apos; zusammenfassen?
    </button>
  );
}

export default function ShoppingListPage() {
  const searchParams = useSearchParams();
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
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [justCheckedIds, setJustCheckedIds] = useState<Set<string>>(new Set());
  const [frequentItems, setFrequentItems] = useState<{ itemLabel: string }[]>([]);
  const [typeAheadSuggestions, setTypeAheadSuggestions] = useState<{ itemLabel: string }[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [typeAheadOpen, setTypeAheadOpen] = useState(false);
  const [storeMode, setStoreMode] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemValue, setEditingItemValue] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [isSmartMergeProcessing, setIsSmartMergeProcessing] = useState(false);
  const smartMergeInflightRef = useRef(0);
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setSmartMergeProcessingGate = useCallback((loading: boolean) => {
    if (loading) {
      smartMergeInflightRef.current += 1;
      if (smartMergeInflightRef.current === 1) setIsSmartMergeProcessing(true);
    } else {
      smartMergeInflightRef.current = Math.max(0, smartMergeInflightRef.current - 1);
      if (smartMergeInflightRef.current === 0) setIsSmartMergeProcessing(false);
    }
  }, []);

  useEffect(() => {
    if (modalRename) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalRename]);

  const activeList = lists.find((l) => l.id === activeListId);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitiallyLoaded = useRef(false);
  const refetchGenRef = useRef(0);
  const listsRef = useRef<ShoppingList[]>([]);
  listsRef.current = lists;
  const itemsByListIdRef = useRef<Record<string, ShoppingItem[]>>({});
  const activeListIdRef = useRef<string | null>(null);
  const typeAheadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  // Keep latest items per list for async parsing (avoid stale closures/race overwrites).
  useEffect(() => {
    const map: Record<string, ShoppingItem[]> = {};
    for (const l of lists) map[l.id] = l.items;
    itemsByListIdRef.current = map;
  }, [lists]);

  useEffect(() => {
    let cancelled = false;
    getShoppingLists()
      .then((loaded) => {
        if (cancelled) return;
        hasInitiallyLoaded.current = true;
        const listIdFromUrl = searchParams.get('listId');
        if (loaded && loaded.length > 0) {
          setLists(migrateShoppingLists(loaded));
          const preferredId = listIdFromUrl && loaded.some((l) => l.id === listIdFromUrl) ? listIdFromUrl : loaded[0]!.id;
          setActiveListId(preferredId);
          if (typeof window !== 'undefined') localStorage.setItem('shopping_lists_backup', JSON.stringify(loaded));
        } else {
          const def = defaultList();
          setLists([def]);
          setActiveListId(def.id);
        }
        setHydrated(true);
      })
      .catch((err) => {
        console.warn('Konnte Listen nicht vom Server laden (Offline). Lade lokales Backup.', err);
        if (cancelled) return;
        hasInitiallyLoaded.current = true;
        if (typeof window !== 'undefined') {
          const backup = localStorage.getItem('shopping_lists_backup');
          if (backup) {
            try {
              const parsed = JSON.parse(backup);
              setLists(migrateShoppingLists(parsed));
              if (Array.isArray(parsed) && parsed.length > 0) setActiveListId(parsed[0].id);
            } catch {
              const def = defaultList();
              setLists([def]);
              setActiveListId(def.id);
            }
          } else {
            const def = defaultList();
            setLists([def]);
            setActiveListId(def.id);
          }
        } else {
          const def = defaultList();
          setLists([def]);
          setActiveListId(def.id);
        }
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    activeListIdRef.current = activeListId;
  }, [activeListId]);

  const refetchFromServer = useCallback(async () => {
    if (!hasInitiallyLoaded.current) return;
    const gen = ++refetchGenRef.current;
    const loaded = await getShoppingLists();
    if (gen !== refetchGenRef.current) return;
    if (!loaded || loaded.length === 0) return;
    const prev = listsRef.current;
    const merged = mergeShoppingListsFromServer(loaded, prev);
    const cur = activeListIdRef.current;
    const keep = cur && merged.some((l) => l.id === cur);
    setLists(merged);
    setActiveListId(keep ? cur! : merged[0]!.id);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    const handler = async () => {
      if (document.visibilityState !== 'visible' || !hasInitiallyLoaded.current) return;
      await refetchFromServer();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [refetchFromServer]);

  useEffect(() => {
    if (!hasInitiallyLoaded.current) return;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refetchFromServer();
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [refetchFromServer]);

  useEffect(() => {
    if (!hydrated || lists.length === 0) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      saveTimeoutRef.current = null;
      if (typeof window !== 'undefined') {
        localStorage.setItem('shopping_lists_backup', JSON.stringify(lists));
      }
      const { success, error } = await saveShoppingLists(lists);
      setSaveErrorMessage(success ? null : (error ?? 'Unbekannter Fehler'));
    }, 400);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [lists, hydrated]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Internet wieder da! Synchronisiere Offline-Änderungen...');
      if (lists.length > 0) {
        saveShoppingLists(lists).catch((err) => console.error('Sync fehlgeschlagen', err));
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }
  }, [lists]);

  // Quick-Add: beim Fokussieren des leeren Eingabefelds häufig gekaufte Items laden
  const loadFrequentItems = useCallback(async () => {
    const items = await getFrequentItems(10);
    setFrequentItems(items);
  }, []);

  // Type-Ahead: bei Eingabe ab 2 Zeichen Vorschläge suchen (debounced)
  useEffect(() => {
    const q = newItemInput.trim();
    if (q.length < 2) {
      setTypeAheadSuggestions([]);
      setTypeAheadOpen(false);
      return;
    }
    if (typeAheadDebounceRef.current) clearTimeout(typeAheadDebounceRef.current);
    typeAheadDebounceRef.current = setTimeout(async () => {
      typeAheadDebounceRef.current = null;
      const suggestions = await searchFrequentItems(q, 8);
      setTypeAheadSuggestions(suggestions);
      setTypeAheadOpen(suggestions.length > 0);
    }, 200);
    return () => {
      if (typeAheadDebounceRef.current) clearTimeout(typeAheadDebounceRef.current);
    };
  }, [newItemInput]);

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
    setLists((prev) => {
      const next = prev.filter((l) => l.id !== id);
      if (next.length === 0) {
        const def = defaultList();
        queueMicrotask(() => setActiveListId(def.id));
        return [def];
      }
      queueMicrotask(() => {
        setActiveListId((cur) => (cur === id ? next[0]!.id : cur));
      });
      return next;
    });
    setModalDeleteList(null);
  };

  const submitSmartInput = useCallback(() => {
    const raw = newItemInput.trim();
    if (!raw || !activeListId || isSmartMergeProcessing) return;
    setTypeAheadOpen(false);
    void processSmartInput(
      raw,
      activeListId,
      setLists,
      (text) => recordFrequentItem(text),
      setSmartMergeProcessingGate,
      itemsByListIdRef
    ).finally(() => {
      setNewItemInput('');
    });
  }, [newItemInput, activeListId, isSmartMergeProcessing, setSmartMergeProcessingGate]);

  const toggleItem = (listId: string, itemId: string) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const items = l.items.map((i) =>
          i.id === itemId ? { ...i, isChecked: !i.isChecked } : i
        );
        const sorted = [...items].sort((a, b) => (a.isChecked ? 1 : 0) - (b.isChecked ? 1 : 0));
        return { ...l, items: sorted };
      })
    );
  };

  const handleToggleItem = (listId: string, itemId: string) => {
    const item = activeList?.items.find((i) => i.id === itemId);
    const willCheck = item && !item.isChecked;
    if (willCheck) {
      recordFrequentItem(item.name);
      setCheckingId(itemId);
      setTimeout(() => {
        toggleItem(listId, itemId);
        setCheckingId(null);
        setJustCheckedIds((s) => new Set(s).add(itemId));
        setTimeout(() => {
          setJustCheckedIds((prev) => {
            const n = new Set(prev);
            n.delete(itemId);
            return n;
          });
        }, 400);
      }, 420);
    } else {
      toggleItem(listId, itemId);
    }
  };

  const deleteItem = (listId: string, itemId: string) => {
    setEditingQtyItemId((id) => (id === itemId ? null : id));
    setEditingItemId((id) => (id === itemId ? null : id));
    setLists((prev) =>
      prev.map((l) =>
        l.id !== listId ? l : { ...l, items: l.items.filter((i) => i.id !== itemId) }
      )
    );
  };

  const handleSmartMerge = useCallback((listId: string, sourceItemId: string, targetName: string) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
        const source = l.items.find((i) => i.id === sourceItemId);
        const target = l.items.find(
          (i) => normalizeItemName(i.name) === normalizeItemName(targetName)
        );
        if (!source || !target || source.id === target.id) return l;
        const mergedSources = [...target.sources, ...source.sources];
        const sameBase = target.baseUnit === source.baseUnit;
        const newTarget: ShoppingItem = {
          ...target,
          totalAmount: sameBase ? target.totalAmount + source.totalAmount : target.totalAmount,
          sources: mergedSources,
          suggestedMergeTarget: undefined,
        };
        return {
          ...l,
          items: l.items
            .filter((i) => i.id !== sourceItemId)
            .map((i) => (i.id === target.id ? newTarget : i)),
        };
      })
    );
  }, []);

  const updateItemText = (listId: string, itemId: string, newText: string) => {
    const t = newText.trim();
    if (!t) return;
    setLists((prev) =>
      prev.map((l) =>
        l.id !== listId
          ? l
          : {
              ...l,
              items: l.items.map((i) =>
                i.id !== itemId ? i : { ...i, name: t, suggestedMergeTarget: undefined }
              ),
            }
      )
    );
    setEditingItemId(null);
    setEditingItemValue('');
  };

  const startEditItem = (item: ShoppingItem, displayLabel: string) => {
    setEditingQtyItemId(null);
    setEditingQtyValue('');
    setEditingItemId(item.id);
    setEditingItemValue(displayLabel);
  };

  const saveEditItem = () => {
    if (!editingItemId || !activeListId) return;
    updateItemText(activeListId, editingItemId, editingItemValue);
  };

  const cancelEditItem = useCallback(() => {
    setEditingItemId(null);
    setEditingItemValue('');
  }, []);

  // Edit-Modus: Klick außerhalb → abbrechen
  useEffect(() => {
    if (!editingItemId) return;
    const handler = (e: MouseEvent) => {
      const el = e.target as Node;
      if (document.querySelector('[data-item-edit]')?.contains(el)) return;
      cancelEditItem();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [editingItemId, cancelEditItem]);

  useEffect(() => () => {
    if (toastRef.current) clearTimeout(toastRef.current);
  }, []);

  const updateItemQty = (
    listId: string,
    itemId: string,
    quantity: number | null,
    unit: string | null
  ) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== listId) return l;
            return {
              ...l,
              items: l.items.map((i) => {
                if (i.id !== itemId) return i;
                const rebuilt = createManualShoppingItemFromParts(i.name, quantity, unit, i.category);
                return {
                  ...rebuilt,
                  id: i.id,
                  isChecked: i.isChecked,
                  suggestedMergeTarget: i.suggestedMergeTarget,
                };
              }),
            };
      })
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

  const resetChecked = (listId: string) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id !== listId
          ? l
          : { ...l, items: l.items.map((i) => ({ ...i, isChecked: false })) }
      )
    );
  };

  const shareList = useCallback(async () => {
    if (!activeList) return;
    const items = activeList.items.filter((i) => !i.isChecked);
    const lines = items.length
      ? items.map((i) => `• ${formatItemExport(i)}`)
      : ['Keine offenen Einträge.'];
    const text = `${activeList.name}\n\n${lines.join('\n')}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: activeList.name,
          text,
        });
      } else {
        await navigator.clipboard?.writeText(text);
        setToast('Liste in Zwischenablage kopiert!');
        if (toastRef.current) clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => {
          toastRef.current = null;
          setToast(null);
        }, 2200);
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      try {
        await navigator.clipboard?.writeText(text);
        setToast('Liste in Zwischenablage kopiert!');
        if (toastRef.current) clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => {
          toastRef.current = null;
          setToast(null);
        }, 2200);
      } catch {
        setToast('Kopieren fehlgeschlagen.');
        if (toastRef.current) clearTimeout(toastRef.current);
        toastRef.current = setTimeout(() => {
          toastRef.current = null;
          setToast(null);
        }, 2200);
      }
    }
  }, [activeList]);

  const unchecked = activeList?.items.filter((i) => !i.isChecked) ?? [];
  const checked = activeList?.items.filter((i) => i.isChecked) ?? [];

  const grouped = unchecked.reduce<Record<string, ShoppingItem[]>>((acc, it) => {
    const cat = it.category ?? 'sonstiges';
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(it);
    return acc;
  }, {});

  const sortedCategories = sortCategoriesBySupermarktRoute(Object.keys(grouped));

  if (!hydrated) {
    return (
      <div className="relative flex min-h-[100dvh] w-full flex-col bg-[#0A0A0A]">
        <header
          className={cn(
            'relative z-[1] min-h-[280px]',
            'w-full max-w-[100vw] -mx-0 sm:-mx-4 md:w-[calc(100%+3rem)] md:-mx-6 lg:w-[calc(100%+4rem)] lg:-mx-8',
            '-mt-[max(0.5rem,env(safe-area-inset-top))] md:-mt-6 lg:-mt-8'
          )}
        >
          <div
            className="absolute top-0 left-0 z-0 h-[280px] w-full rounded-b-[40px] bg-[#050508]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute top-0 left-0 z-0 h-[280px] w-full rounded-b-[40px] bg-[radial-gradient(ellipse_90%_65%_at_50%_-8%,rgba(79,70,229,0.42)_0%,rgba(124,58,237,0.22)_38%,rgba(30,27,75,0.12)_55%,transparent_72%)]"
            aria-hidden
          />
          <div className="relative z-10 w-full px-3 pb-6 pt-8 sm:px-6 md:px-8 md:pt-12">
            <div className="h-8 w-48 animate-pulse rounded-lg bg-white/10" />
            <div className="mt-2 h-4 w-64 animate-pulse rounded bg-white/5" />
          </div>
        </header>
        <div className="relative z-10 mx-auto max-w-5xl px-4 pb-20 sm:px-6 -mt-6">
          <div className="h-[600px] animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col bg-[#0A0A0A]">
      <DashboardShell
        headerVariant="withCTA"
        headerBackground={
          <div className="relative h-full w-full bg-[#050508]">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_65%_at_50%_-8%,rgba(79,70,229,0.42)_0%,rgba(124,58,237,0.22)_38%,rgba(30,27,75,0.12)_55%,transparent_72%)]"
              aria-hidden
            />
          </div>
        }
        title={
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight mt-0 text-white" style={{ letterSpacing: '-0.3px' }}>
              {activeList?.name ?? 'SmartCart'}
            </h1>
            <p className="mt-1 text-sm font-normal text-white sm:text-base" style={{ letterSpacing: '0.1px' }}>
              Dein intelligenter Begleiter
            </p>
            <div className="pointer-events-auto relative z-50 mt-4 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                <ShoppingCart className="h-3.5 w-3.5" />
                {(activeList?.items.filter((i) => !i.isChecked).length ?? 0)} Offen
              </div>
              {/* Smart Liste (Batch-Optimierung) vorübergehend deaktiviert — Echtzeit-Parser ersetzt die alte Pipeline */}
              {/*
              <button
                type="button"
                onClick={() => void handleOptimizeList()}
                disabled={...}
              >
                ✨ Smart Liste
              </button>
              */}
            </div>
          </div>
        }
        subtitle={null}
        headerPrimaryCTA={null}
        headerActionsRight={
          <div className="flex flex-col items-end">
            {/* Obere Reihe: Icons – ohne min-h Wrapper, leicht nach unten gerückt für h1-Mitte */}
            <div className="flex items-center gap-2 mt-1">
              <WhatIsThisModal
                title="SmartCart"
                content={
                  <div className="space-y-4 text-sm text-white/75">
                    <p className="text-base font-medium text-white">Dein SmartCart nimmt dir die Arbeit ab:</p>
                    <ul className="space-y-3 mt-4">
                      <li className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-rose-500 shrink-0" />
                        <span><strong>KI-Sortierung:</strong> Artikel werden automatisch in Supermarkt-Kategorien sortiert.</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Bot className="w-5 h-5 text-rose-500 shrink-0" />
                        <span><strong>Mengen-Erkennung:</strong> &quot;3 Äpfel&quot; oder &quot;500g Mehl&quot; werden direkt verstanden.</span>
                      </li>
                      <li className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-rose-500 shrink-0" />
                        <span><strong>WhatsApp-Import:</strong> Liste aus WhatsApp einfügen – Ein Klick, die KI sortiert alles in einem Durchgang.</span>
                      </li>
                      <li className="flex items-center gap-3 mt-2">
                        <ShoppingCart className="w-5 h-5 text-blue-500 shrink-0" />
                        <span><strong>Einkaufs-Modus:</strong> Der leuchtende Button unten rechts blendet alles Unnötige aus – für den perfekten Überblick im Supermarkt.</span>
                      </li>
                    </ul>
                  </div>
                }
                trigger={
                  <button
                    type="button"
                    aria-label="Was ist das?"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                }
              />
              <button
                type="button"
                onClick={shareList}
                aria-label="Liste teilen"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <Share2 className="h-4 w-4" />
              </button>
              {activeList && !storeMode && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setHeaderMenuOpen((o) => !o)}
                    aria-label="Weitere Aktionen"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white/10 text-white transition-colors hover:bg-white/20"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {headerMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" aria-hidden onClick={() => setHeaderMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-xl border border-white/10 bg-[#0A0A0A]/95 py-1 shadow-xl backdrop-blur-xl">
                        <button
                          type="button"
                          onClick={() => {
                            openRename(activeList);
                            setHeaderMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/90 hover:bg-white/10"
                        >
                          <Pencil className="h-4 w-4" />
                          Liste umbenennen
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            openDelete(activeList);
                            setHeaderMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                          Liste löschen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {/* Untere Reihe: Button auf Höhe der linken Pills (symmetrisch) */}
            <button
              type="button"
              onClick={() => {
                setPendingName('');
                setModalNewList(true);
              }}
              className="mt-8 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md transition-all hover:bg-white/10 sm:mt-9 md:mt-7"
            >
              <Plus className="h-3.5 w-3.5" />
              Neue Liste
            </button>
          </div>
        }
      >
        {/* Master Card (Tier-1 Dashboard-Style): Overlap nur aus Shell (-mt-20), Breite aus Shell (max-w-7xl) */}
        <div className="relative z-10 w-full pb-20">
          <div className="min-h-[300px] overflow-hidden px-4 pb-4 pt-4 sm:px-6 sm:pb-4 sm:pt-6 md:px-8 md:pb-4 md:pt-8">
            {/* Listen-Navigation: Horizontaler Strip (volle Breite), weicher Fade-Out rechts */}
            <div className="mb-4 w-full">
              <div
                className="scrollbar-hide flex min-h-0 w-full gap-2 overflow-x-auto pr-16 [mask-image:linear-gradient(to_right,black_85%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_85%,transparent_100%)]"
              >
                {lists.map((l) => {
                  const isActive = activeListId === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setActiveListId(l.id)}
                      className={cn(
                        'shrink-0 rounded-2xl border px-4 py-2 text-sm font-medium transition-all',
                        isActive
                          ? 'border-white/20 bg-white/10 text-white shadow-[0_0_24px_rgba(249,115,22,0.12)]'
                          : 'border-transparent bg-transparent text-gray-500 hover:text-white/70'
                      )}
                    >
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Command Bar: Eingabefeld direkt unter der Listen-Navigation */}
            {activeList && !storeMode && (
              <div className="mb-6 w-full">
                <FloatingQuickAddCard
                  inputSlot={
                    <div className="flex w-full items-center rounded-2xl border border-white/10 bg-white/[0.03] p-1 backdrop-blur-md transition-all focus-within:ring-2 focus-within:ring-fuchsia-500/30">
                      <div ref={inputContainerRef} className="relative flex-1 min-w-0">
                        <input
                          type="text"
                          value={newItemInput}
                          disabled={isSmartMergeProcessing}
                          aria-busy={isSmartMergeProcessing}
                          onChange={(e) => setNewItemInput(e.target.value)}
                          onFocus={() => { setInputFocused(true); if (!newItemInput.trim()) loadFrequentItems(); }}
                          onBlur={() => { setTimeout(() => { setInputFocused(false); setTypeAheadOpen(false); }, 180); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              if (typeAheadOpen && typeAheadSuggestions.length > 0) {
                                const first = typeAheadSuggestions[0]!.itemLabel;
                                setTypeAheadOpen(false);
                                void processSmartInput(
                                  first,
                                  activeList.id,
                                  setLists,
                                  (t) => recordFrequentItem(t),
                                  setSmartMergeProcessingGate,
                                  itemsByListIdRef
                                ).finally(() => setNewItemInput(''));
                                return;
                              }
                              submitSmartInput();
                            }
                            if (e.key === 'Escape') setTypeAheadOpen(false);
                          }}
                          onPaste={(e) => {
                            const pasted = (e.clipboardData?.getData?.('text') ?? '').trim();
                            if (pasted && activeListId) {
                              e.preventDefault();
                              e.stopPropagation();
                              setTypeAheadOpen(false);
                              void processSmartInput(
                                pasted,
                                activeListId,
                                setLists,
                                (text) => recordFrequentItem(text),
                                setSmartMergeProcessingGate,
                                itemsByListIdRef
                              ).finally(() => setNewItemInput(''));
                            }
                          }}
                          placeholder="Was brauchst du? (Einzel-Item oder Liste…)"
                          className="min-w-0 w-full flex-1 border-none bg-transparent px-4 py-2 text-white outline-none placeholder:text-gray-500 focus:ring-0"
                        />
                        {typeAheadOpen && typeAheadSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#121212]/95 py-1 shadow-xl backdrop-blur-xl">
                            {typeAheadSuggestions.map((s) => (
                              <button
                                key={s.itemLabel}
                                type="button"
                                className="w-full px-4 py-2.5 text-left text-sm text-white/90 transition-colors hover:bg-white/10"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setTypeAheadOpen(false);
                                  void processSmartInput(
                                    s.itemLabel,
                                    activeList.id,
                                    setLists,
                                    (t) => recordFrequentItem(t),
                                    setSmartMergeProcessingGate,
                                    itemsByListIdRef
                                  ).finally(() => setNewItemInput(''));
                                }}
                              >
                                {capitalizeLabel(s.itemLabel)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={submitSmartInput}
                        disabled={!newItemInput.trim() || isSmartMergeProcessing}
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-40"
                        title={isSmartMergeProcessing ? 'Wird geparst…' : 'Hinzufügen'}
                        aria-busy={isSmartMergeProcessing}
                      >
                        {isSmartMergeProcessing ? (
                          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                        ) : (
                          <Plus className="w-5 h-5" aria-hidden />
                        )}
                      </button>
                    </div>
                  }
                  addButton={null}
                  frequentChips={inputFocused && !newItemInput.trim() && frequentItems.length > 0 ? (
                    <div className="mt-3">
                      <p className="mb-2 text-xs font-medium text-white/50">Oft gekauft</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {frequentItems.map((f) => (
                          <button
                            key={f.itemLabel}
                            type="button"
                            onClick={() => {
                              void processSmartInput(
                                f.itemLabel,
                                activeList.id,
                                setLists,
                                (t) => recordFrequentItem(t),
                                setSmartMergeProcessingGate,
                                itemsByListIdRef
                              ).finally(() => setNewItemInput(''));
                              loadFrequentItems();
                            }}
                            className="shrink-0 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-medium text-white/90 backdrop-blur-md transition-colors hover:border-white/20 hover:bg-white/10"
                          >
                            {capitalizeLabel(f.itemLabel)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : undefined}
                />
              </div>
            )}

        {saveErrorMessage && (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200 shadow-sm backdrop-blur-md">
            <div className="mb-1 font-medium text-red-100">Sync fehlgeschlagen.</div>
            <div className="mb-3 text-red-300/90">{saveErrorMessage}</div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  const { success, error } = await saveShoppingLists(lists);
                  setSaveErrorMessage(success ? null : (error ?? 'Unbekannter Fehler'));
                }}
                className="rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-100 transition-colors hover:bg-red-500/30"
              >
                Erneut versuchen
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                Seite neu laden
              </button>
            </div>
          </div>
        )}

        {activeList ? (
            <>
              {isSmartMergeProcessing ? (
                <SmartMergeAiLoader />
              ) : unchecked.length === 0 && checked.length === 0 ? (
                <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-xl backdrop-blur-md sm:p-12">
                  <ShoppingCart className="mx-auto mb-3 h-12 w-12 text-white/25" />
                  <p className="font-medium text-white/80">Noch keine Einträge in deinem SmartCart.</p>
                  <p className="mt-1 text-sm text-white/45">
                    Tippe etwas ein oder füge eine Liste ein (z.B. aus WhatsApp).
                  </p>
                </div>
              ) : (
                <UnifiedListSheet className={storeMode ? 'mt-4 gap-0' : undefined}>
                    {sortedCategories.map((cat, index) => {
                      const items = grouped[cat] ?? [];
                      if (items.length === 0) return null;
                      const theme = getCategoryTheme(cat);
                      return (
                        <Fragment key={cat}>
                          <StickyCategoryHeader title={theme.label} count={items.length} theme={theme} className={index === 0 ? 'pt-0' : undefined} />
                          {items.map((item) => {
                            const qtyDisplay = formatQtyDisplay(item);
                            const hasQty = qtyDisplay.length > 0;
                            const isEditingQty = !storeMode && editingQtyItemId === item.id;
                            const isEditingText = editingItemId === item.id;
                            const displayLabel = `${item.name} (${qtyDisplay})`;
                            const isStriking = checkingId === item.id;
                            const showActions = !storeMode && !isEditingText;
                            const useStoreRow = storeMode && !isEditingText;
                            return (
                              <UnifiedItemRow
                                key={item.id}
                                storeShopping={useStoreRow}
                                onStoreRowClick={
                                  useStoreRow ? () => handleToggleItem(activeList.id, item.id) : undefined
                                }
                                storeAriaLabel={
                                  useStoreRow
                                    ? `${displayLabel} – tippen zum Abhaken`
                                    : undefined
                                }
                                checkbox={
                                  useStoreRow ? (
                                    <UnifiedCheckbox
                                      variant="store"
                                      decorative
                                      checked={false}
                                      onToggle={() => {}}
                                      theme={theme}
                                      ariaLabel="Abhaken"
                                      disabled={false}
                                    />
                                  ) : (
                                    <UnifiedCheckbox
                                      checked={false}
                                      onToggle={() => handleToggleItem(activeList.id, item.id)}
                                      theme={theme}
                                      ariaLabel="Abhaken"
                                      disabled={false}
                                    />
                                  )
                                }
                                actions={
                                  showActions ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          startEditItem(item, item.name);
                                        }}
                                        className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                                        title="Bearbeiten"
                                        aria-label="Bearbeiten"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          deleteItem(activeList.id, item.id);
                                        }}
                                        className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                                        title="Entfernen"
                                        aria-label="Entfernen"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </>
                                  ) : null
                                }
                              >
                                {isEditingText ? (
                                  <>
                                    <input
                                      type="text"
                                      value={editingItemValue}
                                      onChange={(e) => setEditingItemValue(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEditItem(); } if (e.key === 'Escape') cancelEditItem(); }}
                                      className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                                      autoFocus
                                    />
                                    <button
                                      type="button"
                                      onClick={saveEditItem}
                                      className="shrink-0 rounded-lg bg-gradient-to-r from-fuchsia-500/30 to-orange-500/30 p-1.5 text-fuchsia-200 transition-colors hover:from-fuchsia-500/50 hover:to-orange-500/50"
                                      title="Speichern"
                                      aria-label="Speichern"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : isEditingQty ? (
                                  <>
                                    <input
                                      type="text"
                                      value={editingQtyValue}
                                      onChange={(e) => setEditingQtyValue(e.target.value)}
                                      onBlur={() => { const { quantity, unit } = parseQtyInputForShopping(editingQtyValue); updateItemQty(activeList.id, item.id, quantity, unit); }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); const { quantity, unit } = parseQtyInputForShopping(editingQtyValue); updateItemQty(activeList.id, item.id, quantity, unit); }
                                        if (e.key === 'Escape') { setEditingQtyItemId(null); setEditingQtyValue(''); }
                                      }}
                                      placeholder="z.B. 3 oder 500g"
                                      className="w-24 shrink-0 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                                      autoFocus
                                    />
                                    <div className="min-w-0 flex-1">
                                      <ShoppingItemNameStack
                                        name={item.name}
                                        nameClassName={cn('font-medium capitalize text-white', isStriking && 'line-through')}
                                        subLine={null}
                                      />
                                      <ShoppingItemSourcesSublist sources={item.sources} />
                                      {item.suggestedMergeTarget ? (
                                        <SmartMergeSuggestionButton
                                          targetLabel={item.suggestedMergeTarget}
                                          onMerge={() =>
                                            handleSmartMerge(activeList.id, item.id, item.suggestedMergeTarget!)
                                          }
                                        />
                                      ) : null}
                                    </div>
                                  </>
                                ) : storeMode ? (
                                  <>
                                    {hasQty && <StoreQtyPill label={qtyDisplay} />}
                                    <div className="min-w-0 flex-1">
                                      <ShoppingItemNameStack
                                        name={item.name}
                                        nameClassName={cn(
                                          'text-lg font-medium capitalize text-white',
                                          isStriking && 'text-white/35 line-through'
                                        )}
                                        subLine={null}
                                      />
                                      <ShoppingItemSourcesSublist sources={item.sources} />
                                      {item.suggestedMergeTarget ? (
                                        <SmartMergeSuggestionButton
                                          targetLabel={item.suggestedMergeTarget}
                                          onMerge={() =>
                                            handleSmartMerge(activeList.id, item.id, item.suggestedMergeTarget!)
                                          }
                                        />
                                      ) : null}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {hasQty && (
                                      <UnifiedQuantityBadge
                                        label={qtyDisplay}
                                        onClick={() => { setEditingQtyItemId(item.id); setEditingQtyValue(qtyDisplay); }}
                                      />
                                    )}
                                    {!hasQty && (
                                      <UnifiedQuantityBadge label="+ Menge" onClick={() => { setEditingQtyItemId(item.id); setEditingQtyValue(''); }} />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <ShoppingItemNameStack
                                        name={item.name}
                                        nameClassName={cn('font-medium capitalize text-white', isStriking && 'text-white/35 line-through')}
                                        subLine={null}
                                      />
                                      <ShoppingItemSourcesSublist sources={item.sources} />
                                      {item.suggestedMergeTarget ? (
                                        <SmartMergeSuggestionButton
                                          targetLabel={item.suggestedMergeTarget}
                                          onMerge={() =>
                                            handleSmartMerge(activeList.id, item.id, item.suggestedMergeTarget!)
                                          }
                                        />
                                      ) : null}
                                    </div>
                                  </>
                                )}
                              </UnifiedItemRow>
                            );
                          })}
                        </Fragment>
                      );
                    })}
                  </UnifiedListSheet>
              )}
            </>
          ) : (
            <div className="p-8 text-center sm:p-12">
              <ListChecks className="mx-auto mb-3 h-12 w-12 text-white/25" />
              <p className="font-medium text-white/80">Keine Liste ausgewählt.</p>
              <p className="mt-1 text-sm text-white/45">
                Erstelle eine neue Liste oder wähle eine vorhandene.
              </p>
            </div>
          )}
          </div>

          {activeList && checked.length > 0 && (
            <div className="mt-6">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                onKeyDown={(e) => e.key === 'Enter' && setIsCompletedExpanded((v) => !v)}
                className="flex w-full cursor-pointer items-center justify-between px-2 py-3 text-white/50 transition-colors hover:text-white"
                aria-expanded={isCompletedExpanded}
              >
                <span className="text-sm font-semibold">Erledigt ({checked.length})</span>
                {isCompletedExpanded ? <ChevronUp className="w-5 h-5 shrink-0" /> : <ChevronDown className="w-5 h-5 shrink-0" />}
              </div>
              {isCompletedExpanded && (
                <div className={cn('flex flex-col gap-2 px-2 pb-4 pt-2', storeMode && 'gap-0 px-0')}>
                  {checked.map((item) => {
                    const qtyD = formatQtyDisplay(item);
                    const hasQty = qtyD.length > 0;
                    const erledigtLabel = `${qtyD} ${item.name}`.trim();
                    const isEditingText = editingItemId === item.id;
                    const showActions = !storeMode && !isEditingText;
                    const theme = getCategoryTheme('sonstiges');
                    const useStoreRow = storeMode && !isEditingText;
                    return (
                      <UnifiedItemRow
                        key={item.id}
                        isChecked={!useStoreRow}
                        className={useStoreRow ? undefined : 'bg-transparent opacity-90 hover:opacity-100'}
                        storeShopping={useStoreRow}
                        onStoreRowClick={
                          useStoreRow ? () => handleToggleItem(activeList!.id, item.id) : undefined
                        }
                        storeAriaLabel={
                          useStoreRow ? `${erledigtLabel} – tippen zum Zurücknehmen` : undefined
                        }
                        checkbox={
                          useStoreRow ? (
                            <UnifiedCheckbox
                              variant="store"
                              decorative
                              checked
                              onToggle={() => {}}
                              theme={theme}
                              ariaLabel="Rückgängig"
                            />
                          ) : (
                            <UnifiedCheckbox
                              checked
                              onToggle={() => handleToggleItem(activeList!.id, item.id)}
                              theme={theme}
                              ariaLabel="Rückgängig"
                            />
                          )
                        }
                        actions={
                          showActions ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  startEditItem(item, item.name);
                                }}
                                className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/10 hover:text-white"
                                title="Bearbeiten"
                                aria-label="Bearbeiten"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  deleteItem(activeList!.id, item.id);
                                }}
                                className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-500/15 hover:text-red-400"
                                title="Entfernen"
                                aria-label="Entfernen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : null
                        }
                      >
                        {isEditingText ? (
                          <>
                            <input
                              type="text"
                              value={editingItemValue}
                              onChange={(e) => setEditingItemValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  saveEditItem();
                                }
                                if (e.key === 'Escape') cancelEditItem();
                              }}
                              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={saveEditItem}
                              className="shrink-0 rounded-lg bg-gradient-to-r from-fuchsia-500/30 to-orange-500/30 p-1.5 text-fuchsia-200 transition-colors hover:from-fuchsia-500/50 hover:to-orange-500/50"
                              title="Speichern"
                              aria-label="Speichern"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </>
                        ) : storeMode ? (
                          <>
                            {hasQty && <StoreQtyPill label={qtyD} dimmed />}
                            <div className="min-w-0 flex-1">
                              <ShoppingItemNameStack
                                name={item.name}
                                nameClassName="text-lg font-medium capitalize text-gray-600 line-through"
                                subLine={null}
                              />
                              <ShoppingItemSourcesSublist sources={item.sources} />
                            </div>
                          </>
                        ) : (
                          <div className="min-w-0 flex-1">
                            <ShoppingItemNameStack
                              name={erledigtLabel}
                              nameClassName="line-through capitalize text-white/40"
                              subLine={null}
                            />
                            <ShoppingItemSourcesSublist sources={item.sources} />
                          </div>
                        )}
                      </UnifiedItemRow>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => activeListId && resetChecked(activeListId)}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/15 bg-transparent py-3 text-sm font-medium text-white/45 transition-all hover:border-white/25 hover:bg-white/[0.04] hover:text-white/80"
                    title="Erledigte wiederherstellen"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Erledigte wiederherstellen
                  </button>
                </div>
              )}
            </div>
          )}

          {/* FAB: Einkauf starten / Beenden (Store-Modus) – außerhalb der Glass-Card, schwebt unten rechts */}
          {activeList && (
            <button
              type="button"
              onClick={() => {
                setStoreMode((m) => !m);
                if (!storeMode) { setEditingItemId(null); setEditingQtyItemId(null); }
              }}
              className={cn(
                'fixed z-[60] w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-all',
                'bottom-[calc(115px+env(safe-area-inset-bottom))] right-4 md:bottom-8 md:right-8',
                storeMode
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_18px_rgba(239,68,68,0.35)] hover:from-red-600 hover:to-red-700'
                  : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:from-orange-600 hover:to-pink-600'
              )}
              aria-label={storeMode ? 'Einkauf beenden' : 'Einkauf starten'}
              title={storeMode ? 'Beenden' : 'Einkauf starten'}
            >
              <ShoppingCart className="w-6 h-6" />
            </button>
          )}
        </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium shadow-lg animate-[fade-in_0.2s_ease-out]"
        >
          {toast}
        </div>
      )}

      {modalNewList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setModalNewList(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#121212]/95 p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-bold text-white">Neue Liste</h3>
            <input
              type="text"
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addList(pendingName);
                if (e.key === 'Escape') setModalNewList(false);
              }}
              placeholder="z.B. Supermarkt, Drogerie…"
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-3 text-white placeholder:text-gray-500 focus:border-fuchsia-500/50 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalNewList(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => addList(pendingName)}
                className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(236,72,153,0.35)] transition-colors hover:from-fuchsia-400 hover:to-orange-400"
              >
                Erstellen
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRename && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          onClick={() => setModalRename(null)}
        >
          <div
            className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-[#121212]/95 p-6 shadow-2xl backdrop-blur-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center gap-3">
              <Edit2 className="h-5 w-5 text-fuchsia-400" />
              <h3 className="text-xl font-semibold tracking-tight text-white">Liste umbenennen</h3>
            </div>
            <input
              type="text"
              value={pendingName}
              onChange={(e) => setPendingName(e.target.value)}
              onBlur={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameList(pendingName);
                if (e.key === 'Escape') setModalRename(null);
              }}
              placeholder="Name der Liste"
              className="mb-8 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3.5 text-white placeholder:text-gray-500 transition-all focus:border-fuchsia-500/50 focus:outline-none focus:ring-4 focus:ring-fuchsia-500/15"
              autoFocus
            />
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalRename(null)}
                className="rounded-xl px-5 py-2.5 text-sm font-medium text-white/50 transition-all hover:bg-white/10 hover:text-white"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => renameList(pendingName)}
                className="rounded-xl bg-gradient-to-r from-fuchsia-500 to-orange-500 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_20px_rgba(236,72,153,0.35)] transition-all hover:from-fuchsia-400 hover:to-orange-400"
              >
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {modalDeleteList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setModalDeleteList(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#121212]/95 p-6 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-bold text-white">Liste löschen</h3>
            <p className="mb-4 text-sm text-white/60">
              Möchtest du „{lists.find((l) => l.id === modalDeleteList)?.name}“ wirklich löschen?
              Alle Einträge gehen verloren.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalDeleteList(null)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={() => deleteList(modalDeleteList)}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-600"
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
    </div>
  );
}
