import { auth } from '@/auth';
import { CollapsibleCategory } from '@/components/platform/collapsible-category';
import { toolCategories } from '@/lib/tool-categories';

export type { Tool, ToolCategory } from '@/lib/tool-categories';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
      <div className="mb-6 sm:mb-8 md:mb-12">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          Guten Tag, {session?.user?.name || session?.user?.email || 'Nutzer'}.
        </h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-1 sm:mt-2">
          Was möchtest du heute erledigen?
        </p>
      </div>

      {/* KATEGORIEN - Direkt auf dem Hintergrund, ohne Container */}
      <div className="space-y-6 sm:space-y-8 md:space-y-12">
        {toolCategories.map((category) => (
          <CollapsibleCategory key={category.name} category={category} />
        ))}
      </div>
    </div>
  );
}

