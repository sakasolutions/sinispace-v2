'use client';

import { useState, useEffect } from 'react';
import { getUserWorkspaces, createWorkspace } from '@/actions/workspace-actions';
import { ChevronDown, Plus, Folder, Briefcase, Plane, Dumbbell, ChefHat, Settings } from 'lucide-react';
import { WorkspaceSettingsModal } from './workspace-settings-modal';
import { useRouter, usePathname } from 'next/navigation';
import * as LucideIcons from 'lucide-react';

type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  createdAt: Date;
};

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Folder,
  Briefcase,
  Plane,
  Dumbbell,
  ChefHat,
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

export function WorkspaceSwitcher() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    loadWorkspaces();
    // Lade aktuellen Workspace aus localStorage
    const saved = localStorage.getItem('currentWorkspaceId');
    if (saved) {
      setCurrentWorkspaceId(saved);
    }
  }, []);

  const loadWorkspaces = async () => {
    const result = await getUserWorkspaces();
    if (result.success && result.workspaces) {
      setWorkspaces(result.workspaces);
      // Wenn kein Workspace ausgewählt, nimm den ersten
      if (!currentWorkspaceId && result.workspaces.length > 0) {
        const first = result.workspaces[0];
        setCurrentWorkspaceId(first.id);
        localStorage.setItem('currentWorkspaceId', first.id);
      }
    }
  };

  const handleWorkspaceSelect = (workspace: Workspace) => {
    setCurrentWorkspaceId(workspace.id);
    localStorage.setItem('currentWorkspaceId', workspace.id);
    setIsOpen(false);
    // Navigate to workspace dashboard
    router.push(`/workspace/${workspace.id}`);
  };

  const handleCreateWorkspace = async () => {
    const name = prompt('Workspace-Name:');
    if (!name || name.trim().length === 0) return;

    console.log('[WORKSPACE] 🚀 Erstelle neuen Workspace:', name.trim());

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('icon', 'Folder');
    formData.append('color', 'blue');

    try {
      const result = await createWorkspace(formData);
      console.log('[WORKSPACE] 📦 Result:', result);
      
      if (result.success) {
        console.log('[WORKSPACE] ✅ Erfolgreich, lade Workspaces neu...');
        await loadWorkspaces();
        if (result.workspace) {
          console.log('[WORKSPACE] 🔄 Wechsle zu neuem Workspace:', result.workspace.id);
          handleWorkspaceSelect(result.workspace);
        }
      } else {
        console.error('[WORKSPACE] ❌ Fehler:', result.error);
        alert(result.error || 'Fehler beim Erstellen des Workspaces');
      }
    } catch (error) {
      console.error('[WORKSPACE] ❌ Unerwarteter Fehler:', error);
      alert('Unerwarteter Fehler beim Erstellen des Workspaces. Bitte versuche es erneut.');
    }
  };

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId);
  const IconComponent = currentWorkspace?.icon
    ? (iconMap[currentWorkspace.icon] || (LucideIcons[currentWorkspace.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>) || Folder)
    : Folder;
  const colors = currentWorkspace?.color ? colorMap[currentWorkspace.color] || colorMap.blue : colorMap.blue;

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-white/10"
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
              <IconComponent className={`w-3.5 h-3.5 ${colors.text}`} />
            </div>
            <span className="truncate">{currentWorkspace?.name || 'Workspace'}</span>
          </div>
          <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-white/10 rounded-lg shadow-xl z-50 max-h-[300px] overflow-y-auto">
            <div className="p-2">
              {workspaces.map((workspace) => {
                const WsIcon = workspace.icon
                  ? (iconMap[workspace.icon] || (LucideIcons[workspace.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>) || Folder)
                  : Folder;
                const wsColors = workspace.color ? colorMap[workspace.color] || colorMap.blue : colorMap.blue;
                const isActive = workspace.id === currentWorkspaceId;

                return (
                  <button
                    key={workspace.id}
                    onClick={() => {
                      handleWorkspaceSelect(workspace);
                      setIsSettingsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-zinc-800 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${wsColors.bg}`}>
                        <WsIcon className={`w-3.5 h-3.5 ${wsColors.text}`} />
                      </div>
                      <span className="truncate">{workspace.name}</span>
                    </div>
                    {isActive && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWorkspace(workspace);
                          setIsSettingsOpen(true);
                        }}
                        className="p-1 rounded hover:bg-zinc-700"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </button>
                );
              })}
              <div className="border-t border-white/10 mt-2 pt-2">
                <button
                  onClick={handleCreateWorkspace}
                  className="w-full flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Neuer Workspace</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isSettingsOpen && selectedWorkspace && (
        <WorkspaceSettingsModal
          workspace={selectedWorkspace}
          isOpen={isSettingsOpen}
          onClose={() => {
            setIsSettingsOpen(false);
            setSelectedWorkspace(null);
          }}
          onUpdate={loadWorkspaces}
        />
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
