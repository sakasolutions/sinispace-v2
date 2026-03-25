'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { getToolUsageStats, trackToolUsage } from '@/actions/tool-usage-actions';

import { createElement } from 'react';
import {
  Mail,
  Languages,
  Pencil,
  Scale,
  FileText,
  Table2,
  MessageCircleHeart,
  FileInput,
  Terminal,
  ChefHat,
  Dumbbell,
  Plane,
  Share2,
  ShoppingCart,
  FileImage,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardShell } from '@/components/platform/dashboard-shell';
import type { CalendarEventJson } from '@/actions/calendar-actions';

/** Kurze Untertitel – visuelle Dichte (1–2 Wörter) */
const TOOL_SUBTITLES: Record<string, string> = {
  recipe: 'Was koche ich heute?',
  'shopping-list': 'Einkäufe organisieren',
  pdf: 'Bilder zu PDF',
  email: 'Vorlagen & Hilfe',
  polish: 'Korrektur & Stil',
  invoice: 'Angebote & PDF',
  excel: 'Formeln & Daten',
  legal: 'Verträge & Recht',
  'tough-msg': 'WhatsApp & Dating',
  summarize: 'Kurzfassungen',
  travel: 'Routen & Tipps',
  translate: 'Übersetzer',
  fitness: 'Workouts',
  code: 'Code & Debug',
  social: 'LinkedIn & Social',
};

/** Tier-1: dezente Farbring-Icons (Dark / Glass) */
const TOOL_MINIMAL_ICON: Record<string, string> = {
  recipe: 'bg-orange-500/15 border-orange-500/35 text-orange-300',
  'shopping-list': 'bg-rose-500/15 border-rose-500/35 text-rose-300',
  invoice: 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300',
  email: 'bg-blue-500/15 border-blue-500/35 text-blue-300',
  excel: 'bg-green-500/15 border-green-500/35 text-green-300',
  legal: 'bg-violet-500/15 border-violet-500/35 text-violet-300',
  'tough-msg': 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300',
  summarize: 'bg-amber-500/15 border-amber-500/35 text-amber-300',
  polish: 'bg-teal-500/15 border-teal-500/35 text-teal-300',
  travel: 'bg-sky-500/15 border-sky-500/35 text-sky-300',
  pdf: 'bg-red-500/15 border-red-500/35 text-red-300',
  translate: 'bg-indigo-500/15 border-indigo-500/35 text-indigo-300',
  fitness: 'bg-rose-500/15 border-rose-500/35 text-rose-300',
  code: 'bg-white/10 border-white/15 text-white/70',
  social: 'bg-pink-500/15 border-pink-500/35 text-pink-300',
};

const TOOL_MINIMAL_ICON_FALLBACK = 'bg-white/10 border-white/15 text-white/70';

const QUICK_ACCESS_COUNT = 6;

function normalizeHHmm(t: string): string {
  const s = t.trim().slice(0, 5);
  if (s.length >= 4 && s.includes(':')) return s.padStart(5, '0');
  return s;
}

/** „Heute“ wie in lib/dashboard-snapshot (Europe/Berlin) — nur für Client-Anzeige. */
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
  if (h < 17) return 'Mittagessen';
  return 'Abendessen';
}

/** Nächster Termin heute (ohne Mahlzeiten — vermeidet Doppelung zur Essen-Karte). */
function getNextAppointmentToday(
  events: CalendarEventJson[],
  todayStr: string,
  nowHHmm: string
): { next: CalendarEventJson | null; hasAnyToday: boolean } {
  const today = events
    .filter((e) => e.date === todayStr)
    .filter((e) => !isMealEvent(e))
    .sort((a, b) => normalizeHHmm(a.time).localeCompare(normalizeHHmm(b.time)));
  const next = today.find((e) => normalizeHHmm(e.time) >= nowHHmm) ?? null;
  return { next, hasAnyToday: today.length > 0 };
}

