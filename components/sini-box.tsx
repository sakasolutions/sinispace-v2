'use client';

import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { mapFeatureToTool, businessTools, lifestyleTools, type ToolInfo } from '@/lib/tool-mapping';

type LastActivity = {
  id: string;
  action: string;
  page: string | null;
  feature: string | null;
  createdAt: Date;
} | null;

type SiniBoxProps = {
  lastActivity: LastActivity;
};

export function SiniBox({ lastActivity }: SiniBoxProps) {
  // Client-Side: Ermittle aktuelle Uhrzeit
  const currentHour = new Date().getHours();
  const isBusinessTime = currentHour >= 6 && currentHour < 18;

  // Mappe letzte Aktivität zu Tool
  const lastTool: ToolInfo | null = lastActivity
    ? mapFeatureToTool(lastActivity.feature, lastActivity.page)
    : null;

  // Smart Actions basierend auf Tageszeit
  const smartActions = isBusinessTime ? businessTools : lifestyleTools;

  return (
    <div className="mb-4 sm:mb-6 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-white/10 backdrop-blur-sm p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col md:flex-row gap-4 md:gap-6">
        {/* LINKS: Resume-Bereich */}
        <div className="flex-1">
          {lastTool ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <lastTool.icon className="w-5 h-5 text-white/80" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-400 mb-1">Zuletzt aktiv</p>
                <p className="text-sm font-medium text-white truncate">{lastTool.name}</p>
              </div>
              <Link
                href={lastTool.href}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 text-xs font-medium text-white transition-all"
              >
                Weiterarbeiten
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">Bereit durchzustarten?</p>
                <p className="text-xs text-zinc-400 mt-0.5">Wähle ein Tool aus dem Grid</p>
              </div>
            </div>
          )}
        </div>

        {/* RECHTS: Smart Actions */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <p className="text-xs text-zinc-400">
              {isBusinessTime ? 'Business-Zeit' : 'Freizeit'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {smartActions.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-xs font-medium text-zinc-300 hover:text-white transition-all"
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tool.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
