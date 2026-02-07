'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBasket,
  Sparkles,
  ChefHat,
  Percent,
  Plus,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getShoppingLists, getSmartNachkaufenSuggestions } from '@/actions/shopping-list-actions';
import type { ShoppingList } from '@/lib/shopping-lists-storage';
import { DashboardShell } from '@/components/platform/dashboard-shell';

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
  const [smartSuggestions, setSmartSuggestions] = useState<{ label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loadedLists, suggestions] = await Promise.all([
        getShoppingLists(),
        getSmartNachkaufenSuggestions(3),
      ]);
      if (cancelled) return;
      setLists(loadedLists);
      setSmartSuggestions(suggestions);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const activeList = getActiveList(lists);
  const openCount = activeList ? activeList.items.filter((i) => !i.checked).length : 0;
  const previewItems = activeList
    ? activeList.items.filter((i) => !i.checked).slice(0, 3).map((i) => i.text)
    : [];

  return (
    <div className="min-h-screen w-full relative overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-white">
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
              href="/tools/shopping-list"
              className="group inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full transition-all text-sm font-medium border border-white/10 mb-3"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              Zurück
            </Link>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight mt-0 text-white" style={{ letterSpacing: '-0.3px' }}>
              Smarte Einkaufsliste
            </h1>
            <p className="text-sm sm:text-base mt-1 font-normal text-white/80" style={{ letterSpacing: '0.1px' }}>
              Dein intelligenter Begleiter im Supermarkt.
            </p>
            <p className="text-white/90 text-sm font-bold mt-2">Schnellzugriff</p>
          </>
        }
        subtitle={null}
        headerPrimaryCTA={
          <Link
            href="/tools/shopping-list"
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-3.5 bg-gradient-to-r from-orange-600 to-rose-500 text-white font-bold shadow-lg shadow-orange-900/30 hover:from-orange-700 hover:to-rose-600 transition-all"
          >
            <Plus className="w-5 h-5" />
            Neue Liste erstellen
          </Link>
        }
      >
        <div className="space-y-6 md:space-y-8">
          <section aria-labelledby="shopping-quick-heading">
            <h2 id="shopping-quick-heading" className="sr-only">Schnellzugriff</h2>
            <div className="grid grid-cols-2 gap-4 md:gap-4 md:max-w-3xl md:mx-auto">
            {/* Karte 1: Aktive Liste – 1:1 wie /dashboard (min-h-[160px]) */}
            <Link
              href={activeList ? `/tools/shopping-list?listId=${activeList.id}` : '/tools/shopping-list'}
              className="block h-full min-h-[160px]"
            >
              <div
                className="group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 p-5 cursor-pointer active:scale-[0.98] text-left w-full"
                style={DASHBOARD_CARD_STYLE}
              >
                <div className="absolute top-4 right-4">
                  <span className="bg-gray-50/90 text-gray-700 text-[10px] uppercase font-semibold px-2 py-1 rounded shadow-sm" style={{ letterSpacing: '0.6px' }}>
                    {loading ? '—' : activeList ? `${openCount} offen` : 'Keine Liste'}
                  </span>
                </div>
                <div className="flex w-full justify-between items-start gap-2">
                  <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-orange-600 to-rose-500 shadow-lg shadow-orange-600/30">
                    <ShoppingBasket className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                </div>
                <div className="w-full text-left">
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">
                    {activeList?.name ?? 'Wocheneinkauf'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                    {loading ? '…' : previewItems.length > 0 ? previewItems.join(', ') + (openCount > 3 ? '…' : '') : 'Keine offenen Artikel'}
                  </p>
                </div>
              </div>
            </Link>

            {/* Karte 2: Smart Nachkaufen – 1:1 wie /dashboard */}
            <Link href="/tools/shopping/smart-nachkaufen" className="block h-full min-h-[160px]">
              <div
                className="group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 p-5 cursor-pointer active:scale-[0.98] text-left w-full"
                style={DASHBOARD_CARD_STYLE}
              >
                <div className="flex w-full justify-between items-start gap-2">
                  <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
                    <Sparkles className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                </div>
                <div className="w-full text-left">
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Smart Nachkaufen</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                    {loading ? '…' : smartSuggestions.length === 0 ? 'Noch keine Vorschläge' : smartSuggestions.slice(0, 3).map(({ label }) => label).join(', ')}
                  </p>
                </div>
              </div>
            </Link>

            {/* Karte 3: Zutaten importieren – 1:1 wie /dashboard */}
            <Link href="/tools/recipe" className="block h-full min-h-[160px]">
              <div
                className="group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden hover:scale-[1.02] transition-all duration-300 p-5 cursor-pointer active:scale-[0.98] text-left w-full"
                style={DASHBOARD_CARD_STYLE}
              >
                <div className="flex w-full justify-between items-start gap-2">
                  <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-rose-500 to-pink-500 shadow-lg shadow-rose-500/30">
                    <ChefHat className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                </div>
                <div className="w-full text-left">
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Zutaten importieren</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Vom Gourmet-Planer</p>
                </div>
              </div>
            </Link>

            {/* Karte 4: Budget – 1:1 wie /dashboard */}
            <div className="h-full min-h-[160px]">
              <div
                className="group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden p-5 text-left w-full cursor-default"
                style={DASHBOARD_CARD_STYLE}
              >
                <div className="flex w-full justify-between items-start gap-2">
                  <div className="w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0 bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/30">
                    <Percent className="w-8 h-8 shrink-0 text-white" strokeWidth={2.5} aria-hidden />
                  </div>
                </div>
                <div className="w-full text-left">
                  <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">Budget Übersicht</h3>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">Spar-Tipps (demnächst)</p>
                </div>
              </div>
            </div>
          </div>
          </section>

          {/* Meine Listen */}
          <section>
          <h2 className="text-sm font-bold text-gray-600 mb-4">Meine Listen</h2>
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
              }          )}
        </ul>
          )}
          </section>
        </div>
      </DashboardShell>
    </div>
  );
}
