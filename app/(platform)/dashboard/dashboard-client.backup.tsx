'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DashboardGreetingClient } from '@/components/platform/dashboard-greeting-client';
import { triggerHaptic } from '@/lib/haptic-feedback';
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
};

const allTools: Tool[] = [
  // BUSINESS & FINANZEN
  {
    id: 'invoice',
    title: 'Angebot & Rechnung',
    description: 'Rechnungen & Angebote in Sekunden erstellen. Inklusive PDF-Export.',
    icon: FileText,
    color: 'emerald',
    category: 'business',
    href: '/actions/invoice',
    available: true,
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
  },

  // KOMMUNIKATION
  {
    id: 'email',
    title: 'Email-Profi',
    description: 'Perfekte Mails für jeden Anlass. Von Bewerbung bis Beschwerde.',
    icon: Mail,
    color: 'blue',
    category: 'communication',
    href: '/actions/email',
    available: true,
  },
  {
    id: 'tough-msg',
    title: 'Chat-Coach',
    description: 'Perfekte Antworten für WhatsApp, Dating & Social Media. Immer der richtige Ton.',
    icon: MessageCircleHeart,
    color: 'indigo',
    category: 'communication',
    href: '/tools/difficult',
    available: true,
  },
  {
    id: 'translate',
    title: 'Sprachbrücke',
    description: 'Übersetze nicht nur Wörter, sondern die Bedeutung. Kontext-sensitiv.',
    icon: Languages,
    color: 'indigo',
    category: 'communication',
    href: '/actions/translate',
    available: true,
  },

  // TEXT & OPTIMIERUNG
  {
    id: 'polish',
    title: 'Wortschliff',
    description: 'Verwandle Notizen in geschliffene Texte. Korrektur & Stil-Upgrade.',
    icon: Sparkles,
    color: 'cyan',
    category: 'writing',
    href: '/actions/polish',
    available: true,
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
  },

  // TECH & LIFESTYLE
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
  },
  {
    id: 'recipe',
    title: 'CookIQ',
    description: 'Was koche ich heute? Leckere Rezepte basierend auf deinem Vorrat.',
    icon: ChefHat,
    color: 'orange',
    category: 'lifestyle',
    href: '/tools/recipe',
    available: true,
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
  },

  // CONTENT
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
  },
];

const categoryTabs = ['Alle', 'Business', 'Kommunikation', 'Tech & Life'] as const;

const categoryFilterMap: Record<string, string[]> = {
  Alle: [],
  Business: ['business'],
  Kommunikation: ['communication', 'writing'],
  'Tech & Life': ['dev', 'lifestyle', 'social'],
};

// Beliebte Tools für Schnellzugriff (Mobile)
const quickAccessTools = [
  { id: 'email', title: 'Email-Profi', icon: Mail, color: 'blue', href: '/actions/email' },
  { id: 'chat', title: 'Chat', icon: MessageSquare, color: 'indigo', href: '/chat' },
  { id: 'excel', title: 'Excel-Coach', icon: Table2, color: 'green', href: '/tools/excel' },
  { id: 'summarize', title: 'Klartext', icon: FileInput, color: 'amber', href: '/actions/summarize' },
  { id: 'legal', title: 'Rechtstexte', icon: Scale, color: 'violet', href: '/actions/legal' },
];

const colorMap: Record<string, { bg: string; border: string; hoverBorder: string; hoverShadow: string }> = {
  blue: { bg: 'bg-blue-950/30', border: 'border-zinc-700/50 md:border-blue-500/10', hoverBorder: 'hover:border-blue-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.4)]' },
  indigo: { bg: 'bg-indigo-950/30', border: 'border-zinc-700/50 md:border-indigo-500/10', hoverBorder: 'hover:border-indigo-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(99,102,241,0.4)]' },
  rose: { bg: 'bg-rose-950/30', border: 'border-zinc-700/50 md:border-rose-500/10', hoverBorder: 'hover:border-rose-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(244,63,94,0.4)]' },
  violet: { bg: 'bg-violet-950/30', border: 'border-zinc-700/50 md:border-violet-500/10', hoverBorder: 'hover:border-violet-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(139,92,246,0.4)]' },
  green: { bg: 'bg-green-950/30', border: 'border-zinc-700/50 md:border-green-500/10', hoverBorder: 'hover:border-green-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(34,197,94,0.4)]' },
  slate: { bg: 'bg-slate-950/30', border: 'border-zinc-700/50 md:border-slate-500/10', hoverBorder: 'hover:border-slate-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(100,116,139,0.4)]' },
  emerald: { bg: 'bg-emerald-950/30', border: 'border-zinc-700/50 md:border-emerald-500/10', hoverBorder: 'hover:border-emerald-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(16,185,129,0.4)]' },
  cyan: { bg: 'bg-cyan-950/30', border: 'border-zinc-700/50 md:border-cyan-500/10', hoverBorder: 'hover:border-cyan-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(6,182,212,0.4)]' },
  amber: { bg: 'bg-amber-950/30', border: 'border-zinc-700/50 md:border-amber-500/10', hoverBorder: 'hover:border-amber-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(245,158,11,0.4)]' },
  orange: { bg: 'bg-orange-950/30', border: 'border-zinc-700/50 md:border-orange-500/10', hoverBorder: 'hover:border-orange-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(249,115,22,0.4)]' },
  pink: { bg: 'bg-pink-950/30', border: 'border-zinc-700/50 md:border-pink-500/10', hoverBorder: 'hover:border-pink-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(236,72,153,0.4)]' },
  gray: { bg: 'bg-zinc-900/40', border: 'border-zinc-700/50 md:border-white/5', hoverBorder: 'hover:border-white/20', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(255,255,255,0.15)]' },
};

