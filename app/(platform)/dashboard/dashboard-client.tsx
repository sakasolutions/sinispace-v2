'use client';

import { useState, useMemo, useRef } from 'react';
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
  size?: 'large' | 'medium' | 'small';
  priority?: 'high' | 'medium' | 'low'; // NEW: Priority für Layout
};

const allTools: Tool[] = [
  // HIGH PRIORITY - Large Cards (Recipe, Invoice)
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

  // MEDIUM PRIORITY - Medium Cards
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

  // LOW PRIORITY - Small/Compact Cards
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

// Beliebte Tools für Schnellzugriff (Mobile)
const quickAccessTools = [
  { id: 'email', title: 'Email-Profi', icon: Mail, color: 'blue', href: '/actions/email' },
  { id: 'chat', title: 'Chat', icon: MessageSquare, color: 'indigo', href: '/chat' },
  { id: 'excel', title: 'Excel-Coach', icon: Table2, color: 'green', href: '/tools/excel' },
  { id: 'summarize', title: 'Klartext', icon: FileInput, color: 'amber', href: '/actions/summarize' },
  { id: 'legal', title: 'Rechtstexte', icon: Scale, color: 'violet', href: '/actions/legal' },
];

// BRAND COLORS: Pink-Orange Gradient aus Logo
const brandGradient = 'from-orange-500 via-pink-500 to-rose-500';
const brandGradientHover = 'from-orange-400 via-pink-400 to-rose-400';

// Tool Colors mit Brand-Integration
const toolColors: Record<string, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  hoverBorder: string;
  hoverGradient?: string; // NEW: Brand gradient für hover
}> = {
  emerald: {
    bg: 'bg-zinc-900/40',
    border: 'border-emerald-500/10',
    text: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    hoverBorder: 'hover:border-emerald-500/30',
  },
  blue: {
    bg: 'bg-zinc-900/40',
    border: 'border-blue-500/10',
    text: 'text-blue-400',
    iconBg: 'bg-blue-500/10',
    hoverBorder: 'hover:border-blue-500/30',
  },
  green: {
    bg: 'bg-zinc-900/40',
    border: 'border-green-500/10',
    text: 'text-green-400',
    iconBg: 'bg-green-500/10',
    hoverBorder: 'hover:border-green-500/30',
  },
  violet: {
    bg: 'bg-zinc-900/40',
    border: 'border-violet-500/10',
    text: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    hoverBorder: 'hover:border-violet-500/30',
  },
  indigo: {
    bg: 'bg-zinc-900/40',
    border: 'border-indigo-500/10',
    text: 'text-indigo-400',
    iconBg: 'bg-indigo-500/10',
    hoverBorder: 'hover:border-indigo-500/30',
  },
  amber: {
    bg: 'bg-zinc-900/40',
    border: 'border-amber-500/10',
    text: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    hoverBorder: 'hover:border-amber-500/30',
  },
  cyan: {
    bg: 'bg-zinc-900/40',
    border: 'border-cyan-500/10',
    text: 'text-cyan-400',
    iconBg: 'bg-cyan-500/10',
    hoverBorder: 'hover:border-cyan-500/30',
  },
  orange: {
    bg: 'bg-zinc-900/40',
    border: 'border-orange-500/10',
    text: 'text-orange-400',
    iconBg: 'bg-orange-500/10',
    hoverBorder: 'hover:border-orange-500/30',
    hoverGradient: brandGradient, // BRAND: Logo-Farben
  },
  rose: {
    bg: 'bg-zinc-900/40',
    border: 'border-rose-500/10',
    text: 'text-rose-400',
    iconBg: 'bg-rose-500/10',
    hoverBorder: 'hover:border-rose-500/30',
    hoverGradient: brandGradient, // BRAND: Logo-Farben
  },
  slate: {
    bg: 'bg-zinc-900/40',
    border: 'border-white/5',
    text: 'text-zinc-400',
    iconBg: 'bg-white/5',
    hoverBorder: 'hover:border-white/20',
  },
  pink: {
    bg: 'bg-zinc-900/40',
    border: 'border-pink-500/10',
    text: 'text-pink-400',
    iconBg: 'bg-pink-500/10',
    hoverBorder: 'hover:border-pink-500/30',
    hoverGradient: brandGradient, // BRAND: Logo-Farben
  },
};

