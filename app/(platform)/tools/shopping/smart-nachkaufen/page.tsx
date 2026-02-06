'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BackButton } from '@/components/ui/back-button';
import { PageTransition } from '@/components/ui/PageTransition';
import { getSmartNachkaufenSuggestions } from '@/actions/shopping-list-actions';
import { getShoppingLists, saveShoppingLists, recordFrequentItem } from '@/actions/shopping-list-actions';
import type { ShoppingList } from '@/lib/shopping-lists-storage';
import { appendToList } from '@/lib/shopping-lists-storage';
import { cn } from '@/lib/utils';
import { Plus, Sparkles, Loader2, Check } from 'lucide-react';

function getActiveList(lists: ShoppingList[]): ShoppingList | null {
  if (lists.length === 0) return null;
  const withOpen = lists.map((l) => ({
    list: l,
    open: l.items.filter((i) => !i.checked).length,
  }));
  const sorted = [...withOpen].sort((a, b) => b.open - a.open);
  return sorted[0]?.list ?? lists[0] ?? null;
}

export default function SmartNachkaufenPage() {
  const [suggestions, setSuggestions] = useState<{ label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingLabel, setAddingLabel] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    getSmartNachkaufenSuggestions(20).then((data) => {
      if (!cancelled) {
        setSuggestions(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleAddToList = async (label: string) => {
    setAddingLabel(label);
    try {
      const lists = await getShoppingLists();
      const active = getActiveList(lists);
      const listId = active?.id ?? (lists[0]?.id ?? '__new__');
      const { lists: nextLists, appendedCount } = appendToList(
        lists.length > 0 ? lists : [],
        listId,
        [label],
        'Allgemein'
      );
      if (appendedCount > 0) {
        const res = await saveShoppingLists(nextLists);
        if (res.success) {
          setAddedIds((prev) => new Set(prev).add(label));
          await recordFrequentItem(label);
        }
      }
    } finally {
      setAddingLabel(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-rose-50 via-white to-white">
      <PageTransition className="mx-auto max-w-2xl w-full px-4 sm:px-6 py-6 pb-32">
        <BackButton href="/tools/shopping" label="Zurück zur Einkaufsliste" className="text-gray-600 hover:text-gray-900 mb-4" />

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-[18px] flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-6 h-6 text-white" strokeWidth={2.5} aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">Smart Nachkaufen</h1>
            <p className="text-sm text-gray-500">KI erkennt, was bald fehlt</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-3" aria-hidden />
            <p className="text-sm">Vorschläge werden geladen…</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 text-center">
            <p className="text-gray-500">Noch keine Vorschläge</p>
            <p className="text-sm text-gray-400 mt-1">Sobald die KI Muster erkennt, erscheinen hier Empfehlungen.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {suggestions.map(({ label }) => {
              const isAdding = addingLabel === label;
              const isAdded = addedIds.has(label);
              return (
                <li
                  key={label}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white/90 px-4 py-3 shadow-sm"
                >
                  <span className="font-medium text-gray-900 capitalize">{label}</span>
                  <button
                    type="button"
                    onClick={() => handleAddToList(label)}
                    disabled={isAdding || isAdded}
                    className={cn(
                      'shrink-0 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                      isAdded
                        ? 'bg-emerald-100 text-emerald-700 cursor-default'
                        : 'bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98] disabled:opacity-60'
                    )}
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    ) : isAdded ? (
                      <Check className="w-4 h-4" aria-hidden />
                    ) : (
                      <Plus className="w-4 h-4" aria-hidden />
                    )}
                    {isAdded ? 'In Liste' : 'Zur Liste'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-xs text-gray-400 mt-6">
          Tipp: Öffne deine{' '}
          <Link href="/tools/shopping-list" className="text-indigo-500 hover:underline">
            Einkaufsliste
          </Link>{' '}
          um alle Artikel zu sehen.
        </p>
      </PageTransition>
    </div>
  );
}
