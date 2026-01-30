'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { getToolUsageStats, trackToolUsage } from '@/actions/tool-usage-actions';

import {
  Mail,
  Languages,
  Sparkles,
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
  LayoutGrid,
  Briefcase,
  ShoppingCart,
} from 'lucide-react';
import { PageTransition } from '@/components/ui/PageTransition';

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
    icon: Sparkles,
    color: 'cyan',
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

const categoryTabs = ['Alle', 'Business', 'Kommunikation', 'Tech & Life'] as const;

const categoryFilterMap: Record<string, string[]> = {
  Alle: [],
  Business: ['business'],
  Kommunikation: ['communication', 'writing'],
  'Tech & Life': ['dev', 'lifestyle', 'social'],
};

const categoryConfig: Record<(typeof categoryTabs)[number], { icon: React.ComponentType<{ className?: string }> }> = {
  Alle: { icon: LayoutGrid },
  Business: { icon: Briefcase },
  Kommunikation: { icon: MessageCircle },
  'Tech & Life': { icon: Sparkles },
};

function getDailyHeroContent(date: Date): { subline: string; headline: string } {
  const weekday = date.toLocaleDateString('de-DE', { weekday: 'long' });
  return {
    subline: 'HEUTE',
    headline: `${weekday}.`,
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
};

export default function DashboardClient() {
  const [selectedCategory, setSelectedCategory] = useState<(typeof categoryTabs)[number]>('Alle');
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

  const sortedAndFilteredTools = useMemo(() => {
    let filtered = allTools;

    if (selectedCategory !== 'Alle') {
      const allowed = categoryFilterMap[selectedCategory];
      filtered = filtered.filter((t) => allowed.includes(t.category));
    }

    // Sort by usage: Top 4 most used tools first
    const sorted = [...filtered].sort((a, b) => {
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

    return sorted;
  }, [selectedCategory, usageStats]);

  // Split into Hero Cards (Top 4) and Secondary Cards
  const heroTools = sortedAndFilteredTools.slice(0, 4);
  const secondaryTools = sortedAndFilteredTools.slice(4);

  const dailyHero = getDailyHeroContent(new Date());

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

      {/* Main Container - Magazin-Cover Header + Cards */}
      <PageTransition className="mx-auto max-w-7xl w-full px-2 sm:px-4 md:px-6 lg:px-8 pb-28 md:pb-32">
        {/* Daily Hero Header: Kalender-basiert, Subline + Headline, Soft-Fill Pills */}
        <header
          className={cn(
            'pt-[max(3rem,env(safe-area-inset-top))] md:pt-12 pb-4 md:pb-6'
          )}
        >
          <div className="mb-3 md:mb-4">
            <p className="text-xs font-bold tracking-widest text-gray-400 uppercase">
              {dailyHero.subline}
            </p>
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter mt-1">
              {dailyHero.headline}
            </h1>
          </div>

          {/* Super Pills: Soft-Fill, keine Borders */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div className="flex flex-1 md:flex-initial overflow-x-auto scrollbar-hide min-w-0 gap-3 py-1 pl-1 pr-1">
              {categoryTabs.map((cat) => {
                const { icon: Icon } = categoryConfig[cat];
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(cat);
                      triggerHaptic('light');
                    }}
                    className={cn(
                      'h-10 px-5 rounded-full flex items-center gap-2 whitespace-nowrap transition-all duration-200 shrink-0',
                      'active:scale-[0.98]',
                      isActive
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{cat}</span>
                  </button>
                );
              })}
            </div>
            <div className="hidden md:flex shrink-0 text-gray-500 bg-gray-100 rounded-full px-3 py-1.5 text-sm">
              ✨ Premium
            </div>
          </div>
        </header>

        {/* SMART USAGE-BASED CARD HIERARCHY */}
        {sortedAndFilteredTools.length > 0 ? (
          <div className="space-y-3 md:space-y-6 lg:space-y-8">
            {/* HERO CARDS: Mobile 2x2 kompakt, Desktop 2x2 Large Grid */}
            {heroTools.length > 0 && (
              <div 
                className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-4"
                style={{
                  gridAutoRows: 'minmax(auto, auto)',
                }}
              >
                {heroTools.map((tool, index) => {
                  const Icon = tool.icon;
                  const colors = toolColors[tool.color] || toolColors.blue;
                  const toolStats = usageStats[tool.id];
                  const isTrending = toolStats?.isTrending || false;
                  
                  // PRIMARY CARDS: Hero Cards (Top 4)
                  const desktopColSpan = 'lg:col-span-2';
                  const desktopRowSpan = 'lg:row-span-2';
                  
                  
                  const cardClassName = cn(
                    'group relative',
                    // KEIN Container - nur Content
                    'transition-all duration-200 ease-out',
                    tool.available ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed',
                    desktopColSpan,
                    desktopRowSpan,
                    // Padding - Mobile kompakter
                    'p-2 sm:p-3 md:p-4 lg:p-6'
                  );

                  const content = (
                    <>
                      {/* Premium Material Layers - Entfernt, da wir jetzt Gradient im Background haben */}

                      {/* Icon Container - Mobile kleiner für 2-Spalten */}
                      <div className="mb-2 md:mb-5 lg:mb-6">
                        <div className={cn(
                          'inline-flex items-center justify-center rounded-xl md:rounded-2xl transition-all duration-200',
                          'shadow-lg group-hover:shadow-xl group-hover:scale-[1.02]',
                          // Farbige Hintergründe
                          tool.color === 'orange' && 'bg-gradient-to-br from-orange-500 to-pink-500',
                          tool.color === 'pink' && 'bg-gradient-to-br from-pink-500 to-orange-500',
                          tool.color === 'rose' && 'bg-gradient-to-br from-rose-500 to-pink-500',
                          tool.color === 'blue' && 'bg-blue-500',
                          tool.color === 'emerald' && 'bg-emerald-500',
                          tool.color === 'green' && 'bg-green-500',
                          tool.color === 'violet' && 'bg-violet-500',
                          tool.color === 'indigo' && 'bg-indigo-500',
                          tool.color === 'amber' && 'bg-amber-500',
                          tool.color === 'cyan' && 'bg-cyan-500',
                          tool.color === 'slate' && 'bg-slate-500',
                          'w-12 h-12 sm:w-14 sm:h-14 md:w-20 lg:w-24 md:h-20 lg:h-24'
                        )}>
                          <Icon className="text-white w-6 h-6 sm:w-7 sm:h-7 md:w-10 lg:w-12 md:h-10 lg:h-12" />
                        </div>
                      </div>

                      {/* Title & Description - Mobile: Full Details, Desktop: Full Details */}
                      <div className="relative z-10 min-w-0">
                        <h3 className={cn(
                          'font-bold text-gray-900 mb-0.5 md:mb-2',
                          'text-sm sm:text-base md:text-xl lg:text-2xl',
                          'leading-tight line-clamp-2'
                        )}>
                          {tool.title}
                        </h3>
                        <p className={cn(
                          'text-gray-600 leading-snug line-clamp-2',
                          'text-xs sm:text-sm md:text-sm lg:text-base',
                          'hidden sm:block'
                        )}>
                          {tool.description}
                        </p>
                      </div>

                    </>
                  );

                  return tool.available ? (
                    <Link 
                      key={tool.id} 
                      href={tool.href} 
                      className={cardClassName}
                      onClick={async () => {
                        triggerHaptic('light');
                        // Track tool usage
                        await trackToolUsage(tool.id, tool.title);
                        // Refresh stats after a short delay
                        setTimeout(async () => {
                          const result = await getToolUsageStats();
                          if (result.success && result.stats) {
                            setUsageStats(result.stats);
                          }
                        }, 500);
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div 
                      key={tool.id} 
                      className={cardClassName}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            )}

            {/* SECONDARY CARDS: Mobile kompakter, Desktop 4-Spalten */}
            {secondaryTools.length > 0 && (
              <div 
                className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 lg:gap-4"
                style={{
                  gridAutoRows: 'minmax(auto, auto)',
                }}
              >
                {secondaryTools.map((tool, index) => {
                  const Icon = tool.icon;
                  const colors = toolColors[tool.color] || toolColors.blue;
                  const toolStats = usageStats[tool.id];
                  const isTrending = toolStats?.isTrending || false;
                  const size = tool.size || 'medium';
                  const isLarge = size === 'large';
                  const isSmall = size === 'small';

                  // Secondary Cards: Medium or Small based on original size
                  const desktopColSpan = isLarge ? 'lg:col-span-2' : 'lg:col-span-1';
                  const desktopRowSpan = isLarge ? 'lg:row-span-2' : size === 'medium' ? 'lg:row-span-1' : 'lg:row-span-1';
                  
                  // Visual Balance: Color-weight distribution
                  const colorWeight = colors.gradient ? 'high' : 'medium';

                  
                  // SECONDARY CARDS: Kein Container, nur Icon + Text
                  const cardClassName = cn(
                    'group relative',
                    // KEIN Container - nur Content
                    'transition-all duration-200 ease-out',
                    tool.available ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed',
                    desktopColSpan,
                    desktopRowSpan,
                    // Padding für Layout
                    'p-2 md:p-3 lg:p-4'
                  );

                  const content = (
                    <>
                      {/* Premium Material Layers - Entfernt, da wir jetzt Gradient im Background haben */}

                    {/* MOBILE: Compact Layout - Icon & Title Centered, Description Hidden/1 Line */}
                    {/* DESKTOP: Full Layout - Icon, Title, Description */}
                    <div className="flex flex-col items-center justify-center h-full md:items-start md:justify-start">
                      {/* Icon Container - Farbige Box */}
                      <div className={cn(
                        'mb-2 md:mb-3 lg:mb-4',
                        'flex md:inline-flex items-center justify-center'
                      )}>
                        <div className={cn(
                          'inline-flex items-center justify-center rounded-xl transition-all duration-200',
                          'shadow-md group-hover:shadow-lg group-hover:scale-[1.02]',
                          // Farbige Hintergründe
                          tool.color === 'orange' && 'bg-gradient-to-br from-orange-500 to-pink-500',
                          tool.color === 'pink' && 'bg-gradient-to-br from-pink-500 to-orange-500',
                          tool.color === 'rose' && 'bg-gradient-to-br from-rose-500 to-pink-500',
                          tool.color === 'blue' && 'bg-blue-500',
                          tool.color === 'emerald' && 'bg-emerald-500',
                          tool.color === 'green' && 'bg-green-500',
                          tool.color === 'violet' && 'bg-violet-500',
                          tool.color === 'indigo' && 'bg-indigo-500',
                          tool.color === 'amber' && 'bg-amber-500',
                          tool.color === 'cyan' && 'bg-cyan-500',
                          tool.color === 'slate' && 'bg-slate-500',
                          // MOBILE: Smaller icons for compact 2-column layout
                          isLarge ? 'w-12 h-12 md:w-16 lg:w-20 md:h-16 lg:h-20' : 
                          isSmall ? 'w-10 h-10 md:w-12 md:h-12' : 
                          'w-11 h-11 md:w-14 lg:w-16 md:h-14 lg:h-16'
                        )}>
                          <Icon className={cn(
                            'text-white',
                            isLarge ? 'w-6 h-6 md:w-8 lg:w-10 md:h-8 lg:h-10' : 
                            isSmall ? 'w-5 h-5 md:w-6 md:h-6' : 
                            'w-5 h-5 md:w-7 lg:w-8 md:h-7 lg:h-8'
                          )} />
                        </div>
                      </div>

                      {/* Title - Mobile: Centered, Compact, Desktop: Left, Full */}
                      <h3 className={cn(
                        'font-bold text-gray-900 text-center md:text-left',
                        'mb-0 md:mb-1 lg:mb-3',
                        'tracking-tight',
                        'leading-tight',
                        // MOBILE: Smaller, centered text
                        isLarge ? 'text-sm md:text-2xl lg:text-3xl' : 
                        isSmall ? 'text-xs md:text-lg lg:text-xl' : 
                        'text-xs md:text-xl lg:text-2xl',
                        'line-clamp-2'
                      )} style={{ 
                        fontFamily: 'var(--font-plus-jakarta-sans), sans-serif',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        lineHeight: '1.2'
                      }}>
                        {tool.title}
                      </h3>

                      {/* Description - Mobile: Hidden or 1 Line with Ellipsis, Desktop: Full */}
                      <p className={cn(
                        'text-gray-600 font-normal text-center md:text-left',
                        'hidden md:block', // MOBILE: Hidden completely
                        // Desktop sizes
                        isLarge ? 'md:text-sm lg:text-base' : 
                        isSmall ? 'md:text-xs lg:text-sm' : 
                        'md:text-sm lg:text-base',
                        'group-hover:text-gray-700 transition-colors duration-300',
                        'md:line-clamp-none'
                      )} style={{
                        fontWeight: 400,
                        letterSpacing: '0.01em',
                        lineHeight: '1.3'
                      }}>
                        {tool.description}
                      </p>
                    </div>

                    {/* Status badge */}
                    {!tool.available && tool.status === 'soon' && (
                      <div className="absolute top-5 right-5 md:top-6 md:right-6">
                        <span className="text-[10px] uppercase tracking-widest font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-500">
                          In Kürze
                        </span>
                      </div>
                    )}
                  </>
                );

                  return tool.available ? (
                    <Link 
                      key={tool.id} 
                      href={tool.href} 
                      className={cardClassName}
                      onClick={async () => {
                        triggerHaptic('light');
                        // Track tool usage
                        await trackToolUsage(tool.id, tool.title);
                        // Refresh stats after a short delay
                        setTimeout(async () => {
                          const result = await getToolUsageStats();
                          if (result.success && result.stats) {
                            setUsageStats(result.stats);
                          }
                        }, 500);
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div 
                      key={tool.id} 
                      className={cardClassName}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            )}
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
