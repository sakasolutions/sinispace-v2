'use client';

import { useState, useEffect } from 'react';
import { getUserWorkspaces } from '@/actions/workspace-actions';
import { CustomSelect } from './custom-select';
import { Folder } from 'lucide-react';

type Workspace = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

interface WorkspaceSelectProps {
  value?: string;
  onChange: (workspaceId: string) => void;
  name?: string;
}

export function WorkspaceSelect({ value, onChange, name }: WorkspaceSelectProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWorkspaces();
    // Lade aktuellen Workspace aus localStorage
    if (!value) {
      const saved = localStorage.getItem('currentWorkspaceId');
      if (saved) {
        onChange(saved);
      }
    }
  }, []);

  const loadWorkspaces = async () => {
    const result = await getUserWorkspaces();
    if (result.success && result.workspaces) {
      setWorkspaces(result.workspaces);
      setIsLoading(false);
      // Wenn kein Value gesetzt, nimm aktuellen Workspace
      if (!value && result.workspaces.length > 0) {
        const saved = localStorage.getItem('currentWorkspaceId');
        const targetId = saved || result.workspaces[0].id;
        onChange(targetId);
      }
    }
  };

  const options = workspaces.map((w) => ({
    value: w.id,
    label: w.name,
  }));

  if (isLoading) {
    return (
      <div className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-500 min-h-[44px] flex items-center">
        Lade Workspaces...
      </div>
    );
  }

  return (
    <CustomSelect
      name={name}
      value={value || ''}
      onChange={onChange}
      options={options}
      placeholder="Workspace auswählen..."
      icon={Folder}
      variant="dropdown"
    />
  );
}