function firstMealEventToday(events: CalendarEventJson[], todayStr: string): CalendarEventJson | null {
  const meals = events
    .filter((e) => e.date === todayStr && isMealEvent(e))
    .sort((a, b) => normalizeHHmm(a.time).localeCompare(normalizeHHmm(b.time)));
  return meals[0] ?? null;
}

/** Live-Badges für Top-4 (CookIQ + SmartCart kommen aus DB-Props) */
const TOOL_LIVE_BADGE: Record<string, { label: string }> = {
  fitness: { label: '3 geplant' },
  travel: { label: '2 Trips' },
  calendar: { label: '2 Termine' },
  email: { label: 'Entwürfe' },
  pdf: { label: 'Bereit' },
  legal: { label: 'Offen' },
};

function resolveToolLiveBadge(
  toolId: string,
  opts: { todaysMealTitle: string | null; openCartItemsCount: number }
): string | null {
  if (toolId === 'recipe') {
    if (opts.todaysMealTitle) return `Heute: ${opts.todaysMealTitle}`;
    return 'Planung offen';
  }
  if (toolId === 'shopping-list') {
    if (opts.openCartItemsCount === 0) return 'Alles erledigt';
    return `${opts.openCartItemsCount} offen`;
  }
  return TOOL_LIVE_BADGE[toolId]?.label ?? null;
}

function resolveQuickContext(
  toolId: string,
  opts: {
    todaysMealTitle: string | null;
    openCartItemsCount: number;
    count7d: number;
  }
): string | null {
  const live = resolveToolLiveBadge(toolId, opts);
  if (toolId === 'recipe' || toolId === 'shopping-list') {
    return live;
  }
  if (opts.count7d > 0) {
    return `Diese Woche: ${opts.count7d}×`;
  }
  return TOOL_LIVE_BADGE[toolId]?.label ?? null;
}

type Tool = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  category: string;
  href: string;
  available: boolean;
  status?: 'soon';
  size?: 'large' | 'medium' | 'small';
  priority?: 'high' | 'medium' | 'low';
};

