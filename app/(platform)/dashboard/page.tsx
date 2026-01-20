'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Mail, Languages, Sparkles, MessageSquare, 
  Scale, Calculator, Briefcase, Receipt,
  FileText, HelpCircle, ThumbsUp, Search as SearchIcon,
  Linkedin, Instagram, Video,
  Code2, Search, ArrowUpRight
} from 'lucide-react';

type Tool = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string; // Tailwind color class for icon and glow
  category: string;
  href: string;
  available: boolean; // true if the tool exists, false if "In Kürze verfügbar"
};

const allTools: Tool[] = [
  // KOMMUNIKATION
  {
    id: 'email',
    title: 'E-Mail Profi',
    description: 'Perfekte Mails in Sekunden: Von höflich bis bestimmt.',
    icon: Mail,
    color: 'blue',
    category: 'KOMMUNIKATION',
    href: '/actions/email',
    available: true,
  },
  {
    id: 'translate',
    title: 'Kontext Übersetzer',
    description: 'Übersetzen mit Nuance: Slang, Business oder Native Speaker.',
    icon: Languages,
    color: 'indigo',
    category: 'KOMMUNIKATION',
    href: '/actions/translate',
    available: true,
  },
  {
    id: 'polish',
    title: 'Text Veredler',
    description: 'Mach deinen Entwurf zu Gold: Grammatik, Stil & Eloquenz.',
    icon: Sparkles,
    color: 'sky',
    category: 'KOMMUNIKATION',
    href: '/actions/polish',
    available: true,
  },
  {
    id: 'tough-msg',
    title: 'Schwierige Nachrichten',
    description: 'Konflikte lösen: Absagen und Kritik professionell verpacken.',
    icon: MessageSquare,
    color: 'rose',
    category: 'KOMMUNIKATION',
    href: '/actions/tough-msg',
    available: true,
  },
  
  // BUSINESS
  {
    id: 'legal',
    title: 'Rechtstexte & Formales',
    description: 'Sichere Formulierungen für Verträge, Mahnungen & Kündigungen.',
    icon: Scale,
    color: 'purple',
    category: 'BUSINESS',
    href: '/actions/legal',
    available: true,
  },
  {
    id: 'excel',
    title: 'Excel Retter',
    description: 'Formeln & Fixes: Dein Experte für Excel und Google Sheets.',
    icon: Calculator,
    color: 'green',
    category: 'BUSINESS',
    href: '/actions/excel',
    available: true,
  },
  {
    id: 'job-desc',
    title: 'Stellenanzeigen',
    description: 'Attraktive Job-Texte, die Top-Talente anziehen.',
    icon: Briefcase,
    color: 'slate',
    category: 'BUSINESS',
    href: '/actions/job-desc',
    available: true,
  },
  {
    id: 'invoice',
    title: 'Angebot & Rechnung',
    description: 'Leistungsbeschreibungen, die Kunden gerne bezahlen.',
    icon: Receipt,
    color: 'emerald',
    category: 'BUSINESS',
    href: '/actions/invoice',
    available: false,
  },
  
  // WISSEN
  {
    id: 'summarize',
    title: 'Text Zusammenfasser',
    description: 'Lange Texte in Sekunden verstehen. Kernaussagen auf den Punkt.',
    icon: FileText,
    color: 'teal',
    category: 'WISSEN',
    href: '/actions/summarize',
    available: true,
  },
  {
    id: 'explain-5',
    title: 'Der Vereinfacher',
    description: 'Komplexe Themen (Krypto, Physik) kinderleicht erklärt.',
    icon: HelpCircle,
    color: 'orange',
    category: 'WISSEN',
    href: '/actions/explain-5',
    available: false,
  },
  {
    id: 'pro-con',
    title: 'Entscheidungs-Hilfe',
    description: 'Qual der Wahl? Eine objektive Pro- & Contra-Analyse.',
    icon: ThumbsUp,
    color: 'amber',
    category: 'WISSEN',
    href: '/actions/pro-con',
    available: false,
  },
  {
    id: 'research',
    title: 'Recherche Assistent',
    description: 'Fakten-Check und Hintergründe zu jedem Thema.',
    icon: SearchIcon,
    color: 'yellow',
    category: 'WISSEN',
    href: '/actions/research',
    available: false,
  },
  
  // SOCIAL
  {
    id: 'linkedin',
    title: 'LinkedIn Viral',
    description: 'Posts, die auffallen und Engagement erzeugen.',
    icon: Linkedin,
    color: 'blue',
    category: 'SOCIAL',
    href: '/actions/linkedin',
    available: false,
  },
  {
    id: 'instagram',
    title: 'Instagram Caption',
    description: 'Die perfekte Bildunterschrift inkl. Hashtags.',
    icon: Instagram,
    color: 'pink',
    category: 'SOCIAL',
    href: '/actions/instagram',
    available: false,
  },
  {
    id: 'video',
    title: 'Video Skript',
    description: 'Strukturierte Skripte für TikTok, Reels & Shorts.',
    icon: Video,
    color: 'red',
    category: 'SOCIAL',
    href: '/actions/video',
    available: false,
  },
  
  // DEV
  {
    id: 'code',
    title: 'Code Fixer',
    description: 'Debugge deinen Code und finde Fehler sofort.',
    icon: Code2,
    color: 'cyan',
    category: 'DEV',
    href: '/actions/code',
    available: false,
  },
];

