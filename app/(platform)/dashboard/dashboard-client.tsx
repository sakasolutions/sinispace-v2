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
  Search,
  ShoppingCart,
  FileImage,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Hand,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardShell } from '@/components/platform/dashboard-shell';

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

/** Squircle-Container pro Tool – Gradient + dezenter Schatten (Tier-1) */
const TOOL_SQUIRCLE: Record<string, { gradient: string; shadow: string }> = {
  recipe: { gradient: 'bg-gradient-to-br from-orange-500 to-amber-500', shadow: 'shadow-sm shadow-black/10' },
  'shopping-list': { gradient: 'bg-gradient-to-br from-orange-600 to-rose-500', shadow: 'shadow-sm shadow-black/10' },
  fitness: { gradient: 'bg-gradient-to-br from-rose-500 to-purple-600', shadow: 'shadow-sm shadow-black/10' },
  travel: { gradient: 'bg-gradient-to-br from-sky-400 to-indigo-500', shadow: 'shadow-sm shadow-black/10' },
  pdf: { gradient: 'bg-gradient-to-br from-red-400 to-rose-400', shadow: 'shadow-sm shadow-black/10' },
  email: { gradient: 'bg-gradient-to-br from-blue-400 to-cyan-500', shadow: 'shadow-sm shadow-black/10' },
  excel: { gradient: 'bg-gradient-to-br from-blue-400 to-cyan-500', shadow: 'shadow-sm shadow-black/10' },
  polish: { gradient: 'bg-gradient-to-br from-teal-500 to-emerald-500', shadow: 'shadow-sm shadow-black/10' },
  invoice: { gradient: 'bg-gradient-to-br from-emerald-500 to-green-500', shadow: 'shadow-sm shadow-black/10' },
  legal: { gradient: 'bg-gradient-to-br from-violet-500 to-purple-600', shadow: 'shadow-sm shadow-black/10' },
  'tough-msg': { gradient: 'bg-gradient-to-br from-indigo-500 to-violet-500', shadow: 'shadow-sm shadow-black/10' },
  summarize: { gradient: 'bg-gradient-to-br from-amber-400 to-orange-500', shadow: 'shadow-sm shadow-black/10' },
  translate: { gradient: 'bg-gradient-to-br from-indigo-400 to-violet-500', shadow: 'shadow-sm shadow-black/10' },
  code: { gradient: 'bg-gradient-to-br from-slate-500 to-slate-600', shadow: 'shadow-sm shadow-black/10' },
  social: { gradient: 'bg-gradient-to-br from-pink-500 to-rose-500', shadow: 'shadow-sm shadow-black/10' },
};

const SQUIRCLE_FALLBACK = { gradient: 'bg-gradient-to-br from-orange-400 to-pink-500', shadow: 'shadow-sm shadow-black/10' };

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

/** Day (06:00–18:00) = sunrise, Night (18:00–06:00) = night */
function getTimeOfDay(): 'sunrise' | 'night' {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? 'sunrise' : 'night';
}

export type DashboardClientProps = {
  /** Aus CalendarEvent (meal) für heutiges Datum (Europe/Berlin) */
  todaysMealTitle: string | null;
  /** SmartCart: Items mit checked === false über alle Listen */
  openCartItemsCount: number;
};