const allTools: Tool[] = [
  // HIGH PRIORITY - Large Cards
  {
    id: 'recipe',
    title: 'CookIQ',
    description: 'Was koche ich heute? Leckere Rezepte basierend auf deinem Vorrat.',
    icon: ChefHat,
    color: 'orange',
    category: 'lifestyle',
    href: '/tools/recipe',
    available: true,
    size: 'large',
    priority: 'high',
  },
  {
    id: 'invoice',
    title: 'Angebot & Rechnung',
    description: 'Rechnungen & Angebote in Sekunden erstellen. Inklusive PDF-Export.',
    icon: FileText,
    color: 'emerald',
    category: 'business',
    href: '/actions/invoice',
    available: true,
    size: 'large',
    priority: 'high',
  },
  {
    id: 'email',
    title: 'Email-Profi',
    description: 'Perfekte Mails für jeden Anlass. Von Bewerbung bis Beschwerde.',
    icon: Mail,
    color: 'blue',
    category: 'communication',
    href: '/actions/email',
    available: true,
    size: 'large',
    priority: 'high',
  },
  {
    id: 'excel',
    title: 'Excel-Coach',
    description: 'Formeln verstehen, erstellen und Daten blitzschnell analysieren.',
    icon: Table2,
    color: 'green',
    category: 'business',
    href: '/tools/excel',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'legal',
    title: 'Rechtstexte & Formales',
    description: 'Sichere Formulierungen für Verträge, Kündigungen und Bürokratie.',
    icon: Scale,
    color: 'violet',
    category: 'business',
    href: '/tools/legal',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'tough-msg',
    title: 'Chat-Coach',
    description: 'Perfekte Antworten für WhatsApp, Dating & Social Media.',
    icon: MessageCircleHeart,
    color: 'indigo',
    category: 'communication',
    href: '/tools/difficult',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'summarize',
    title: 'Klartext',
    description: 'Fasse lange Dokumente prägnant zusammen und spare Lesezeit.',
    icon: FileInput,
    color: 'amber',
    category: 'writing',
    href: '/actions/summarize',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'polish',
    title: 'Wortschliff',
    description: 'Verwandle Notizen in geschliffene Texte. Korrektur & Stil-Upgrade.',
    icon: Pencil,
    color: 'teal',
    category: 'writing',
    href: '/actions/polish',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'travel',
    title: 'Travel-Agent',
    description: 'Komplette Reise-Routen mit Tagesplan, Hidden Gems & Food-Tipps.',
    icon: Plane,
    color: 'blue',
    category: 'lifestyle',
    href: '/tools/travel',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'shopping-list',
    title: 'SmartCart',
    description: 'Mehrere Listen verwalten – Supermarkt, Drogerie, Geburtstag & mehr.',
    icon: ShoppingCart,
    color: 'orange',
    category: 'lifestyle',
    href: '/tools/shopping-list',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'pdf',
    title: 'PDF Creator',
    description: 'Bilder (JPEG, PNG, WebP) zu einer PDF-Datei zusammenfügen.',
    icon: FileImage,
    color: 'red',
    category: 'professional',
    href: '/tools/pdf',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'translate',
    title: 'Sprachbrücke',
    description: 'Übersetze nicht nur Wörter, sondern die Bedeutung.',
    icon: Languages,
    color: 'indigo',
    category: 'communication',
    href: '/actions/translate',
    available: true,
    size: 'small',
    priority: 'low',
  },
  {
    id: 'fitness',
    title: 'Fit-Coach',
    description: 'Maßgeschneiderte Trainingspläne für Zuhause & Gym.',
    icon: Dumbbell,
    color: 'rose',
    category: 'lifestyle',
    href: '/tools/fitness',
    available: true,
    size: 'small',
    priority: 'low',
  },
  {
    id: 'code',
    title: 'Codefix',
    description: 'Finde Bugs, optimiere Code und lass dir Lösungen erklären.',
    icon: Terminal,
    color: 'slate',
    category: 'dev',
    href: '/actions/code',
    available: false,
    status: 'soon',
    size: 'small',
    priority: 'low',
  },
  {
    id: 'social',
    title: 'Social Media Creator',
    description: 'Ideen & Texte für LinkedIn, Instagram und TikTok.',
    icon: Share2,
    color: 'pink',
    category: 'social',
    href: '/actions/social',
    available: false,
    status: 'soon',
    size: 'small',
    priority: 'low',
  },
];

/** Workflow-Sektionen (nur Content-Struktur, keine Navigation) */
const WORKFLOW_SECTIONS = [
  { id: 'productivity', label: 'Produktivität', icon: ShoppingCart, toolIds: ['recipe', 'shopping-list', 'excel'] },
  { id: 'communication', label: 'Kommunikation', icon: Mail, toolIds: ['email', 'tough-msg', 'translate'] },
  { id: 'personal', label: 'Persönlich', icon: Dumbbell, toolIds: ['fitness', 'travel', 'polish'] },
  { id: 'professional', label: 'Professionell', icon: FileText, toolIds: ['legal', 'invoice', 'pdf', 'summarize', 'code', 'social'] },
] as const;

const TOOL_WORKFLOW: Record<string, (typeof WORKFLOW_SECTIONS)[number]['id']> = {
  recipe: 'productivity',
  'shopping-list': 'productivity',
  pdf: 'professional',
  excel: 'productivity',
  email: 'communication',
  'tough-msg': 'communication',
  translate: 'communication',
  fitness: 'personal',
  travel: 'personal',
  polish: 'personal',
  legal: 'professional',
  invoice: 'professional',
  summarize: 'professional',
  code: 'professional',
  social: 'professional',
};

