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
  Sparkles,
  Pencil,
  Scale,
  FileText,
  Table2,
  MessageCircleHeart,
  MessageSquare,
  MessageCircle,
  FileInput,
  Terminal,
  ChefHat,
  Dumbbell,
  Plane,
  Share2,
  ArrowUpRight,
  Search,
  TrendingUp,
  Briefcase,
  ShoppingCart,
  FileImage,
} from 'lucide-react';
import { PageTransition } from '@/components/ui/PageTransition';

/** Kurze Untertitel – visuelle Dichte (1–2 Wörter) */
const TOOL_SUBTITLES: Record<string, string> = {
  recipe: 'Planer & Rezepte',
  'shopping-list': 'Smarte Listen',
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

/** Hero Glow – farbiger Schatten für Top-4 (stärkerer Colored Shadow) */
const TOOL_GLOW_SHADOW: Record<string, string> = {
  recipe: 'shadow-[0_4px_24px_-2px_rgba(249,115,22,0.3)]',
  'shopping-list': 'shadow-[0_4px_24px_-2px_rgba(239,68,68,0.3)]',
  pdf: 'shadow-[0_4px_24px_-2px_rgba(239,68,68,0.3)]',
  email: 'shadow-[0_4px_24px_-2px_rgba(59,130,246,0.3)]',
  polish: 'shadow-[0_4px_24px_-2px_rgba(20,184,166,0.3)]',
  invoice: 'shadow-[0_4px_24px_-2px_rgba(16,185,129,0.3)]',
  excel: 'shadow-[0_4px_24px_-2px_rgba(34,197,94,0.3)]',
  legal: 'shadow-[0_4px_24px_-2px_rgba(139,92,246,0.3)]',
  'tough-msg': 'shadow-[0_4px_24px_-2px_rgba(99,102,241,0.3)]',
  summarize: 'shadow-[0_4px_24px_-2px_rgba(245,158,11,0.3)]',
  travel: 'shadow-[0_4px_24px_-2px_rgba(14,165,233,0.3)]',
  translate: 'shadow-[0_4px_24px_-2px_rgba(99,102,241,0.3)]',
  fitness: 'shadow-[0_4px_24px_-2px_rgba(244,63,94,0.3)]',
  code: 'shadow-[0_4px_24px_-2px_rgba(100,116,139,0.3)]',
  social: 'shadow-[0_4px_24px_-2px_rgba(236,72,153,0.3)]',
};

/** Section-Backgrounds für Workflow-Trennung */
const WORKFLOW_SECTION_BG: Record<string, string> = {
  productivity: 'bg-gradient-to-b from-orange-50/30 to-transparent',
  communication: 'bg-gradient-to-b from-blue-50/30 to-transparent',
  personal: 'bg-gradient-to-b from-rose-50/30 to-transparent',
  professional: 'bg-gradient-to-b from-violet-50/30 to-transparent',
};

/** Icon-Bg-Kreis – subtiler Tint pro Farbe */
const ICON_BG_CLASS: Record<string, string> = {
  orange: 'bg-orange-50',
  pink: 'bg-pink-50',
  blue: 'bg-blue-50',
  emerald: 'bg-emerald-50',
  green: 'bg-green-50',
  violet: 'bg-violet-50',
  indigo: 'bg-indigo-50',
  amber: 'bg-amber-50',
  rose: 'bg-rose-50',
  cyan: 'bg-cyan-50',
  slate: 'bg-slate-50',
  teal: 'bg-teal-50',
  red: 'bg-red-50',
  sky: 'bg-sky-50',
};

/** Icon-Farben – Brand pro Tool (Solid-Look) */
const HERO_ICON_COLORS: Record<string, string> = {
  recipe: 'text-orange-500',
  'shopping-list': 'text-red-500',
  pdf: 'text-red-500',
  email: 'text-blue-500',
  polish: 'text-teal-500',
  invoice: 'text-emerald-500',
  excel: 'text-green-500',
  legal: 'text-violet-500',
  'tough-msg': 'text-indigo-500',
  summarize: 'text-amber-500',
  travel: 'text-sky-500',
  translate: 'text-indigo-500',
  fitness: 'text-rose-500',
  code: 'text-slate-500',
  social: 'text-pink-500',
};

const COLOR_FALLBACK: Record<string, string> = {
  orange: 'text-orange-500',
  pink: 'text-pink-500',
  blue: 'text-blue-500',
  emerald: 'text-emerald-500',
  green: 'text-green-500',
  violet: 'text-violet-500',
  indigo: 'text-indigo-500',
  amber: 'text-amber-500',
  rose: 'text-rose-500',
  cyan: 'text-cyan-500',
  slate: 'text-slate-500',
  teal: 'text-teal-500',
  red: 'text-red-500',
  sky: 'text-sky-500',
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
    title: 'Gourmet-Planer',
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
    title: 'Einkaufslisten',
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

function getHeaderContent(date: Date): { headline: string; subline: string } {
  const weekday = date.toLocaleDateString('de-DE', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  return {
    headline: `${weekday}.`,
    subline: dateStr,
  };
}

// PREMIUM HIGH-FIDELITY: Helper-Funktion für Akzentfarben (RGB-Werte)
const getAccentColorRGB = (accentColor: string): { r: number; g: number; b: number } => {
  const colorMap: Record<string, { r: number; g: number; b: number }> = {
    orange: { r: 249, g: 115, b: 22 },
    pink: { r: 244, g: 114, b: 182 },
    blue: { r: 59, g: 130, b: 246 },
    emerald: { r: 16, g: 185, b: 129 },
    green: { r: 34, g: 197, b: 94 },
    violet: { r: 139, g: 92, b: 246 },
    indigo: { r: 99, g: 102, b: 241 },
    amber: { r: 245, g: 158, b: 11 },
    cyan: { r: 6, g: 182, b: 212 },
    rose: { r: 244, g: 63, b: 94 },
    red: { r: 239, g: 68, b: 68 },
    slate: { r: 100, g: 116, b: 139 },
  };
  return colorMap[accentColor] || colorMap.blue;
};

// FESTES MAPPING: Desktop Hover-Klassen für jede Tool-Farbe (explizit, damit Tailwind sie erkennt)
const desktopHoverClasses: Record<string, { border: string; bg: string }> = {
  orange: {
    border: 'md:group-hover:border-orange-500',
    bg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-orange-50 md:group-hover:to-pink-50',
  },
  pink: {
    border: 'md:group-hover:border-pink-500',
    bg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-pink-50 md:group-hover:to-orange-50',
  },
  rose: {
    border: 'md:group-hover:border-rose-500',
    bg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-pink-50 md:group-hover:to-rose-50',
  },
  emerald: {
    border: 'md:group-hover:border-emerald-500',
    bg: 'md:group-hover:bg-emerald-50',
  },
  blue: {
    border: 'md:group-hover:border-blue-500',
    bg: 'md:group-hover:bg-blue-50',
  },
  green: {
    border: 'md:group-hover:border-green-500',
    bg: 'md:group-hover:bg-green-50',
  },
  violet: {
    border: 'md:group-hover:border-violet-500',
    bg: 'md:group-hover:bg-violet-50',
  },
  indigo: {
    border: 'md:group-hover:border-indigo-500',
    bg: 'md:group-hover:bg-indigo-50',
  },
  amber: {
    border: 'md:group-hover:border-amber-500',
    bg: 'md:group-hover:bg-amber-50',
  },
  cyan: {
    border: 'md:group-hover:border-cyan-500',
    bg: 'md:group-hover:bg-cyan-50',
  },
  slate: {
    border: 'md:group-hover:border-gray-500',
    bg: 'md:group-hover:bg-gray-50',
  },
  red: {
    border: 'md:group-hover:border-red-500',
    bg: 'md:group-hover:bg-red-50',
  },
};

// PREMIUM FLOATING DESIGN: Permanent Floating Cards mit vollumfänglichem farbigen Rahmen
const toolColors: Record<string, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  hoverBorder: string;
  hoverBg: string;
  gradient?: string;
  accentColor: string; // Vollumfänglicher farbiger Rahmen (1px solid)
}> = {
  emerald: {
    bg: 'bg-white',
    border: 'border-emerald-300',
    text: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    hoverBorder: 'md:group-hover:border-emerald-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-emerald-50', // Nur Desktop
    accentColor: 'emerald',
  },
  blue: {
    bg: 'bg-white',
    border: 'border-blue-300',
    text: 'text-blue-600',
    iconBg: 'bg-blue-50',
    hoverBorder: 'md:group-hover:border-blue-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-blue-50', // Nur Desktop
    accentColor: 'blue',
  },
  green: {
    bg: 'bg-white',
    border: 'border-green-300',
    text: 'text-green-600',
    iconBg: 'bg-green-50',
    hoverBorder: 'md:group-hover:border-green-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-green-50', // Nur Desktop
    accentColor: 'green',
  },
  violet: {
    bg: 'bg-white',
    border: 'border-violet-300',
    text: 'text-violet-600',
    iconBg: 'bg-violet-50',
    hoverBorder: 'md:group-hover:border-violet-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-violet-50', // Nur Desktop
    accentColor: 'violet',
  },
  indigo: {
    bg: 'bg-white',
    border: 'border-indigo-300',
    text: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    hoverBorder: 'md:group-hover:border-indigo-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-indigo-50', // Nur Desktop
    accentColor: 'indigo',
  },
  amber: {
    bg: 'bg-white',
    border: 'border-amber-300',
    text: 'text-amber-600',
    iconBg: 'bg-amber-50',
    hoverBorder: 'md:group-hover:border-amber-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-amber-50', // Nur Desktop
    accentColor: 'amber',
  },
  cyan: {
    bg: 'bg-white',
    border: 'border-cyan-300',
    text: 'text-cyan-600',
    iconBg: 'bg-cyan-50',
    hoverBorder: 'md:group-hover:border-cyan-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-cyan-50', // Nur Desktop
    accentColor: 'cyan',
  },
  orange: {
    bg: 'bg-white',
    border: 'border-orange-300',
    text: 'text-orange-600',
    iconBg: 'bg-gradient-to-br from-orange-50 to-pink-50',
    hoverBorder: 'md:group-hover:border-orange-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-orange-50 md:group-hover:to-pink-50', // Nur Desktop
    gradient: 'from-orange-500 to-pink-500',
    accentColor: 'orange',
  },
  rose: {
    bg: 'bg-white',
    border: 'border-rose-300',
    text: 'text-rose-600',
    iconBg: 'bg-gradient-to-br from-pink-50 to-rose-50',
    hoverBorder: 'md:group-hover:border-rose-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-pink-50 md:group-hover:to-rose-50', // Nur Desktop
    gradient: 'from-pink-500 to-rose-500',
    accentColor: 'rose',
  },
  slate: {
    bg: 'bg-white',
    border: 'border-gray-300',
    text: 'text-gray-600',
    iconBg: 'bg-gray-50',
    hoverBorder: 'md:group-hover:border-gray-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-gray-50', // Nur Desktop
    accentColor: 'gray',
  },
  pink: {
    bg: 'bg-white',
    border: 'border-pink-300',
    text: 'text-pink-600',
    iconBg: 'bg-gradient-to-br from-pink-50 to-orange-50',
    hoverBorder: 'md:group-hover:border-pink-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-pink-50 md:group-hover:to-orange-50', // Nur Desktop
    gradient: 'from-pink-500 to-orange-500',
    accentColor: 'pink',
  },
  red: {
    bg: 'bg-white',
    border: 'border-red-300',
    text: 'text-red-600',
    iconBg: 'bg-red-50',
    hoverBorder: 'md:group-hover:border-red-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-red-50', // Nur Desktop
    accentColor: 'red',
  },
};

export default function DashboardClient() {
  const [pullDistance, setPullDistance] = useState(0);
  const [usageStats, setUsageStats] = useState<Record<string, { count7d: number; count30d: number; isTrending: boolean }>>({});
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const headerContent = getHeaderContent(new Date());

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, 160)}px)` : 'none',
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
      }}
    >
      {/* Pull-to-Refresh Indicator */}
      {pullDistance > 50 && (
        <div className="fixed top-0 left-0 right-0 flex items-center justify-center h-16 bg-white z-50">
          {pullDistance >= 150 ? (
            <div className="flex items-center gap-2 text-orange-500">
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium text-gray-700">Loslassen zum Aktualisieren</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-500">
              <span className="text-sm font-medium">Ziehen zum Aktualisieren</span>
            </div>
          )}
        </div>
      )}

      {/* Main Container: Header + Content */}
      <PageTransition className="relative z-10 mx-auto max-w-7xl w-full px-4 sm:px-4 md:px-6 lg:px-8 pb-28 md:pb-32">
        {/* Clean Header: Greeting + Date (keine Navigation hier) */}
        <header className="pt-[max(3rem,env(safe-area-inset-top))] md:pt-12 pb-6 md:pb-8 border-b border-gray-200/50 mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">
            {headerContent.headline}
          </h1>
          <p className="text-sm text-gray-400 font-medium mt-1">
            {headerContent.subline}
          </p>
        </header>

        {/* Content: Zuletzt verwendet + Kategorie-Sektionen */}
        {sortedTools.length > 0 ? (
          <div className="space-y-6 md:space-y-8">
            {/* Zuletzt verwendet: Top 4 */}
            <section className="mb-8 md:mb-10">
              <h2 className="text-sm font-bold text-gray-600 mb-4">Zuletzt verwendet</h2>
              <div className="grid grid-cols-2 gap-4 md:gap-4">
                {sortedTools.slice(0, 4).map((tool) => {
                  const Icon = tool.icon;
                  const heroGlow = TOOL_GLOW_SHADOW[tool.id];
                  const iconColor = HERO_ICON_COLORS[tool.id] ?? COLOR_FALLBACK[tool.color] ?? 'text-gray-600';
                  const iconBg = ICON_BG_CLASS[tool.color] ?? 'bg-gray-50';
                  const subtitle = TOOL_SUBTITLES[tool.id];
                  const card = (
                    <div
                      key={tool.id}
                      className={cn(
                        'group relative flex flex-col items-center text-center min-h-[44px]',
                        'bg-white/95 backdrop-blur-sm rounded-2xl border border-gray-100/80',
                        heroGlow ?? 'shadow-sm',
                        'hover:shadow-lg hover:border-gray-200/80 transition-all duration-300',
                        'p-5 min-h-[160px]',
                        tool.available ? 'cursor-pointer active:scale-[0.98]' : 'opacity-60 cursor-not-allowed'
                      )}
                    >
                      <div className={cn('flex items-center justify-center rounded-full p-4 shrink-0', iconBg)}>
                        {createElement(Icon, { className: cn('w-10 h-10 shrink-0', iconColor), strokeWidth: 2.5, 'aria-hidden': true } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number })}
                      </div>
                      <h3 className="font-bold text-gray-900 mt-4 text-base leading-tight line-clamp-2">{tool.title}</h3>
                      <p className="text-xs text-gray-500 font-medium mt-1 line-clamp-1">{subtitle}</p>
                      {!tool.available && tool.status === 'soon' && (
                        <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Bald</span>
                      )}
                    </div>
                  );
                  return tool.available ? (
                    <Link key={tool.id} href={tool.href} onClick={async () => { triggerHaptic('light'); await trackToolUsage(tool.id, tool.title); setTimeout(() => getToolUsageStats().then((r) => r.success && r.stats && setUsageStats(r.stats)), 500); }}>
                      {card}
                    </Link>
                  ) : (
                    <div key={tool.id}>{card}</div>
                  );
                })}
              </div>
            </section>

            {/* Kategorie-Sektionen: Klare Content-Struktur */}
            {WORKFLOW_SECTIONS.map((section) => {
              const featuredIds = sortedTools.slice(0, 4).map((t) => t.id);
              const tools = sortedTools.filter(
                (t) => TOOL_WORKFLOW[t.id] === section.id && !featuredIds.includes(t.id)
              );
              if (tools.length === 0) return null;
              const sectionBg = WORKFLOW_SECTION_BG[section.id] ?? '';
              const Icon = section.icon;
              return (
                <section key={section.id} className={cn('rounded-2xl p-4 md:p-5 -mx-1 mb-6 md:mb-8', sectionBg)}>
                  <h2 className="text-sm font-bold text-gray-600 mb-4 flex items-center gap-2">
                    <Icon className="w-4 h-4 text-gray-500" />
                    {section.label}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {tools.map((tool) => {
                      const Icon = tool.icon;
                      const iconColor = HERO_ICON_COLORS[tool.id] ?? COLOR_FALLBACK[tool.color] ?? 'text-gray-600';
                      const iconBg = ICON_BG_CLASS[tool.color] ?? 'bg-gray-50';
                      const subtitle = TOOL_SUBTITLES[tool.id];
                      const card = (
                        <div
                          key={tool.id}
                          className={cn(
                            'group relative flex flex-col items-center text-center min-h-[44px]',
                            'bg-white rounded-xl border border-gray-100 shadow-sm',
                            'hover:shadow-md hover:border-gray-200 transition-all duration-200',
                            'p-4 min-h-[140px]',
                            tool.available ? 'cursor-pointer active:scale-[0.98]' : 'opacity-60 cursor-not-allowed'
                          )}
                        >
                          <div className={cn('flex items-center justify-center rounded-full p-3 shrink-0', iconBg)}>
                            {createElement(Icon, { className: cn('w-8 h-8 shrink-0', iconColor), strokeWidth: 2.5, 'aria-hidden': true } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number })}
                          </div>
                          <h3 className="font-bold text-gray-900 mt-3 text-sm leading-tight line-clamp-2">{tool.title}</h3>
                          <p className="text-xs text-gray-400 font-medium mt-1 line-clamp-1">{subtitle}</p>
                          {!tool.available && tool.status === 'soon' && (
                            <span className="absolute top-2 right-2 text-[10px] uppercase font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Bald</span>
                          )}
                        </div>
                      );
                      return tool.available ? (
                        <Link key={tool.id} href={tool.href} onClick={async () => { triggerHaptic('light'); await trackToolUsage(tool.id, tool.title); setTimeout(() => getToolUsageStats().then((r) => r.success && r.stats && setUsageStats(r.stats)), 500); }}>
                          {card}
                        </Link>
                      ) : (
                        <div key={tool.id}>{card}</div>
                      );
                    })}
                  </div>
                </section>
              );
            }).filter(Boolean)}
          </div>
        ) : (
          <div className="text-center py-24">
            <Search className="w-16 h-16 mx-auto mb-6 text-gray-300" />
            <p className="text-gray-600 text-lg font-medium tracking-wide mb-2">Keine Tools gefunden.</p>
            <p className="text-gray-500 text-sm font-normal">
              Versuche eine andere Suche oder Kategorie.
            </p>
          </div>
        )}
      </PageTransition>
    </div>
  );
}
