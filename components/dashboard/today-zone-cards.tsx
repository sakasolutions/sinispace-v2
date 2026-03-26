'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, CheckCircle2, ChefHat, Flame, ShoppingCart, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptic-feedback';
import type { CalendarEventJson } from '@/actions/calendar-actions';
import { getShoppingLists } from '@/actions/shopping-list-actions';
import { getResultById } from '@/actions/workspace-actions';
import type { ShoppingList } from '@/lib/shopping-lists-storage';

function normalizeHHmm(t: string): string {
  const s = t.trim().slice(0, 5);
  if (s.length >= 4 && s.includes(':')) return s.padStart(5, '0');
  return s;
}

function getTodayDateStringBerlin(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function getNowHHmmBerlin(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

function isMealEvent(e: CalendarEventJson): boolean {
  return e.syncedMeal === true || e.actionTag === 'food';
}

function mealLabelFromTimeHHmm(time: string): string {
  const h = parseInt(normalizeHHmm(time).slice(0, 2), 10) || 12;
  if (h < 11) return 'Frühstück';
  if (h < 15) return 'Mittagessen';
  if (h < 17) return 'Snack';
  return 'Abendessen';
}

function firstMealEventToday(events: CalendarEventJson[], todayStr: string): CalendarEventJson | null {
  const meals = events
    .filter((e) => e.date === todayStr && isMealEvent(e))
    .sort((a, b) => normalizeHHmm(a.time).localeCompare(normalizeHHmm(b.time)));
  return meals[0] ?? null;
}

function futureNonMealEventsToday(
  events: CalendarEventJson[],
  todayStr: string,
  nowHHmm: string
): CalendarEventJson[] {
  return events
    .filter((e) => e.date === todayStr && !isMealEvent(e))
    .filter((e) => normalizeHHmm(e.time) >= nowHHmm)
    .sort((a, b) => normalizeHHmm(a.time).localeCompare(normalizeHHmm(b.time)));
}

function collectOpenItemLabels(lists: ShoppingList[]): string[] {
  const out: string[] = [];
  for (const list of lists) {
    for (const item of list.items) {
      if (!item.checked) {
        const t = item.text?.trim();
        if (t) out.push(t);
      }
    }
  }
  return out;
}

function normalizeItemLabel(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

function extractRecipeImageUrlFromResultContent(content: string): string | null {
  try {
    const o = JSON.parse(content) as { imageUrl?: string | null };
    if (typeof o.imageUrl === 'string' && o.imageUrl.trim().length > 0) return o.imageUrl.trim();
  } catch {
    /* ignore */
  }
  return null;
}

function freierTagCopy(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '12', 10);
  if (h >= 17 || h < 5) return 'Freier Abend';
  return 'Freier Tag';
}

const ZONE_CARD_GLOW =
  'shadow-[0_0_20px_rgba(255,255,255,0.03)] hover:shadow-[0_0_30px_rgba(255,255,255,0.08)] transition-shadow duration-300';

const MEAL_CARD =
  `group flex min-h-[140px] cursor-pointer flex-col justify-between rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple/40 md:min-h-[180px] md:p-6 ${ZONE_CARD_GLOW}`;

/** Einkauf + Kalender/Freier Abend — einheitliches Glas */
const SECONDARY_ZONE_CARD =
  'group rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple/40';

const SHOP_CARD = `flex cursor-pointer flex-col ${SECONDARY_ZONE_CARD} ${ZONE_CARD_GLOW}`;

/** Hero: „Was kochst du heute?“ — stärkere Elevation & Gradient */
const HERO_EMPTY_MEAL_CARD =
  'group relative flex min-h-[140px] cursor-pointer flex-col justify-between overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-2xl transition-all duration-200 hover:border-white/[0.12] hover:from-white/[0.08] hover:to-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple/40 md:min-h-[180px] md:p-6';

export type TodayZoneCardsProps = {
  todaysMealTitle: string | null;
  openCartItemsCount: number;
  initialCalendarEvents: CalendarEventJson[];
};

export function TodayZoneCards({
  todaysMealTitle,
  openCartItemsCount,
  initialCalendarEvents,
}: TodayZoneCardsProps) {
  const [openItemLabels, setOpenItemLabels] = useState<string[]>([]);
  const [mealThumbUrl, setMealThumbUrl] = useState<string | null>(null);

  const todayStr = useMemo(() => getTodayDateStringBerlin(), []);
  const nowHHmm = getNowHHmmBerlin();
  const firstMeal = useMemo(
    () => firstMealEventToday(initialCalendarEvents, todayStr),
    [initialCalendarEvents, todayStr]
  );

  const futureAppointments = useMemo(
    () => futureNonMealEventsToday(initialCalendarEvents, todayStr, nowHHmm),
    [initialCalendarEvents, todayStr, nowHHmm]
  );
  const nextAppt = futureAppointments[0] ?? null;
  const moreAppointments = Math.max(0, futureAppointments.length - 1);

  useEffect(() => {
    let cancelled = false;
    getShoppingLists()
      .then((lists) => {
        if (cancelled) return;
        setOpenItemLabels(collectOpenItemLabels(lists));
      })
      .catch(() => setOpenItemLabels([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const mealTitleDisplay = todaysMealTitle ?? firstMeal?.title ?? null;
  const recipeHref = firstMeal?.recipeResultId
    ? `/tools/recipe?open=${encodeURIComponent(firstMeal.recipeResultId)}`
    : '/tools/recipe';

  useEffect(() => {
    const rid = firstMeal?.recipeResultId;
    if (!rid) {
      setMealThumbUrl(null);
      return;
    }
    let cancelled = false;
    getResultById(rid)
      .then((result) => {
        if (cancelled || !result?.content) return;
        const url = extractRecipeImageUrlFromResultContent(result.content);
        setMealThumbUrl(url);
      })
      .catch(() => setMealThumbUrl(null));
    return () => {
      cancelled = true;
    };
  }, [firstMeal?.recipeResultId]);

  const mealSubtitlePlanned =
    firstMeal != null
      ? `${normalizeHHmm(firstMeal.time)} · ${mealLabelFromTimeHHmm(firstMeal.time)}`
      : null;

  const todosTodayCount = futureAppointments.length;

  return (
    <section aria-labelledby="today-status-heading" className="mb-5 w-full min-w-0 md:mb-6">
      <h2 id="today-status-heading" className="sr-only">
        Status für heute
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1fr] md:grid-rows-[auto_auto] md:gap-3">
        {/* Essen — links, 2 Zeilen hoch (Desktop) */}
        {mealTitleDisplay ? (
          <Link
            href={recipeHref}
            onClick={() => triggerHaptic('light')}
            className={cn(MEAL_CARD, 'col-span-2 md:col-span-1 md:row-span-2 md:row-start-1 md:col-start-1')}
          >
            <div className="flex flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div
                    className="mb-4 flex h-8 w-8 items-center justify-center rounded-[10px] border border-orange-400/10 bg-orange-400/[0.08]"
                    aria-hidden
                  >
                    <ChefHat className="h-4 w-4 text-orange-400/70" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-white/90 md:text-xl">
                    {mealTitleDisplay}
                  </h3>
                  {mealSubtitlePlanned ? (
                    <p className="mt-1 text-xs text-white/30">{mealSubtitlePlanned}</p>
                  ) : null}
                </div>
                {mealThumbUrl ? (
                  <div className="relative mt-0 h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={mealThumbUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="48px"
                      unoptimized
                    />
                  </div>
                ) : null}
              </div>
            </div>
            <span className="mt-auto text-xs text-white/25 transition group-hover:text-white/50">
              Rezept ansehen →
            </span>
          </Link>
        ) : (
          <Link
            href="/tools/recipe"
            onClick={() => triggerHaptic('light')}
            className={cn(
              HERO_EMPTY_MEAL_CARD,
              'col-span-2 md:col-span-1 md:row-span-2 md:row-start-1 md:col-start-1'
            )}
          >
            <div className="relative z-10 flex flex-1 flex-col">
              <div
                className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-brand-orange/30 bg-brand-orange/20 text-brand-orange"
                aria-hidden
              >
                <Flame className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <h3 className="mb-2 text-xl font-bold text-white">Was kochst du heute?</h3>
              <p className="mb-6 text-sm text-white/60">
                Dein Teller ist noch leer. Lass uns in Sekunden etwas Leckeres zaubern.
              </p>
            </div>
            <div className="relative z-10 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-orange px-6 py-3 font-bold text-white shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-transform hover:scale-[1.02] sm:w-auto">
              <Sparkles className="h-5 w-5" strokeWidth={1.9} />
              KI-Rezept generieren
            </div>
          </Link>
        )}

        {/* Einkauf — rechts oben */}
        <Link
          href="/tools/shopping-list"
          onClick={() => triggerHaptic('light')}
          className={cn(
            SHOP_CARD,
            'col-span-1 h-full min-h-[140px] flex-col justify-between rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm md:row-start-1 md:col-start-2'
          )}
        >
          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-pink-400/10 bg-pink-400/[0.08]"
              aria-hidden
            >
              {openCartItemsCount === 0 ? (
                <CheckCircle2 className="h-[13px] w-[13px] text-emerald-400/60" strokeWidth={1.5} />
              ) : (
                <ShoppingCart className="h-[13px] w-[13px] text-pink-400/70" strokeWidth={1.5} />
              )}
            </div>
            <p className="text-[13px] font-medium text-white/80">Einkauf</p>
          </div>
          <div className="mb-4 mt-2">
            <span className="text-3xl font-bold text-white">{openCartItemsCount}</span>{' '}
            <span className="text-sm text-white/50">Artikel offen</span>
          </div>
          <div className="mt-auto flex items-center text-xs font-semibold text-brand-pink transition-colors hover:text-white">
            Zur Liste &rarr;
          </div>
        </Link>

        {/* Termin — Desktop einzeilig; Mobil flex-col-Karte */}
        <Link
          href="/calendar"
          onClick={() => triggerHaptic('light')}
          className={cn(
            'col-span-1 flex h-full min-h-[140px] cursor-pointer flex-col justify-between rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur-sm md:row-start-2 md:col-start-2',
            SECONDARY_ZONE_CARD,
            ZONE_CARD_GLOW
          )}
        >
          <div className="mb-3 flex items-center gap-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-400/[0.08]"
              aria-hidden
            >
              <Calendar className="h-[13px] w-[13px] text-violet-400/70" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium text-white/80">Termine</p>
          </div>
          <div className="mb-4 mt-2">
            <span className="text-3xl font-bold text-white">{todosTodayCount}</span>{' '}
            <span className="text-sm text-white/50">To-Dos heute</span>
          </div>
          <div className="mt-auto flex items-center text-xs font-semibold text-brand-purple transition-colors hover:text-white">
            Tagesplan &rarr;
          </div>
        </Link>
      </div>
    </section>
  );
}
