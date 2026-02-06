'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBasket,
  History,
  ChefHat,
  Percent,
  Plus,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getShoppingLists, getFrequentItems, saveShoppingLists, recordFrequentItem } from '@/actions/shopping-list-actions';
import type { ShoppingList } from '@/lib/shopping-lists-storage';
import { generateId } from '@/lib/shopping-lists-storage';
import { PageTransition } from '@/components/ui/PageTransition';

/** Gleiche Glass-Karten-Styles wie Main-Dashboard / Gourmet-Cockpit */
const DASHBOARD_CARD_STYLE: React.CSSProperties = {
  background: 'rgba(255,255,255,0.16)',
  border: '1px solid rgba(255,255,255,0.22)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.08), 0 16px 48px -12px rgba(0,0,0,0.06)',
  WebkitBackdropFilter: 'blur(8px)',
  backdropFilter: 'blur(8px)',
};

type Props = {
  onNeueListe?: () => void;
  onSchnellHinzufuegen?: () => void;
};

/** Findet die Liste mit den meisten offenen Items (oder zuletzt bearbeitet / erste) */
function getActiveList(lists: ShoppingList[]): ShoppingList | null {
  if (lists.length === 0) return null;
  const withOpen = lists.map((l) => ({
    list: l,
    open: l.items.filter((i) => !i.checked).length,
  }));
  const sorted = [...withOpen].sort((a, b) => b.open - a.open);
  return sorted[0]?.list ?? lists[0] ?? null;
}

