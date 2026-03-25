'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  ShoppingCart,
  Utensils,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptic-feedback';
import type { CalendarEventJson } from '@/actions/calendar-actions';
import { getShoppingLists } from '@/actions/shopping-list-actions';
import { getResultById } from '@/actions/workspace-actions';
import type { ShoppingList } from '@/lib/shopping-lists-storage';

const CARD_BASE =
  'group relative flex min-h-[120px] flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-xl transition-all duration-300 md:min-h-[140px]';

const CARD_HOVER =
  'hover:border-white/[0.12] hover:bg-white/[0.06] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple/40';

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

/** Alle noch anstehenden Termine heute (ohne Mahlzeiten), sortiert nach Uhrzeit. */
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
  const [mealImageUrl, setMealImageUrl] = useState<string | null>(null);
  const [openItemLabels, setOpenItemLabels] = useState<string[]>([]);

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

  const hasAnyAppointmentToday = useMemo(
    () => initialCalendarEvents.some((e) => e.date === todayStr && !isMealEvent(e)),
    [initialCalendarEvents, todayStr]
  );

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

  useEffect(() => {
    const rid = firstMeal?.recipeResultId;
    if (!rid) {
      setMealImageUrl(null);
      return;
    }
    let cancelled = false;
    getResultById(rid)
      .then((result) => {
        if (cancelled || !result?.content) return;
        const url = extractRecipeImageUrlFromResultContent(result.content);
        setMealImageUrl(url);
      })
      .catch(() => setMealImageUrl(null));
    return () => {
      cancelled = true;
    };
  }, [firstMeal?.recipeResultId]);

  const mealTitleDisplay = todaysMealTitle ?? firstMeal?.title ?? null;
  const mealTimeLabel = firstMeal ? mealLabelFromTimeHHmm(firstMeal.time) : null;
  const recipeHref = firstMeal?.recipeResultId
    ? `/tools/recipe?open=${encodeURIComponent(firstMeal.recipeResultId)}`
    : '/tools/recipe';

  const shoppingPreview =
    openItemLabels.length > 0
      ? openItemLabels.slice(0, 3).join(', ') +
        (openItemLabels.length > 3 ? ` · +${openItemLabels.length - 3} weitere` : '')
      : null;

  return (
    <section aria-labelledby="today-status-heading" className="w-full min-w-0">
      <h2 id="today-status-heading" className="sr-only">
        Status für heute
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {/* Karte 1: Essen */}
        {mealTitleDisplay ? (
          <Link
            href={recipeHref}
            onClick={() => triggerHaptic('light')}
            className={cn(CARD_BASE, CARD_HOVER, 'cursor-pointer', 'relative block')}
          >
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
              style={{
                background:
                  'radial-gradient(ellipse 80% 60% at 15% 0%, rgba(251, 191, 36, 0.35) 0%, transparent 55%)',
              }}
              aria-hidden
            />
            {mealImageUrl ? (
              <>
                <div className="absolute inset-0 z-0">
                  <Image
                    src={mealImageUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    unoptimized
                  />
                </div>
                <div
                  className="absolute inset-0 z-[1] bg-gradient-to-t from-black/70 via-black/40 to-transparent"
                  aria-hidden
                />
              </>
            ) : null}
            <div className={cn('relative z-[2] flex min-h-[88px] flex-col justify-end')}>
              <p className="line-clamp-2 text-base font-semibold leading-snug text-white drop-shadow-md">
                {mealTitleDisplay}
              </p>
              {mealTimeLabel ? (
                <p className="mt-1 text-xs font-medium text-white/75 drop-shadow">{mealTimeLabel}</p>
              ) : null}
              <span className="mt-3 text-xs font-medium text-white/80 drop-shadow transition group-hover:text-white">
                Rezept ansehen →
              </span>
            </div>
          </Link>
        ) : (
          <Link
            href="/tools/recipe"
            onClick={() => triggerHaptic('light')}
            className={cn(CARD_BASE, CARD_HOVER, 'cursor-pointer', 'relative block justify-between')}
          >
            <div
              className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-amber-900/20 via-orange-900/10 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 z-0 opacity-[0.06]"
              style={{
                background:
                  'radial-gradient(ellipse 70% 50% at 20% 0%, rgba(251, 146, 60, 0.5) 0%, transparent 60%)',
              }}
              aria-hidden
            />
            <div className="relative z-[1] flex flex-1 flex-col">
              <Utensils className="h-6 w-6 text-white/30" strokeWidth={1.5} aria-hidden />
              <p className="mt-4 text-base font-semibold text-white">Was kochst du heute?</p>
              <span className="mt-3 text-xs font-medium text-white/55 transition group-hover:text-white/90">
                Inspiration holen →
              </span>
            </div>
          </Link>
        )}

        {/* Karte 2: Einkauf */}
        <Link
          href="/tools/shopping-list"
          onClick={() => triggerHaptic('light')}
          className={cn(CARD_BASE, CARD_HOVER, 'cursor-pointer', 'relative block')}
        >
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.05]"
            style={{
              background:
                'radial-gradient(ellipse 70% 50% at 20% 0%, rgba(244, 114, 182, 0.4) 0%, transparent 55%)',
            }}
            aria-hidden
          />
          <div className="relative z-[1] flex flex-1 flex-col justify-between">
            <div className="flex items-start gap-3">
              <ShoppingCart className="mr-1 mt-0.5 h-5 w-5 shrink-0 text-white/35" strokeWidth={2} />
              <div className="min-w-0 flex-1">
                {openCartItemsCount === 0 ? (
                  <>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-6 w-6 text-emerald-400/60" strokeWidth={2} aria-hidden />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">Alles eingekauft</p>
                    <p className="mt-1 text-xs text-white/40">Nichts Offenes auf der Liste</p>
                  </>
                ) : shoppingPreview ? (
                  <>
                    <p className="line-clamp-3 text-sm leading-snug text-white/90">{shoppingPreview}</p>
                    <span className="mt-3 text-xs font-medium text-white/55 transition group-hover:text-white/90">
                      Liste öffnen →
                    </span>
                  </>
                ) : (
                  <>
                    <p className="text-3xl font-bold tabular-nums text-white">{openCartItemsCount}</p>
                    <p className="mt-0.5 text-sm text-white/50">Artikel offen</p>
                    <span className="mt-3 text-xs font-medium text-white/55 transition group-hover:text-white/90">
                      Liste öffnen →
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Karte 3: Termine */}
        <Link
          href="/calendar"
          onClick={() => triggerHaptic('light')}
          className={cn(CARD_BASE, CARD_HOVER, 'cursor-pointer', 'relative block')}
        >
          <div
            className="pointer-events-none absolute bottom-4 left-4 top-4 w-0.5 rounded-full bg-gradient-to-b from-brand-purple to-transparent opacity-60"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 z-0 opacity-[0.05]"
            style={{
              background:
                'radial-gradient(ellipse 60% 45% at 0% 0%, rgba(168, 85, 247, 0.35) 0%, transparent 55%)',
            }}
            aria-hidden
          />
          <div className="relative z-[1] flex min-h-[88px] flex-col justify-between pl-6">
            {nextAppt ? (
              <>
                <div>
                  <p className="text-lg font-semibold tabular-nums text-white">{nextAppt.time} Uhr</p>
                  <p className="mt-1 line-clamp-2 text-sm text-white/75">{nextAppt.title}</p>
                  {moreAppointments > 0 ? (
                    <p className="mt-2 text-xs text-white/40">
                      +{moreAppointments}{' '}
                      {moreAppointments === 1 ? 'weiterer Termin' : 'weitere Termine'}
                    </p>
                  ) : null}
                </div>
                <span className="mt-3 text-xs font-medium text-white/55 transition group-hover:text-white/90">
                  Kalender →
                </span>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-white/35" strokeWidth={2} />
                  <div>
                    <p className="text-base font-semibold text-white">{freierTagCopy()}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {hasAnyAppointmentToday
                        ? 'Nichts mehr Offenes — Zeit für dich.'
                        : 'Noch nichts eingetragen.'}
                    </p>
                  </div>
                </div>
                <span className="mt-3 text-xs font-medium text-white/55 transition group-hover:text-white/90">
                  Termin eintragen →
                </span>
              </>
            )}
          </div>
        </Link>
      </div>
    </section>
  );
}
