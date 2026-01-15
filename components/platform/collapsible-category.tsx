'use client';

import { ToolCategory } from '@/lib/tool-categories';
import { DashboardCard } from '@/components/platform/dashboard-card';

interface CollapsibleCategoryProps {
  category: ToolCategory;
}

export function CollapsibleCategory({ category }: CollapsibleCategoryProps) {
  return (
    <div>
      {/* Kategorie-Überschrift - Immer sichtbar, ohne Accordion */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-6">
        {category.name}
      </h2>

      {/* Grid mit Karten */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
  );
}

