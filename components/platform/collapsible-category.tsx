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
      <h2 className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-4 sm:mb-6">
        {category.name}
      </h2>

      {/* Grid mit Karten - Mobile: 1 Spalte, Tablet: 2 Spalten, Desktop: 3 Spalten */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
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

