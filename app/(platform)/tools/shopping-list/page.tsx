'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BackButton } from '@/components/ui/back-button';
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
  ArrowLeft,
  HelpCircle,
  MoreVertical,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  generateId,
  defaultList,
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
import { analyzeShoppingItem } from '@/actions/shopping-list-ai';
import { CustomSelect } from '@/components/ui/custom-select';
import { DashboardShell } from '@/components/platform/dashboard-shell';
import { AnimatedList, AnimatedListItem } from '@/components/ui/AnimatedList';
import { WhatIsThisModal } from '@/components/ui/what-is-this-modal';
import {
  SummaryCard,
  QuickAddCard,
  CategoryCard,
  ItemRow,
  ItemRowCheckbox,
  QuantityPill,
} from '@/components/shopping/list-detail-ui';

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
  setLists: React.Dispatch<React.SetStateAction<ShoppingList[]>>,
  onItemDone?: (displayText: string) => void
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
        if (done.status === 'done') onItemDone?.(done.text);
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
          onItemDone?.(updated.text);
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
      onItemDone?.(updated.text);
      const items = list.items.map((it, i) => (i === idx ? updated : it));
      return prev.map((l) => (l.id !== listId ? l : { ...l, items }));
    });
  });
}

function capitalizeLabel(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function formatItemExport(item: ShoppingItem): string {
  const hasQty = item.quantity != null || (item.unit?.trim() ?? '') !== '';
  const qtyD = formatQtyDisplay(item);
  if (item.quantity != null && !(item.unit?.trim()))
    return `${item.quantity}x ${item.text}`;
  if (hasQty) return `${qtyD} ${item.text}`.trim();
  return item.text;
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
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeList = lists.find((l) => l.id === activeListId);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitiallyLoaded = useRef(false);
  const activeListIdRef = useRef<string | null>(null);
  const typeAheadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await getShoppingLists();
      if (cancelled) return;
      hasInitiallyLoaded.current = true;
      const listIdFromUrl = searchParams.get('listId');
      if (loaded.length > 0) {
        setLists(loaded);
        const preferredId = listIdFromUrl && loaded.some((l) => l.id === listIdFromUrl) ? listIdFromUrl : loaded[0]!.id;
        setActiveListId(preferredId);
        setHydrated(true);
        return;
      }
      const def = defaultList();
      setLists([def]);
      setActiveListId(def.id);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    activeListIdRef.current = activeListId;
  }, [activeListId]);

  const refetchFromServer = useCallback(async () => {
    if (!hasInitiallyLoaded.current) return;
    const loaded = await getShoppingLists();
    if (loaded.length === 0) return;
    const cur = activeListIdRef.current;
    const keep = cur && loaded.some((l) => l.id === cur);
    setLists(loaded);
    setActiveListId(keep ? cur! : loaded[0]!.id);
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
      const { success, error } = await saveShoppingLists(lists);
      setSaveErrorMessage(success ? null : (error ?? 'Unbekannter Fehler'));
    }, 400);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [lists, hydrated]);

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
    setTypeAheadOpen(false);
    chunks.forEach((raw) =>
      processChunk(raw, activeListId, setLists, (text) => recordFrequentItem(text))
    );
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

  const handleToggleItem = (listId: string, itemId: string) => {
    const item = activeList?.items.find((i) => i.id === itemId);
    const willCheck = item && !item.checked;
    if (willCheck) {
      recordFrequentItem(item.text);
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
                i.id !== itemId
                  ? i
                  : { ...i, text: t, rawInput: t, quantity: null, unit: null }
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

  const resetChecked = (listId: string) => {
    setLists((prev) =>
      prev.map((l) =>
        l.id !== listId
          ? l
          : { ...l, items: l.items.map((i) => ({ ...i, checked: false })) }
      )
    );
  };

  const shareList = useCallback(async () => {
    if (!activeList) return;
    const items = activeList.items.filter((i) => !i.checked);
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
      <div className="min-h-screen min-h-full w-full relative bg-[#fff6f7]">
        <header
          className={cn(
            'relative z-[1] min-h-[280px]',
            'w-full max-w-[100vw] -mx-0 sm:-mx-4 md:w-[calc(100%+3rem)] md:-mx-6 lg:w-[calc(100%+4rem)] lg:-mx-8',
            '-mt-[max(0.5rem,env(safe-area-inset-top))] md:-mt-6 lg:-mt-8'
          )}
        >
          <div className="absolute top-0 left-0 w-full h-[280px] z-0 overflow-hidden rounded-b-[40px] bg-gray-200" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/65 to-black/45 z-0 rounded-b-[40px]" aria-hidden />
          <div className="dashboard-header-pt md:pt-12 relative z-10 w-full px-3 sm:px-6 md:px-8 pb-6">
            <Link href="/tools/shopping" className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm font-medium border border-white/10 mb-3">
              <ArrowLeft className="w-4 h-4" />
              Zurück
            </Link>
            <div className="h-8 w-48 bg-white/20 rounded-lg animate-pulse" />
            <div className="h-4 w-64 mt-2 bg-white/10 rounded animate-pulse" />
          </div>
        </header>
        <div className="relative z-10 mx-auto max-w-7xl w-full px-3 sm:px-4 md:px-6 lg:px-8 pb-32 -mt-20">
          <div className="animate-pulse rounded-2xl bg-gray-100 h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-full w-full relative bg-[#fff6f7]">
      <DashboardShell
        headerVariant="withCTA"
        headerBackground={
          <div className="relative w-full h-full bg-cover bg-center" style={{ backgroundImage: "url('/assets/images/einkaufsliste.webp')" }}>
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/65 to-black/45 z-0" aria-hidden />
          </div>
        }
        title={
          <>
            <Link
              href="/tools/shopping"
              className="group inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full transition-all text-sm font-medium border border-white/10 mb-3"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Zurück
            </Link>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight mt-0 text-white" style={{ letterSpacing: '-0.3px' }}>
              {activeList?.name ?? 'Einkaufsliste'}
            </h1>
            <p className="text-sm sm:text-base mt-1 font-normal text-white/80" style={{ letterSpacing: '0.1px' }}>
              Smart Input & KI-Kategorien. Einzel-Item oder Liste einfügen.
            </p>
          </>
        }
        subtitle={null}
        headerPrimaryCTA={null}
        headerActionsRight={
          <div className="flex flex-col items-end justify-end gap-3">
            <div className="flex items-center gap-2">
              <WhatIsThisModal
                title="Smart Einkaufsliste"
                content={
                  <div className="space-y-3 text-gray-700">
                    <p>
                      Deine intelligente Einkaufsliste mit <strong>KI-gestützter Analyse</strong>. Tippe einfach ein Produkt ein – die AI erkennt automatisch Kategorien, korrigiert Tippfehler und sortiert alles nach Supermarkt-Route.
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Keine Mengen?</strong> Kein Problem. Gib nur an, was du brauchst ("Milch") oder mit Mengen ("3 Tomaten"). Die AI passt sich an.
                    </p>
                  </div>
                }
                examples={[
                  '3 Tomaten → AI: 3x Tomaten (Obst/Gemüse)',
                  'Milch → AI: Milch (Kühlregal)',
                  'Kusbasi → AI: Kusbasi (Fleisch) - keine Korrektur!',
                ]}
                useCases={[
                  'Einzelne Produkte eintippen oder ganze Listen einfügen (z.B. aus WhatsApp)',
                  'AI korrigiert Tippfehler, behält aber kulturelle Begriffe bei',
                  'Automatische Sortierung nach Supermarkt-Gang (Obst/Gemüse → Fleisch → Kühlregal...)',
                  'Store-Modus: Große Checkboxen für einfaches Abhaken beim Einkaufen',
                ]}
                tips={[
                  'Füge mehrere Produkte mit Zeilenumbrüchen oder Kommas ein',
                  'Die AI merkt sich häufig gekaufte Artikel (Chips "Oft gekauft")',
                  'Im Store-Modus sind alle Bearbeitungs-Funktionen ausgeblendet',
                ]}
                trigger={
                  <button type="button" aria-label="Was ist das?" className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center text-white bg-white/20 hover:bg-white/30 transition-colors">
                    <HelpCircle className="w-4 h-4" />
                  </button>
                }
              />
              <button
                type="button"
                onClick={shareList}
                aria-label="Liste teilen"
                className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center text-white bg-white/20 hover:bg-white/30 transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
              {activeList && !storeMode && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setHeaderMenuOpen((o) => !o)}
                    aria-label="Weitere Aktionen"
                    className="w-9 h-9 rounded-full border border-white/40 flex items-center justify-center text-white bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {headerMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" aria-hidden onClick={() => setHeaderMenuOpen(false)} />
                      <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                        <button type="button" onClick={() => { openRename(activeList); setHeaderMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Pencil className="w-4 h-4" />
                          Liste umbenennen
                        </button>
                        <button type="button" onClick={() => { openDelete(activeList); setHeaderMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          Liste löschen
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="min-w-0 w-full max-w-[220px] sm:max-w-[260px]">
              <CustomSelect
                value={activeListId ?? ''}
                onChange={(v) => setActiveListId(v)}
                options={lists.map((l) => ({ value: l.id, label: l.name }))}
                placeholder="Liste wählen…"
                theme="light"
                icon={ListChecks}
                dropdownInPortal
              />
            </div>
            <button
              type="button"
              onClick={() => { setPendingName(''); setModalNewList(true); }}
              className="mt-2 w-full max-w-[220px] sm:max-w-[260px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 bg-gradient-to-r from-orange-600 to-rose-500 text-white font-bold text-sm shadow-lg shadow-orange-900/30 hover:from-orange-700 hover:to-rose-600 transition-all"
            >
              <Plus className="w-4 h-4" />
              Neue Liste
            </button>
          </div>
        }
      >
        <section className="mb-8 md:mb-10">
          <div className="space-y-4 md:max-w-3xl md:mx-auto px-6 sm:px-8 md:px-10">

        {saveErrorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm shadow-sm">
            <div className="font-medium mb-1">Sync fehlgeschlagen.</div>
            <div className="text-red-700 mb-3">{saveErrorMessage}</div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={async () => { const { success, error } = await saveShoppingLists(lists); setSaveErrorMessage(success ? null : (error ?? 'Unbekannter Fehler')); }} className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-800 font-medium text-sm transition-colors">Erneut versuchen</button>
              <button type="button" onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium text-sm transition-colors">Seite neu laden</button>
            </div>
          </div>
        )}

        {activeList ? (
            <>
              <SummaryCard
                progressLabel={`${checked.length}/${activeList.items.length} erledigt`}
                progressPercent={activeList.items.length ? (checked.length / activeList.items.length) * 100 : 0}
                storeMode={storeMode}
                onToggleStoreMode={() => {
                  setStoreMode((m) => !m);
                  if (!storeMode) { setEditingItemId(null); setEditingQtyItemId(null); }
                }}
              />

              {!storeMode && (
                <QuickAddCard
                  inputSlot={
                    <div ref={inputContainerRef} className="relative">
                      <input
                        type="text"
                        value={newItemInput}
                        onChange={(e) => setNewItemInput(e.target.value)}
                        onFocus={() => { setInputFocused(true); if (!newItemInput.trim()) loadFrequentItems(); }}
                        onBlur={() => { setTimeout(() => { setInputFocused(false); setTypeAheadOpen(false); }, 180); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (typeAheadOpen && typeAheadSuggestions.length > 0) {
                              const first = typeAheadSuggestions[0]!.itemLabel;
                              processChunk(first, activeList.id, setLists, (t) => recordFrequentItem(t));
                              setNewItemInput(''); setTypeAheadOpen(false);
                              return;
                            }
                            submitSmartInput();
                          }
                          if (e.key === 'Escape') setTypeAheadOpen(false);
                        }}
                        onPaste={(e) => {
                          const pasted = (e.clipboardData?.getData?.('text') ?? '').trim();
                          const chunks = splitInput(pasted);
                          if (chunks.length > 0 && activeListId) {
                            e.preventDefault(); e.stopPropagation();
                            chunks.forEach((raw) => processChunk(raw, activeListId, setLists, (text) => recordFrequentItem(text)));
                            setNewItemInput(''); setTypeAheadOpen(false);
                          }
                        }}
                        placeholder="Was brauchst du? (Einzel-Item oder Liste…)"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                      />
                      {typeAheadOpen && typeAheadSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-gray-200 bg-white shadow-lg z-20 py-1 max-h-48 overflow-y-auto">
                          {typeAheadSuggestions.map((s) => (
                            <button key={s.itemLabel} type="button" className="w-full text-left px-4 py-2.5 text-sm text-gray-800 hover:bg-orange-50 transition-colors" onMouseDown={(e) => { e.preventDefault(); processChunk(s.itemLabel, activeList.id, setLists, (t) => recordFrequentItem(t)); setNewItemInput(''); setTypeAheadOpen(false); }}>
                              {capitalizeLabel(s.itemLabel)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  }
                  addButton={
                    <button type="button" onClick={submitSmartInput} disabled={!splitInput(newItemInput).length} className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-r from-orange-600 to-rose-500 text-white flex items-center justify-center hover:from-orange-700 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/25" title="Hinzufügen">
                      <Plus className="w-5 h-5" />
                    </button>
                  }
                  helperText="Liste aus WhatsApp einfügen → Zeilen/Kommas werden erkannt, jedes Item einzeln analysiert."
                  frequentChips={inputFocused && !newItemInput.trim() && frequentItems.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-gray-500 mb-2">Oft gekauft</p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {frequentItems.map((f) => (
                          <button key={f.itemLabel} type="button" onClick={() => { processChunk(f.itemLabel, activeList.id, setLists, (t) => recordFrequentItem(t)); loadFrequentItems(); }} className="shrink-0 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-700 text-sm font-medium transition-colors">
                            {capitalizeLabel(f.itemLabel)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : undefined}
                />
              )}

              <div className="flex-1 overflow-y-auto min-h-0 pt-8 pb-12">
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
                      const theme = getCategoryTheme(cat);
                      const CatIcon = CATEGORY_ICON_MAP[theme.icon] ?? Package;
                      return (
                        <CategoryCard
                          key={cat}
                          title={theme.label}
                          count={items.length}
                          icon={<CatIcon className="w-4 h-4" aria-hidden />}
                          className="mb-4 last:mb-0"
                        >
                          <AnimatedList as="div">
                            {items.map((item) => {
                              const hasQty = item.quantity != null || (item.unit?.trim() ?? '') !== '';
                              const isEditingQty = !storeMode && editingQtyItemId === item.id;
                              const isEditingText = editingItemId === item.id;
                              const qtyDisplay = formatQtyDisplay(item);
                              const displayLabel =
                                item.quantity != null && !(item.unit?.trim())
                                  ? `${item.quantity}x ${item.text}`
                                  : hasQty
                                    ? `${qtyDisplay} ${item.text}`.trim()
                                    : item.text;
                              const isStriking = checkingId === item.id;
                              const showActions = !storeMode && !isEditingText;
                              const canEdit = item.status !== 'analyzing';
                              return (
                                <AnimatedListItem key={item.id} layout={false} as="div" className={cn('transition-all duration-300', isStriking && 'opacity-70')}>
                                  <ItemRow
                                    isChecked={false}
                                    checkbox={
                                      <ItemRowCheckbox
                                        checked={false}
                                        isStriking={isStriking}
                                        onToggle={() => handleToggleItem(activeList.id, item.id)}
                                        storeMode={storeMode}
                                        ariaLabel="Abhaken"
                                      />
                                    }
                                    actions={
                                      showActions ? (
                                        <>
                                          {canEdit && (
                                            <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); startEditItem(item, displayLabel); }} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0" title="Bearbeiten" aria-label="Bearbeiten"><Pencil className="w-4 h-4" /></button>
                                          )}
                                          <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteItem(activeList.id, item.id); }} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 shrink-0" title="Entfernen" aria-label="Entfernen"><Trash2 className="w-4 h-4" /></button>
                                        </>
                                      ) : null
                                    }
                                  >
                                    <div className="flex-1 min-w-0 flex items-center gap-2" {...(isEditingText ? { 'data-item-edit': '' } : {})}>
                                      {isEditingText ? (
                                        <>
                                          <input
                                            type="text"
                                            value={editingItemValue}
                                            onChange={(e) => setEditingItemValue(e.target.value)}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') { e.preventDefault(); saveEditItem(); }
                                              if (e.key === 'Escape') cancelEditItem();
                                            }}
                                            className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400"
                                            autoFocus
                                          />
                                          <button
                                            type="button"
                                            onClick={saveEditItem}
                                            className="p-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 shrink-0"
                                            title="Speichern"
                                            aria-label="Speichern"
                                          >
                                            <Check className="w-4 h-4" />
                                          </button>
                                        </>
                                      ) : item.status === 'analyzing' ? (
                                        <span className={cn('text-gray-500 italic', storeMode ? 'text-base' : '', isStriking && 'line-through')}>
                                          Analysiere …
                                        </span>
                                      ) : item.status === 'error' ? (
                                        <span className={cn('text-gray-700', storeMode ? 'text-base font-medium' : '', isStriking && 'line-through')}>
                                          {item.text}
                                        </span>
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
                                      <span className={cn('text-gray-900 font-medium', isStriking && 'line-through')}>
                                        {item.text}
                                      </span>
                                    </>
                                      ) : (
                                        <>
                                          {!storeMode && hasQty ? (
                                            <QuantityPill
                                              label={item.quantity != null && !(item.unit?.trim()) ? `${item.quantity}x` : qtyDisplay}
                                              onClick={() => { setEditingQtyItemId(item.id); setEditingQtyValue(qtyDisplay); }}
                                            />
                                          ) : !storeMode && !hasQty ? (
                                            <QuantityPill label="+ Menge" onClick={() => { setEditingQtyItemId(item.id); setEditingQtyValue(''); }} />
                                          ) : null}
                                          <span className={cn('text-gray-900 font-medium transition-all duration-300', storeMode ? 'text-base' : '', isStriking && 'line-through')}>
                                            {hasQty ? item.text : displayLabel}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </ItemRow>
                                </AnimatedListItem>
                              );
                            })}
                          </AnimatedList>
                        </CategoryCard>
                      );
                    })}

                    {checked.length > 0 && (
                      <CategoryCard
                        title="Erledigt"
                        count={checked.length}
                        icon={<Check className="w-4 h-4 text-orange-500" aria-hidden />}
                        className="mt-4"
                      >
                        <AnimatedList as="div">
                          {checked.map((item) => {
                            const hasQty = item.quantity != null || (item.unit?.trim() ?? '') !== '';
                            const qtyD = formatQtyDisplay(item);
                            const erledigtLabel = hasQty
                              ? (item.quantity != null && !(item.unit?.trim())
                                ? `${item.quantity}x ${item.text}`
                                : `${qtyD} ${item.text}`.trim())
                              : item.text;
                            const justChecked = justCheckedIds.has(item.id);
                            const isEditingText = editingItemId === item.id;
                            const showActions = !storeMode && !isEditingText;
                            return (
                              <AnimatedListItem key={item.id} layout={false} as="div" className={cn('transition-all duration-300', justChecked && 'animate-[slideIn_0.4s_ease-out]')}>
                                <ItemRow
                                  isChecked
                                  checkbox={
                                    <ItemRowCheckbox checked onToggle={() => handleToggleItem(activeList!.id, item.id)} storeMode={storeMode} ariaLabel="Rückgängig" />
                                  }
                                  actions={
                                    showActions ? (
                                      <>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); startEditItem(item, erledigtLabel); }} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 shrink-0" title="Bearbeiten" aria-label="Bearbeiten"><Pencil className="w-4 h-4" /></button>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); deleteItem(activeList!.id, item.id); }} className="p-2 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 shrink-0" title="Entfernen" aria-label="Entfernen"><Trash2 className="w-4 h-4" /></button>
                                      </>
                                    ) : null
                                  }
                                >
                                  {isEditingText ? (
                                    <div className="flex items-center gap-2" data-item-edit="">
                                      <input type="text" value={editingItemValue} onChange={(e) => setEditingItemValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveEditItem(); } if (e.key === 'Escape') cancelEditItem(); }} className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400" autoFocus />
                                      <button type="button" onClick={saveEditItem} className="p-1.5 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 shrink-0" title="Speichern" aria-label="Speichern"><Check className="w-4 h-4" /></button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 line-through opacity-80">{erledigtLabel}</span>
                                  )}
                                </ItemRow>
                              </AnimatedListItem>
                            );
                          })}
                        </AnimatedList>
                      </CategoryCard>
                    )}
                  </>
                )}
              </div>
              {checked.length > 0 && (
                <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 flex justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04),0_8px_24px_-4px_rgba(0,0,0,0.08)]">
                  <button
                    type="button"
                    onClick={() => activeListId && resetChecked(activeListId)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                    title="Erledigte wiederherstellen"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Erledigte wiederherstellen
                  </button>
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
        </section>

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
    </DashboardShell>
    </div>
  );
}