/** Zeitbasiertes Greeting (ohne Name – Name kommt aus Einstellungen) */
function getSunriseGreetingBase(): { base: string; subline: string } {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return { base: 'Guten Morgen', subline: 'Alles im Griff für heute.' };
  if (h >= 11 && h < 17) return { base: 'Guten Tag', subline: 'Zeit für Fokus.' };
  if (h >= 17 && h < 22) return { base: 'Guten Abend', subline: 'Alles im Griff für heute.' };
  return { base: 'Hallo', subline: 'Willkommen zurück.' }; // 22:00 – 04:59
}

export type DashboardClientProps = {
  /** Aus CalendarEvent (meal) für heutiges Datum (Europe/Berlin) */
  todaysMealTitle: string | null;
  /** SmartCart: Items mit checked === false über alle Listen */
  openCartItemsCount: number;
  /** Kalender-Events (getCalendarEvents) — für „Nächster Termin“ & Mahlzeit-Uhrzeit */
  initialCalendarEvents: CalendarEventJson[];
};

export default function DashboardClient({
  todaysMealTitle,
  openCartItemsCount,
  initialCalendarEvents,
}: DashboardClientProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [usageStats, setUsageStats] = useState<Record<string, { count7d: number; count30d: number; isTrending: boolean }>>({});
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const [displayName, setDisplayName] = useState<string>('');

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Display-Name aus Einstellungen (User kann in Profil festlegen)
  useEffect(() => {
    fetch('/api/user/display-name')
      .then((res) => res.json())
      .then((data) => {
        if (data?.displayName) setDisplayName(String(data.displayName).trim());
      })
      .catch(() => {});
  }, []);

  // Fetch usage stats AFTER initial render (non-blocking)
  // Delay auf Mobile länger für bessere Performance
  useEffect(() => {
    // Delay für bessere initial load performance
    const delay = typeof window !== 'undefined' && window.innerWidth < 768 ? 1000 : 300;
    
    const timeoutId = setTimeout(() => {
      getToolUsageStats().then((result) => {
        if (result.success && result.stats) {
          setUsageStats(result.stats);
        }
      }).catch((error) => {
        console.error('Failed to load usage stats:', error);
        // Fail silently - dashboard works without stats
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const root = containerRef.current?.parentElement;
    if (!root || root.scrollTop !== 0) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      y: touch.clientY,
      scrollTop: root.scrollTop,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !containerRef.current) return;
    const root = containerRef.current.parentElement;
    if (!root || root.scrollTop > 0) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Deutlich unempfindlicher: Erst ab 50px Pull reagieren, Reload erst bei 150px
    if (deltaY > 50) {
      if (e.cancelable) {
        e.preventDefault();
      }
      requestAnimationFrame(() => {
        const maxPull = 160;
        const limitedDeltaY = Math.min(maxPull, deltaY);
        setPullDistance(limitedDeltaY);

        if (limitedDeltaY >= 150 && pullDistance < 150) {
          triggerHaptic('light');
        }
      });
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 150) {
      triggerHaptic('success');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      setPullDistance(0);
    }
    touchStartRef.current = null;
  };

  // Default hierarchy for new users (Top 4)
  const defaultTop4 = ['recipe', 'invoice', 'email', 'tough-msg'];

  const sortedTools = useMemo(() => {
    return [...allTools].sort((a, b) => {
      const aStats = usageStats[a.id];
      const bStats = usageStats[b.id];
      
      // If no usage stats, use default hierarchy
      if (!aStats && !bStats) {
        const aIndex = defaultTop4.indexOf(a.id);
        const bIndex = defaultTop4.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return 0;
      }
      
      // Sort by 7-day usage count (descending)
      const aCount = aStats?.count7d || 0;
      const bCount = bStats?.count7d || 0;
      if (aCount !== bCount) return bCount - aCount;
      
      // If equal, check default hierarchy
      const aIndex = defaultTop4.indexOf(a.id);
      const bIndex = defaultTop4.indexOf(b.id);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return 0;
    });
  }, [usageStats]);

  const sunriseGreeting = getSunriseGreetingBase();
  const greetingText = displayName ? `${sunriseGreeting.base}, ${displayName}!` : `${sunriseGreeting.base}!`;

  const todayStr = getTodayDateStringBerlin();
  const nowHHmm = getNowHHmmBerlin();
  const { next: nextAppointment, hasAnyToday: hasAnyApptToday } = getNextAppointmentToday(
    initialCalendarEvents,
    todayStr,
    nowHHmm
  );
  const firstMeal = firstMealEventToday(initialCalendarEvents, todayStr);
  const mealSubtitle =
    todaysMealTitle && firstMeal
      ? mealLabelFromTimeHHmm(firstMeal.time)
      : todaysMealTitle
        ? 'Heute geplant'
        : '';

  const quickAccessTools = useMemo(
    () => sortedTools.filter((t) => t.available).slice(0, QUICK_ACCESS_COUNT),
    [sortedTools]
  );
  const quickAccessIds = useMemo(() => new Set(quickAccessTools.map((t) => t.id)), [quickAccessTools]);

  return (
    <div
      ref={containerRef}
      className="relative isolate min-h-[100dvh] w-full overflow-x-hidden bg-transparent"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, 160)}px)` : 'none',
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
      }}
    >
      {/* Ambient Aurora – weiches Brand-Licht oben (nicht interaktiv) */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-0 h-96 w-full bg-gradient-to-br from-fuchsia-500/8 via-purple-500/5 to-orange-400/8 blur-[100px]"
        aria-hidden
      />

      {/* Pull-to-Refresh Indicator */}
      {pullDistance > 50 && (
        <div className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-center border-b border-white/10 bg-canvas/95 backdrop-blur-sm">
          {pullDistance >= 150 ? (
            <div className="flex items-center gap-2 text-white/70">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
              <span className="text-sm font-medium">Loslassen zum Aktualisieren</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/55">
              <span className="text-sm font-medium">Ziehen zum Aktualisieren</span>
            </div>
          )}
        </div>
      )}

      <div className="relative z-10">
      <DashboardShell
        headerVariant="default"
        headerBackground={<div className="h-full w-full bg-transparent" aria-hidden />}
        title={
          <h1
            className="mt-0 flex flex-wrap items-center gap-3 bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent md:text-4xl"
            style={{ letterSpacing: '-0.3px' }}
          >
            <span>{greetingText}</span>
          </h1>
        }
        subtitle={
          <p className="mt-1 text-sm font-normal text-white/60 sm:text-base" style={{ letterSpacing: '0.02em' }}>
            {sunriseGreeting.subline}
          </p>
        }
        headerExtra={
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="flex max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-md"
              title={
                todaysMealTitle
                  ? `Heute: ${todaysMealTitle}`
                  : 'Noch keine Mahlzeit für heute geplant'
              }
            >
              <ChefHat className="h-3 w-3 shrink-0 text-white/50" aria-hidden />
              <span className="max-w-[200px] truncate">
                {todaysMealTitle ? <>Heute: {todaysMealTitle}</> : <>Planung offen</>}
              </span>
            </span>
            <span className="flex shrink-0 items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur-md">
              {openCartItemsCount === 0 ? (
                <>
                  <CheckCircle className="mr-1.5 h-3 w-3 shrink-0 text-white/50" aria-hidden />
                  Alles erledigt
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-1.5 h-3 w-3 shrink-0 text-white/50" aria-hidden />
                  {openCartItemsCount} offen
                </>
              )}
            </span>
          </div>
        }
      >
        <div className="space-y-8 md:space-y-10">
          {/* Zone 1: Heute — drei Status-Karten */}
          <section aria-labelledby="today-heading">
            <h2 id="today-heading" className="mb-3 text-sm font-medium uppercase tracking-wider text-white/40">
              Heute
            </h2>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
              {/* Essen */}
              <div className="relative min-w-[260px] max-w-[100%] shrink-0 snap-center rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl md:min-w-0">
                <div
                  className="absolute left-0 right-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-emerald-400 to-teal-400"
                  aria-hidden
                />
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <ChefHat className="h-5 w-5 text-white/90" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-white">Essen heute</p>
                    {todaysMealTitle ? (
                      <>
                        <p className="mt-1 line-clamp-2 text-xs text-white/40">{todaysMealTitle}</p>
                        {mealSubtitle ? (
                          <p className="mt-0.5 text-xs text-white/40">{mealSubtitle}</p>
                        ) : null}
                        <Link
                          href="/tools/recipe"
                          className="mt-3 inline-block text-xs text-white/60 transition-colors hover:text-white"
                          onClick={() => triggerHaptic('light')}
                        >
                          → Rezept öffnen
                        </Link>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-xs text-white/40">Noch nichts geplant</p>
                        <Link
                          href="/tools/recipe"
                          className="mt-3 inline-block text-xs text-white/60 transition-colors hover:text-white"
                          onClick={() => triggerHaptic('light')}
                        >
                          → Planen
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Einkauf */}
              <div className="relative min-w-[260px] max-w-[100%] shrink-0 snap-center rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl md:min-w-0">
                <div
                  className="absolute left-0 right-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-orange-400 to-amber-400"
                  aria-hidden
                />
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <ShoppingCart className="h-5 w-5 text-white/90" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-white">Einkauf</p>
                    {openCartItemsCount > 0 ? (
                      <>
                        <p className="mt-1 text-xs text-white/40">
                          {openCartItemsCount} Artikel offen
                        </p>
                        <Link
                          href="/tools/shopping-list"
                          className="mt-3 inline-block text-xs text-white/60 transition-colors hover:text-white"
                          onClick={() => triggerHaptic('light')}
                        >
                          → Liste öffnen
                        </Link>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-white/40">Alles erledigt ✓</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Nächster Termin */}
              <div className="relative min-w-[260px] max-w-[100%] shrink-0 snap-center rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl md:min-w-0">
                <div
                  className="absolute left-0 right-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-brand-pink to-brand-orange"
                  aria-hidden
                />
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10">
                    <Calendar className="h-5 w-5 text-white/90" strokeWidth={2} aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm font-medium text-white">Nächster Termin</p>
                    {nextAppointment ? (
                      <>
                        <p className="mt-1 text-xs text-white/40">
                          {nextAppointment.time} Uhr — {nextAppointment.title}
                        </p>
                        <Link
                          href="/calendar"
                          className="mt-3 inline-block text-xs text-white/60 transition-colors hover:text-white"
                          onClick={() => triggerHaptic('light')}
                        >
                          → Kalender
                        </Link>
                      </>
                    ) : (
                      <>
                        <p className="mt-1 text-xs text-white/40">
                          {hasAnyApptToday ? 'Keine weiteren Termine heute' : 'Keine Termine heute'}
                        </p>
                        <Link
                          href="/calendar"
                          className="mt-3 inline-block text-xs text-white/60 transition-colors hover:text-white"
                          onClick={() => triggerHaptic('light')}
                        >
                          → Kalender
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Zone 2: Schnellzugriff */}
          <section aria-labelledby="quick-heading">
            <h2 id="quick-heading" className="mb-3 text-sm font-medium uppercase tracking-wider text-white/40">
              Schnellzugriff
            </h2>
            <div className={cn('overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl')}>
              {quickAccessTools.map((tool, index) => {
                const Icon = tool.icon;
                const iconRing = TOOL_MINIMAL_ICON[tool.id] ?? TOOL_MINIMAL_ICON_FALLBACK;
                const ctx = resolveQuickContext(tool.id, {
                  todaysMealTitle,
                  openCartItemsCount,
                  count7d: usageStats[tool.id]?.count7d ?? 0,
                });
                const isLast = index === quickAccessTools.length - 1;
                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    onClick={async () => {
                      triggerHaptic('light');
                      await trackToolUsage(tool.id, tool.title);
                      setTimeout(
                        () =>
                          getToolUsageStats().then(
                            (r) => r.success && r.stats && setUsageStats(r.stats)
                          ),
                        500
                      );
                    }}
                    className={cn(
                      'flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-white/5',
                      !isLast && 'border-b border-white/5'
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                          iconRing
                        )}
                      >
                        {createElement(Icon, {
                          className: 'h-[18px] w-[18px] shrink-0',
                          strokeWidth: 2,
                          'aria-hidden': true,
                        } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number })}
                      </span>
                      <span className="truncate text-sm font-medium text-white">{tool.title}</span>
                    </span>
                    {ctx ? (
                      <span className="shrink-0 truncate text-xs text-white/40">{ctx}</span>
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-white/45" aria-hidden />
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Zone 3: Alle Tools — Akkordeons (ohne Schnellzugriff) */}
          <section aria-labelledby="all-tools-heading">
            <h2 id="all-tools-heading" className="mb-3 text-sm font-medium uppercase tracking-wider text-white/40">
              Alle Tools
            </h2>
            <div className="space-y-3">
              {WORKFLOW_SECTIONS.map((section) => {
                const tools = sortedTools.filter(
                  (t) => TOOL_WORKFLOW[t.id] === section.id && !quickAccessIds.has(t.id)
                );
                if (tools.length === 0) return null;
                const isOpen = openAccordions.has(section.id);
                const SectionIcon = section.icon;
                return (
                  <div key={section.id} className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        toggleAccordion(section.id);
                      }}
                      className="flex w-full items-center justify-between rounded-xl p-4 text-left transition-colors hover:bg-white/8"
                    >
                      <span className="flex items-center gap-3 text-sm font-semibold text-white">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60">
                          <SectionIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
                        </span>
                        {section.label}
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-white/45"
                      >
                        <ChevronDown className="h-5 w-5" />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-1 gap-3 p-3 pt-0 md:grid-cols-2">
                            {tools.map((tool) => {
                              const Icon = tool.icon;
                              const subtitle = TOOL_SUBTITLES[tool.id];
                              const inner = (
                                <div className="flex h-full flex-col gap-2 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 hover:bg-white/8">
                                  <div className="flex items-start gap-3">
                                    <span
                                      className={cn(
                                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                                        TOOL_MINIMAL_ICON[tool.id] ?? TOOL_MINIMAL_ICON_FALLBACK
                                      )}
                                    >
                                      {createElement(Icon, {
                                        className: 'h-[18px] w-[18px] shrink-0',
                                        strokeWidth: 2,
                                        'aria-hidden': true,
                                      } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number })}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-semibold text-white">{tool.title}</p>
                                      <p className="mt-0.5 line-clamp-2 text-xs text-white/55">{subtitle}</p>
                                    </div>
                                  </div>
                                </div>
                              );
                              return tool.available ? (
                                <Link
                                  key={tool.id}
                                  href={tool.href}
                                  onClick={async () => {
                                    triggerHaptic('light');
                                    await trackToolUsage(tool.id, tool.title);
                                    setTimeout(
                                      () =>
                                        getToolUsageStats().then(
                                          (r) => r.success && r.stats && setUsageStats(r.stats)
                                        ),
                                      500
                                    );
                                  }}
                                >
                                  {inner}
                                </Link>
                              ) : (
                                <div key={tool.id} className="cursor-not-allowed opacity-60">
                                  {inner}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </DashboardShell>
      </div>
    </div>
  );
}
