'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DashboardGreetingClient } from '@/components/platform/dashboard-greeting-client';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { WorkspaceSwitcherModal } from '@/components/platform/workspace-switcher-modal';
import { getWorkspaceResults } from '@/actions/workspace-actions';
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
  ArrowRight,
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
    title: 'Gourmet-Planer',
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

const toolIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  invoice: FileText,
  legal: Scale,
  excel: Table2,
  recipe: ChefHat,
  fitness: Dumbbell,
  travel: Plane,
  polish: Sparkles,
  translate: Languages,
  'tough-msg': MessageCircleHeart,
  'job-desc': FileText,
  summarize: FileText,
};

const colorMap: Record<string, { bg: string; border: string; hoverBorder: string; hoverShadow: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-500/10', hoverBorder: 'hover:border-blue-300 dark:hover:border-blue-500/30', hoverShadow: 'hover:shadow-blue-500/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(59,130,246,0.4)]' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', border: 'border-indigo-200 dark:border-indigo-500/10', hoverBorder: 'hover:border-indigo-300 dark:hover:border-indigo-500/30', hoverShadow: 'hover:shadow-indigo-500/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(99,102,241,0.4)]' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-200 dark:border-rose-500/10', hoverBorder: 'hover:border-rose-300 dark:hover:border-rose-500/30', hoverShadow: 'hover:shadow-rose-500/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(244,63,94,0.4)]' },
  violet: { bg: 'bg-violet-50 dark:bg-violet-950/30', border: 'border-violet-200 dark:border-violet-500/10', hoverBorder: 'hover:border-violet-300 dark:hover:border-violet-500/30', hoverShadow: 'hover:shadow-violet-500/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(139,92,246,0.4)]' },
  green: { bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-500/10', hoverBorder: 'hover:border-green-300 dark:hover:border-green-500/30', hoverShadow: 'hover:shadow-green-500/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(34,197,94,0.4)]' },
  slate: { bg: 'bg-slate-50 dark:bg-slate-950/30', border: 'border-slate-200 dark:border-slate-500/10', hoverBorder: 'hover:border-slate-300 dark:hover:border-slate-500/30', hoverShadow: 'hover:shadow-slate-500/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(100,116,139,0.4)]' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-500/10', hoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-500/30', hoverShadow: 'hover:shadow-emerald-500/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(16,185,129,0.4)]' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', border: 'border-cyan-200 dark:border-cyan-500/10', hoverBorder: 'hover:border-cyan-300 dark:hover:border-cyan-500/30', hoverShadow: 'hover:shadow-cyan-500/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(6,182,212,0.4)]' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-500/10', hoverBorder: 'hover:border-amber-300 dark:hover:border-amber-500/30', hoverShadow: 'hover:shadow-amber-500/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(245,158,11,0.4)]' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-500/10', hoverBorder: 'hover:border-orange-300 dark:hover:border-orange-500/30', hoverShadow: 'hover:shadow-orange-500/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(249,115,22,0.4)]' },
  pink: { bg: 'bg-pink-50 dark:bg-pink-950/30', border: 'border-pink-200 dark:border-pink-500/10', hoverBorder: 'hover:border-pink-300 dark:hover:border-pink-500/30', hoverShadow: 'hover:shadow-pink-500/20 dark:hover:shadow-[0_25px_50px_-12px_rgba(236,72,153,0.4)]' },
  gray: { bg: 'bg-zinc-100 dark:bg-zinc-900/40', border: 'border-zinc-200 dark:border-white/5', hoverBorder: 'hover:border-zinc-300 dark:hover:border-white/20', hoverShadow: 'hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:hover:shadow-[0_25px_50px_-12px_rgba(255,255,255,0.15)]' },
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

type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

type Result = {
  id: string;
  toolId: string;
  toolName: string;
  title: string | null;
  content: string;
  createdAt: Date;
};

interface DashboardClientProps {
  workspaces?: Workspace[];
  currentWorkspaceId?: string | null;
}

