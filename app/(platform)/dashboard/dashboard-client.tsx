'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DashboardGreetingClient } from '@/components/platform/dashboard-greeting-client';
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
  FileInput,
  Terminal,
  ChefHat,
  Dumbbell,
  Plane,
  Share2,
  ArrowUpRight,
  Search,
  TrendingUp,
} from 'lucide-react';

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

const quickAccessTools = [
  { id: 'email', title: 'Email-Profi', icon: Mail, color: 'blue', href: '/actions/email' },
  { id: 'chat', title: 'Chat', icon: MessageSquare, color: 'indigo', href: '/chat' },
  { id: 'excel', title: 'Excel-Coach', icon: Table2, color: 'green', href: '/tools/excel' },
  { id: 'summarize', title: 'Klartext', icon: FileInput, color: 'amber', href: '/actions/summarize' },
  { id: 'legal', title: 'Rechtstexte', icon: Scale, color: 'violet', href: '/actions/legal' },
];

// CLEAN DESIGN: Light theme colors mit Logo-Gradient Accents
const toolColors: Record<string, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  hoverBorder: string;
  hoverBg: string;
  gradient?: string;
}> = {
  emerald: {
    bg: 'bg-white',
    border: 'border-emerald-100',
    text: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    hoverBorder: 'hover:border-emerald-300',
    hoverBg: 'hover:bg-emerald-50',
  },
  blue: {
    bg: 'bg-white',
    border: 'border-blue-100',
    text: 'text-blue-600',
    iconBg: 'bg-blue-50',
    hoverBorder: 'hover:border-blue-300',
    hoverBg: 'hover:bg-blue-50',
  },
  green: {
    bg: 'bg-white',
    border: 'border-green-100',
    text: 'text-green-600',
    iconBg: 'bg-green-50',
    hoverBorder: 'hover:border-green-300',
    hoverBg: 'hover:bg-green-50',
  },
  violet: {
    bg: 'bg-white',
    border: 'border-violet-100',
    text: 'text-violet-600',
    iconBg: 'bg-violet-50',
    hoverBorder: 'hover:border-violet-300',
    hoverBg: 'hover:bg-violet-50',
  },
  indigo: {
    bg: 'bg-white',
    border: 'border-indigo-100',
    text: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    hoverBorder: 'hover:border-indigo-300',
    hoverBg: 'hover:bg-indigo-50',
  },
  amber: {
    bg: 'bg-white',
    border: 'border-amber-100',
    text: 'text-amber-600',
    iconBg: 'bg-amber-50',
    hoverBorder: 'hover:border-amber-300',
    hoverBg: 'hover:bg-amber-50',
  },
  cyan: {
    bg: 'bg-white',
    border: 'border-cyan-100',
    text: 'text-cyan-600',
    iconBg: 'bg-cyan-50',
    hoverBorder: 'hover:border-cyan-300',
    hoverBg: 'hover:bg-cyan-50',
  },
  orange: {
    bg: 'bg-white',
    border: 'border-orange-100',
    text: 'text-orange-600',
    iconBg: 'bg-gradient-to-br from-orange-50 to-pink-50',
    hoverBorder: 'hover:border-orange-300',
    hoverBg: 'hover:bg-gradient-to-br hover:from-orange-50 hover:to-pink-50',
    gradient: 'from-orange-500 to-pink-500',
  },
  rose: {
    bg: 'bg-white',
    border: 'border-rose-100',
    text: 'text-rose-600',
    iconBg: 'bg-gradient-to-br from-pink-50 to-rose-50',
    hoverBorder: 'hover:border-rose-300',
    hoverBg: 'hover:bg-gradient-to-br hover:from-pink-50 hover:to-rose-50',
    gradient: 'from-pink-500 to-rose-500',
  },
  slate: {
    bg: 'bg-white',
    border: 'border-gray-100',
    text: 'text-gray-600',
    iconBg: 'bg-gray-50',
    hoverBorder: 'hover:border-gray-300',
    hoverBg: 'hover:bg-gray-50',
  },
  pink: {
    bg: 'bg-white',
    border: 'border-pink-100',
    text: 'text-pink-600',
    iconBg: 'bg-gradient-to-br from-pink-50 to-orange-50',
    hoverBorder: 'hover:border-pink-300',
    hoverBg: 'hover:bg-gradient-to-br hover:from-pink-50 hover:to-orange-50',
    gradient: 'from-pink-500 to-orange-500',
  },
};

