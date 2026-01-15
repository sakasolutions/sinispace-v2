import { auth } from '@/auth';
import { CollapsibleCategory } from '@/components/platform/collapsible-category';
import { toolCategories } from '@/lib/tool-categories';

export type { Tool, ToolCategory } from '@/lib/tool-categories';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-5xl">
      {/* Dark Background für Glassmorphism-Karten */}
      <div className="relative min-h-[calc(100vh-4rem)] rounded-2xl bg-zinc-950 p-6 md:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
          Guten Tag, {session?.user?.name || session?.user?.email || 'Nutzer'}.
          </h1>
          <p className="text-zinc-400">
            Was möchtest du heute erledigen?
          </p>
        </div>

        {/* KATEGORIEN */}
        <div className="space-y-4">
          {toolCategories.map((category) => (
            <CollapsibleCategory key={category.name} category={category} />
          ))}
        </div>
      </div>
    </div>
  );
}

