'use client';

import { useState } from 'react';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Mail, FileText, Scale, Table2, ChefHat, Dumbbell, Plane, Sparkles, Languages, MessageCircleHeart } from 'lucide-react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';

type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  createdAt: Date;
};

type Result = {
  id: string;
  toolId: string;
  toolName: string;
  title: string | null;
  content: string;
  createdAt: Date;
};

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
};

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  green: { bg: 'bg-green-500/20', text: 'text-green-400' },
  purple: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  red: { bg: 'bg-red-500/20', text: 'text-red-400' },
  yellow: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
};

interface WorkspaceDashboardClientProps {
  workspace: Workspace;
  workspaces: Workspace[];
  recentResults: Result[];
}

export function WorkspaceDashboardClient({ workspace, workspaces, recentResults }: WorkspaceDashboardClientProps) {
  const IconComponent = workspace.icon
    ? (toolIconMap[workspace.icon] || (LucideIcons[workspace.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>) || null)
    : null;
  const colors = workspace.color ? colorMap[workspace.color] || colorMap.blue : colorMap.blue;

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `Vor ${diffDays} Tagen`;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <Breadcrumb items={[{ label: workspace.name }]} />

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          {IconComponent && (
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg}`}>
              <IconComponent className={`w-6 h-6 ${colors.text}`} />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{workspace.name}</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {recentResults.length} {recentResults.length === 1 ? 'Ergebnis' : 'Ergebnisse'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentResults.map((result) => {
          const ToolIcon = toolIconMap[result.toolId] || FileText;
          let preview = '';
          try {
            const parsed = JSON.parse(result.content);
            preview = parsed.title || parsed.tripTitle || parsed.recipeName || 'Ergebnis';
          } catch {
            preview = result.content.substring(0, 50) + '...';
          }

          return (
            <Link
              key={result.id}
              href={`/workspace/${workspace.id}/result/${result.id}`}
              className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/50 flex items-center justify-center flex-shrink-0">
                  <ToolIcon className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white truncate">{result.toolName}</h3>
                  {result.title && (
                    <p className="text-xs text-zinc-500 mt-0.5 truncate">{result.title}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2">{preview}</p>
              <p className="text-xs text-zinc-600 mt-2">{formatDate(result.createdAt)}</p>
            </Link>
          );
        })}
      </div>

      {recentResults.length === 0 && (
        <div className="text-center py-12">
          <p className="text-zinc-400 mb-4">Noch keine Ergebnisse in diesem Workspace</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
          >
            Tool verwenden
          </Link>
        </div>
      )}
    </div>
  );
}