const categories = ['Alle', 'KOMMUNIKATION', 'BUSINESS', 'WISSEN', 'SOCIAL', 'DEV'];

// Beliebte Tools für Schnellzugriff (Mobile)
const quickAccessTools = [
  { id: 'email', title: 'E-Mail', icon: Mail, color: 'blue', href: '/actions/email' },
  { id: 'chat', title: 'Chat', icon: MessageSquare, color: 'indigo', href: '/chat' },
  { id: 'excel', title: 'Excel', icon: Calculator, color: 'green', href: '/actions/excel' },
  { id: 'summarize', title: 'Zusammenfassen', icon: FileText, color: 'teal', href: '/actions/summarize' },
  { id: 'legal', title: 'Rechtstexte', icon: Scale, color: 'purple', href: '/actions/legal' },
];

// Color Mapping für Card-Hintergründe (subtiler Tint im Dark Mode)
const colorMap: Record<string, { bg: string; border: string; hoverBorder: string; hoverShadow: string }> = {
  blue: { bg: 'bg-blue-950/30', border: 'border-blue-500/10', hoverBorder: 'hover:border-blue-500/30', hoverShadow: 'hover:shadow-blue-500/10' },
  indigo: { bg: 'bg-indigo-950/30', border: 'border-indigo-500/10', hoverBorder: 'hover:border-indigo-500/30', hoverShadow: 'hover:shadow-indigo-500/10' },
  sky: { bg: 'bg-sky-950/30', border: 'border-sky-500/10', hoverBorder: 'hover:border-sky-500/30', hoverShadow: 'hover:shadow-sky-500/10' },
  rose: { bg: 'bg-rose-950/30', border: 'border-rose-500/10', hoverBorder: 'hover:border-rose-500/30', hoverShadow: 'hover:shadow-rose-500/10' },
  purple: { bg: 'bg-purple-950/30', border: 'border-purple-500/10', hoverBorder: 'hover:border-purple-500/30', hoverShadow: 'hover:shadow-purple-500/10' },
  violet: { bg: 'bg-violet-950/30', border: 'border-violet-500/10', hoverBorder: 'hover:border-violet-500/30', hoverShadow: 'hover:shadow-violet-500/10' },
  green: { bg: 'bg-green-950/30', border: 'border-green-500/10', hoverBorder: 'hover:border-green-500/30', hoverShadow: 'hover:shadow-green-500/10' },
  slate: { bg: 'bg-slate-950/30', border: 'border-slate-500/10', hoverBorder: 'hover:border-slate-500/30', hoverShadow: 'hover:shadow-slate-500/10' },
  emerald: { bg: 'bg-emerald-950/30', border: 'border-emerald-500/10', hoverBorder: 'hover:border-emerald-500/30', hoverShadow: 'hover:shadow-emerald-500/10' },
  teal: { bg: 'bg-teal-950/30', border: 'border-teal-500/10', hoverBorder: 'hover:border-teal-500/30', hoverShadow: 'hover:shadow-teal-500/10' },
  orange: { bg: 'bg-orange-950/30', border: 'border-orange-500/10', hoverBorder: 'hover:border-orange-500/30', hoverShadow: 'hover:shadow-orange-500/10' },
  amber: { bg: 'bg-amber-950/30', border: 'border-amber-500/10', hoverBorder: 'hover:border-amber-500/30', hoverShadow: 'hover:shadow-amber-500/10' },
  yellow: { bg: 'bg-yellow-950/30', border: 'border-yellow-500/10', hoverBorder: 'hover:border-yellow-500/30', hoverShadow: 'hover:shadow-yellow-500/10' },
  pink: { bg: 'bg-pink-950/30', border: 'border-pink-500/10', hoverBorder: 'hover:border-pink-500/30', hoverShadow: 'hover:shadow-pink-500/10' },
  red: { bg: 'bg-red-950/30', border: 'border-red-500/10', hoverBorder: 'hover:border-red-500/30', hoverShadow: 'hover:shadow-red-500/10' },
  cyan: { bg: 'bg-cyan-950/30', border: 'border-cyan-500/10', hoverBorder: 'hover:border-cyan-500/30', hoverShadow: 'hover:shadow-cyan-500/10' },
  // Fallback
  gray: { bg: 'bg-zinc-900/40', border: 'border-white/5', hoverBorder: 'hover:border-white/20', hoverShadow: 'hover:shadow-white/5' },
};

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Alle');

  // Filter-Logik
  const filteredTools = useMemo(() => {
    let filtered = allTools;

    // Filter nach Kategorie
    if (selectedCategory !== 'Alle') {
      filtered = filtered.filter(tool => tool.category === selectedCategory);
    }

    // Filter nach Suchtext
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        tool => 
          tool.title.toLowerCase().includes(query) ||
          tool.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [selectedCategory, searchQuery]);

  const colorClasses: Record<string, { text: string; bg: string; bgHover: string; border: string; hoverBorder: string; hoverShadow: string }> = {
    blue: { text: 'text-blue-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-blue-500/20', border: 'border-blue-500/20', hoverBorder: 'group-hover:border-blue-500/50', hoverShadow: 'group-hover:shadow-[color]-500/20' },
    indigo: { text: 'text-indigo-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-indigo-500/20', border: 'border-indigo-500/20', hoverBorder: 'group-hover:border-indigo-500/50', hoverShadow: 'group-hover:shadow-indigo-500/20' },
    sky: { text: 'text-sky-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-sky-500/20', border: 'border-sky-500/20', hoverBorder: 'group-hover:border-sky-500/50', hoverShadow: 'group-hover:shadow-sky-500/20' },
    rose: { text: 'text-rose-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-rose-500/20', border: 'border-rose-500/20', hoverBorder: 'group-hover:border-rose-500/50', hoverShadow: 'group-hover:shadow-rose-500/20' },
    purple: { text: 'text-purple-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-purple-500/20', border: 'border-purple-500/20', hoverBorder: 'group-hover:border-purple-500/50', hoverShadow: 'group-hover:shadow-purple-500/20' },
    green: { text: 'text-green-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-green-500/20', border: 'border-green-500/20', hoverBorder: 'group-hover:border-green-500/50', hoverShadow: 'group-hover:shadow-green-500/20' },
    slate: { text: 'text-slate-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-slate-500/20', border: 'border-slate-500/20', hoverBorder: 'group-hover:border-slate-500/50', hoverShadow: 'group-hover:shadow-slate-500/20' },
    emerald: { text: 'text-emerald-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-emerald-500/20', border: 'border-emerald-500/20', hoverBorder: 'group-hover:border-emerald-500/50', hoverShadow: 'group-hover:shadow-emerald-500/20' },
    teal: { text: 'text-teal-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-teal-500/20', border: 'border-teal-500/20', hoverBorder: 'group-hover:border-teal-500/50', hoverShadow: 'group-hover:shadow-teal-500/20' },
    orange: { text: 'text-orange-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-orange-500/20', border: 'border-orange-500/20', hoverBorder: 'group-hover:border-orange-500/50', hoverShadow: 'group-hover:shadow-orange-500/20' },
    amber: { text: 'text-amber-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-amber-500/20', border: 'border-amber-500/20', hoverBorder: 'group-hover:border-amber-500/50', hoverShadow: 'group-hover:shadow-amber-500/20' },
    yellow: { text: 'text-yellow-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-yellow-500/20', border: 'border-yellow-500/20', hoverBorder: 'group-hover:border-yellow-500/50', hoverShadow: 'group-hover:shadow-yellow-500/20' },
    pink: { text: 'text-pink-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-pink-500/20', border: 'border-pink-500/20', hoverBorder: 'group-hover:border-pink-500/50', hoverShadow: 'group-hover:shadow-pink-500/20' },
    red: { text: 'text-red-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-red-500/20', border: 'border-red-500/20', hoverBorder: 'group-hover:border-red-500/50', hoverShadow: 'group-hover:shadow-red-500/20' },
    cyan: { text: 'text-cyan-400', bg: 'bg-zinc-800/50', bgHover: 'group-hover:bg-cyan-500/20', border: 'border-cyan-500/20', hoverBorder: 'group-hover:border-cyan-500/50', hoverShadow: 'group-hover:shadow-cyan-500/20' },
  };

  return (
    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-0">
      {/* HEADER - Kompakter auf Mobile */}
      <div className="mb-4 sm:mb-6 md:mb-8 lg:mb-12">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
          Willkommen zurück. 👋
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-zinc-400 mt-0.5 sm:mt-1 md:mt-2 tracking-wide">
          Welches Tool soll dir heute helfen?
        </p>
      </div>

      {/* SUCHLEISTE - Reduziertes Padding auf Mobile */}
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

      {/* SCHNELLZUGRIFF - Nur Mobile */}
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
                  <div className={`w-16 h-16 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center shadow-lg transition-all group-active:scale-95 ${quickColors.hoverBorder}`}>
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

      {/* KATEGORIE-TABS - Kleiner auf Mobile */}
      <div className="mb-4 sm:mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[32px] sm:min-h-[36px] tracking-wide ${
                selectedCategory === category
                  ? 'bg-gradient-to-r from-teal-500/20 to-indigo-500/20 text-white border border-teal-500/30 shadow-lg shadow-teal-500/10'
                  : 'bg-zinc-900/50 text-zinc-400 border border-white/5 hover:bg-zinc-800/50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* TOOLS GRID - Mobile: 2 Spalten, Desktop: Magazine Style */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            const iconColors = colorClasses[tool.color] || colorClasses.blue;
            // Card-Farben (subtiler Tint im Dark Mode)
            const cardColors = colorMap[tool.color as keyof typeof colorMap] || colorMap.gray;
            // Magazine Style Card - Einheitlich auf allen Geräten
            const cardClassName = `group relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-lg p-4 aspect-square ${cardColors.bg} ${cardColors.border} ${cardColors.hoverBorder} ${cardColors.hoverShadow} ${tool.available ? 'cursor-pointer' : 'opacity-75 cursor-not-allowed'}`;

            // Farb-Klasse für Glow-Element (nutze die Tool-Farbe)
            const glowColorClass = tool.color === 'blue' ? 'bg-blue-500' :
                                  tool.color === 'green' ? 'bg-green-500' :
                                  tool.color === 'indigo' ? 'bg-indigo-500' :
                                  tool.color === 'purple' ? 'bg-purple-500' :
                                  tool.color === 'violet' ? 'bg-violet-500' :
                                  tool.color === 'sky' ? 'bg-sky-500' :
                                  tool.color === 'rose' ? 'bg-rose-500' :
                                  tool.color === 'slate' ? 'bg-slate-500' :
                                  tool.color === 'emerald' ? 'bg-emerald-500' :
                                  tool.color === 'teal' ? 'bg-teal-500' :
                                  tool.color === 'orange' ? 'bg-orange-500' :
                                  tool.color === 'amber' ? 'bg-amber-500' :
                                  tool.color === 'yellow' ? 'bg-yellow-500' :
                                  tool.color === 'pink' ? 'bg-pink-500' :
                                  tool.color === 'red' ? 'bg-red-500' :
                                  tool.color === 'cyan' ? 'bg-cyan-500' :
                                  'bg-zinc-500';

            const cardContent = (
              <div className="flex flex-col justify-between h-full relative z-10 min-h-[128px]">
                {/* Inner Glow - Radial Gradient von oben */}
                <div className="absolute -inset-px bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />
                
                {/* OBEN: Icon (links) + Arrow (rechts) */}
                <div className="flex items-start justify-between mb-2">
                  {/* ICON CONTAINER - Oben links */}
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center transition-all duration-500 group-hover:bg-white/15 shrink-0">
                    <div className={`${iconColors.text} group-hover:drop-shadow-[0_0_12px_currentColor] transition-all duration-500`}>
                      <Icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-500" />
                    </div>
                  </div>
                  
                  {/* ARROW ICON - Oben rechts (immer sichtbar) */}
                  {tool.available && (
                    <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors shrink-0" />
                  )}
                </div>
                
                {/* BESCHREIBUNG - Desktop Hover Reveal */}
                {tool.description && (
                  <div className="absolute bottom-16 left-0 right-0 px-4 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 pointer-events-none z-20">
                    <p className="text-xs text-zinc-300 line-clamp-2 bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/5">
                      {tool.description}
                    </p>
                  </div>
                )}
                
                {/* UNTEN: Titel */}
                <div className="mt-auto relative z-10">
                  <h3 className="font-bold text-lg text-white leading-tight tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
                    {tool.title}
                    {!tool.available && (
                      <span className="hidden sm:inline text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500 ml-1.5">
                        In Kürze
                      </span>
                    )}
                  </h3>
                </div>
                
                {/* DEKORATIVER GLOW - Unten rechts (immer sichtbar) */}
                <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 ${glowColorClass} pointer-events-none`} />
              </div>
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
          <p className="text-sm text-zinc-500 mt-1 tracking-wide">Versuche eine andere Suche oder Kategorie.</p>
        </div>
      )}
    </div>
  );
}