export default function DashboardClient() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof categoryTabs)[number]>('Alle');
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

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full relative bg-zinc-950"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, 100)}px)` : 'none',
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
      }}
    >
      {/* BRAND: Subtle gradient background - Logo-Farben */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-500/5 via-transparent to-pink-500/5" />
      </div>

      {/* Pull-to-Refresh Indicator */}
      {pullDistance > 0 && (
        <div className="fixed top-0 left-0 right-0 flex items-center justify-center h-16 bg-zinc-950/95 backdrop-blur-xl border-b border-white/5 z-50">
          {pullDistance >= 60 ? (
            <div className="flex items-center gap-2 text-orange-400">
              <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-light">Loslassen zum Aktualisieren</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-500">
              <span className="text-sm font-light">Ziehen zum Aktualisieren</span>
            </div>
          )}
        </div>
      )}

      {/* Main Container - Mobile First mit großzügigem Whitespace */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pb-32 pt-[calc(env(safe-area-inset-top)+1.5rem)] md:pt-8">
        
        {/* Header Section */}
        <div className="mb-12 md:mb-16 lg:mb-20">
          <DashboardGreetingClient />
        </div>

        {/* Search Bar - Brand Colors Integration */}
        <div className="mb-8 md:mb-12">
          <div className="relative group max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-orange-400 transition-colors duration-300 z-10" />
            <input
              type="text"
              placeholder="Suche nach Tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/50 border border-white/5 text-white placeholder:text-zinc-600 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-orange-500/30 focus:ring-1 focus:ring-orange-500/20 transition-all duration-300 text-base font-light tracking-wide backdrop-blur-sm"
            />
          </div>
        </div>

        {/* Mobile Quick Access - Brand Gradient Touches */}
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
                    'transition-all duration-300 group-active:scale-90',
                    colors.bg,
                    colors.border,
                    colors.hoverBorder,
                    'group-hover:shadow-lg'
                  )}>
                    <QuickIcon className={cn('w-6 h-6', colors.text)} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Category Tabs - Brand Gradient für Active */}
        <div className="mb-10 md:mb-14 overflow-x-auto">
          <div className="flex gap-3 pb-2 min-w-max">
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  triggerHaptic('light');
                }}
                className={cn(
                  'px-5 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all duration-300 whitespace-nowrap',
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-rose-500/20 text-white border border-orange-500/30 shadow-lg shadow-orange-500/10'
                    : 'bg-zinc-900/50 text-zinc-500 border border-white/5 hover:text-zinc-400 hover:border-white/10'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* STAGGERED LAYOUT - Mobile First, Fluid & Organic */}
        {filteredTools.length > 0 ? (
          <div className="space-y-6 md:space-y-8">
            {/* Mobile: Vertical Stack mit verschiedenen Größen */}
            {/* Desktop: Staggered Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredTools.map((tool, index) => {
                const Icon = tool.icon;
                const colors = toolColors[tool.color] || toolColors.blue;
                const size = tool.size || 'medium';
                const isLarge = size === 'large';
                const isSmall = size === 'small';

                // Staggered positioning - verschiedene Start-Positionen
                const staggeredClass = index % 3 === 1 ? 'md:mt-8 lg:mt-12' : index % 3 === 2 ? 'md:mt-4 lg:mt-6' : '';

                const cardClassName = cn(
                  'group relative rounded-2xl border overflow-hidden',
                  'transition-all duration-500 ease-out',
                  'hover:-translate-y-1 hover:shadow-2xl',
                  colors.bg,
                  colors.border,
                  colors.hoverBorder,
                  tool.available ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed',
                  staggeredClass,
                  // Size-based padding & min-height
                  isLarge ? 'p-8 md:p-10 min-h-[280px] md:min-h-[320px]' : 
                  isSmall ? 'p-5 md:p-6 min-h-[180px]' : 
                  'p-6 md:p-8 min-h-[220px] md:min-h-[260px]'
                );

                const content = (
                  <>
                    {/* BRAND: Gradient overlay on hover */}
                    {colors.hoverGradient && (
                      <div className={cn(
                        'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500',
                        colors.hoverGradient
                      )} />
                    )}

                    {/* Subtle glow effect - Brand colors */}
                    <div className={cn(
                      'absolute -bottom-16 -right-16 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500',
                      colors.hoverGradient ? `bg-gradient-to-br ${colors.hoverGradient}` : colors.iconBg.replace('bg-', 'bg-').replace('/10', '')
                    )} />

                    {/* Icon Container - Brand gradient für hover */}
                    <div className="mb-5 md:mb-6">
                      <div className={cn(
                        'inline-flex items-center justify-center rounded-xl border transition-all duration-500',
                        colors.iconBg,
                        colors.border,
                        isLarge ? 'w-14 h-14 md:w-16 md:h-16' : isSmall ? 'w-12 h-12' : 'w-13 h-13 md:w-14 md:h-14',
                        'group-hover:scale-110 group-hover:rotate-3',
                        colors.hoverGradient && 'group-hover:bg-gradient-to-br group-hover:border-orange-500/30',
                        colors.hoverGradient && `group-hover:${colors.hoverGradient}`
                      )}>
                        <Icon className={cn(
                          colors.text,
                          isLarge ? 'w-7 h-7 md:w-8 md:h-8' : isSmall ? 'w-6 h-6' : 'w-6 h-6 md:w-7 md:h-7',
                          'transition-transform duration-500 group-hover:scale-110'
                        )} />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className={cn(
                      'font-bold text-white mb-2 md:mb-3',
                      'tracking-tight leading-tight',
                      isLarge ? 'text-2xl md:text-3xl' : isSmall ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'
                    )} style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
                      {tool.title}
                    </h3>

                    {/* Description - Ultra-thin */}
                    <p className={cn(
                      'text-zinc-500 leading-relaxed font-light tracking-wide',
                      isLarge ? 'text-sm md:text-base' : isSmall ? 'text-xs md:text-sm' : 'text-sm',
                      'group-hover:text-zinc-400 transition-colors duration-500'
                    )}>
                      {tool.description}
                    </p>

                    {/* Arrow indicator - Brand gradient */}
                    {tool.available && (
                      <div className="absolute top-5 right-5 md:top-6 md:right-6">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          'bg-white/5 border border-white/10',
                          'group-hover:bg-gradient-to-br group-hover:border-orange-500/30 transition-all duration-500',
                          colors.hoverGradient && `group-hover:${colors.hoverGradient}`
                        )}>
                          <ArrowUpRight className={cn(
                            'w-4 h-4 text-white/30 group-hover:text-white transition-all duration-500',
                            'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
                          )} />
                        </div>
                      </div>
                    )}

                    {/* Status badge */}
                    {!tool.available && tool.status === 'soon' && (
                      <div className="absolute top-5 right-5 md:top-6 md:right-6">
                        <span className="text-[10px] uppercase tracking-widest font-light px-2.5 py-1 rounded-full border border-white/5 bg-white/2 text-zinc-500">
                          In Kürze
                        </span>
                      </div>
                    )}
                  </>
                );

                return tool.available ? (
                  <Link key={tool.id} href={tool.href} className={cardClassName}>
                    {content}
                  </Link>
                ) : (
                  <div key={tool.id} className={cardClassName}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-24">
            <Search className="w-16 h-16 mx-auto mb-6 text-zinc-700" />
            <p className="text-zinc-500 text-lg font-light tracking-wide mb-2">Keine Tools gefunden.</p>
            <p className="text-zinc-600 text-sm font-light">
              Versuche eine andere Suche oder Kategorie.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
