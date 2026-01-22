import { LucideIcon } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

type ToolHeaderProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'indigo' | 'rose' | 'violet' | 'green' | 'orange' | 'amber' | 'cyan' | 'pink' | 'slate';
  backLink?: string;
};

const colorMap: Record<string, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-500' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-500' },
  indigo: { bg: 'bg-indigo-500/20', text: 'text-indigo-500' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-500' },
  violet: { bg: 'bg-violet-500/20', text: 'text-violet-500' },
  green: { bg: 'bg-green-500/20', text: 'text-green-500' },
  orange: { bg: 'bg-orange-500/20', text: 'text-orange-500' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-500' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-500' },
  pink: { bg: 'bg-pink-500/20', text: 'text-pink-500' },
  slate: { bg: 'bg-slate-500/20', text: 'text-slate-500' },
};

export function ToolHeader({ title, description, icon: Icon, color, backLink }: ToolHeaderProps) {
  const colors = colorMap[color] || colorMap.emerald;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6 sm:mb-8 p-4 sm:p-6 bg-white/5 border border-white/10 rounded-xl sm:rounded-2xl">
      {backLink && (
        <Link
          href={backLink}
          className="sm:absolute sm:left-4 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Zurück</span>
        </Link>
      )}
      
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`} />
      </div>
      
      <div className="flex-1 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
        <p className="text-zinc-400 text-xs sm:text-sm mt-0.5 sm:mt-1">{description}</p>
      </div>
    </div>
  );
}
