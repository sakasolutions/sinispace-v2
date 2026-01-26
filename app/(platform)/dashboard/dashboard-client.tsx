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
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

      {/* Main Container - Clean, Spacious */}
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pb-32 pt-[calc(env(safe-area-inset-top)+1.5rem)] md:pt-8">
        
        {/* Header Section */}
        <div className="mb-12 md:mb-16 lg:mb-20">
          <DashboardGreetingClient />
        </div>

        {/* Search Bar - Clean Design */}
        <div className="mb-8 md:mb-12">
          <div className="relative group max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-orange-500 transition-colors duration-300 z-10" />
            <input
              type="text"
              placeholder="Suche nach Tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all duration-300 text-base font-medium tracking-wide shadow-sm hover:shadow-md"
            />
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

        {/* Category Tabs - Clean with Logo Gradient */}
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
                  'px-5 py-2.5 rounded-full text-sm font-medium tracking-wide transition-all duration-300 whitespace-nowrap shadow-sm',
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white border-0 shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:text-gray-900 hover:border-gray-300'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* PREMIUM LAYOUT - Floating Cards mit Depth & Polish */}
        {filteredTools.length > 0 ? (
          <div className="space-y-8 md:space-y-12">
            {/* Golden Ratio Spacing: 1.618 ratio zwischen cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10 lg:gap-12">
              {filteredTools.map((tool, index) => {
                const Icon = tool.icon;
                const colors = toolColors[tool.color] || toolColors.blue;
                const size = tool.size || 'medium';
                const isLarge = size === 'large';
                const isSmall = size === 'small';

                // Staggered positioning
                const staggeredClass = index % 3 === 1 ? 'md:mt-8 lg:mt-12' : index % 3 === 2 ? 'md:mt-4 lg:mt-6' : '';

                const cardClassName = cn(
                  'group relative rounded-2xl border overflow-hidden',
                  'transition-all duration-300 ease-out',
                  'hover:-translate-y-1',
                  colors.bg,
                  colors.border,
                  colors.hoverBorder,
                  colors.hoverBg,
                  tool.available ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed',
                  staggeredClass,
                  // DEPTH: Multiple shadow layers für realistic depth
                  'shadow-[0_1px_3px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.04)]',
                  'hover:shadow-[0_4px_6px_rgba(0,0,0,0.1),0_12px_24px_rgba(0,0,0,0.08)]',
                  // Logo gradient glow für hover
                  colors.gradient && 'hover:shadow-[0_4px_6px_rgba(0,0,0,0.1),0_12px_24px_rgba(249,115,22,0.15)]',
                  // Size-based padding - Golden ratio spacing
                  isLarge ? 'p-10 md:p-12 min-h-[300px] md:min-h-[360px]' : 
                  isSmall ? 'p-6 md:p-7 min-h-[200px]' : 
                  'p-8 md:p-10 min-h-[240px] md:min-h-[280px]'
                );

                const content = (
                  <>
                    {/* DEPTH: Subtle border gradient */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className={cn(
                        'absolute inset-0 rounded-2xl',
                        colors.gradient 
                          ? `bg-gradient-to-br ${colors.gradient} opacity-5` 
                          : 'bg-gradient-to-br from-gray-100 to-transparent opacity-30'
                      )} style={{ 
                        maskImage: 'linear-gradient(to bottom right, black 0%, transparent 70%)',
                        WebkitMaskImage: 'linear-gradient(to bottom right, black 0%, transparent 70%)'
                      }} />
                    </div>

                    {/* Logo Gradient Accent für bestimmte Tools - Subtle Glow */}
                    {colors.gradient && (
                      <div className={cn(
                        'absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500',
                        `bg-gradient-to-br ${colors.gradient}`
                      )} />
                    )}

                    {/* Icon Container - Enhanced mit Glow */}
                    <div className="mb-6 md:mb-8">
                      <div className={cn(
                        'inline-flex items-center justify-center rounded-xl border transition-all duration-300',
                        colors.iconBg,
                        colors.border,
                        isLarge ? 'w-16 h-16 md:w-18 md:h-18' : isSmall ? 'w-13 h-13' : 'w-14 h-14 md:w-16 md:h-16',
                        'group-hover:scale-110',
                        'shadow-sm group-hover:shadow-md',
                        colors.gradient && 'group-hover:border-orange-300 group-hover:shadow-orange-200/50'
                      )}>
                        <Icon className={cn(
                          colors.text,
                          isLarge ? 'w-8 h-8 md:w-9 md:h-9' : isSmall ? 'w-6 h-6' : 'w-7 h-7 md:w-8 md:h-8'
                        )} />
                      </div>
                    </div>

                    {/* Title - Typography Upgrade: Font-weight 700 */}
                    <h3 className={cn(
                      'font-bold text-gray-900 mb-3 md:mb-4',
                      'tracking-tight leading-tight',
                      isLarge ? 'text-2xl md:text-3xl' : isSmall ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'
                    )} style={{ 
                      fontFamily: 'var(--font-plus-jakarta-sans), sans-serif',
                      fontWeight: 700,
                      letterSpacing: '-0.02em'
                    }}>
                      {tool.title}
                    </h3>

                    {/* Description - Typography Upgrade: Font-weight 400, improved letter-spacing */}
                    <p className={cn(
                      'text-gray-600 leading-relaxed font-normal',
                      isLarge ? 'text-sm md:text-base' : isSmall ? 'text-xs md:text-sm' : 'text-sm',
                      'group-hover:text-gray-700 transition-colors duration-300'
                    )} style={{
                      fontWeight: 400,
                      letterSpacing: '0.01em',
                      lineHeight: '1.6'
                    }}>
                      {tool.description}
                    </p>

                    {/* Arrow indicator - Logo gradient mit Glow */}
                    {tool.available && (
                      <div className="absolute top-6 right-6 md:top-8 md:right-8">
                        <div className={cn(
                          'w-9 h-9 rounded-lg flex items-center justify-center',
                          'bg-white/80 backdrop-blur-sm border border-gray-200',
                          'group-hover:bg-gradient-to-br group-hover:border-orange-300 transition-all duration-300',
                          'shadow-sm group-hover:shadow-md',
                          colors.gradient && `group-hover:bg-gradient-to-br group-hover:${colors.gradient}`,
                          colors.gradient && 'group-hover:shadow-orange-200/50'
                        )}>
                          <ArrowUpRight className={cn(
                            'w-4 h-4 text-gray-400 group-hover:text-white transition-all duration-300',
                            'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
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
