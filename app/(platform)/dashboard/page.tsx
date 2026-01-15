import { auth } from '@/auth';
import { CollapsibleCategory } from '@/components/platform/collapsible-category';
import { toolCategories } from '@/lib/tool-categories';

export type { Tool, ToolCategory } from '@/lib/tool-categories';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-12">
        <h1 className="text-2xl font-bold text-white">
          Guten Tag, {session?.user?.name || session?.user?.email || 'Nutzer'}.
        </h1>
        <p className="text-zinc-400 mt-2">
          Was möchtest du heute erledigen?
        </p>
      </div>

      {/* KATEGORIEN - Direkt auf dem Hintergrund, ohne Container */}
      <div className="space-y-12">
        {toolCategories.map((category) => (
          <CollapsibleCategory key={category.name} category={category} />
        ))}
      </div>
    </div>
  );
}