const glowColorMap: Record<string, string> = {
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  rose: 'bg-rose-500',
  violet: 'bg-violet-500',
  green: 'bg-green-500',
  slate: 'bg-slate-500',
  emerald: 'bg-emerald-500',
  cyan: 'bg-cyan-500',
  amber: 'bg-amber-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
};

export default function DashboardClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof categoryTabs)[number]>('Alle');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pull-to-Refresh Handler
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
      // Nur preventDefault wenn Event cancelable ist (Pull-to-Refresh)
      if (e.cancelable) {
        e.preventDefault();
      }
      
      // Performance: requestAnimationFrame für smooth updates
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
      setIsRefreshing(true);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      setPullDistance(0);
    }
    touchStartRef.current = null;
  };

  const filteredTools = useMemo(() => {
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

    return filtered;
  }, [selectedCategory, searchQuery]);

  const colorClasses: Record<string, { text: string; bg: string; bgHover: string; border: string; hoverBorder: string; hoverShadow: string }> = {
    blue: { text: 'text-blue-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-blue-500/20', border: 'border-blue-500/20', hoverBorder: 'group-hover:border-blue-500/50', hoverShadow: 'group-hover:shadow-blue-500/20' },
    indigo: { text: 'text-indigo-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-indigo-500/20', border: 'border-indigo-500/20', hoverBorder: 'group-hover:border-indigo-500/50', hoverShadow: 'group-hover:shadow-indigo-500/20' },
    rose: { text: 'text-rose-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-rose-500/20', border: 'border-rose-500/20', hoverBorder: 'group-hover:border-rose-500/50', hoverShadow: 'group-hover:shadow-rose-500/20' },
    violet: { text: 'text-violet-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-violet-500/20', border: 'border-violet-500/20', hoverBorder: 'group-hover:border-violet-500/50', hoverShadow: 'group-hover:shadow-violet-500/20' },
    green: { text: 'text-green-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-green-500/20', border: 'border-green-500/20', hoverBorder: 'group-hover:border-green-500/50', hoverShadow: 'group-hover:shadow-green-500/20' },
    slate: { text: 'text-slate-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-slate-500/20', border: 'border-slate-500/20', hoverBorder: 'group-hover:border-slate-500/50', hoverShadow: 'group-hover:shadow-slate-500/20' },
    emerald: { text: 'text-emerald-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-emerald-500/20', border: 'border-emerald-500/20', hoverBorder: 'group-hover:border-emerald-500/50', hoverShadow: 'group-hover:shadow-emerald-500/20' },
    cyan: { text: 'text-cyan-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-cyan-500/20', border: 'border-cyan-500/20', hoverBorder: 'group-hover:border-cyan-500/50', hoverShadow: 'group-hover:shadow-cyan-500/20' },
    amber: { text: 'text-amber-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-amber-500/20', border: 'border-amber-500/20', hoverBorder: 'group-hover:border-amber-500/50', hoverShadow: 'group-hover:shadow-amber-500/20' },
    orange: { text: 'text-orange-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-orange-500/20', border: 'border-orange-500/20', hoverBorder: 'group-hover:border-orange-500/50', hoverShadow: 'group-hover:shadow-orange-500/20' },
    pink: { text: 'text-pink-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-pink-500/20', border: 'border-pink-500/20', hoverBorder: 'group-hover:border-pink-500/50', hoverShadow: 'group-hover:shadow-pink-500/20' },
  };

  return (
    <div
      ref={containerRef}
      className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-0 relative z-10"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, 100)}px)` : 'none',
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
      }}
    >
      {/* NEW: Brand watermark pattern - subtle S in background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.015] -z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[30rem] font-black text-white" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif', letterSpacing: '-0.05em' }}>
          S
        </div>
      </div>
      {/* Pull-to-Refresh Indicator */}
      {pullDistance > 0 && (
        <div className="fixed top-0 left-0 right-0 flex items-center justify-center h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-white/10 z-50">
          {pullDistance >= 60 ? (
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loslassen zum Aktualisieren</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-sm">Ziehen zum Aktualisieren</span>
            </div>
          )}
        </div>
      )}

      {/* Header mit Background Glow */}
      <DashboardGreetingClient />

      {/* Search Bar mit Glass-Effekt 2.0 */}
      <div className="mb-6 sm:mb-8">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 md:w-5 md:h-5 text-zinc-500 group-focus-within:text-blue-400 transition-all duration-300 z-10 group-focus-within:scale-110" />
          <input
            type="text"
            placeholder="Suche nach Tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.03] border border-white/10 text-white placeholder:text-zinc-500 rounded-2xl py-4 md:py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 shadow-lg backdrop-blur-xl text-base md:text-sm min-h-[56px] md:min-h-[56px] tracking-wide hover:bg-white/[0.05] hover:border-white/15"
          />
        </div>
      </div>

      <div className="mb-6 md:hidden">
        <div className="grid grid-cols-4 gap-4">
          {quickAccessTools.map((quickTool) => {
            const QuickIcon = quickTool.icon;
            const quickColors = colorClasses[quickTool.color] || colorClasses.blue;
            return (
              <Link
                key={quickTool.id}
                href={quickTool.href}
                className="flex flex-col items-center group p-3"
                onClick={() => triggerHaptic('light')}
              >
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-lg',
                    'transition-all duration-300 group-active:scale-90 group-hover:scale-110',
                    'group-hover:bg-white/[0.08] group-hover:border-white/20',
                    quickColors.hoverBorder,
                    quickColors.bgHover
                  )}
                >
                  <QuickIcon className={cn('w-7 h-7 transition-transform duration-300 group-hover:scale-110', quickColors.text)} />
                </div>
                <span className="text-[10px] text-zinc-400 text-center mt-2 truncate w-full group-hover:text-zinc-300 transition-colors duration-300 leading-tight font-medium">
                  {quickTool.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-6 sm:mb-8 overflow-x-auto">
        <div className="flex gap-3 md:gap-2 pb-2 min-w-max">
          {categoryTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                triggerHaptic('light');
              }}
              className={`px-5 py-2.5 md:px-4 md:py-2 sm:px-5 sm:py-2.5 rounded-full text-sm md:text-xs sm:text-sm font-semibold transition-all duration-300 whitespace-nowrap min-h-[44px] md:min-h-[36px] sm:min-h-[40px] tracking-wide backdrop-blur-md ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-teal-500/25 via-indigo-500/25 to-blue-500/25 text-white border border-teal-500/40 shadow-lg shadow-teal-500/20 scale-105'
                  : 'bg-white/[0.03] text-zinc-400 border border-white/10 hover:bg-white/[0.06] hover:text-zinc-300 hover:border-white/20 hover:scale-102'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 md:gap-6">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            const iconColors = colorClasses[tool.color] || colorClasses.blue;
            const cardColors = colorMap[tool.color] || colorMap.gray;
            const glowClass = glowColorMap[tool.color] || 'bg-zinc-500';

            // BACKUP: Original card classes
            // 'group relative flex flex-col h-full min-h-[180px] p-6 md:p-5 rounded-2xl border overflow-hidden',
            // 'transform-gpu will-change-transform [backface-visibility:hidden] translate-z-0',
            // 'backdrop-blur-sm shadow-md transition-[transform,box-shadow] duration-300 ease-out',
            // 'hover:-translate-y-2 hover:shadow-2xl md:hover:-translate-y-2',

            // NEW: Enhanced card with personality
            const cardClassName = cn(
              'group relative flex flex-col h-full min-h-[200px] p-7 md:p-6 rounded-3xl border overflow-hidden',
              'transform-gpu will-change-transform [backface-visibility:hidden] translate-z-0',
              'backdrop-blur-xl shadow-xl transition-all duration-500 ease-out',
              'hover:-translate-y-3 hover:scale-[1.02] hover:shadow-2xl md:hover:-translate-y-3',
              'hover:border-opacity-60',
              cardColors.bg,
              cardColors.border,
              cardColors.hoverBorder,
              cardColors.hoverShadow,
              tool.available ? 'cursor-pointer' : 'opacity-75 cursor-not-allowed',
              // NEW: Tool-specific personality animations
              tool.category === 'business' && 'hover:shadow-emerald-500/20',
              tool.category === 'communication' && 'hover:shadow-blue-500/20',
              tool.category === 'lifestyle' && 'hover:shadow-orange-500/20',
              tool.category === 'writing' && 'hover:shadow-cyan-500/20'
            );

            const cardContent = (
              <>
                {/* BACKUP: Original gradient overlay */}
                {/* <div className="absolute -inset-px bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" /> */}
                
                {/* NEW: Enhanced gradient overlay with tool-specific colors */}
                <div className={cn(
                  'absolute -inset-px bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none',
                  tool.category === 'business' && 'from-emerald-500/20 via-transparent to-transparent',
                  tool.category === 'communication' && 'from-blue-500/20 via-transparent to-transparent',
                  tool.category === 'lifestyle' && 'from-orange-500/20 via-transparent to-transparent',
                  tool.category === 'writing' && 'from-cyan-500/20 via-transparent to-transparent'
                )} />

                {/* NEW: Subtle animated border glow */}
                <div className={cn(
                  'absolute -inset-0.5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none',
                  'bg-gradient-to-r from-transparent via-white/5 to-transparent',
                  tool.category === 'business' && 'via-emerald-500/10',
                  tool.category === 'communication' && 'via-blue-500/10',
                  tool.category === 'lifestyle' && 'via-orange-500/10',
                  tool.category === 'writing' && 'via-cyan-500/10'
                )} />

                <div className="flex items-start justify-between mb-5 md:mb-5 relative z-10">
                  {/* NEW: Enhanced icon container with parallax effect */}
                  <div className={cn(
                    'w-14 h-14 md:w-12 md:h-12 rounded-xl bg-white/[0.08] flex items-center justify-center shrink-0',
                    'border border-white/10 backdrop-blur-md',
                    'transition-all duration-500 group-hover:scale-110 group-hover:rotate-3',
                    'group-hover:bg-white/[0.12] group-hover:border-white/20',
                    iconColors.bg,
                    iconColors.bgHover
                  )}>
                    <div className={cn(iconColors.text, 'transition-all duration-500 group-hover:scale-110')}>
                      <Icon className="w-7 h-7 md:w-6 md:h-6 animate-float [animation-duration:6s]" />
                    </div>
                  </div>
                  {tool.available ? (
                    <ArrowUpRight className="w-5 h-5 text-white/30 group-hover:text-white transition-all duration-500 group-hover:translate-x-2 group-hover:-translate-y-2 group-hover:scale-110 shrink-0" />
                  ) : tool.status === 'soon' ? (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border border-zinc-600/50 bg-zinc-800/60 backdrop-blur-sm text-zinc-400 shrink-0">
                      In Kürze
                    </span>
                  ) : null}
                </div>

                {/* NEW: Enhanced typography with better spacing */}
                <h3
                  className="font-bold text-2xl md:text-xl text-white mb-3 md:mb-3 relative z-10 subpixel-antialiased leading-tight tracking-tight"
                  style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif', fontWeight: 750 }}
                >
                  {tool.title}
                </h3>

                <p className="text-sm md:text-xs text-zinc-400 leading-relaxed line-clamp-3 relative z-10 flex-1 subpixel-antialiased group-hover:text-zinc-300 transition-colors duration-300">
                  {tool.description}
                </p>

                {/* NEW: Enhanced glow effect with tool-specific colors */}
                <div
                  className={cn(
                    'absolute -bottom-6 -right-6 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none',
                    'transition-all duration-700 group-hover:scale-150 group-hover:opacity-40 group-hover:blur-[60px]',
                    glowClass
                  )}
                  style={{ zIndex: 0 }}
                />

                {/* NEW: Additional subtle glow for depth */}
                <div
                  className={cn(
                    'absolute -top-8 -left-8 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none',
                    'transition-all duration-700 group-hover:scale-125 group-hover:opacity-20',
                    glowClass
                  )}
                  style={{ zIndex: 0 }}
                />
              </>
            );

            return tool.available ? (
              <Link key={tool.id} href={tool.href} className={cardClassName}>
                {cardContent}
              </Link>
            ) : (
              <div key={tool.id} className={cardClassName}>
                {cardContent}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="relative inline-block mb-6">
            <Search className="w-16 h-16 mx-auto text-zinc-600/50 animate-pulse" />
            <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full" />
          </div>
          <p className="text-zinc-400 tracking-wide text-lg mb-2">Keine Tools gefunden.</p>
          <p className="text-sm text-zinc-500 mt-1 tracking-wide">
            Versuche eine andere Suche oder Kategorie.
          </p>
        </div>
      )}
    </div>
  );
}