export function ShoppingCockpit({ onNeueListe, onSchnellHinzufuegen }: Props) {
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [frequentItems, setFrequentItems] = useState<{ itemLabel: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickAddPending, setQuickAddPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedLists, frequent] = await Promise.all([
        getShoppingLists(),
        getFrequentItems(10),
      ]);
      if (cancelled) return;
      setLists(loadedLists);
      setFrequentItems(frequent);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const activeList = getActiveList(lists);
  const openCount = activeList ? activeList.items.filter((i) => !i.checked).length : 0;
  const previewItems = activeList
    ? activeList.items.filter((i) => !i.checked).slice(0, 3).map((i) => i.text)
    : [];

  /** Quick-Add: Item zu aktiver Liste hinzufügen, nur append – keine Daten löschen */
  const handleQuickAdd = async (itemLabel: string) => {
    setQuickAddPending(itemLabel);
    try {
      let nextLists = lists.length > 0 ? [...lists] : [];
      let targetListId: string;

      if (nextLists.length === 0) {
        const newList: ShoppingList = {
          id: generateId(),
          name: 'Allgemein',
          items: [{ id: generateId(), text: itemLabel, checked: false }],
        };
        nextLists = [newList];
        targetListId = newList.id;
      } else {
        const target = getActiveList(nextLists) ?? nextLists[0]!;
        targetListId = target.id;
        const idx = nextLists.findIndex((l) => l.id === targetListId);
        if (idx >= 0) {
          nextLists = nextLists.map((l, i) =>
            i === idx
              ? {
                  ...l,
                  items: [
                    ...l.items,
                    { id: generateId(), text: itemLabel, checked: false },
                  ],
                }
              : l
          );
        }
      }

      const res = await saveShoppingLists(nextLists);
      if (res.success) {
        setLists(nextLists);
        await recordFrequentItem(itemLabel);
      }
      onSchnellHinzufuegen?.();
    } finally {
      setQuickAddPending(null);
    }
  };

  return (
    <div className="min-h-screen w-full relative overflow-x-visible bg-white" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
      {/* Universal Header – identisch Gourmet-Standard, Maße wie spezifiziert */}
      {/* Universal Header – gleiche Maße wie Gourmet-Planer & Dashboard (h-[280px], rounded-b-[40px]) */}
      <header
        className={cn(
          'relative z-[1] min-h-[280px]',
          'w-full max-w-[100vw] -mx-0 sm:-mx-4 md:w-[calc(100%+3rem)] md:-mx-6 lg:w-[calc(100%+4rem)] lg:-mx-8',
          '-mt-[max(0.5rem,env(safe-area-inset-top))] md:-mt-6 lg:-mt-8'
        )}
      >
        <div
          className="absolute top-0 left-0 w-full h-[280px] z-0 overflow-hidden rounded-b-[40px] bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/images/einkaufsliste.webp')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/45 to-black/25 z-0" aria-hidden />
        </div>
        <div className="relative z-10 pt-8 px-6 md:px-8 pb-12 h-full flex flex-col justify-end">
          <div className="flex flex-col items-start gap-4">
            <Link
              href="/tools/shopping-list"
              className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full transition-all text-sm font-medium border border-white/10"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Zurück
            </Link>
            <div className="mt-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white mb-1" style={{ letterSpacing: '-0.3px' }}>
                Smarte Einkaufsliste
              </h1>
              <p className="text-white/90 text-lg md:text-xl">Dein intelligenter Begleiter im Supermarkt.</p>
            </div>
            <Link
              href="/tools/shopping-list"
              className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3.5 bg-gradient-to-r from-orange-600 to-rose-500 text-white font-bold shadow-lg shadow-orange-600/30 hover:from-orange-700 hover:to-rose-600 transition-all"
            >
              <Plus className="w-5 h-5" />
              Neue Liste erstellen
            </Link>
          </div>
        </div>
      </header>

      <PageTransition className="relative z-20 -mt-20 mx-auto max-w-7xl w-full px-3 sm:px-4 md:px-6 lg:px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Karte 1: Aktive Liste */}
          <Link
            href={activeList ? `/tools/shopping-list?listId=${activeList.id}` : '/tools/shopping-list'}
            className="group relative flex flex-col min-h-[160px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 p-5 cursor-pointer active:scale-[0.98] text-left block w-full"
            style={DASHBOARD_CARD_STYLE}
          >
            <div className="absolute top-4 right-4">
              <span className="bg-gray-50/90 text-gray-700 text-[10px] uppercase font-semibold px-2 py-1 rounded shadow-sm" style={{ letterSpacing: '0.6px' }}>
                {loading ? '—' : activeList ? `${openCount} offen` : 'Keine Liste'}
              </span>
            </div>
            <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-600 to-rose-500 shadow-lg shadow-orange-600/30 mb-3">
              <ShoppingBasket className="w-8 h-8 text-white" strokeWidth={2.5} aria-hidden />
            </div>
            <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight">
              {activeList?.name ?? 'Wocheneinkauf'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
              {loading ? '…' : previewItems.length > 0 ? previewItems.join(', ') + (openCount > 3 ? '…' : '') : 'Keine offenen Artikel'}
            </p>
          </Link>

          {/* Karte 2: Smart History (Quick Add) */}
          <div
            className="relative flex flex-col min-h-[160px] rounded-2xl overflow-hidden p-5 text-left w-full"
            style={DASHBOARD_CARD_STYLE}
          >
            <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-500 to-yellow-500 shadow-lg shadow-amber-500/30 mb-3">
              <History className="w-8 h-8 text-white" strokeWidth={2.5} aria-hidden />
            </div>
            <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight">Oft gekauft</h3>
            <p className="text-sm text-gray-500 mt-0.5 mb-3">Schnell hinzufügen</p>
            <div className="flex flex-wrap gap-2">
              {loading ? (
                <span className="text-sm text-gray-400">…</span>
              ) : (
                frequentItems.slice(0, 3).map(({ itemLabel }) => (
                  <button
                    key={itemLabel}
                    type="button"
                    onClick={() => handleQuickAdd(itemLabel)}
                    disabled={!!quickAddPending}
                    className="px-3 py-1.5 rounded-full bg-white/60 border border-white/50 text-gray-700 text-sm font-medium hover:bg-white/80 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {quickAddPending === itemLabel ? '…' : itemLabel}
                  </button>
                ))
              )}
              {!loading && frequentItems.length === 0 && (
                <span className="text-sm text-gray-400">Noch keine History</span>
              )}
            </div>
          </div>

          {/* Karte 3: Aus Rezepten */}
          <Link
            href="/tools/recipe"
            className="group relative flex flex-col min-h-[160px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 p-5 cursor-pointer active:scale-[0.98] text-left block w-full"
            style={DASHBOARD_CARD_STYLE}
          >
            <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/30 mb-3">
              <ChefHat className="w-8 h-8 text-white" strokeWidth={2.5} aria-hidden />
            </div>
            <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight">Zutaten importieren</h3>
            <p className="text-sm text-gray-500 mt-0.5">Vom Gourmet-Planer</p>
            <p className="text-xs text-gray-400 mt-1">3 Rezepte im Wochenplan</p>
          </Link>

          {/* Karte 4: Budget / Spar-Tipps (Placeholder) */}
          <div
            className="relative flex flex-col min-h-[160px] rounded-2xl overflow-hidden p-5 text-left w-full cursor-default"
            style={DASHBOARD_CARD_STYLE}
          >
            <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30 mb-3">
              <Percent className="w-8 h-8 text-white" strokeWidth={2.5} aria-hidden />
            </div>
            <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight">Budget Übersicht</h3>
            <p className="text-sm text-gray-500 mt-0.5">Spar-Tipps (demnächst)</p>
          </div>
        </div>

        {/* Meine Listen */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Meine Listen</h2>
          {loading ? (
            <div className="rounded-2xl overflow-hidden p-6 text-center text-gray-500" style={DASHBOARD_CARD_STYLE}>
              Listen werden geladen…
            </div>
          ) : lists.length === 0 ? (
            <div className="rounded-2xl overflow-hidden p-6 text-center text-gray-500" style={DASHBOARD_CARD_STYLE}>
              Noch keine Listen. Erstelle eine über „Neue Liste erstellen“.
            </div>
          ) : (
            <ul className="space-y-3">
              {lists.map((list) => {
                const done = list.items.filter((i) => i.checked).length;
                const total = list.items.length;
                const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <li key={list.id}>
                    <Link
                      href={`/tools/shopping-list?listId=${list.id}`}
                      className="flex items-center gap-4 rounded-2xl overflow-hidden p-4 transition-all hover:scale-[1.01] active:scale-[0.99]"
                      style={DASHBOARD_CARD_STYLE}
                    >
                      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                        <ShoppingBasket className="w-5 h-5 text-orange-600" aria-hidden />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{list.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1.5 bg-white/40 rounded-full overflow-hidden max-w-[120px]">
                            <div
                              className="h-full bg-gradient-to-r from-orange-600 to-rose-500 rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            {done}/{total} erledigt
                          </span>
                        </div>
                      </div>
                      <span className="text-gray-500 group-hover:text-orange-600 transition-colors">
                        Öffnen
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </PageTransition>
    </div>
  );
}
