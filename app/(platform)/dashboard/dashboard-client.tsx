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

/** Premium-Minimal: kleine Kreise mit zarter Tinte + Rand (keine Vollflächen-Gradients) */
const TOOL_MINIMAL_ICON: Record<string, string> = {
  recipe: 'bg-orange-50/50 border-orange-100 text-orange-600',
  'shopping-list': 'bg-rose-50/50 border-rose-100 text-rose-600',
  invoice: 'bg-emerald-50/50 border-emerald-100 text-emerald-600',
  email: 'bg-blue-50/50 border-blue-100 text-blue-600',
  excel: 'bg-green-50/50 border-green-100 text-green-600',
  legal: 'bg-violet-50/50 border-violet-100 text-violet-600',
  'tough-msg': 'bg-indigo-50/50 border-indigo-100 text-indigo-600',
  summarize: 'bg-amber-50/50 border-amber-100 text-amber-600',
  polish: 'bg-teal-50/50 border-teal-100 text-teal-600',
  travel: 'bg-sky-50/50 border-sky-100 text-sky-600',
  pdf: 'bg-red-50/50 border-red-100 text-red-600',
  translate: 'bg-indigo-50/50 border-indigo-100 text-indigo-600',
  fitness: 'bg-rose-50/50 border-rose-100 text-rose-600',
  code: 'bg-slate-50/50 border-slate-200 text-slate-600',
  social: 'bg-pink-50/50 border-pink-100 text-pink-600',
};

const TOOL_MINIMAL_ICON_FALLBACK = 'bg-slate-50/50 border-slate-200 text-slate-600';

const CARD_SHADOW_SOFT = 'shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)]';

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
      className="relative min-h-screen w-full overflow-x-hidden bg-[#F8F9FA]"
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
        <div className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-center border-b border-slate-100 bg-[#F8F9FA]/95 backdrop-blur-sm">
          {pullDistance >= 150 ? (
            <div className="flex items-center gap-2 text-slate-600">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              <span className="text-sm font-medium">Loslassen zum Aktualisieren</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500">
              <span className="text-sm font-medium">Ziehen zum Aktualisieren</span>
            </div>
          )}
        </div>
      )}

      <DashboardShell
        headerVariant="default"
        headerBackground={<div className="h-full w-full bg-[#F8F9FA]" aria-hidden />}
        title={
          <h1
            className="mt-0 flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl"
            style={{ letterSpacing: '-0.3px' }}
          >
            <span>{greetingText}</span>
          </h1>
        }
        subtitle={
          <p className="mt-1 text-sm font-normal text-slate-500 sm:text-base" style={{ letterSpacing: '0.02em' }}>
            {sunriseGreeting.subline}
          </p>
        }
        headerExtra={
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="flex max-w-full min-w-0 shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm"
              title={
                todaysMealTitle
                  ? `Heute: ${todaysMealTitle}`
                  : 'Noch keine Mahlzeit für heute geplant'
              }
            >
              <ChefHat className="h-3 w-3 shrink-0 text-slate-500" aria-hidden />
              <span className="truncate max-w-[200px]">
                {todaysMealTitle ? <>Heute: {todaysMealTitle}</> : <>Planung offen</>}
              </span>
            </span>
            <span className="flex shrink-0 items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              {openCartItemsCount === 0 ? (
                <>
                  <CheckCircle className="mr-1.5 h-3 w-3 shrink-0 text-slate-500" aria-hidden />
                  Alles erledigt
                </>
              ) : (
                <>
                  <ShoppingCart className="mr-1.5 h-3 w-3 shrink-0 text-slate-500" aria-hidden />
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
              <div className="grid grid-cols-2 gap-4 md:mx-auto md:max-w-3xl md:gap-5">
                {sortedTools.slice(0, 4).map((tool) => {
                  const Icon = tool.icon;
                  const subtitle = TOOL_SUBTITLES[tool.id];
                  const liveBadgeLabel = resolveToolLiveBadge(tool.id, {
                    todaysMealTitle,
                    openCartItemsCount,
                  });
                  const iconRing = TOOL_MINIMAL_ICON[tool.id] ?? TOOL_MINIMAL_ICON_FALLBACK;
                  const card = (
                    <div
                      className={cn(
                        'group relative flex h-full min-h-[148px] flex-col items-start gap-4 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5',
                        CARD_SHADOW_SOFT,
                        'transition-all duration-300 hover:scale-[1.02]',
                        tool.available ? 'cursor-pointer active:scale-[0.98]' : 'cursor-not-allowed opacity-60'
                      )}
                    >
                      {(liveBadgeLabel || (!tool.available && tool.status === 'soon')) && (
                        <div className="absolute right-3 top-3 z-[1] flex max-w-[55%] flex-col items-end gap-0.5 text-right">
                          {liveBadgeLabel && (
                            <span
                              className="max-w-full truncate text-[10px] font-medium text-slate-400"
                              title={liveBadgeLabel}
                            >
                              {liveBadgeLabel}
                            </span>
                          )}
                          {!tool.available && tool.status === 'soon' && (
                            <span className="text-[10px] font-medium text-slate-400">Bald</span>
                          )}
                        </div>
                      )}
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border',
                          iconRing
                        )}
                      >
                        {createElement(Icon, {
                          className: 'h-[18px] w-[18px] shrink-0',
                          strokeWidth: 2,
                          'aria-hidden': true,
                        } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number })}
                      </div>
                      <div className="min-w-0 max-w-[88%] text-left">
                        <h3 className="line-clamp-2 text-base font-semibold leading-tight text-slate-900">{tool.title}</h3>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{subtitle}</p>
                      </div>
                    </div>
                  );
                  return tool.available ? (
                    <Link key={tool.id} href={tool.href} className="block h-full min-h-[148px]" onClick={async () => { triggerHaptic('light'); await trackToolUsage(tool.id, tool.title); setTimeout(() => getToolUsageStats().then((r) => r.success && r.stats && setUsageStats(r.stats)), 500); }}>
                      {card}
                    </Link>
                  ) : (
                    <div key={tool.id} className="h-full min-h-[148px]">{card}</div>
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
                  className="mb-4 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => { triggerHaptic('light'); toggleAccordion(section.id); }}
                    className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50/90"
                  >
                    <span className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                        <SectionIcon className="h-4 w-4" strokeWidth={2} aria-hidden />
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
                          const row = (
                            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 transition-colors last:border-0 hover:bg-slate-50/90">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500">
                                {createElement(Icon, { className: 'h-[18px] w-[18px] shrink-0', strokeWidth: 2, 'aria-hidden': true } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number })}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-base font-semibold text-slate-900">{tool.title}</p>
                                <p className="truncate text-sm text-slate-500">{subtitle}</p>
                              </div>
                              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
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
          <div className="py-24 text-center">
            <span className="mx-auto mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm">
              <Search className="h-6 w-6" strokeWidth={2} aria-hidden />
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