export default function DashboardClient({ workspaces = [], currentWorkspaceId }: DashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<(typeof categoryTabs)[number]>('Alle');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(
    workspaces.find(w => w.id === currentWorkspaceId) || workspaces[0] || null
  );
  const [recentResults, setRecentResults] = useState<Result[]>([]);
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lade aktuellen Workspace aus localStorage und Results
  useEffect(() => {
    const saved = localStorage.getItem('currentWorkspaceId');
    if (saved && workspaces.length > 0) {
      const found = workspaces.find(w => w.id === saved);
      if (found) {
        setCurrentWorkspace(found);
        loadRecentResults(found.id);
      }
    } else if (workspaces.length > 0 && currentWorkspace) {
      loadRecentResults(currentWorkspace.id);
    }
  }, [workspaces]);

  // Lade Recent Results für aktuellen Workspace
  const loadRecentResults = async (workspaceId: string) => {
    try {
      const result = await getWorkspaceResults(workspaceId, 6);
      if (result.success && result.results) {
        setRecentResults(result.results);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Results:', error);
    }
  };

  // Lade Results neu wenn Workspace wechselt
  useEffect(() => {
    if (currentWorkspace) {
      loadRecentResults(currentWorkspace.id);
    }
  }, [currentWorkspace]);

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
      e.preventDefault();
      const maxPull = 100;
      const limitedDeltaY = Math.min(maxPull, deltaY);
      setPullDistance(limitedDeltaY);

      if (limitedDeltaY >= 60 && pullDistance < 60) {
        triggerHaptic('light');
      }
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
    blue: { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-zinc-800/50', bgHover: 'group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20', border: 'border-blue-200 dark:border-blue-500/20', hoverBorder: 'group-hover:border-blue-300 dark:group-hover:border-blue-500/50', hoverShadow: 'group-hover:shadow-blue-500/20' },
    indigo: { text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-zinc-800/50', bgHover: 'group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20', border: 'border-indigo-200 dark:border-indigo-500/20', hoverBorder: 'group-hover:border-indigo-300 dark:group-hover:border-indigo-500/50', hoverShadow: 'group-hover:shadow-indigo-500/20' },
    rose: { text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-zinc-800/50', bgHover: 'group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20', border: 'border-rose-200 dark:border-rose-500/20', hoverBorder: 'group-hover:border-rose-300 dark:group-hover:border-rose-500/50', hoverShadow: 'group-hover:shadow-rose-500/20' },
    violet: { text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-zinc-800/50', bgHover: 'group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20', border: 'border-violet-200 dark:border-violet-500/20', hoverBorder: 'group-hover:border-violet-300 dark:group-hover:border-violet-500/50', hoverShadow: 'group-hover:shadow-violet-500/20' },
    green: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-zinc-800/50', bgHover: 'group-hover:bg-green-100 dark:group-hover:bg-green-500/20', border: 'border-green-200 dark:border-green-500/20', hoverBorder: 'group-hover:border-green-300 dark:group-hover:border-green-500/50', hoverShadow: 'group-hover:shadow-green-500/20' },
    slate: { text: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-zinc-800/50', bgHover: 'group-hover:bg-slate-100 dark:group-hover:bg-slate-500/20', border: 'border-slate-200 dark:border-slate-500/20', hoverBorder: 'group-hover:border-slate-300 dark:group-hover:border-slate-500/50', hoverShadow: 'group-hover:shadow-slate-500/20' },
    emerald: { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-zinc-800/50', bgHover: 'group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20', border: 'border-emerald-200 dark:border-emerald-500/20', hoverBorder: 'group-hover:border-emerald-300 dark:group-hover:border-emerald-500/50', hoverShadow: 'group-hover:shadow-emerald-500/20' },
    cyan: { text: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-zinc-800/50', bgHover: 'group-hover:bg-cyan-100 dark:group-hover:bg-cyan-500/20', border: 'border-cyan-200 dark:border-cyan-500/20', hoverBorder: 'group-hover:border-cyan-300 dark:group-hover:border-cyan-500/50', hoverShadow: 'group-hover:shadow-cyan-500/20' },
    amber: { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-zinc-800/50', bgHover: 'group-hover:bg-amber-100 dark:group-hover:bg-amber-500/20', border: 'border-amber-200 dark:border-amber-500/20', hoverBorder: 'group-hover:border-amber-300 dark:group-hover:border-amber-500/50', hoverShadow: 'group-hover:shadow-amber-500/20' },
    orange: { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-zinc-800/50', bgHover: 'group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20', border: 'border-orange-200 dark:border-orange-500/20', hoverBorder: 'group-hover:border-orange-300 dark:group-hover:border-orange-500/50', hoverShadow: 'group-hover:shadow-orange-500/20' },
    pink: { text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-50 dark:bg-zinc-800/50', bgHover: 'group-hover:bg-pink-100 dark:group-hover:bg-pink-500/20', border: 'border-pink-200 dark:border-pink-500/20', hoverBorder: 'group-hover:border-pink-300 dark:group-hover:border-pink-500/50', hoverShadow: 'group-hover:shadow-pink-500/20' },
  };

  return (
    <div
      ref={containerRef}
      className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-0 relative"
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
        <div className="fixed top-0 left-0 right-0 flex items-center justify-center h-16 bg-white/90 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-200 dark:border-white/10 z-50 transition-colors duration-200">
          {pullDistance >= 60 ? (
            <div className="flex items-center gap-2 text-green-400">
              <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Loslassen zum Aktualisieren</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <span className="text-sm">Ziehen zum Aktualisieren</span>
            </div>
          )}
        </div>
      )}

      {/* Header mit Background Glow */}
      <DashboardGreetingClient 
        currentWorkspace={currentWorkspace}
        onWorkspaceClick={() => setIsWorkspaceModalOpen(true)}
      />

      {/* Workspace Switcher Modal */}
      <WorkspaceSwitcherModal
        isOpen={isWorkspaceModalOpen}
        onClose={() => setIsWorkspaceModalOpen(false)}
        currentWorkspaceId={currentWorkspace?.id || null}
        onWorkspaceSelect={async (workspaceId) => {
          const found = workspaces.find(w => w.id === workspaceId);
          if (found) {
            setCurrentWorkspace(found);
            localStorage.setItem('currentWorkspaceId', workspaceId);
            // Lade Results für neuen Workspace
            await loadRecentResults(workspaceId);
          }
        }}
      />

      {/* Recent Results Section (nur Mobile, nur wenn Results vorhanden) */}
      {recentResults.length > 0 && currentWorkspace && (
        <div className="mb-6 md:hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Letzte Ergebnisse</h2>
            <Link
              href={`/workspace/${currentWorkspace.id}`}
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Alle anzeigen
            </Link>
          </div>
          <div className="overflow-x-auto scrollbar-hide pb-2">
            <div className="flex gap-3 min-w-max">
              {recentResults.slice(0, 6).map((result) => {
                const ToolIcon = toolIconMap[result.toolId] || FileText;
                let preview = '';
                try {
                  const parsed = JSON.parse(result.content);
                  preview = parsed.title || parsed.tripTitle || parsed.recipeName || result.title || 'Ergebnis';
                } catch {
                  preview = result.title || result.content.substring(0, 30) + '...';
                }

                return (
                  <Link
                    key={result.id}
                    href={`/workspace/${currentWorkspace.id}/result/${result.id}`}
                    className="shrink-0 w-[200px] rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-gradient-to-b dark:from-zinc-800/30 dark:to-zinc-900/30 backdrop-blur-xl p-4 hover:border-zinc-300 dark:hover:border-white/20 transition-colors shadow-sm dark:shadow-none"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center flex-shrink-0">
                        <ToolIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-medium text-zinc-900 dark:text-white truncate">{result.toolName}</h3>
                        {result.title && (
                          <p className="text-[10px] text-zinc-600 dark:text-zinc-500 mt-0.5 truncate">{result.title}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-2">{preview}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-zinc-600">
                        {new Date(result.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                      </p>
                      <ArrowRight className="w-3 h-3 text-zinc-600 dark:text-zinc-500" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Search Bar mit Glass-Effekt */}
      <div className="mb-4 sm:mb-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 dark:text-zinc-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors z-10" />
          <input
            type="text"
            placeholder="Suche nach Tools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-500 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-lg backdrop-blur-md text-sm sm:text-base min-h-[56px] tracking-wide"
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
                    className={`w-16 h-16 rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 backdrop-blur-md flex items-center justify-center shadow-lg dark:shadow-lg transition-all group-active:scale-95 group-active:bg-zinc-200 dark:group-active:bg-white/10 group-active:border-zinc-300 dark:group-active:border-white/20 ${quickColors.hoverBorder}`}
                  >
                    <QuickIcon className={`w-6 h-6 ${quickColors.text}`} />
                  </div>
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400 text-center mt-1 truncate max-w-[64px] group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors">
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
                  : 'bg-zinc-100 dark:bg-zinc-900/50 text-zinc-700 dark:text-zinc-400 border border-zinc-200 dark:border-white/5 hover:bg-zinc-200 dark:hover:bg-zinc-800/50'
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
              'group relative flex flex-col h-full min-h-[180px] p-5 rounded-2xl border overflow-hidden',
              'transform-gpu will-change-transform [backface-visibility:hidden] translate-z-0',
              'backdrop-blur-sm shadow-md transition-[transform,box-shadow] duration-300 ease-out',
              'hover:-translate-y-2 hover:shadow-2xl',
              cardColors.bg,
              cardColors.border,
              cardColors.hoverBorder,
              cardColors.hoverShadow,
              tool.available ? 'cursor-pointer' : 'opacity-75 cursor-not-allowed'
            );

            const cardContent = (
              <>
                <div className="absolute -inset-px bg-gradient-to-b from-white/20 dark:from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none" />

                <div className="flex items-start justify-between mb-4 relative z-10">
                  <div className="w-10 h-10 rounded-lg bg-white/80 dark:bg-white/10 flex items-center justify-center shrink-0">
                    <div className={iconColors.text}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  {tool.available ? (
                    <ArrowUpRight className="w-4 h-4 text-white/30 group-hover:text-white transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 shrink-0" />
                  ) : tool.status === 'soon' ? (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full border border-zinc-300 dark:border-zinc-600 bg-zinc-200 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-400 shrink-0">
                      In Kürze
                    </span>
                  ) : null}
                </div>

                <h3
                  className="font-bold text-lg text-zinc-900 dark:text-white mb-2 relative z-10 subpixel-antialiased"
                  style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
                >
                  {tool.title}
                </h3>

                <p className="text-xs text-zinc-700 dark:text-zinc-400 leading-relaxed line-clamp-3 relative z-10 flex-1 subpixel-antialiased">
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
          <Search className="w-12 h-12 mx-auto mb-4 text-zinc-400 dark:text-zinc-600 opacity-50" />
          <p className="text-zinc-600 dark:text-zinc-400 tracking-wide">Keine Tools gefunden.</p>
          <p className="text-sm text-zinc-600 dark:text-zinc-500 mt-1 tracking-wide">
            Versuche eine andere Suche oder Kategorie.
          </p>
        </div>
      )}
    </div>
  );
}
