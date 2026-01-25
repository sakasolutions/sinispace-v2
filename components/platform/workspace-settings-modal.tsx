'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { updateWorkspace, archiveWorkspace } from '@/actions/workspace-actions';
import { X, Folder, Briefcase, Plane, Dumbbell, ChefHat } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  createdAt: Date;
};

const iconOptions = [
  { value: 'Folder', label: 'Ordner', icon: Folder },
  { value: 'Briefcase', label: 'Business', icon: Briefcase },
  { value: 'Plane', label: 'Reise', icon: Plane },
  { value: 'Dumbbell', label: 'Fitness', icon: Dumbbell },
  { value: 'ChefHat', label: 'Kochen', icon: ChefHat },
];

const colorOptions = [
  { value: 'blue', label: 'Blau', color: 'bg-blue-500' },
  { value: 'green', label: 'Grün', color: 'bg-green-500' },
  { value: 'purple', label: 'Lila', color: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', color: 'bg-orange-500' },
  { value: 'red', label: 'Rot', color: 'bg-red-500' },
  { value: 'yellow', label: 'Gelb', color: 'bg-yellow-500' },
  { value: 'pink', label: 'Rosa', color: 'bg-pink-500' },
  { value: 'cyan', label: 'Cyan', color: 'bg-cyan-500' },
];

interface WorkspaceSettingsModalProps {
  workspace: Workspace;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function WorkspaceSettingsModal({ workspace, isOpen, onClose, onUpdate }: WorkspaceSettingsModalProps) {
  const [name, setName] = useState(workspace.name);
  const [icon, setIcon] = useState(workspace.icon || 'Folder');
  const [color, setColor] = useState(workspace.color || 'blue');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(workspace.name);
      setIcon(workspace.icon || 'Folder');
      setColor(workspace.color || 'blue');
    }
  }, [isOpen, workspace]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleSave = async () => {
    setIsSaving(true);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('icon', icon);
    formData.append('color', color);

    const result = await updateWorkspace(workspace.id, formData);
    if (result.success) {
      onUpdate();
      onClose();
    } else {
      alert(result.error || 'Fehler beim Aktualisieren');
    }
    setIsSaving(false);
  };

  const handleArchive = async () => {
    if (!confirm('Möchtest du diesen Workspace wirklich archivieren?')) return;

    const result = await archiveWorkspace(workspace.id);
    if (result.success) {
      onUpdate();
      onClose();
    } else {
      alert(result.error || 'Fehler beim Archivieren');
    }
  };

  const SelectedIcon = iconOptions.find((opt) => opt.value === icon)?.icon || Folder;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Workspace-Einstellungen</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-zinc-800 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Workspace-Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {iconOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = icon === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setIcon(opt.value)}
                    className={`p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-500/20'
                        : 'border-white/10 bg-zinc-800 hover:border-white/20'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mx-auto ${isSelected ? 'text-blue-400' : 'text-zinc-400'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Farbe</label>
            <div className="grid grid-cols-4 gap-2">
              {colorOptions.map((opt) => {
                const isSelected = color === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setColor(opt.value)}
                    className={`p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/50'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`w-full h-6 rounded ${opt.color}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 border-t border-white/10">
            <div className={`w-8 h-8 rounded flex items-center justify-center ${colorOptions.find((c) => c.value === color)?.color || 'bg-blue-500'}`}>
              <SelectedIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-zinc-300">Vorschau: {name}</span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleArchive}
            className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors text-sm"
          >
            Archivieren
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isSaving ? 'Speichern...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
