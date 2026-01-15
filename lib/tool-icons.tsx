'use client';

import { Mail, FileText, Scale, Search, FileSearch, Calculator, Briefcase, Camera, BookOpen, LucideIcon } from 'lucide-react';

export const iconMap: Record<string, LucideIcon> = {
  Mail,
  FileText,
  Scale,
  Search,
  FileSearch,
  Calculator,
  Briefcase,
  Camera,
  BookOpen,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] || Mail; // Fallback zu Mail
}
