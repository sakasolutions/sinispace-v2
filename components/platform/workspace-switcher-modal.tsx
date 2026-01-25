'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { getUserWorkspaces, createWorkspace } from '@/actions/workspace-actions';
import { X, Plus, Folder, Briefcase, Plane, Dumbbell, ChefHat } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

interface WorkspaceSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWorkspaceId: string | null;
  onWorkspaceSelect: (workspaceId: string) => void;
}

export function WorkspaceSwitcherModal({ 
  isOpen, 
  onClose, 
  currentWorkspaceId,
  onWorkspaceSelect 
}: WorkspaceSwitcherModalProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
    }
  }, [isOpen]);

  const loadWorkspaces = async () => {
    setIsLoading(true);
    const result = await getUserWorkspaces();
    if (result.success && result.workspaces) {
      setWorkspaces(result.workspaces);
    }
    setIsLoading(false);
  };

  const handleWorkspaceSelect = (workspace: Workspace) => {
    onWorkspaceSelect(workspace.id);
    localStorage.setItem('currentWorkspaceId', workspace.id);
    onClose();
    router.push(`/workspace/${workspace.id}`);
  };

  const handleCreateWorkspace = async () => {
    const name = prompt('Workspace-Name:');
    if (!name || name.trim().length === 0) return;

    const formData = new FormData();
    formData.append('name', name.trim());
    formData.append('icon', 'Folder');
    formData.append('color', 'blue');

    try {
      const result = await createWorkspace(formData);
      if (result.success && result.workspace) {
        await loadWorkspaces();
        handleWorkspaceSelect(result.workspace);
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Workspaces:', error);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div 
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="w-full md:max-w-md bg-zinc-900 border-t md:border-t-0 md:border border-white/10 rounded-t-2xl md:rounded-2xl shadow-xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Workspace wechseln</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Workspace List */}
        <div className="overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="p-8 text-center text-zinc-400">Lade Workspaces...</div>
          ) : workspaces.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">
              <p className="mb-4">Noch keine Workspaces</p>
              <button
                onClick={handleCreateWorkspace}
                className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                Ersten Workspace erstellen
              </button>
            </div>
          ) : (
            <div className="p-2">
              {workspaces.map((workspace) => {
                const IconComponent = workspace.icon
                  ? (iconMap[workspace.icon] || (LucideIcons[workspace.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>) || null)
                  : null;
                const colors = workspace.color ? colorMap[workspace.color] || colorMap.blue : colorMap.blue;
                const isActive = workspace.id === currentWorkspaceId;

                return (
                  <button
                    key={workspace.id}
                    onClick={() => handleWorkspaceSelect(workspace)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors mb-1 ${
                      isActive
                        ? 'bg-blue-500/20 border border-blue-500/30'
                        : 'bg-white/5 hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    {IconComponent && (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.bg}`}>
                        <IconComponent className={`w-5 h-5 ${colors.text}`} />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                        {workspace.name}
                      </p>
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Create New Workspace Button */}
          <div className="p-2 border-t border-white/10">
            <button
              onClick={handleCreateWorkspace}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Plus className="w-5 h-5 text-blue-400" />
              </div>
              <span className="text-sm font-medium text-zinc-300">Neuer Workspace</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
