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
  ChevronRight,
  MessageCircle,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardShell } from '@/components/platform/dashboard-shell';
import { TodayZoneCards } from '@/components/dashboard/today-zone-cards';
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

/** Schnellzugriff: 28×28, Lucide, dezente Tint-Boxen */
type ToolQuickVisual = {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  box: string;
  iconClass: string;
};

const TOOL_QUICK_VISUAL: Record<string, ToolQuickVisual> = {
  recipe: { Icon: ChefHat, box: 'border-orange-400/10 bg-orange-400/[0.08]', iconClass: 'text-orange-400/70' },
  'shopping-list': { Icon: ShoppingCart, box: 'border-pink-400/10 bg-pink-400/[0.08]', iconClass: 'text-pink-400/70' },
  invoice: { Icon: FileText, box: 'border-emerald-400/10 bg-emerald-400/[0.08]', iconClass: 'text-emerald-400/70' },
  email: { Icon: Mail, box: 'border-violet-400/10 bg-violet-400/[0.08]', iconClass: 'text-violet-400/70' },
  excel: { Icon: Table2, box: 'border-green-400/10 bg-green-400/[0.08]', iconClass: 'text-green-400/70' },
  legal: { Icon: Scale, box: 'border-violet-400/10 bg-violet-400/[0.08]', iconClass: 'text-violet-400/70' },
  'tough-msg': { Icon: MessageCircle, box: 'border-sky-400/10 bg-sky-400/[0.08]', iconClass: 'text-sky-400/70' },
  summarize: { Icon: FileInput, box: 'border-amber-400/10 bg-amber-400/[0.08]', iconClass: 'text-amber-400/70' },
  polish: { Icon: Pencil, box: 'border-teal-400/10 bg-teal-400/[0.08]', iconClass: 'text-teal-400/70' },
  travel: { Icon: Plane, box: 'border-sky-400/10 bg-sky-400/[0.08]', iconClass: 'text-sky-400/70' },
  pdf: { Icon: FileImage, box: 'border-red-400/10 bg-red-400/[0.08]', iconClass: 'text-red-400/70' },
  translate: { Icon: Languages, box: 'border-indigo-400/10 bg-indigo-400/[0.08]', iconClass: 'text-indigo-400/70' },
  fitness: { Icon: Dumbbell, box: 'border-rose-400/10 bg-rose-400/[0.08]', iconClass: 'text-rose-400/70' },
  code: { Icon: Terminal, box: 'border-white/10 bg-white/[0.06]', iconClass: 'text-white/60' },
  social: { Icon: Share2, box: 'border-pink-400/10 bg-pink-400/[0.08]', iconClass: 'text-pink-400/70' },
};

const TOOL_QUICK_FALLBACK: ToolQuickVisual = {
  Icon: Flame,
  box: 'border-white/10 bg-white/[0.06]',
  iconClass: 'text-white/60',
};

/** Tier-1: dezente Farbring-Icons (Dark / Glass) — Akkordeon „Alle Tools“ */
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

function setRgbaAlpha(color: string, alpha: number): string {
  const m = color.match(/rgba?\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,)\s]+)\s*(?:,\s*([^)]+)\s*)?\)/i);
  if (!m) return color;
  const r = m[1].trim();
  const g = m[2].trim();
  const b = m[3].trim();
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const TOOL_COLORS: Record<
  string,
  { bg: string; border: string; glow: string; icon: string; title: string; meta: string }
