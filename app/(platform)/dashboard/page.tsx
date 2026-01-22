'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Mail,
  Languages,
  Sparkles,
  Scale,
  FileText,
  Table2,
  MessageCircleWarning,
  MessageSquare,
  FileInput,
  Terminal,
  ChefHat,
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
    href: '/actions/legal',
    available: true,
  },
  {
    id: 'excel',
    title: 'Excel-Coach',
    description: 'Formeln verstehen, erstellen und Daten blitzschnell analysieren.',
    icon: Table2,
    color: 'green',
    category: 'business',
    href: '/actions/excel',
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
    title: 'Konflikt-Lotse',
    description: 'Löse Streitigkeiten und antworte souverän auf schwierige Nachrichten.',
    icon: MessageCircleWarning,
    color: 'rose',
    category: 'communication',
    href: '/actions/tough-msg',
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
    title: 'Gourmet-Planer',
    description: 'Was koche ich heute? Leckere Rezepte basierend auf deinem Vorrat.',
    icon: ChefHat,
    color: 'orange',
    category: 'lifestyle',
    href: '/actions/recipe',
    available: false,
    status: 'soon',
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
  { id: 'excel', title: 'Excel-Coach', icon: Table2, color: 'green', href: '/actions/excel' },
  { id: 'summarize', title: 'Klartext', icon: FileInput, color: 'amber', href: '/actions/summarize' },
  { id: 'legal', title: 'Rechtstexte', icon: Scale, color: 'violet', href: '/actions/legal' },
];

const colorMap: Record<string, { bg: string; border: string; hoverBorder: string; hoverShadow: string }> = {
  blue: { bg: 'bg-blue-950/30', border: 'border-blue-500/10', hoverBorder: 'hover:border-blue-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.3)]' },
  indigo: { bg: 'bg-indigo-950/30', border: 'border-indigo-500/10', hoverBorder: 'hover:border-indigo-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(99,102,241,0.3)]' },
  rose: { bg: 'bg-rose-950/30', border: 'border-rose-500/10', hoverBorder: 'hover:border-rose-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(244,63,94,0.3)]' },
  violet: { bg: 'bg-violet-950/30', border: 'border-violet-500/10', hoverBorder: 'hover:border-violet-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(139,92,246,0.3)]' },
  green: { bg: 'bg-green-950/30', border: 'border-green-500/10', hoverBorder: 'hover:border-green-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(34,197,94,0.3)]' },
  slate: { bg: 'bg-slate-950/30', border: 'border-slate-500/10', hoverBorder: 'hover:border-slate-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(100,116,139,0.3)]' },
  emerald: { bg: 'bg-emerald-950/30', border: 'border-emerald-500/10', hoverBorder: 'hover:border-emerald-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(16,185,129,0.3)]' },
  cyan: { bg: 'bg-cyan-950/30', border: 'border-cyan-500/10', hoverBorder: 'hover:border-cyan-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(6,182,212,0.3)]' },
  amber: { bg: 'bg-amber-950/30', border: 'border-amber-500/10', hoverBorder: 'hover:border-amber-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(245,158,11,0.3)]' },
  orange: { bg: 'bg-orange-950/30', border: 'border-orange-500/10', hoverBorder: 'hover:border-orange-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(249,115,22,0.3)]' },
  pink: { bg: 'bg-pink-950/30', border: 'border-pink-500/10', hoverBorder: 'hover:border-pink-500/30', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(236,72,153,0.3)]' },
  gray: { bg: 'bg-zinc-900/40', border: 'border-white/5', hoverBorder: 'hover:border-white/20', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(255,255,255,0.1)]' },
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

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof categoryTabs)[number]>('Alle');

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
    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-0">
      <div className="mb-4 sm:mb-6 md:mb-8 lg:mb-12">
        <h1
          className="text-lg sm:text-xl md:text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
        >
          Willkommen zurück. 👋
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-zinc-400 mt-0.5 sm:mt-1 md:mt-2 tracking-wide">
          Welches Tool soll dir heute helfen?
        </p>
      </div>

      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Suche nach Tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl sm:rounded-2xl border border-white/10 bg-zinc-900/50 pl-9 sm:pl-12 pr-4 py-2.5 sm:py-3.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all min-h-[44px] tracking-wide"
          />
        </div>
      </div>

      <div className="mb-4 md:hidden">
        <div className="overflow-x-auto scrollbar-hide pb-2">
          <div className="flex gap-3 min-w-max">
            {quickAccessTools.map((quickTool) => {
              const QuickIcon = quickTool.icon;
              const quickColors = colorClasses[quickTool.color] || colorClasses.blue;
              return (
                <Link
                  key={quickTool.id}
                  href={quickTool.href}
                  className="shrink-0 flex flex-col items-center group"
                >
                  <div
                    className={`w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shadow-lg transition-all group-active:scale-95 ${quickColors.hoverBorder}`}
                  >
                    <QuickIcon className={`w-6 h-6 ${quickColors.text}`} />
                  </div>
                  <span className="text-[10px] text-zinc-400 text-center mt-1 truncate max-w-[64px] group-hover:text-zinc-300 transition-colors">
                    {quickTool.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-4 sm:mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {categoryTabs.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[32px] sm:min-h-[36px] tracking-wide ${
                selectedCategory === cat
                  ? 'bg-gradient-to-r from-teal-500/20 to-indigo-500/20 text-white border border-teal-500/30 shadow-lg shadow-teal-500/10'
                  : 'bg-zinc-900/50 text-zinc-400 border border-white/5 hover:bg-zinc-800/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            const iconColors = colorClasses[tool.color] || colorClasses.blue;
            const cardColors = colorMap[tool.color] || colorMap.gray;
            const glowClass = glowColorMap[tool.color] || 'bg-zinc-500';

            const cardClassName = cn(
              'group relative flex flex-col h-full min-h-[180px] p-5 rounded-2xl border backdrop-blur-xl overflow-hidden transform-gpu backface-hidden',
              'transition-all duration-300 ease-out hover:-translate-y-2',
              cardColors.bg,
              cardColors.border,
              cardColors.hoverBorder,
              cardColors.hoverShadow,
              tool.available ? 'cursor-pointer' : 'opacity-75 cursor-not-allowed'
            );

            const cardContent = (
              <>
                <div className="absolute -inset-px bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <div className={iconColors.text}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  {tool.available ? (
                    <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-white transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 shrink-0" />
                  ) : tool.status === 'soon' ? (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border border-zinc-600 bg-zinc-800/80 text-zinc-400 shrink-0">
                      In Kürze
                    </span>
                  ) : null}
                </div>

                <h3
                  className="font-bold text-lg text-white mb-2 relative z-10"
                  style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
                >
                  {tool.title}
                </h3>

                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 relative z-10 flex-1">
                  {tool.description}
                </p>

                <div
                  className={cn(
                    'absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-15 pointer-events-none',
                    'transition-all duration-500 group-hover:scale-125 group-hover:opacity-30',
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
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto mb-4 text-zinc-600 opacity-50" />
          <p className="text-zinc-400 tracking-wide">Keine Tools gefunden.</p>
          <p className="text-sm text-zinc-500 mt-1 tracking-wide">
            Versuche eine andere Suche oder Kategorie.
          </p>
        </div>
      )}
    </div>
  );
}
