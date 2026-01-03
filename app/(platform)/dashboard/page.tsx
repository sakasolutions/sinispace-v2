import { auth } from '@/auth';
import Link from 'next/link';
import { CollapsibleCategory } from '@/components/platform/collapsible-category';

export type Tool = {
  title: string;
  desc: string;
  href: string;
  icon: string;
};

export type ToolCategory = {
  name: string;
  tools: Tool[];
};

export const toolCategories: ToolCategory[] = [
  {
    name: 'Büro & Organisation',
    tools: [
      {
        title: 'E-Mail Verfasser',
        desc: 'Erstelle professionelle E-Mails aus Stichpunkten.',
        href: '/actions/email',
        icon: '✉️',
      },
      {
        title: 'Meeting Protokoll',
        desc: 'Wandle Gesprächsnotizen in strukturierte Protokolle um.',
        href: '/actions/meeting',
        icon: '📝',
      },
      {
        title: 'Rechtstexte',
        desc: 'Formuliere Verträge und rechtliche Dokumente präzise.',
        href: '/actions/legal',
        icon: '⚖️',
      },
    ],
  },
  {
    name: 'Wissen & Analyse',
    tools: [
      {
        title: 'Text Zusammenfasser',
        desc: 'Kopiere langen Text und erhalte das Wichtigste.',
        href: '/actions/summarize',
        icon: '🔍',
      },
      {
        title: 'Recherche Assistent',
        desc: 'Finde Fakten und Quellen zu einem Thema.',
        href: '/actions/research',
        icon: '🔎',
      },
      {
        title: 'Excel Formel Experte',
        desc: 'Beschreibe dein Problem, ich gebe dir die fertige Formel.',
        href: '/actions/excel',
        icon: '🧮',
      },
    ],
  },
  {
    name: 'Social Media & Content',
    tools: [
      {
        title: 'LinkedIn Post',
        desc: 'Erstelle professionelle LinkedIn-Beiträge für dein Netzwerk.',
        href: '/actions/linkedin',
        icon: '💼',
      },
      {
        title: 'Instagram Caption',
        desc: 'Schreibe kreative und ansprechende Instagram-Beschriftungen.',
        href: '/actions/instagram',
        icon: '📷',
      },
      {
        title: 'Blog Artikel',
        desc: 'Verfasse strukturierte Blog-Artikel zu jedem Thema.',
        href: '/actions/blog',
        icon: '📖',
      },
    ],
  },
];

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">
        Guten Tag, {session?.user?.name || session?.user?.email || 'Nutzer'}.
        </h1>
        <p className="text-zinc-500">
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
  );
}

export function ActionCard({
  title,
  desc,
  href,
  icon,
}: {
  title: string;
  desc: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-md"
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 group-hover:bg-zinc-200 transition-colors text-2xl">
        {icon}
      </div>
      <h3 className="mb-2 font-semibold text-zinc-900">{title}</h3>
      <p className="mb-4 flex-1 text-sm text-zinc-500">{desc}</p>
      <div className="flex items-center text-sm font-medium text-zinc-600 group-hover:text-zinc-900 transition-colors">
        <span>Starten</span>
        <span className="ml-2 transition-transform group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}
