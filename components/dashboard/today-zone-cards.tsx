'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CheckCircle2,
  ChefHat,
  ShoppingCart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptic-feedback';
import type { CalendarEventJson } from '@/actions/calendar-actions';
import { getShoppingLists } from '@/actions/shopping-list-actions';
import type { ShoppingList } from '@/lib/shopping-lists-storage';

const CARD_BASE =
  'group relative flex min-h-[110px] cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 transition-all duration-200 hover:border-white/[0.08] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple/40';

/** Kalender: Mobil eine Zeile, Desktop wie die anderen Karten */
const CARD_CALENDAR =
  'group relative flex min-h-0 cursor-pointer flex-row items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 transition-all duration-200 hover:border-white/[0.08] hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-purple/40 md:min-h-[110px] md:flex-col md:items-stretch md:justify-between md:p-4';

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

/** Erster Buchstabe pro Wort groß, Rest klein */
function normalizeItemLabel(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w.length === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
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
  const mealTimeSubtitle = firstMeal ? `${normalizeHHmm(firstMeal.time)} Uhr` : null;
  const recipeHref = firstMeal?.recipeResultId
    ? `/tools/recipe?open=${encodeURIComponent(firstMeal.recipeResultId)}`
    : '/tools/recipe';

  const normalizedPills = openItemLabels.map(normalizeItemLabel).filter(Boolean);
  const showPills = normalizedPills.length > 0 && openCartItemsCount > 0;

  return (
    <section aria-labelledby="today-status-heading" className="w-full min-w-0">
      <h2 id="today-status-heading" className="sr-only">
        Status für heute
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-3">
        {/* Essen */}
        {mealTitleDisplay ? (
          <Link
            href={recipeHref}
            onClick={() => triggerHaptic('light')}
            className={cn(CARD_BASE, 'block')}
          >
            <div
              className="mb-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-orange-400/10 bg-orange-400/[0.08]"
              aria-hidden
            >
              <ChefHat className="h-[14px] w-[14px] text-orange-400/70" strokeWidth={1.5} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">{mealTitleDisplay}</p>
                {mealTimeSubtitle ? (
                  <p className="mt-0.5 text-xs text-white/35">{mealTimeSubtitle}</p>
                ) : null}
              </div>
              <span className="mt-2 text-xs text-white/30 transition group-hover:text-white/60">Rezept ansehen →</span>
            </div>
          </Link>
        ) : (
          <Link
            href="/tools/recipe"
            onClick={() => triggerHaptic('light')}
            className={cn(CARD_BASE, 'block')}
          >
            <div
              className="mb-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-orange-400/10 bg-orange-400/[0.08]"
              aria-hidden
            >
              <ChefHat className="h-[14px] w-[14px] text-orange-400/70" strokeWidth={1.5} />
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-white/90">Was kochst du?</p>
                <p className="mt-0.5 text-xs text-white/35">Noch kein Plan für heute</p>
              </div>
              <span className="mt-2 text-xs text-white/30 transition group-hover:text-white/60">Inspiration holen →</span>
            </div>
          </Link>
        )}

        {/* Einkauf */}
        <Link
          href="/tools/shopping-list"
          onClick={() => triggerHaptic('light')}
          className={cn(CARD_BASE, 'block')}
        >
          {openCartItemsCount === 0 ? (
            <>
              <div
                className="mb-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-pink-400/10 bg-pink-400/[0.08]"
                aria-hidden
              >
                <CheckCircle2 className="h-[14px] w-[14px] text-emerald-400/60" strokeWidth={1.5} />
              </div>
              <div className="flex min-h-0 flex-1 flex-col justify-between">
                <p className="text-sm font-medium text-white/90">Alles eingekauft</p>
                <p className="mt-0.5 text-xs text-white/35">Nichts Offenes auf der Liste</p>
              </div>
            </>
          ) : (
            <>
              <div
                className="mb-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-pink-400/10 bg-pink-400/[0.08]"
                aria-hidden
              >
                <ShoppingCart className="h-[14px] w-[14px] text-pink-400/70" strokeWidth={1.5} />
              </div>
              <div className="flex min-h-0 flex-1 flex-col justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90">Einkauf</p>
                  {showPills ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {normalizedPills.slice(0, 3).map((label, idx) => (
                        <span
                          key={`${idx}-${label}`}
                          className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs text-white/50"
                        >
                          {label}
                        </span>
                      ))}
                      {normalizedPills.length > 3 ? (
                        <span className="rounded-md bg-white/[0.05] px-2 py-0.5 text-xs text-white/50">
                          +{normalizedPills.length - 3}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-0.5 text-xs text-white/35">{openCartItemsCount} Artikel offen</p>
                  )}
                </div>
                <span className="mt-2 text-xs text-white/30 transition group-hover:text-white/60">Liste öffnen →</span>
              </div>
            </>
          )}
        </Link>

        {/* Termin — Mobil kompakte Zeile, Desktop Karte */}
        <Link
          href="/calendar"
          onClick={() => triggerHaptic('light')}
          className={cn(CARD_CALENDAR, 'col-span-2 block md:col-span-1')}
        >
          {nextAppt ? (
            <>
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-400/[0.08] md:mb-3"
                aria-hidden
              >
                <Calendar className="h-[14px] w-[14px] text-violet-400/70" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1 md:flex md:flex-1 md:flex-col md:justify-between">
                <div>
                  <p className="text-lg font-semibold tracking-tight text-white/80">{normalizeHHmm(nextAppt.time)} Uhr</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-white/35">{nextAppt.title}</p>
                  {moreAppointments > 0 ? (
                    <p className="mt-1 text-xs text-white/20">+{moreAppointments} weitere</p>
                  ) : null}
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-400/[0.08] md:mb-3"
                aria-hidden
              >
                <Calendar className="h-[14px] w-[14px] text-violet-400/70" strokeWidth={1.5} />
              </div>
              <div className="min-w-0 flex-1 md:flex md:flex-1 md:flex-col md:justify-between">
                <div>
                  <p className="text-sm font-medium text-white/90 md:text-lg md:font-semibold md:tracking-tight md:text-white/80">
                    {freierTagCopy()}
                  </p>
                  <p className="mt-0.5 text-xs text-white/35">Keine Termine</p>
                </div>
              </div>
              <span className="shrink-0 text-xs text-white/30 transition group-hover:text-white/60">Termin eintragen →</span>
            </>
          )}
        </Link>
      </div>
    </section>
  );
}