export default function DashboardClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof categoryTabs)[number]>('Alle');
  const [pullDistance, setPullDistance] = useState(0);
  const [usageStats, setUsageStats] = useState<Record<string, { count7d: number; count30d: number; isTrending: boolean }>>({});
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch usage stats on mount
  useEffect(() => {
    getToolUsageStats().then((result) => {
      if (result.success && result.stats) {
        setUsageStats(result.stats);
      }
    });
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      const touch = e.touches[0];
      touchStartRef.current = {
        y: touch.clientY,
        scrollTop: containerRef.current.scrollTop,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !containerRef.current) return;
    if (containerRef.current.scrollTop > 0) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (deltaY > 0) {
      if (e.cancelable) {
        e.preventDefault();
      }
      requestAnimationFrame(() => {
        const maxPull = 100;
        const limitedDeltaY = Math.min(maxPull, deltaY);
        setPullDistance(limitedDeltaY);

        if (limitedDeltaY >= 60 && pullDistance < 60) {
          triggerHaptic('light');
        }
      });
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 60) {
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

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
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
  }, [selectedCategory, searchQuery, usageStats]);

  // Split into Hero Cards (Top 4) and Secondary Cards
  const heroTools = sortedAndFilteredTools.slice(0, 4);
  const secondaryTools = sortedAndFilteredTools.slice(4);

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, 100)}px)` : 'none',
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
      }}
    >

      {/* Pull-to-Refresh Indicator */}
      {pullDistance > 0 && (
        <div className="fixed top-0 left-0 right-0 flex items-center justify-center h-16 bg-white/95 backdrop-blur-xl border-b border-gray-200 z-50">
          {pullDistance >= 60 ? (
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

      {/* Main Container - MOBILE: Kompakt, Desktop: Spacious */}
      <div className="mx-auto max-w-7xl w-full px-3 sm:px-4 md:px-6 lg:px-8 pb-24 md:pb-32 pt-[max(1rem,env(safe-area-inset-top))] md:pt-8">
        
        {/* Header Section - MOBILE: Kompakt */}
        <div className="mb-6 md:mb-12 lg:mb-16">
          <DashboardGreetingClient />
        </div>

        {/* PREMIUM: Search Bar - Advanced Material Layers - MOBILE: Kompakt */}
        <div className="mb-4 md:mb-8 lg:mb-12">
          <div className="relative group max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-all duration-500 z-10 group-focus-within:scale-110" />
            <input
              type="text"
              placeholder="Suche nach Tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/90 backdrop-blur-md border border-gray-200/80 text-gray-900 placeholder:text-gray-400 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] text-base font-medium tracking-wide shadow-stack-base hover:shadow-stack-hover focus:shadow-brand-orange"
            />
            {/* PREMIUM: Subtle Glow on Focus */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-pink-500/0 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none -z-10 blur-xl" />
          </div>
        </div>

        {/* Mobile Quick Access */}
        <div className="mb-10 md:hidden">
          <div className="flex gap-3 justify-center">
            {quickAccessTools.slice(0, 4).map((quickTool) => {
              const QuickIcon = quickTool.icon;
              const colors = toolColors[quickTool.color] || toolColors.blue;
              return (
                <Link
                  key={quickTool.id}
                  href={quickTool.href}
                  className="flex flex-col items-center group"
                  onClick={() => triggerHaptic('light')}
                >
                  <div className={cn(
                    'w-14 h-14 rounded-xl border flex items-center justify-center',
                    'transition-all duration-300 group-active:scale-90 shadow-sm',
                    colors.bg,
                    colors.border,
                    colors.hoverBorder,
                    'group-hover:shadow-md'
                  )}>
                    <QuickIcon className={cn('w-6 h-6', colors.text)} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* PREMIUM: Category Tabs - Physics-Based Feedback - MOBILE: Kompakt */}
        <div className="mb-4 md:mb-10 lg:mb-14 overflow-x-auto">
          <div className="flex gap-3 pb-2 min-w-max">
            {categoryTabs.map((cat, index) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  triggerHaptic('light');
                }}
                className={cn(
                  'px-5 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all duration-500 whitespace-nowrap',
                  'ease-[cubic-bezier(0.16,1,0.3,1)]',
                  'active:scale-95',
                  'relative',
                  'will-change-transform', // Better rendering performance
                  selectedCategory === cat
                    ? 'text-white border-0 shadow-brand-orange scale-105 gradient-tab-smooth'
                    : 'bg-white/90 backdrop-blur-sm text-gray-600 border border-gray-200/80 hover:text-gray-900 hover:border-gray-300 hover:scale-102 shadow-stack-base hover:shadow-brand-orange'
                )}
                style={{
                  animation: `fade-in-up 0.4s ease-out ${index * 0.1}s both`,
                  opacity: 0,
                  // Smooth rendering
                  WebkitFontSmoothing: 'antialiased',
                  MozOsxFontSmoothing: 'grayscale',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'translateZ(0)', // Force GPU acceleration for smooth rendering
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* SMART USAGE-BASED CARD HIERARCHY */}
        {sortedAndFilteredTools.length > 0 ? (
          <div className="space-y-4 md:space-y-6 lg:space-y-8">
            {/* HERO CARDS: Top 4 Most Used Tools - Mobile: Full Width, Desktop: 2x2 Large Grid */}
            {heroTools.length > 0 && (
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-4"
                style={{
                  gridAutoRows: 'minmax(auto, auto)',
                }}
              >
                {heroTools.map((tool, index) => {
                  const Icon = tool.icon;
                  const colors = toolColors[tool.color] || toolColors.blue;
                  const toolStats = usageStats[tool.id];
                  const isTrending = toolStats?.isTrending || false;
                  
                  // Hero Cards: Always large (2x2)
                  const desktopColSpan = 'lg:col-span-2';
                  const desktopRowSpan = 'lg:row-span-2';
                  const colorWeight = colors.gradient ? 'high' : 'medium';

                  // Smooth entrance animation
                  const animationDelay = `${index * 0.1}s`;
                  const animationStyle = {
                    animation: `fade-in-up 0.6s ease-out ${animationDelay} both`,
                    opacity: 0,
                  };

                  const cardClassName = cn(
                    'group relative rounded-xl border overflow-hidden',
                    'rounded-xl',
                    // MODERN HOVER: Smooth transition for transform and shadow
                    'transition-all duration-300 ease',
                    // MODERN HOVER: Leichtes Anheben auf Desktop (nur md+)
                    'md:hover:-translate-y-2',
                    colors.bg,
                    colors.border,
                    colors.hoverBorder,
                    colors.hoverBg,
                    tool.available ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed',
                    desktopColSpan,
                    desktopRowSpan,
                    colorWeight === 'high' && 'border-2',
                    // Base shadow
                    'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.02)]',
                    // MODERN HOVER: Verstärkter, weicher Schatten auf Desktop
                    'md:hover:shadow-[0_10px_20px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.06)]',
                    colors.gradient && 'md:hover:shadow-[0_10px_20px_rgba(249,115,22,0.12),0_4px_8px_rgba(244,114,182,0.08)]',
                    // Hero Cards: Larger padding and height
                    'p-4 md:p-6 lg:p-8 h-[140px] md:h-auto md:min-h-[280px] lg:min-h-[320px]'
                  );

                  const content = (
                    <>
                      {/* Very Subtle Material Layers */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 via-white/15 to-transparent backdrop-blur-[4px] opacity-0 group-hover:opacity-50 transition-opacity duration-200 pointer-events-none" />
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-200 pointer-events-none">
                        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-white/10 to-transparent rounded-tl-xl" />
                      </div>

                      {/* Trending Indicator */}
                      {isTrending && (
                        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-2 py-1 rounded-full text-[10px] font-semibold shadow-lg animate-pulse">
                          <TrendingUp className="w-3 h-3" />
                          <span>Trending</span>
                        </div>
                      )}

                      {/* Icon Container */}
                      <div className="mb-2 md:mb-4 lg:mb-6">
                        <div className={cn(
                          'inline-flex items-center justify-center rounded-lg border transition-all duration-200',
                          'ease-out',
                          colors.iconBg,
                          colors.border,
                          'w-10 h-10 md:w-16 lg:w-18 md:h-16 lg:h-18',
                          'shadow-[0_1px_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.02)]',
                          'group-hover:shadow-[0_2px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.05),0_8px_16px_rgba(0,0,0,0.06)]',
                          colors.gradient && 'group-hover:shadow-[0_2px_2px_rgba(249,115,22,0.1),0_4px_8px_rgba(244,114,182,0.08),0_8px_16px_rgba(249,115,22,0.1)]',
                          colors.gradient && 'group-hover:border-orange-300',
                          'backdrop-blur-sm group-hover:backdrop-blur-md'
                        )}>
                          <Icon className={cn(
                            colors.text,
                            'transition-opacity duration-200 ease-out group-hover:opacity-90',
                            'w-5 h-5 md:w-8 lg:w-9 md:h-8 lg:h-9'
                          )} />
                        </div>
                      </div>

                      {/* Title & Description - Mobile: Full Details, Desktop: Full Details */}
                      <div className="relative z-10">
                        <h3 className={cn(
                          'font-bold text-gray-900 mb-1 md:mb-2',
                          'text-lg md:text-xl lg:text-2xl',
                          'leading-tight line-clamp-2'
                        )}>
                          {tool.title}
                        </h3>
                        <p className={cn(
                          'text-gray-600 text-sm md:text-sm lg:text-base',
                          'leading-snug line-clamp-2'
                        )}>
                          {tool.description}
                        </p>
                      </div>

                      {/* Expand Icon */}
                      {tool.available && (
                        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 lg:bottom-8 lg:right-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/90 backdrop-blur-sm border border-gray-200/50 flex items-center justify-center shadow-sm">
                            <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
                          </div>
                        </div>
                      )}
                    </>
                  );

                  return tool.available ? (
                    <Link 
                      key={tool.id} 
                      href={tool.href} 
                      className={cardClassName}
                      style={animationStyle}
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
                      style={animationStyle}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            )}

            {/* SECONDARY CARDS: Rest of Tools - Mobile: 2-Column Compact, Desktop: Smaller Grid */}
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

                  // Smooth entrance animation with offset for secondary cards
                  const animationDelay = `${(heroTools.length + index) * 0.1}s`;
                  const animationStyle = {
                    animation: `fade-in-up 0.6s ease-out ${animationDelay} both`,
                    opacity: 0,
                  };

                  const cardClassName = cn(
                    'group relative rounded-xl border overflow-hidden',
                    'rounded-xl',
                    // MODERN HOVER: Smooth transition for transform and shadow
                    'transition-all duration-300 ease',
                    // MODERN HOVER: Leichtes Anheben auf Desktop (nur md+)
                    'md:hover:-translate-y-2',
                    colors.bg,
                    colors.border,
                    colors.hoverBorder,
                    colors.hoverBg,
                    tool.available ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed',
                    desktopColSpan,
                    desktopRowSpan,
                    colorWeight === 'high' && 'border-2',
                    // Base shadow
                    'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_4px_rgba(0,0,0,0.02)]',
                    // MODERN HOVER: Verstärkter, weicher Schatten auf Desktop
                    'md:hover:shadow-[0_10px_20px_rgba(0,0,0,0.1),0_4px_8px_rgba(0,0,0,0.06)]',
                    colors.gradient && 'md:hover:shadow-[0_10px_20px_rgba(249,115,22,0.12),0_4px_8px_rgba(244,114,182,0.08)]',
                    // MOBILE: Compact height for 2-column layout, Desktop: Full heights
                    isLarge ? 'p-3 md:p-6 lg:p-8 h-[100px] md:h-auto md:min-h-[280px] lg:min-h-[320px]' : 
                    isSmall ? 'p-2.5 md:p-4 lg:p-5 h-[90px] md:h-auto md:min-h-[160px] lg:min-h-[180px]' : 
                    'p-3 md:p-5 lg:p-6 h-[100px] md:h-auto md:min-h-[200px] lg:min-h-[220px]'
                  );

                  const content = (
                    <>
                      {/* Very Subtle Material Layers */}
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 via-white/15 to-transparent backdrop-blur-[4px] opacity-0 group-hover:opacity-50 transition-opacity duration-200 pointer-events-none" />
                      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-30 transition-opacity duration-200 pointer-events-none">
                        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-gradient-to-br from-white/10 to-transparent rounded-tl-xl" />
                      </div>

                      {/* Trending Indicator for Secondary Cards */}
                      {isTrending && (
                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-semibold shadow-lg">
                          <TrendingUp className="w-2.5 h-2.5" />
                        </div>
                      )}

                    {/* MOBILE: Compact Layout - Icon & Title Centered, Description Hidden/1 Line */}
                    {/* DESKTOP: Full Layout - Icon, Title, Description */}
                    <div className="flex flex-col items-center justify-center h-full md:items-start md:justify-start">
                      {/* Icon Container - Mobile: Centered, Desktop: Left */}
                      <div className={cn(
                        'mb-2 md:mb-4 lg:mb-6',
                        'flex md:inline-flex items-center justify-center'
                      )}>
                        <div className={cn(
                          'inline-flex items-center justify-center rounded-lg border transition-all duration-200',
                          'ease-out',
                          colors.iconBg,
                          colors.border,
                          // MOBILE: Smaller icons for compact 2-column layout
                          isLarge ? 'w-10 h-10 md:w-16 lg:w-18 md:h-16 lg:h-18' : 
                          isSmall ? 'w-8 h-8 md:w-13 md:h-13' : 
                          'w-9 h-9 md:w-14 lg:w-16 md:h-14 lg:h-16',
                          'shadow-[0_1px_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.02)]',
                          'group-hover:shadow-[0_2px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.05),0_8px_16px_rgba(0,0,0,0.06)]',
                          colors.gradient && 'group-hover:shadow-[0_2px_2px_rgba(249,115,22,0.1),0_4px_8px_rgba(244,114,182,0.08),0_8px_16px_rgba(249,115,22,0.1)]',
                          colors.gradient && 'group-hover:border-orange-300',
                          'backdrop-blur-sm group-hover:backdrop-blur-md'
                        )}>
                          <Icon className={cn(
                            colors.text,
                            'transition-opacity duration-200 ease-out group-hover:opacity-90',
                            isLarge ? 'w-5 h-5 md:w-8 lg:w-9 md:h-8 lg:h-9' : 
                            isSmall ? 'w-4 h-4 md:w-6 md:h-6' : 
                            'w-4 h-4 md:w-7 lg:w-8 md:h-7 lg:h-8'
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

                    {/* PREMIUM: Arrow Indicator - MOBILE: Hidden, Desktop: Visible */}
                    {tool.available && (
                      <div className="absolute top-3 right-3 md:top-6 lg:top-8 md:right-6 lg:right-8">
                        <div className={cn(
                          'w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center',
                          'bg-white/90 backdrop-blur-md border border-gray-200/80',
                          'group-hover:bg-gradient-to-br group-hover:border-orange-300 transition-all duration-500',
                          'ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                          'group-active:scale-90',
                          // PREMIUM: Advanced Shadow Stacks
                          'shadow-[0_1px_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.02)]',
                          'group-hover:shadow-[0_2px_2px_rgba(0,0,0,0.04),0_4px_8px_rgba(249,115,22,0.15),0_8px_16px_rgba(244,114,182,0.12)]',
                          colors.gradient && `group-hover:bg-gradient-to-br group-hover:${colors.gradient}`,
                          colors.gradient && 'group-hover:animate-glow-pulse',
                          // PREMIUM: Glass-Edge Effect
                          'group-hover:glass-edge-brand'
                        )}>
                          <ArrowUpRight className={cn(
                            'w-3 h-3 md:w-4 md:h-4 text-gray-400 group-hover:text-white transition-all duration-500',
                            'ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                            'group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-105'
                          )} />
                        </div>
                      </div>
                    )}

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
                      style={animationStyle}
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
                      style={animationStyle}
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
      </div>
    </div>
  );
}
