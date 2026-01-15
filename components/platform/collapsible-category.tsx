'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ToolCategory } from '@/lib/tool-categories';
import { DashboardCard } from '@/components/platform/dashboard-card';

interface CollapsibleCategoryProps {
  category: ToolCategory;
}

export function CollapsibleCategory({ category }: CollapsibleCategoryProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/60 backdrop-blur-md shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-800/50"
      >
        <h2 className="font-semibold text-white">{category.name}</h2>
        <ChevronDown
          className={`h-5 w-5 text-zinc-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-white/5 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {category.tools.map((tool) => (
              <DashboardCard
                key={tool.href}
                title={tool.title}
                desc={tool.desc}
                href={tool.href}
                icon={tool.icon}
                accentColor={tool.accentColor}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

