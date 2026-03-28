'use client';

import { ArrowLeft, Search, Sparkles } from 'lucide-react';
import { PageTransition } from '@/components/ui/PageTransition';
import { cn } from '@/lib/utils';

export type CollectionCategory = { id: string; label: string };

export type CollectionViewProps = {
  onBack: () => void;
  onVorschlagGenerieren: () => void;
  collectionSearch: string;
  onCollectionSearchChange: (value: string) => void;
  collectionCategory: string;
  onCollectionCategoryChange: (id: string) => void;
  categories: CollectionCategory[];
  categoryCounts: Record<string, number>;
  children: React.ReactNode;
};

/**
 * „Meine Sammlung“: CookIQ-Dashboard-Hero (angepasste Texte, weicher Glow) + Suche/Pills + Inhalt.
 */
export function CollectionView({
  onBack,
  onVorschlagGenerieren,
  collectionSearch,
  onCollectionSearchChange,
  collectionCategory,
  onCollectionCategoryChange,
  categories,
  categoryCounts,
  children,
}: CollectionViewProps) {
  return (
    <PageTransition className="w-full" data-header-full-bleed>
      <div className="w-full pb-6">
        {/* Hero wie CookIQ-Dashboard, Glow dezent & statisch (weicher Auslauf nach oben) */}
        <div className="relative mx-4 mt-[max(0.5rem,env(safe-area-inset-top))] h-[280px] max-w-5xl overflow-hidden rounded-[32px] border border-white/[0.08] shadow-2xl shadow-black/60 md:mx-auto md:mt-4 md:h-[320px]">
          <img
            src="/gourmet-header.webp"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-[0.1]"
            aria-hidden
          />
          <div className="absolute inset-0 bg-black/90" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute -inset-x-[18%] -top-[42%] bottom-0">
              <div
                className="absolute -bottom-[20%] left-1/2 h-[min(160%,34rem)] w-[min(195%,46rem)] -translate-x-1/2 rounded-[50%] blur-3xl"
                style={{
                  background:
                    'radial-gradient(ellipse 62% 52% at 50% 92%, rgba(249,115,22,0.22) 0%, rgba(236,72,153,0.13) 40%, rgba(168,85,247,0.08) 58%, rgba(168,85,247,0) 74%)',
                }}
              />
              <div
                className="absolute -bottom-[12%] left-1/2 h-[min(125%,28rem)] w-[min(145%,36rem)] -translate-x-1/2 rounded-[50%] blur-2xl"
                style={{
                  background:
                    'radial-gradient(ellipse 54% 44% at 50% 90%, rgba(249,115,22,0.14) 0%, rgba(236,72,153,0.09) 50%, rgba(168,85,247,0.05) 66%, rgba(168,85,247,0) 84%)',
                }}
              />
              <div
                className="absolute inset-x-0 -top-[8%] bottom-[-10%] opacity-[0.07]"
                style={{
                  background:
                    'radial-gradient(ellipse 95% 76% at 50% 108%, rgba(249,115,22,0.2) 0%, rgba(236,72,153,0.11) 45%, rgba(168,85,247,0.06) 62%, transparent 80%)',
                }}
              />
            </div>
          </div>
          <div
            className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-black from-0% via-black/22 via-[26%] to-transparent to-[58%]"
            aria-hidden
          />

          <button
            type="button"
            onClick={onBack}
            className="group absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-30 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/[0.08] md:left-6 md:top-6"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-1" />
            Zurück zur Übersicht
          </button>

          <div className="relative z-20 flex h-full flex-col justify-end p-6 md:p-8">
            <h1 className="mb-2 text-3xl font-black tracking-tight text-white antialiased drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] md:text-5xl">
              Meine Sammlung
            </h1>
            <p className="mb-8 text-sm font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.85)] md:text-base">
              Deine kulinarischen Schätze.
            </p>
            <div className="relative isolate">
              <div
                className="pointer-events-none absolute inset-0 -m-3 rounded-2xl bg-gradient-to-t from-brand-orange/25 via-brand-pink/12 to-transparent opacity-80 blur-xl"
                aria-hidden
              />
              <button
                type="button"
                onClick={onVorschlagGenerieren}
                className="relative z-10 inline-flex animate-glow-pulse items-center justify-center gap-2 rounded-xl border border-white/20 bg-brand-orange px-6 py-3.5 font-bold text-white shadow-[0_0_36px_rgba(249,115,22,0.45),0_0_72px_rgba(236,72,153,0.2)] ring-2 ring-brand-orange/50 transition-all hover:scale-[1.03] hover:shadow-[0_0_48px_rgba(249,115,22,0.55),0_0_96px_rgba(236,72,153,0.28)]"
              >
                <Sparkles className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                Vorschlag generieren
              </button>
            </div>
          </div>
        </div>

        {/* Suche & Pills direkt unter dem Hero */}
        <div className="mx-auto mt-6 max-w-5xl space-y-4 px-4 md:px-6">
          <div className="rounded-[20px] border border-white/[0.05] bg-white/[0.03] p-3 backdrop-blur-xl" role="search">
            <label className="sr-only" htmlFor="collection-search-input">
              Rezepte durchsuchen
            </label>
            <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-black/35 px-3 py-2.5 backdrop-blur-md">
              <Search className="h-4 w-4 shrink-0 text-white/25" aria-hidden />
              <input
                id="collection-search-input"
                type="search"
                value={collectionSearch}
                onChange={(e) => onCollectionSearchChange(e.target.value)}
                placeholder="Suche in der Sammlung…"
                className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-medium text-white/65 placeholder:text-white/20 outline-none focus:ring-0"
                autoComplete="off"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Kategorie-Filter">
            {categories.map((cat) => {
              const isActive = collectionCategory === cat.id;
              const count = categoryCounts[cat.id] ?? 0;
              const countLabel =
                cat.id === 'Alle' ? (count === 1 ? '1 Rezept' : `${count} Rezepte`) : `${count}`;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onCollectionCategoryChange(cat.id)}
                  className={cn(
                    'inline-flex max-w-full items-baseline gap-1.5 rounded-full border px-3.5 py-2 text-left text-sm transition-all',
                    isActive
                      ? 'border-white/20 bg-gradient-to-r from-brand-orange/90 via-brand-orange/75 to-brand-pink/80 font-semibold text-white shadow-[0_0_20px_-6px_rgba(249,115,22,0.45)]'
                      : 'border-white/[0.05] bg-white/[0.05] font-medium text-gray-300 backdrop-blur-md hover:border-white/[0.1] hover:bg-white/[0.08] hover:text-white'
                  )}
                >
                  <span className="truncate">{cat.label}</span>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums text-xs',
                      isActive ? 'font-bold text-white/90' : 'font-semibold text-gray-500'
                    )}
                  >
                    ({countLabel})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-5xl px-4 pb-8 md:px-6">{children}</div>
      </div>
    </PageTransition>
  );
}
