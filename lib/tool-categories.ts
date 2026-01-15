export type Tool = {
  title: string;
  desc: string;
  href: string;
  icon: string; // Icon-Name als String
  accentColor: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'indigo' | 'teal';
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
        icon: 'Mail',
        accentColor: 'blue',
      },
      {
        title: 'Meeting Protokoll',
        desc: 'Wandle Gesprächsnotizen in strukturierte Protokolle um.',
        href: '/actions/meeting',
        icon: 'FileText',
        accentColor: 'indigo',
      },
      {
        title: 'Rechtstexte',
        desc: 'Formuliere Verträge und rechtliche Dokumente präzise.',
        href: '/actions/legal',
        icon: 'Scale',
        accentColor: 'purple',
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
        icon: 'Search',
        accentColor: 'teal',
      },
      {
        title: 'Recherche Assistent',
        desc: 'Finde Fakten und Quellen zu einem Thema.',
        href: '/actions/research',
        icon: 'FileSearch',
        accentColor: 'orange',
      },
      {
        title: 'Excel Formel Experte',
        desc: 'Beschreibe dein Problem, ich gebe dir die fertige Formel.',
        href: '/actions/excel',
        icon: 'Calculator',
        accentColor: 'green',
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
        icon: 'Briefcase',
        accentColor: 'blue',
      },
      {
        title: 'Instagram Caption',
        desc: 'Schreibe kreative und ansprechende Instagram-Beschriftungen.',
        href: '/actions/instagram',
        icon: 'Camera',
        accentColor: 'pink',
      },
      {
        title: 'Blog Artikel',
        desc: 'Verfasse strukturierte Blog-Artikel zu jedem Thema.',
        href: '/actions/blog',
        icon: 'BookOpen',
        accentColor: 'purple',
      },
    ],
  },
];
