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
    title: 'E-Mail Verfasser',
    description: 'Erstelle professionelle E-Mails aus Stichpunkten.',
    icon: Mail,
    color: 'blue',
    category: 'KOMMUNIKATION',
    href: '/actions/email',
    available: true,
  },
  {
    id: 'translate',
    title: 'Kontext Übersetzer',
    description: 'Übersetze Texte mit Kontext und natürlichen Formulierungen.',
    icon: Languages,
    color: 'indigo',
    category: 'KOMMUNIKATION',
    href: '/actions/translate',
    available: true,
  },
  {
    id: 'polish',
    title: 'Text Aufpolierer',
    description: 'Verbessere Texte: professioneller, klarer, überzeugender.',
    icon: Sparkles,
    color: 'sky',
    category: 'KOMMUNIKATION',
    href: '/actions/polish',
    available: true,
  },
  {
    id: 'tough-msg',
    title: 'Schwierige Nachrichten',
    description: 'Formuliere schwierige Botschaften empathisch und klar.',
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
    description: 'Assistent für juristische Formulierungen und Erklärungen.',
    icon: Scale,
    color: 'purple',
    category: 'BUSINESS',
    href: '/actions/legal',
    available: true,
  },
  {
    id: 'excel',
    title: 'Excel Retter',
    description: 'Beschreibe dein Problem, ich gebe dir die fertige Formel.',
    icon: Calculator,
    color: 'green',
    category: 'BUSINESS',
    href: '/actions/excel',
    available: true,
  },
  {
    id: 'job-desc',
    title: 'Job-Beschreibung',
    description: 'Erstelle professionelle Stellenausschreibungen.',
    icon: Briefcase,
    color: 'slate',
    category: 'BUSINESS',
    href: '/actions/job-desc',
    available: true,
  },
  {
    id: 'invoice',
    title: 'Rechnungs-Posten',
    description: 'Formuliere Rechnungspositionen und Beschreibungen.',
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
    description: 'Kopiere langen Text und erhalte das Wichtigste.',
    icon: FileText,
    color: 'teal',
    category: 'WISSEN',
    href: '/actions/summarize',
    available: true,
  },
  {
    id: 'explain-5',
    title: 'Erklär\'s mir wie 5',
    description: 'Komplexe Themen einfach erklärt, als wäre ich 5 Jahre alt.',
    icon: HelpCircle,
    color: 'orange',
    category: 'WISSEN',
    href: '/actions/explain-5',
    available: false,
  },
  {
    id: 'pro-con',
    title: 'Pro & Contra',
    description: 'Erstelle Pro- und Contra-Listen zu jedem Thema.',
    icon: ThumbsUp,
    color: 'amber',
    category: 'WISSEN',
    href: '/actions/pro-con',
    available: false,
  },
  {
    id: 'research',
    title: 'Recherche Assistent',
    description: 'Finde Fakten und Quellen zu einem Thema.',
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
    description: 'Erstelle professionelle LinkedIn-Beiträge für dein Netzwerk.',
    icon: Linkedin,
    color: 'blue',
    category: 'SOCIAL',
    href: '/actions/linkedin',
    available: false,
  },
  {
    id: 'instagram',
    title: 'Instagram Caption',
    description: 'Schreibe kreative und ansprechende Instagram-Beschriftungen.',
    icon: Instagram,
    color: 'pink',
    category: 'SOCIAL',
    href: '/actions/instagram',
    available: false,
  },
  {
    id: 'video',
    title: 'Video Skript',
    description: 'Erstelle strukturierte Video-Skripte für Social Media.',
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
    description: 'Analysiere und korrigiere Code-Fehler automatisch.',
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

  const colorClasses: Record<string, { text: string; bg: string; border: string; hoverBorder: string; hoverShadow: string }> = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', hoverBorder: 'group-hover:border-blue-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-blue-500/10' },
    indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', hoverBorder: 'group-hover:border-indigo-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-indigo-500/10' },
    sky: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', hoverBorder: 'group-hover:border-sky-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-sky-500/10' },
    rose: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', hoverBorder: 'group-hover:border-rose-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-rose-500/10' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', hoverBorder: 'group-hover:border-purple-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-purple-500/10' },
    green: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', hoverBorder: 'group-hover:border-green-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-green-500/10' },
    slate: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', hoverBorder: 'group-hover:border-slate-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-slate-500/10' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', hoverBorder: 'group-hover:border-emerald-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-emerald-500/10' },
    teal: { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', hoverBorder: 'group-hover:border-teal-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-teal-500/10' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', hoverBorder: 'group-hover:border-orange-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-orange-500/10' },
    amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', hoverBorder: 'group-hover:border-amber-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-amber-500/10' },
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', hoverBorder: 'group-hover:border-yellow-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-yellow-500/10' },
    pink: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', hoverBorder: 'group-hover:border-pink-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-pink-500/10' },
    red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', hoverBorder: 'group-hover:border-red-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-red-500/10' },
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', hoverBorder: 'group-hover:border-cyan-500/30', hoverShadow: 'group-hover:shadow-lg group-hover:shadow-cyan-500/10' },
  };

  return (
    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pb-8">
      {/* HEADER */}
      <div className="mb-6 sm:mb-8 md:mb-12">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Guten Tag.
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-1 sm:mt-2">
          Was möchtest du heute erledigen?
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
            className="w-full rounded-2xl border border-white/10 bg-zinc-900/50 px-12 py-3.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all min-h-[44px]"
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
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap min-h-[36px] ${
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
            const cardClassName = `group relative rounded-xl border border-white/5 bg-zinc-900/40 backdrop-blur-sm ${colors.hoverBorder} ${colors.hoverShadow} transition-all duration-300 hover:-translate-y-1 p-6 ${tool.available ? 'cursor-pointer' : 'opacity-75 cursor-not-allowed'}`;

            const cardContent = (
              <div className="flex flex-col h-full">
                {/* ICON CONTAINER */}
                <div className={`flex-shrink-0 h-12 w-12 rounded-2xl ${colors.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
                
                {/* CONTENT */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="font-semibold text-lg text-zinc-100 group-hover:text-white mb-2 flex items-center gap-2">
                    {tool.title}
                    {!tool.available && (
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/5">
                        In Kürze verfügbar
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2 mb-4 flex-1">
                    {tool.description}
                  </p>
                  
                  {/* "ÖFFNEN" LINK */}
                  {tool.available && (
                    <div className="flex justify-end mt-auto pt-2">
                      <span className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300 flex items-center gap-1 transition-all">
                        Öffnen
                        <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
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
          <p className="text-zinc-400">Keine Tools gefunden.</p>
          <p className="text-sm text-zinc-500 mt-1">Versuche eine andere Suche oder Kategorie.</p>
        </div>
      )}
    </div>
  );
}
