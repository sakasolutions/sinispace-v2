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
  size?: 'large' | 'medium' | 'small'; // NEW: Size für asymmetrisches Layout
};

const allTools: Tool[] = [
  // BUSINESS & FINANZEN - Large bubbles (wichtigste Tools)
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
    size: 'large',
  },

  // Medium bubbles
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
  },

  // Small bubbles
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
  },
  {
    id: 'recipe',
    title: 'Gourmet-Planer',
    description: 'Was koche ich heute? Leckere Rezepte basierend auf deinem Vorrat.',
    icon: ChefHat,
    color: 'orange',
    category: 'lifestyle',
    href: '/tools/recipe',
    available: true,
    size: 'small',
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

// NEW: Minimal Luxury Color Palette - Rich blacks mit subtle tints
const luxuryColors: Record<string, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  glow: string;
  accent: string;
}> = {
  emerald: {
    bg: 'bg-[#0a1a14]',
    border: 'border-emerald-500/10',
    text: 'text-emerald-400',
    iconBg: 'bg-emerald-500/5',
    glow: 'bg-emerald-500',
    accent: 'emerald',
  },
  blue: {
    bg: 'bg-[#0a111a]',
    border: 'border-blue-500/10',
    text: 'text-blue-400',
    iconBg: 'bg-blue-500/5',
    glow: 'bg-blue-500',
    accent: 'blue',
  },
  green: {
    bg: 'bg-[#0a1a12]',
    border: 'border-green-500/10',
    text: 'text-green-400',
    iconBg: 'bg-green-500/5',
    glow: 'bg-green-500',
    accent: 'green',
  },
  violet: {
    bg: 'bg-[#120a1a]',
    border: 'border-violet-500/10',
    text: 'text-violet-400',
    iconBg: 'bg-violet-500/5',
    glow: 'bg-violet-500',
    accent: 'violet',
  },
  indigo: {
    bg: 'bg-[#0f0a1a]',
    border: 'border-indigo-500/10',
    text: 'text-indigo-400',
    iconBg: 'bg-indigo-500/5',
    glow: 'bg-indigo-500',
    accent: 'indigo',
  },
  amber: {
    bg: 'bg-[#1a140a]',
    border: 'border-amber-500/10',
    text: 'text-amber-400',
    iconBg: 'bg-amber-500/5',
    glow: 'bg-amber-500',
    accent: 'amber',
  },
  cyan: {
    bg: 'bg-[#0a161a]',
    border: 'border-cyan-500/10',
    text: 'text-cyan-400',
    iconBg: 'bg-cyan-500/5',
    glow: 'bg-cyan-500',
    accent: 'cyan',
  },
  orange: {
    bg: 'bg-[#1a120a]',
    border: 'border-orange-500/10',
    text: 'text-orange-400',
    iconBg: 'bg-orange-500/5',
    glow: 'bg-orange-500',
    accent: 'orange',
  },
  rose: {
    bg: 'bg-[#1a0a12]',
    border: 'border-rose-500/10',
    text: 'text-rose-400',
    iconBg: 'bg-rose-500/5',
    glow: 'bg-rose-500',
    accent: 'rose',
  },
  slate: {
    bg: 'bg-[#0a0a0a]',
    border: 'border-white/5',
    text: 'text-zinc-400',
    iconBg: 'bg-white/3',
    glow: 'bg-zinc-500',
    accent: 'slate',
  },
  pink: {
    bg: 'bg-[#1a0a14]',
    border: 'border-pink-500/10',
    text: 'text-pink-400',
    iconBg: 'bg-pink-500/5',
    glow: 'bg-pink-500',
    accent: 'pink',
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
        <div className="fixed top-0 left-0 right-0 flex items-center justify-center h-16 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5 z-50">
          {pullDistance >= 60 ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-light">Loslassen zum Aktualisieren</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-500">
              <span className="text-sm font-light">Ziehen zum Aktualisieren</span>
            </div>
          )}
        </div>
      )}

      {/* Main Container mit großzügigem Whitespace */}
      <div className="mx-auto max-w-[1600px] w-full px-6 sm:px-8 lg:px-12 xl:px-16 pb-24 pt-[calc(env(safe-area-inset-top)+2rem)] md:pt-12">
        
        {/* Header Section - Ultra Premium Typography */}
        <div className="mb-16 md:mb-20 lg:mb-24">
          <DashboardGreetingClient />
        </div>

        {/* Search Bar - Minimal Luxury */}
        <div className="mb-12 md:mb-16">
          <div className="relative group max-w-2xl">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600 group-focus-within:text-zinc-400 transition-colors duration-500 z-10" />
            <input
              type="text"
              placeholder="Suche nach Tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111111] border border-white/5 text-white placeholder:text-zinc-600 rounded-2xl py-5 pl-14 pr-6 focus:outline-none focus:border-white/10 transition-all duration-500 text-base font-light tracking-wide"
            />
          </div>
        </div>

        {/* Mobile Quick Access */}
        <div className="mb-12 md:hidden">
          <div className="flex gap-4 justify-center">
            {quickAccessTools.slice(0, 4).map((quickTool) => {
              const QuickIcon = quickTool.icon;
              const colors = luxuryColors[quickTool.color] || luxuryColors.blue;
              return (
                <Link
                  key={quickTool.id}
                  href={quickTool.href}
                  className="flex flex-col items-center group"
                  onClick={() => triggerHaptic('light')}
                >
                  <div className={cn(
                    'w-16 h-16 rounded-2xl border flex items-center justify-center',
                    'transition-all duration-500 group-active:scale-90',
                    colors.bg,
                    colors.border,
                    'group-hover:border-opacity-30'
                  )}>
                    <QuickIcon className={cn('w-7 h-7', colors.text)} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Category Tabs - Ultra Minimal */}
        <div className="mb-16 md:mb-20 overflow-x-auto">
          <div className="flex gap-4 pb-2 min-w-max">
            {categoryTabs.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  triggerHaptic('light');
                }}
                className={cn(
                  'px-6 py-3 rounded-full text-sm font-light tracking-wider transition-all duration-500 whitespace-nowrap',
                  selectedCategory === cat
                    ? 'bg-white/5 text-white border border-white/10'
                    : 'text-zinc-500 hover:text-zinc-400 border border-transparent'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ASYMMETRICAL FLOATING LAYOUT - Minimal Luxury */}
        {filteredTools.length > 0 ? (
          <div className="relative">
            {/* Floating Tools Grid - Asymmetrisch */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 auto-rows-max">
              {filteredTools.map((tool, index) => {
                const Icon = tool.icon;
                const colors = luxuryColors[tool.color] || luxuryColors.blue;
                const size = tool.size || 'medium';

                // Asymmetrische Positionierung
                const colSpan = size === 'large' ? 'md:col-span-6 lg:col-span-5' : size === 'medium' ? 'md:col-span-6 lg:col-span-4' : 'md:col-span-6 lg:col-span-3';
                const rowSpan = size === 'large' ? 'md:row-span-2' : 'md:row-span-1';

                // Staggered positioning für dynamisches Layout
                const offset = index % 3 === 1 ? 'md:col-start-7' : '';
                const isLarge = size === 'large';

                const bubbleClassName = cn(
                  'group relative rounded-3xl border overflow-hidden',
                  'transition-all duration-700 ease-out',
                  'hover:-translate-y-2 hover:scale-[1.01]',
                  colors.bg,
                  colors.border,
                  'hover:border-opacity-20',
                  colSpan,
                  rowSpan,
                  tool.available ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed',
                  // Size-based padding
                  isLarge ? 'p-10 md:p-12' : size === 'medium' ? 'p-8 md:p-10' : 'p-6 md:p-8'
                );

                const content = (
                  <>
                    {/* Subtle glow effect */}
                    <div className={cn(
                      'absolute -bottom-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700',
                      colors.glow
                    )} />

                    {/* Icon - Size-based */}
                    <div className="mb-6 md:mb-8">
                      <div className={cn(
                        'inline-flex items-center justify-center rounded-2xl border',
                        colors.iconBg,
                        colors.border,
                        isLarge ? 'w-16 h-16 md:w-20 md:h-20' : size === 'medium' ? 'w-14 h-14 md:w-16 md:h-16' : 'w-12 h-12 md:w-14 md:h-14',
                        'transition-all duration-500 group-hover:scale-110 group-hover:rotate-3'
                      )}>
                        <Icon className={cn(
                          colors.text,
                          isLarge ? 'w-8 h-8 md:w-10 md:h-10' : size === 'medium' ? 'w-7 h-7 md:w-8 md:h-8' : 'w-6 h-6 md:w-7 md:h-7'
                        )} />
                      </div>
                    </div>

                    {/* Title - Premium Typography */}
                    <h3 className={cn(
                      'font-bold text-white mb-3 md:mb-4',
                      'tracking-tight',
                      isLarge ? 'text-3xl md:text-4xl' : size === 'medium' ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl',
                      'leading-tight'
                    )} style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif', fontWeight: 800 }}>
                      {tool.title}
                    </h3>

                    {/* Description - Ultra-thin weight */}
                    <p className={cn(
                      'text-zinc-500 leading-relaxed',
                      isLarge ? 'text-base md:text-lg' : size === 'medium' ? 'text-sm md:text-base' : 'text-sm',
                      'font-light tracking-wide',
                      'group-hover:text-zinc-400 transition-colors duration-500'
                    )}>
                      {tool.description}
                    </p>

                    {/* Arrow indicator */}
                    {tool.available && (
                      <div className="absolute top-6 right-6 md:top-8 md:right-8">
                        <ArrowUpRight className={cn(
                          'w-5 h-5 md:w-6 md:h-6 text-white/20 group-hover:text-white/40 transition-all duration-500',
                          'group-hover:translate-x-1 group-hover:-translate-y-1'
                        )} />
                      </div>
                    )}

                    {/* Status badge */}
                    {!tool.available && tool.status === 'soon' && (
                      <div className="absolute top-6 right-6 md:top-8 md:right-8">
                        <span className="text-[10px] uppercase tracking-widest font-light px-3 py-1.5 rounded-full border border-white/5 bg-white/2 text-zinc-500">
                          In Kürze
                        </span>
                      </div>
                    )}
                  </>
                );

                return tool.available ? (
                  <Link key={tool.id} href={tool.href} className={bubbleClassName}>
                    {content}
                  </Link>
                ) : (
                  <div key={tool.id} className={bubbleClassName}>
                    {content}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-32">
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
