'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, CheckCircle2, ChefHat, Flame, ShoppingCart } from 'lucide-react';
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

const SHOP_CARD =
  `group flex cursor-pointer flex-col rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple/40 ${ZONE_CARD_GLOW}`;

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

  const normalizedPills = openItemLabels.map(normalizeItemLabel).filter(Boolean);
  const showPills = normalizedPills.length > 0 && openCartItemsCount > 0;

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
            className={cn(MEAL_CARD, 'col-span-2 md:col-span-1 md:row-span-2 md:row-start-1 md:col-start-1')}
          >
            <div className="flex flex-1 flex-col">
              <div
                className="mb-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border border-orange-400/10 bg-orange-400/[0.08]"
                aria-hidden
              >
                <Flame className="h-4 w-4 text-orange-400/70" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-white/90 md:text-xl">
                Was kochst du heute?
              </h3>
              <p className="mt-1 hidden whitespace-pre-line text-xs leading-relaxed text-white/30 md:block">
                Noch kein Abendessen geplant.{'\n'}Lass dich inspirieren.
              </p>
              <p className="mt-1 text-xs text-white/30 md:hidden">Noch kein Plan. Lass dich inspirieren.</p>
            </div>
            <span className="mt-auto text-xs text-white/25 transition group-hover:text-white/50">
              Inspiration holen →
            </span>
          </Link>
        )}

        {/* Einkauf — rechts oben */}
        <Link
          href="/tools/shopping-list"
          onClick={() => triggerHaptic('light')}
          className={cn(SHOP_CARD, 'col-span-1 md:row-start-1 md:col-start-2')}
        >
          {openCartItemsCount === 0 ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-pink-400/10 bg-pink-400/[0.08]"
                  aria-hidden
                >
                  <CheckCircle2 className="h-[13px] w-[13px] text-emerald-400/60" strokeWidth={1.5} />
                </div>
                <span className="text-[13px] font-medium text-white/80">Alles eingekauft</span>
              </div>
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-pink-400/10 bg-pink-400/[0.08]"
                  aria-hidden
                >
                  <ShoppingCart className="h-[13px] w-[13px] text-pink-400/70" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white/80">Einkauf</p>
                  <p className="text-[11px] text-white/25">{openCartItemsCount} Artikel offen</p>
                </div>
              </div>
              {showPills ? (
                <div className="flex flex-wrap gap-1">
                  {normalizedPills.slice(0, 3).map((label, idx) => (
                    <span
                      key={`${idx}-${label}`}
                      className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/50"
                    >
                      {label}
                    </span>
                  ))}
                  {normalizedPills.length > 3 ? (
                    <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/50">
                      +{normalizedPills.length - 3}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="text-2xl font-semibold text-white/70">{openCartItemsCount}</span>
                  <span className="text-xs text-white/25">Artikel</span>
                </div>
              )}
            </>
          )}
        </Link>

        {/* Termin — Desktop einzeilig; Mobil flex-col-Karte */}
        <Link
          href="/calendar"
          onClick={() => triggerHaptic('light')}
          className={cn(
            'col-span-1 flex min-h-0 cursor-pointer flex-col justify-between gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 transition-all duration-200 hover:border-white/[0.09] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple/40 md:row-start-2 md:col-start-2 md:flex-row md:items-center md:justify-between md:gap-3 md:px-4 md:py-3.5',
            ZONE_CARD_GLOW
          )}
        >
          {nextAppt ? (
            <>
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-400/[0.08]"
                  aria-hidden
                >
                  <Calendar className="h-[13px] w-[13px] text-violet-400/70" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-white/80">{nextAppt.title}</p>
                  <p className="text-[11px] text-white/25">{normalizeHHmm(nextAppt.time)} Uhr</p>
                </div>
              </div>
              {moreAppointments > 0 ? (
                <span className="shrink-0 self-end text-[11px] text-white/20 md:self-auto">+{moreAppointments}</span>
              ) : null}
            </>
          ) : (
            <>
              <div className="flex flex-1 items-start gap-3 md:items-center">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-400/[0.08]"
                  aria-hidden
                >
                  <Calendar className="h-[13px] w-[13px] text-violet-400/70" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-white/80">{freierTagCopy()}</p>
                  <p className="text-[11px] text-white/25">Keine Termine</p>
                </div>
              </div>
              <span className="shrink-0 self-end text-[11px] text-white/20 transition group-hover:text-white/40 md:self-auto">
                Eintragen →
              </span>
            </>
          )}
        </Link>
      </div>
    </section>
  );
}
