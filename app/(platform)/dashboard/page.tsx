'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Mail, Languages, Sparkles, MessageSquare, 
  Scale, Calculator, Briefcase, Receipt,
  FileText, HelpCircle, ThumbsUp, Search as SearchIcon,
  Linkedin, Instagram, Video,
  Code2, Search
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
    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pb-8">
      {/* HEADER */}
      <div className="mb-6 sm:mb-8 md:mb-12">
        <h1 className="text-xl sm:text-2xl font-bold text-white" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
          Willkommen zurück. 👋
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-1 sm:mt-2 tracking-wide">
          Welches Tool soll dir heute helfen?
        </p>
      </div>

      {/* SUCHLEISTE */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Suche nach Tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-zinc-900/50 px-12 py-3.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all min-h-[44px] tracking-wide"
          />
        </div>
      </div>

      {/* KATEGORIE-TABS */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap min-h-[36px] tracking-wide ${
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

      {/* TOOLS GRID */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            const colors = colorClasses[tool.color] || colorClasses.blue;
            // Spotlight Card Effect - Milchglas mit innerem Glow
            const cardClassName = `group relative overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl ${colors.hoverBorder} transition-all duration-500 ease-out hover:-translate-y-1 p-6 ${tool.available ? 'cursor-pointer' : 'opacity-75 cursor-not-allowed'}`;

            const cardContent = (
              <div className="flex flex-col h-full relative z-10">
                {/* Inner Glow - Radial Gradient von oben */}
                <div className="absolute -inset-px bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none" />
                
                {/* ICON CONTAINER - Mit Leuchteffekt */}
                <div className={`flex-shrink-0 h-12 w-12 rounded-2xl ${colors.bg} ${colors.bgHover} flex items-center justify-center mb-4 transition-all duration-500 group-hover:bg-opacity-80`}>
                  <div className={`${colors.text} group-hover:drop-shadow-[0_0_12px_currentColor] transition-all duration-500`}>
                    <Icon className={`w-6 h-6 group-hover:scale-110 transition-transform duration-500`} />
                  </div>
                </div>
                
                {/* CONTENT */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="font-bold text-xl text-zinc-100 group-hover:text-white mb-2 flex items-center gap-2 tracking-tight" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>
                    {tool.title}
                    {!tool.available && (
                      <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500">
                        In Kürze verfügbar
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2 mb-4 flex-1 tracking-wide">
                    {tool.description}
                  </p>
                  
                  {/* "ÖFFNEN" LINK */}
                  {tool.available && (
                    <div className="flex justify-end mt-auto pt-2">
                      <span className="text-xs font-medium text-zinc-400 group-hover:text-white flex items-center gap-1 transition-all tracking-wide">
                        Öffnen
                        <span className="group-hover:translate-x-1 transition-transform duration-500">→</span>
                      </span>
                    </div>
                  )}
                </div>
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
