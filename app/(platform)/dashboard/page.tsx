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
    available: false,
  },
  {
    id: 'tough-msg',
    title: 'Schwierige Nachrichten',
    description: 'Formuliere schwierige Botschaften empathisch und klar.',
    icon: MessageSquare,
    color: 'rose',
    category: 'KOMMUNIKATION',
    href: '/actions/tough-msg',
    available: false,
  },
  
  // BUSINESS
  {
    id: 'legal',
    title: 'Rechtstexte',
    description: 'Formuliere Verträge und rechtliche Dokumente präzise.',
    icon: Scale,
    color: 'purple',
    category: 'BUSINESS',
    href: '/actions/legal',
    available: false,
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
    available: false,
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

  const colorClasses: Record<string, { text: string; bg: string; border: string }> = {
    blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    sky: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    rose: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
    purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    green: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    slate: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    teal: { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    yellow: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    pink: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
    red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
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
            className="w-full rounded-lg border border-white/10 bg-zinc-900/50 px-12 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 transition-all min-h-[44px]"
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
                  ? 'bg-white text-black'
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
            const cardClassName = `relative rounded-xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl hover:border-white/10 transition-all hover:-translate-y-1 p-6 ${tool.available ? '' : 'opacity-75 cursor-not-allowed'}`;

            const cardContent = (
              <div className="flex items-start gap-4">
                {/* ICON */}
                <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${colors.bg} ${colors.border} border flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${colors.text}`} />
                </div>
                
                {/* CONTENT */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                    {tool.title}
                    {!tool.available && (
                      <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/5">
                        In Kürze verfügbar
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">
                    {tool.description}
                  </p>
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
