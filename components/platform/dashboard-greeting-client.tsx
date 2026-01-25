'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, Folder, Briefcase, Plane, Dumbbell, ChefHat } from 'lucide-react';
import { getUserWorkspaces } from '@/actions/workspace-actions';
import * as LucideIcons from 'lucide-react';

// Dynamische Begrüßung nach Tageszeit
function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 11) {
    return 'Guten Morgen';
  } else if (hour >= 11 && hour < 18) {
    return 'Guten Tag';
  } else if (hour >= 18 && hour < 22) {
    return 'Guten Abend';
  } else {
    return 'Nachtschicht?';
  }
}

type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder,
  Briefcase,
  Plane,
  Dumbbell,
  ChefHat,
};

interface DashboardGreetingClientProps {
  currentWorkspace?: Workspace | null;
  onWorkspaceClick?: () => void;
}

export function DashboardGreetingClient({ currentWorkspace, onWorkspaceClick }: DashboardGreetingClientProps) {
  const [displayName, setDisplayName] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  // Hydration-Fix: Nur nach Mount rendern
  useEffect(() => {
    setMounted(true);
    
    // User-Daten per API holen
    fetch('/api/user/display-name')
      .then(res => res.json())
      .then(data => {
        if (data.displayName) {
          setDisplayName(data.displayName);
        }
      })
      .catch(err => {
        console.error('Fehler beim Laden des Display-Namens:', err);
      });
  }, []);

  const greeting = getTimeBasedGreeting();
  const IconComponent = currentWorkspace?.icon
    ? (iconMap[currentWorkspace.icon] || (LucideIcons[currentWorkspace.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>) || null)
    : null;

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

  const colors = currentWorkspace?.color ? colorMap[currentWorkspace.color] || colorMap.blue : colorMap.blue;

  return (
    <div className="relative mb-6 sm:mb-8 md:mb-10 lg:mb-12">
      {/* Background Glow für visuelle Tiefe */}
      <div className="absolute bg-blue-600/20 blur-[100px] w-[300px] h-[300px] rounded-full -top-20 -left-20 -z-10 pointer-events-none" />
      
      <div className="relative">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1
            className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white tracking-tight"
            style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}
          >
            {greeting}{displayName ? `, ${displayName}` : ''} 👋
          </h1>
        </div>
        
        {/* Workspace-Info (nur Mobile) */}
        {currentWorkspace && (
          <div className="md:hidden mt-3">
            <button
              onClick={onWorkspaceClick}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
            >
              {IconComponent && (
                <div className={`w-5 h-5 rounded-md flex items-center justify-center ${colors.bg}`}>
                  <IconComponent className={`w-3 h-3 ${colors.text}`} />
                </div>
              )}
              <span className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">{currentWorkspace.name}</span>
              <ChevronDown className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        )}
        
        <p className="text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 mt-2 sm:mt-3 tracking-wide">
          Dein Business läuft. Was optimieren wir jetzt?
        </p>
      </div>
    </div>
  );
}