> = {
  recipe: {
    bg: 'rgba(251,146,60,0.06)',
    border: 'rgba(251,146,60,0.10)',
    glow: 'rgba(251,146,60,0.06)',
    icon: 'rgba(251,146,60,0.85)',
    title: 'rgba(251,186,120,0.95)',
    meta: 'rgba(251,146,60,0.40)',
  },
  'shopping-list': {
    bg: 'rgba(236,72,153,0.05)',
    border: 'rgba(236,72,153,0.09)',
    glow: 'rgba(236,72,153,0.05)',
    icon: 'rgba(236,72,153,0.85)',
    title: 'rgba(244,150,196,0.95)',
    meta: 'rgba(236,72,153,0.40)',
  },
  invoice: {
    bg: 'rgba(52,211,153,0.04)',
    border: 'rgba(52,211,153,0.08)',
    glow: 'rgba(52,211,153,0.04)',
    icon: 'rgba(52,211,153,0.85)',
    title: 'rgba(130,230,190,0.95)',
    meta: 'rgba(52,211,153,0.40)',
  },
  'tough-msg': {
    bg: 'rgba(96,165,250,0.04)',
    border: 'rgba(96,165,250,0.08)',
    glow: 'rgba(96,165,250,0.04)',
    icon: 'rgba(96,165,250,0.85)',
    title: 'rgba(160,200,255,0.95)',
    meta: 'rgba(96,165,250,0.40)',
  },
  email: {
    bg: 'rgba(168,85,247,0.04)',
    border: 'rgba(168,85,247,0.08)',
    glow: 'rgba(168,85,247,0.04)',
    icon: 'rgba(168,85,247,0.85)',
    title: 'rgba(200,160,255,0.95)',
    meta: 'rgba(168,85,247,0.40)',
  },
  excel: {
    bg: 'rgba(34,197,94,0.04)',
    border: 'rgba(34,197,94,0.08)',
    glow: 'rgba(34,197,94,0.04)',
    icon: 'rgba(34,197,94,0.85)',
    title: 'rgba(130,230,160,0.95)',
    meta: 'rgba(34,197,94,0.40)',
  },
  summarize: {
    bg: 'rgba(234,179,8,0.04)',
    border: 'rgba(234,179,8,0.08)',
    glow: 'rgba(234,179,8,0.04)',
    icon: 'rgba(234,179,8,0.85)',
    title: 'rgba(250,210,100,0.95)',
    meta: 'rgba(234,179,8,0.40)',
  },
  polish: {
    bg: 'rgba(244,114,182,0.04)',
    border: 'rgba(244,114,182,0.08)',
    glow: 'rgba(244,114,182,0.04)',
    icon: 'rgba(244,114,182,0.85)',
    title: 'rgba(250,170,210,0.95)',
    meta: 'rgba(244,114,182,0.40)',
  },
  legal: {
    bg: 'rgba(148,163,184,0.04)',
    border: 'rgba(148,163,184,0.08)',
    glow: 'rgba(148,163,184,0.04)',
    icon: 'rgba(148,163,184,0.85)',
    title: 'rgba(190,200,215,0.95)',
    meta: 'rgba(148,163,184,0.40)',
  },
  translate: {
    bg: 'rgba(56,189,248,0.04)',
    border: 'rgba(56,189,248,0.08)',
    glow: 'rgba(56,189,248,0.04)',
    icon: 'rgba(56,189,248,0.85)',
    title: 'rgba(140,215,255,0.95)',
    meta: 'rgba(56,189,248,0.40)',
  },
  travel: {
    bg: 'rgba(251,146,60,0.04)',
    border: 'rgba(251,146,60,0.08)',
    glow: 'rgba(251,146,60,0.04)',
    icon: 'rgba(251,146,60,0.85)',
    title: 'rgba(251,186,120,0.95)',
    meta: 'rgba(251,146,60,0.40)',
  },
  fitness: {
    bg: 'rgba(239,68,68,0.04)',
    border: 'rgba(239,68,68,0.08)',
    glow: 'rgba(239,68,68,0.04)',
    icon: 'rgba(239,68,68,0.85)',
    title: 'rgba(255,150,150,0.95)',
    meta: 'rgba(239,68,68,0.40)',
  },
  code: {
    bg: 'rgba(139,92,246,0.04)',
    border: 'rgba(139,92,246,0.08)',
    glow: 'rgba(139,92,246,0.04)',
    icon: 'rgba(139,92,246,0.85)',
    title: 'rgba(180,150,255,0.95)',
    meta: 'rgba(139,92,246,0.40)',
  },
  social: {
    bg: 'rgba(236,72,153,0.04)',
    border: 'rgba(236,72,153,0.08)',
    glow: 'rgba(236,72,153,0.04)',
    icon: 'rgba(236,72,153,0.85)',
    title: 'rgba(244,150,196,0.95)',
    meta: 'rgba(236,72,153,0.40)',
  },
};