export default function DashboardClient({
  todaysMealTitle,
  openCartItemsCount,
}: DashboardClientProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [usageStats, setUsageStats] = useState<Record<string, { count7d: number; count30d: number; isTrending: boolean }>>({});
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const [displayName, setDisplayName] = useState<string>('');
  const [timeOfDay, setTimeOfDay] = useState<'sunrise' | 'night'>(() => getTimeOfDay());

  // Time-of-day aktualisieren (z. B. jede Minute), damit Theme wechselt
  useEffect(() => {
    setTimeOfDay(getTimeOfDay());
    const interval = setInterval(() => setTimeOfDay(getTimeOfDay()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);
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

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full relative overflow-x-hidden bg-[var(--app-canvas,#fcfbfa)]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, 160)}px)` : 'none',
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
      }}
    >
      {/* Ambient-Blobs liegen im globalen Layout (hinter Sidebar + Content) */}

      {/* Pull-to-Refresh Indicator */}
      {pullDistance > 50 && (
        <div
          className={cn(
            'fixed top-0 left-0 right-0 flex items-center justify-center h-16 z-50',
            timeOfDay === 'sunrise' ? 'bg-white' : 'bg-slate-900'
          )}
        >
          {pullDistance >= 150 ? (
            <div className={cn('flex items-center gap-2', timeOfDay === 'sunrise' ? 'text-orange-500' : 'text-violet-400')}>
              <div className={cn('w-5 h-5 border-2 border-t-transparent rounded-full animate-spin', timeOfDay === 'sunrise' ? 'border-orange-500' : 'border-violet-400')} />
              <span className={cn('text-sm font-medium', timeOfDay === 'sunrise' ? 'text-gray-700' : 'text-white/90')}>Loslassen zum Aktualisieren</span>
            </div>
          ) : (
            <div className={cn('flex items-center gap-2', timeOfDay === 'sunrise' ? 'text-gray-500' : 'text-white/70')}>
              <span className="text-sm font-medium">Ziehen zum Aktualisieren</span>
            </div>
          )}
        </div>
      )}

      <DashboardShell
        headerVariant="default"
        headerBackground={
          <div className="relative w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url(/assets/images/dashboard-header.webp)' }}>
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-800/60 to-gray-900/60 z-0" aria-hidden />
          </div>
        }
        title={
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight mt-0 text-white flex items-center gap-3 flex-wrap"
            style={{ letterSpacing: '-0.3px' }}
          >
            <span
              className="inline-flex items-center justify-center rounded-xl bg-white/15 p-2 text-white border border-white/25 shrink-0"
              aria-hidden
            >
              <Hand className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2} />
            </span>
            <span>{greetingText}</span>
          </h1>
        }
        subtitle={
          <p className="text-sm sm:text-base mt-1 font-normal text-white/75" style={{ letterSpacing: '0.1px' }}>
            {sunriseGreeting.subline}
          </p>
        }
        headerExtra={
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="backdrop-blur-md rounded-2xl px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 shrink-0 bg-white/10 border border-white/20 text-white/80 min-w-0 max-w-full"
              title={
                todaysMealTitle
                  ? `Heute: ${todaysMealTitle}`
                  : 'Noch keine Mahlzeit für heute geplant'
              }
            >
              <ChefHat className="w-3 h-3 opacity-90 shrink-0" aria-hidden />
              <span className="uppercase tracking-wide truncate max-w-[140px]">
                {todaysMealTitle ? <>Heute: {todaysMealTitle}</> : <>Planung offen</>}
              </span>
            </span>
            <span className="backdrop-blur-md rounded-2xl px-3 py-1.5 text-xs font-medium flex items-center shrink-0 bg-white/10 border border-white/20 text-white/80 uppercase tracking-wide">
              {openCartItemsCount === 0 ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1.5 opacity-90 shrink-0" aria-hidden />
                  Alles erledigt
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3 h-3 mr-1.5 opacity-90 shrink-0" aria-hidden />
                  {openCartItemsCount} offen
                </>
              )}
            </span>
          </div>
        }
      >
        {sortedTools.length > 0 ? (
          <div className="space-y-6 md:space-y-8">
            {/* Erste Cards: Oberkante bei Main+36px (pt-9 in Shell), Titel im Header */}
            <section aria-labelledby="recent-heading">
              <h2 id="recent-heading" className="sr-only">Zuletzt verwendet</h2>
              <div className="grid grid-cols-2 gap-4 md:gap-4 md:max-w-3xl md:mx-auto">
                {sortedTools.slice(0, 4).map((tool) => {
                  const Icon = tool.icon;
                  const subtitle = TOOL_SUBTITLES[tool.id];
                  const liveBadgeLabel = resolveToolLiveBadge(tool.id, {
                    todaysMealTitle,
                    openCartItemsCount,
                  });
                  const card = (
                    <div
                      key={tool.id}
                      className={cn(
                        'group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-card overflow-hidden',
                        'bg-white/90 backdrop-blur-sm border border-slate-200/70 shadow-tier1',
                        'hover:scale-[1.02] transition-all duration-300',
                        'p-5',
                        tool.available ? 'cursor-pointer active:scale-[0.98]' : 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      {/* Status-Badge: dezent oben rechts (einheitliches Micro-Design) */}
                      {(liveBadgeLabel || (!tool.available && tool.status === 'soon')) && (
                        <div className="absolute top-4 right-4 flex flex-col items-end gap-0.5 max-w-[calc(100%-2rem)]">
                          {liveBadgeLabel && (
                            <span
                              className="bg-slate-100/95 text-slate-600 text-[10px] uppercase font-semibold px-2 py-1 rounded-2xl shrink-0 max-w-[100px] truncate text-right"
                              style={{ letterSpacing: '0.6px' }}
                              title={liveBadgeLabel}
                            >
                              {liveBadgeLabel}
                            </span>
                          )}
                          {!tool.available && tool.status === 'soon' && (
                            <span className="bg-slate-100/95 text-slate-600 text-[10px] uppercase font-semibold px-2 py-1 rounded-2xl" style={{ letterSpacing: '0.6px' }}>Bald</span>
                          )}
                        </div>
                      )}
                      {/* Squircle (App-Icon-Style) */}
                      <div className="flex w-full justify-between items-start gap-2">
                        {(() => {
                          const sq = TOOL_SQUIRCLE[tool.id] ?? SQUIRCLE_FALLBACK;
                          return (
                            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center shrink-0', sq.gradient, sq.shadow)}>
                              {createElement(Icon, { className: 'w-8 h-8 shrink-0 text-white', strokeWidth: 2.5, 'aria-hidden': true } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number })}
                            </div>
                          );
                        })()}
                      </div>
                      {/* Unten: Titel + Subtext */}
                      <div className="w-full text-left">
                        <h3 className="font-bold text-lg text-slate-900 leading-tight line-clamp-2">{tool.title}</h3>
                        <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{subtitle}</p>
                      </div>
                    </div>
                  );
                  return tool.available ? (
                    <Link key={tool.id} href={tool.href} className="block h-full min-h-[160px]" onClick={async () => { triggerHaptic('light'); await trackToolUsage(tool.id, tool.title); setTimeout(() => getToolUsageStats().then((r) => r.success && r.stats && setUsageStats(r.stats)), 500); }}>
                      {card}
                    </Link>
                  ) : (
                    <div key={tool.id} className="h-full min-h-[160px]">{card}</div>
                  );
                })}
              </div>
            </section>

            {/* Smart Glass Accordions – sekundäre Tools nach Kategorie */}
            {WORKFLOW_SECTIONS.map((section) => {
              const featuredIds = sortedTools.slice(0, 4).map((t) => t.id);
              const tools = sortedTools.filter(
                (t) => TOOL_WORKFLOW[t.id] === section.id && !featuredIds.includes(t.id)
              );
              if (tools.length === 0) return null;
              const isOpen = openAccordions.has(section.id);
              const SectionIcon = section.icon;
              return (
                <div
                  key={section.id}
                  className="rounded-card overflow-hidden mb-4 bg-white/90 backdrop-blur-sm border border-slate-200/70 shadow-tier1"
                >
                  <button
                    type="button"
                    onClick={() => { triggerHaptic('light'); toggleAccordion(section.id); }}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/80 transition-colors"
                  >
                    <span className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                      <span className="inline-flex items-center justify-center rounded-xl bg-orange-100 text-orange-600 p-2 shrink-0">
                        <SectionIcon className="w-4 h-4" strokeWidth={2} aria-hidden />
                      </span>
                      {section.label}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-slate-400"
                    >
                      <ChevronDown className="w-5 h-5" />
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
                        {tools.map((tool) => {
                          const Icon = tool.icon;
                          const subtitle = TOOL_SUBTITLES[tool.id];
                          const sq = TOOL_SQUIRCLE[tool.id] ?? SQUIRCLE_FALLBACK;
                          const row = (
                            <div className="flex items-center gap-3 py-4 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50/90 transition-colors">
                              <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center shrink-0', sq.gradient, sq.shadow)}>
                                {createElement(Icon, { className: 'w-5 h-5 shrink-0 text-white', strokeWidth: 2, 'aria-hidden': true } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number })}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-base text-slate-900 truncate">{tool.title}</p>
                                <p className="text-sm text-slate-500 truncate">{subtitle}</p>
                              </div>
                              <ChevronRight className="w-5 h-5 shrink-0 text-slate-400" />
                            </div>
                          );
                          return tool.available ? (
                            <Link
                              key={tool.id}
                              href={tool.href}
                              onClick={async () => { triggerHaptic('light'); await trackToolUsage(tool.id, tool.title); setTimeout(() => getToolUsageStats().then((r) => r.success && r.stats && setUsageStats(r.stats)), 500); }}
                              className="block"
                            >
                              {row}
                            </Link>
                          ) : (
                            <div key={tool.id} className="opacity-60 cursor-not-allowed">
                              {row}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24">
            <span className="inline-flex items-center justify-center rounded-xl bg-orange-100 text-orange-600 p-3 mx-auto mb-6">
              <Search className="w-8 h-8" strokeWidth={2} aria-hidden />
            </span>
            <p className="text-slate-900 text-xl font-bold tracking-tight mb-2">Keine Tools gefunden.</p>
            <p className="text-slate-500 text-sm font-normal">
              Versuche eine andere Suche oder Kategorie.
            </p>
          </div>
        )}
      </DashboardShell>
    </div>
  );
}
