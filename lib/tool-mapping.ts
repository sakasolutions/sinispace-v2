/**
 * Tool-Mapping für SiniBox
 * Mappt Tool-IDs zu Icons, Namen und Links
 */

import {
  Mail,
  FileText,
  Scale,
  Table2,
  MessageCircleHeart,
  Languages,
  Sparkles,
  FileInput,
  ChefHat,
  Briefcase,
  LucideIcon,
} from 'lucide-react';

export type ToolInfo = {
  id: string;
  name: string;
  icon: LucideIcon;
  href: string;
  category: 'business' | 'communication' | 'lifestyle';
};

export const toolMap: Record<string, ToolInfo> = {
  // Business
  invoice: {
    id: 'invoice',
    name: 'Angebot & Rechnung',
    icon: FileText,
    href: '/actions/invoice',
    category: 'business',
  },
  legal: {
    id: 'legal',
    name: 'Rechtstexte & Formales',
    icon: Scale,
    href: '/tools/legal',
    category: 'business',
  },
  excel: {
    id: 'excel',
    name: 'Excel-Coach',
    icon: Table2,
    href: '/tools/excel',
    category: 'business',
  },
  email: {
    id: 'email',
    name: 'Email-Profi',
    icon: Mail,
    href: '/actions/email',
    category: 'communication',
  },
  // Communication
  'tough-msg': {
    id: 'tough-msg',
    name: 'Chat-Coach',
    icon: MessageCircleHeart,
    href: '/tools/difficult',
    category: 'communication',
  },
  translate: {
    id: 'translate',
    name: 'Sprachbrücke',
    icon: Languages,
    href: '/actions/translate',
    category: 'communication',
  },
  polish: {
    id: 'polish',
    name: 'Wortschliff',
    icon: Sparkles,
    href: '/actions/polish',
    category: 'communication',
  },
  summarize: {
    id: 'summarize',
    name: 'Klartext',
    icon: FileInput,
    href: '/actions/summarize',
    category: 'communication',
  },
  // Lifestyle
  recipe: {
    id: 'recipe',
    name: 'Gourmet-Planer',
    icon: ChefHat,
    href: '/tools/recipe',
    category: 'lifestyle',
  },
  'job-desc': {
    id: 'job-desc',
    name: 'Job-Beschreibung',
    icon: Briefcase,
    href: '/actions/job-desc',
    category: 'business',
  },
};

/**
 * Mappt Feature-Namen (aus UserActivity.feature) oder Page-Pfade zu Tool-IDs
 */
export function mapFeatureToTool(feature: string | null, page: string | null = null): ToolInfo | null {
  // Versuche zuerst über Page-Pfad
  if (page) {
    // Extrahiere Tool-ID aus Pfad (z.B. "/actions/email" -> "email")
    const pathParts = page.split('/').filter(Boolean);
    if (pathParts.length >= 2) {
      const toolId = pathParts[pathParts.length - 1];
      if (toolMap[toolId]) {
        return toolMap[toolId];
      }
    }
  }

  if (!feature) return null;

  // Normalisiere Feature-Name
  const normalized = feature.toLowerCase().replace(/\s+/g, '-');

  // Direktes Mapping
  if (toolMap[normalized]) {
    return toolMap[normalized];
  }

  // Fallback: Suche nach Teilstring
  for (const [key, tool] of Object.entries(toolMap)) {
    if (feature.toLowerCase().includes(key) || key.includes(normalized)) {
      return tool;
    }
  }

  // Spezielle Mappings
  const specialMappings: Record<string, string> = {
    'e-mail verfasser': 'email',
    'email verfasser': 'email',
    'excel-coach': 'excel',
    'rechnung': 'invoice',
    'angebot': 'invoice',
    'rechtstexte': 'legal',
    'chat-coach': 'tough-msg',
    'schwierige nachrichten': 'tough-msg',
    'gourmet-planer': 'recipe',
    'rezept': 'recipe',
  };

  const lowerFeature = feature.toLowerCase();
  for (const [key, toolId] of Object.entries(specialMappings)) {
    if (lowerFeature.includes(key)) {
      return toolMap[toolId] || null;
    }
  }

  return null;
}

/**
 * Business-Tools (für Business-Zeit)
 */
export const businessTools: ToolInfo[] = [
  toolMap.invoice,
  toolMap.email,
  toolMap.excel,
];

/**
 * Lifestyle-Tools (für Freizeit)
 */
export const lifestyleTools: ToolInfo[] = [
  toolMap.recipe,
  toolMap['tough-msg'],
  // Reise-Tool existiert noch nicht, verwenden wir Chat-Coach als Platzhalter
];