const DEFAULT_COLOR = {
  bg: 'rgba(148,163,184,0.04)',
  border: 'rgba(148,163,184,0.08)',
  glow: 'rgba(148,163,184,0.04)',
  icon: 'rgba(148,163,184,0.85)',
  title: 'rgba(190,200,215,0.95)',
  meta: 'rgba(148,163,184,0.40)',
};

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

  const formattedDate = useMemo(() => {
    const d = new Date();
    const tz = 'Europe/Berlin';
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'short', timeZone: tz })
      .format(d)
      .replace(/\.$/, '');
    const dayMonth = new Intl.DateTimeFormat('de-DE', {
      day: 'numeric',
      month: 'long',
      timeZone: tz,
    }).format(d);
    return `${weekday}, ${dayMonth}`;
  }, []);

  const top4Tools = useMemo(() => sortedTools.slice(0, 4), [sortedTools]);
  const top4Ids = useMemo(() => new Set(top4Tools.map((t) => t.id)), [top4Tools]);

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
        layer0HeightClass="h-0"
        headerMinHeightClass="min-h-0"
        headerBackground={<div className="h-full w-full bg-transparent" aria-hidden />}
        title={
          <div className="mb-8 flex items-end justify-between px-2 md:px-4">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm font-medium uppercase tracking-wider text-brand-orange">
                {formattedDate}
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                {sunriseGreeting.base}
                {(displayName || '').trim() ? `, ${(displayName || '').trim()}` : null}
              </h1>
            </div>
            <div
              className="ml-3 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/[0.1] bg-white/[0.05] shadow-inner backdrop-blur-md"
              aria-hidden
            >
              <span className="font-semibold text-white/50">
                {(displayName || '').trim().charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
          </div>
        }
        subtitle={null}
      >
        <div>
          <TodayZoneCards
            todaysMealTitle={todaysMealTitle}
            openCartItemsCount={openCartItemsCount}
            initialCalendarEvents={initialCalendarEvents}
          />

          {/* Zone 2: Top 4 Tools */}
          <section className="mb-5" aria-labelledby="top-tools-heading">
            <h2
              id="top-tools-heading"
              className="mb-2.5 text-[11px] font-medium text-white/15"
            >
              Deine Tools
            </h2>

            <div className="grid grid-cols-2 gap-2.5 md:gap-3">
              {top4Tools.map((tool) => {
                const c = TOOL_COLORS[tool.id] ?? DEFAULT_COLOR;
                const ctx = resolveQuickContext(tool.id, {
                  todaysMealTitle,
                  openCartItemsCount,
                  count7d: usageStats[tool.id]?.count7d ?? 0,
                });
                const Icon = tool.icon;

                const iconBg = setRgbaAlpha(c.bg, 0.12);
                const iconBorder = setRgbaAlpha(c.border, 0.15);

                const cardStyle: React.CSSProperties = {
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  boxShadow: `0 0 20px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.04)`,
                };

                const icon = createElement(Icon, {
                  className: 'h-4 w-4 md:h-[18px] md:w-[18px] shrink-0',
                  style: { color: c.icon },
                  strokeWidth: 1.75,
                  'aria-hidden': true,
                } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number });

                const inner = (
                  <>
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-[10px] md:h-10 md:w-10"
                      style={{ background: iconBg, border: `1px solid ${iconBorder}` }}
                    >
                      {icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold leading-snug text-white">{tool.title}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-white/70">{ctx ?? ''}</div>
                    </div>
                  </>
                );

                const baseClass =
                  'flex items-center gap-3 rounded-[14px] p-3.5 text-left transition-all duration-200 hover:-translate-y-[1px] md:p-4';

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
                    className={baseClass}
                    style={cardStyle}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div
                    key={tool.id}
                    className={cn(baseClass, 'cursor-not-allowed opacity-60')}
                    style={cardStyle}
                    aria-disabled
                  >
                    {inner}
                  </div>
                );
              })}
            </div>

            <div className="my-4 h-px bg-white/[0.04] md:my-5" />
          </section>

          {/* Zone 3: Kategorie-Akkordeons (ohne Top 4) */}
          <section aria-label="Tools nach Kategorien">
            <div className="space-y-3">
              {WORKFLOW_SECTIONS.map((section) => {
                const tools = sortedTools.filter(
                  (t) => TOOL_WORKFLOW[t.id] === section.id && !top4Ids.has(t.id)
                );
                if (tools.length === 0) return null;
                const isOpen = openAccordions.has(section.id);
                const SectionIcon = section.icon;
                return (
                  <div
                    key={section.id}
                    className="overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02]"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        toggleAccordion(section.id);
                      }}
                      className="flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="inline-flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                          <SectionIcon
                            className="h-[13px] w-[13px] text-white/30"
                            strokeWidth={1.5}
                            aria-hidden
                          />
                        </span>
                        <span className="text-sm text-white/50">{section.label}</span>
                      </span>
                      <motion.span
                        animate={{ rotate: isOpen ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-white/15"
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden />
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
                          <div className="flex flex-col pb-2">
                            {tools.map((tool, toolIndex) => {
                              const Icon = tool.icon;
                              const subtitle = TOOL_SUBTITLES[tool.id];
                              const isLast = toolIndex === tools.length - 1;

                              const rowInner = (
                                <>
                                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                                    {createElement(Icon, {
                                      className: 'h-[13px] w-[13px] shrink-0 text-white/30',
                                      strokeWidth: 1.5,
                                      'aria-hidden': true,
                                    } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number })}
                                  </span>
                                  <span className="min-w-0">
                                    <p className="text-sm text-white/50">{tool.title}</p>
                                    {subtitle ? (
                                      <p className="mt-0.5 line-clamp-1 text-xs text-white/35">
                                        {subtitle}
                                      </p>
                                    ) : null}
                                  </span>
                                </>
                              );

                              const borderClass = !isLast
                                ? 'border-b border-white/[0.03]'
                                : '';

                              if (tool.available) {
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
                                      'flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.03]',
                                      borderClass
                                    )}
                                  >
                                    {rowInner}
                                  </Link>
                                );
                              }

                              return (
                                <div
                                  key={tool.id}
                                  className={cn(
                                    'flex cursor-not-allowed items-center gap-3 px-4 py-2.5 opacity-60',
                                    borderClass
                                  )}
                                >
                                  {rowInner}
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
