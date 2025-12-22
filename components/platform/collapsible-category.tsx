'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { ToolCategory } from '@/app/(platform)/dashboard/page';

interface CollapsibleCategoryProps {
  category: ToolCategory;
}

export function CollapsibleCategory({ category }: CollapsibleCategoryProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-zinc-50"
      >
        <h2 className="font-semibold text-zinc-900">{category.name}</h2>
        <ChevronDown
          className={`h-5 w-5 text-zinc-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Content */}
      {isOpen && (
        <div className="border-t border-zinc-200 p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {category.tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group relative flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200 transition-colors text-2xl">
                  {tool.icon}
                </div>
                <h3 className="mb-2 font-semibold text-zinc-900">{tool.title}</h3>
                <p className="mb-4 flex-1 text-sm text-zinc-500">{tool.desc}</p>
                <div className="flex items-center text-sm font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">
                  <span>Starten</span>
                  <span className="ml-2 transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

