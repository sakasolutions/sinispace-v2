'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { getToolUsageStats, trackToolUsage } from '@/actions/tool-usage-actions';

import { createElement } from 'react';
import {
  Mail,
  Languages,
  Sparkles,
  Pencil,
  Scale,
  FileText,
  Table2,
  MessageCircleHeart,
  MessageSquare,
  MessageCircle,
  FileInput,
  Terminal,
  ChefHat,
  Dumbbell,
  Plane,
  Share2,
  ArrowUpRight,
  Search,
  TrendingUp,
  Briefcase,
  ShoppingCart,
  FileImage,
  Sun,
  Moon,
  ChevronDown,
  ChevronRight,
  Calendar,
  CheckCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageTransition } from '@/components/ui/PageTransition';

/** Kurze Untertitel – visuelle Dichte (1–2 Wörter) */
const TOOL_SUBTITLES: Record<string, string> = {
  recipe: 'Planer & Rezepte',
  'shopping-list': 'Smarte Listen',
  pdf: 'Bilder zu PDF',
  email: 'Vorlagen & Hilfe',
  polish: 'Korrektur & Stil',
  invoice: 'Angebote & PDF',
  excel: 'Formeln & Daten',
  legal: 'Verträge & Recht',
  'tough-msg': 'WhatsApp & Dating',
  summarize: 'Kurzfassungen',
  travel: 'Routen & Tipps',
  translate: 'Übersetzer',
  fitness: 'Workouts',
  code: 'Code & Debug',
  social: 'LinkedIn & Social',
};

/** Hero Glow – farbiger Schatten für Top-4 (stärkerer Colored Shadow) */
const TOOL_GLOW_SHADOW: Record<string, string> = {
  recipe: 'shadow-[0_4px_24px_-2px_rgba(249,115,22,0.3)]',
  'shopping-list': 'shadow-[0_4px_24px_-2px_rgba(239,68,68,0.3)]',
  pdf: 'shadow-[0_4px_24px_-2px_rgba(239,68,68,0.3)]',
  email: 'shadow-[0_4px_24px_-2px_rgba(59,130,246,0.3)]',
  polish: 'shadow-[0_4px_24px_-2px_rgba(20,184,166,0.3)]',
  invoice: 'shadow-[0_4px_24px_-2px_rgba(16,185,129,0.3)]',
  excel: 'shadow-[0_4px_24px_-2px_rgba(34,197,94,0.3)]',
  legal: 'shadow-[0_4px_24px_-2px_rgba(139,92,246,0.3)]',
  'tough-msg': 'shadow-[0_4px_24px_-2px_rgba(99,102,241,0.3)]',
  summarize: 'shadow-[0_4px_24px_-2px_rgba(245,158,11,0.3)]',
  travel: 'shadow-[0_4px_24px_-2px_rgba(14,165,233,0.3)]',
  translate: 'shadow-[0_4px_24px_-2px_rgba(99,102,241,0.3)]',
  fitness: 'shadow-[0_4px_24px_-2px_rgba(244,63,94,0.3)]',
  code: 'shadow-[0_4px_24px_-2px_rgba(100,116,139,0.3)]',
  social: 'shadow-[0_4px_24px_-2px_rgba(236,72,153,0.3)]',
};

/** Section-Backgrounds für Workflow-Trennung */
const WORKFLOW_SECTION_BG: Record<string, string> = {
  productivity: 'bg-gradient-to-b from-orange-50/30 to-transparent',
  communication: 'bg-gradient-to-b from-blue-50/30 to-transparent',
  personal: 'bg-gradient-to-b from-rose-50/30 to-transparent',
  professional: 'bg-gradient-to-b from-violet-50/30 to-transparent',
};

/** Icon-Bg-Kreis – subtiler Tint pro Farbe */
const ICON_BG_CLASS: Record<string, string> = {
  orange: 'bg-orange-50',
  pink: 'bg-pink-50',
  blue: 'bg-blue-50',
  emerald: 'bg-emerald-50',
  green: 'bg-green-50',
  violet: 'bg-violet-50',
  indigo: 'bg-indigo-50',
  amber: 'bg-amber-50',
  rose: 'bg-rose-50',
  cyan: 'bg-cyan-50',
  slate: 'bg-slate-50',
  teal: 'bg-teal-50',
  red: 'bg-red-50',
  sky: 'bg-sky-50',
};

/** Icon-Farben – Brand pro Tool (Solid-Look) */
const HERO_ICON_COLORS: Record<string, string> = {
  recipe: 'text-orange-500',
  'shopping-list': 'text-red-500',
  pdf: 'text-red-500',
  email: 'text-blue-500',
  polish: 'text-teal-500',
  invoice: 'text-emerald-500',
  excel: 'text-green-500',
  legal: 'text-violet-500',
  'tough-msg': 'text-indigo-500',
  summarize: 'text-amber-500',
  travel: 'text-sky-500',
  translate: 'text-indigo-500',
  fitness: 'text-rose-500',
  code: 'text-slate-500',
  social: 'text-pink-500',
};

/** Squircle-Container pro Tool – Apple Vision Style (Gradient + Glow) */
const TOOL_SQUIRCLE: Record<string, { gradient: string; shadow: string }> = {
  recipe: { gradient: 'bg-gradient-to-br from-orange-500 to-amber-500', shadow: 'shadow-lg shadow-orange-500/30' },
  'shopping-list': { gradient: 'bg-gradient-to-br from-orange-400 to-pink-500', shadow: 'shadow-lg shadow-orange-500/30' },
  fitness: { gradient: 'bg-gradient-to-br from-rose-500 to-purple-600', shadow: 'shadow-lg shadow-rose-500/30' },
  travel: { gradient: 'bg-gradient-to-br from-sky-400 to-indigo-500', shadow: 'shadow-lg shadow-sky-500/30' },
  pdf: { gradient: 'bg-gradient-to-br from-red-400 to-rose-400', shadow: 'shadow-lg shadow-red-500/30' },
  email: { gradient: 'bg-gradient-to-br from-blue-400 to-cyan-500', shadow: 'shadow-lg shadow-blue-500/30' },
  excel: { gradient: 'bg-gradient-to-br from-blue-400 to-cyan-500', shadow: 'shadow-lg shadow-cyan-500/30' },
  polish: { gradient: 'bg-gradient-to-br from-teal-500 to-emerald-500', shadow: 'shadow-lg shadow-teal-500/30' },
  invoice: { gradient: 'bg-gradient-to-br from-emerald-500 to-green-500', shadow: 'shadow-lg shadow-emerald-500/30' },
  legal: { gradient: 'bg-gradient-to-br from-violet-500 to-purple-600', shadow: 'shadow-lg shadow-violet-500/30' },
  'tough-msg': { gradient: 'bg-gradient-to-br from-indigo-500 to-violet-500', shadow: 'shadow-lg shadow-indigo-500/30' },
  summarize: { gradient: 'bg-gradient-to-br from-amber-400 to-orange-500', shadow: 'shadow-lg shadow-amber-500/30' },
  translate: { gradient: 'bg-gradient-to-br from-indigo-400 to-violet-500', shadow: 'shadow-lg shadow-indigo-500/30' },
  code: { gradient: 'bg-gradient-to-br from-slate-500 to-slate-600', shadow: 'shadow-lg shadow-slate-500/30' },
  social: { gradient: 'bg-gradient-to-br from-pink-500 to-rose-500', shadow: 'shadow-lg shadow-pink-500/30' },
};

const SQUIRCLE_FALLBACK = { gradient: 'bg-gradient-to-br from-orange-400 to-pink-500', shadow: 'shadow-lg shadow-orange-500/30' };

/** Accordion-Listen: dezente Icon-Box pro Tool (kleiner Squircle) */
const ACCORDION_ICON: Record<string, { bg: string; text: string }> = {
  recipe: { bg: 'bg-orange-100', text: 'text-orange-600' },
  'shopping-list': { bg: 'bg-orange-100', text: 'text-orange-600' },
  excel: { bg: 'bg-green-100', text: 'text-green-600' },
  email: { bg: 'bg-blue-100', text: 'text-blue-600' },
  'tough-msg': { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  translate: { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  fitness: { bg: 'bg-rose-100', text: 'text-rose-600' },
  travel: { bg: 'bg-sky-100', text: 'text-sky-600' },
  polish: { bg: 'bg-teal-100', text: 'text-teal-600' },
  legal: { bg: 'bg-violet-100', text: 'text-violet-600' },
  invoice: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  pdf: { bg: 'bg-red-100', text: 'text-red-600' },
  summarize: { bg: 'bg-amber-100', text: 'text-amber-600' },
  code: { bg: 'bg-slate-100', text: 'text-slate-600' },
  social: { bg: 'bg-pink-100', text: 'text-pink-600' },
};
const ACCORDION_ICON_FALLBACK = { bg: 'bg-gray-100', text: 'text-gray-600' };

/** Live-Badges für Top-4 – einheitlich dezent (oben rechts in der Karte) */
const TOOL_LIVE_BADGE: Record<string, { label: string }> = {
  recipe: { label: 'Heute: Pasta' },
  'shopping-list': { label: '4 offen' },
  fitness: { label: '3 geplant' },
  travel: { label: '2 Trips' },
  calendar: { label: '2 Termine' },
  email: { label: 'Entwürfe' },
  pdf: { label: 'Bereit' },
  legal: { label: 'Offen' },
};

const COLOR_FALLBACK: Record<string, string> = {
  orange: 'text-orange-500',
  pink: 'text-pink-500',
  blue: 'text-blue-500',
  emerald: 'text-emerald-500',
  green: 'text-green-500',
  violet: 'text-violet-500',
  indigo: 'text-indigo-500',
  amber: 'text-amber-500',
  rose: 'text-rose-500',
  cyan: 'text-cyan-500',
  slate: 'text-slate-500',
  teal: 'text-teal-500',
  red: 'text-red-500',
  sky: 'text-sky-500',
};

type Tool = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  category: string;
  href: string;
  available: boolean;
  status?: 'soon';
  size?: 'large' | 'medium' | 'small';
  priority?: 'high' | 'medium' | 'low';
};

const allTools: Tool[] = [
  // HIGH PRIORITY - Large Cards
  {
    id: 'recipe',
    title: 'Gourmet-Planer',
    description: 'Was koche ich heute? Leckere Rezepte basierend auf deinem Vorrat.',
    icon: ChefHat,
    color: 'orange',
    category: 'lifestyle',
    href: '/tools/recipe',
    available: true,
    size: 'large',
    priority: 'high',
  },
  {
    id: 'invoice',
    title: 'Angebot & Rechnung',
    description: 'Rechnungen & Angebote in Sekunden erstellen. Inklusive PDF-Export.',
    icon: FileText,
    color: 'emerald',
    category: 'business',
    href: '/actions/invoice',
    available: true,
    size: 'large',
    priority: 'high',
  },
  {
    id: 'email',
    title: 'Email-Profi',
    description: 'Perfekte Mails für jeden Anlass. Von Bewerbung bis Beschwerde.',
    icon: Mail,
    color: 'blue',
    category: 'communication',
    href: '/actions/email',
    available: true,
    size: 'large',
    priority: 'high',
  },
  {
    id: 'excel',
    title: 'Excel-Coach',
    description: 'Formeln verstehen, erstellen und Daten blitzschnell analysieren.',
    icon: Table2,
    color: 'green',
    category: 'business',
    href: '/tools/excel',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'legal',
    title: 'Rechtstexte & Formales',
    description: 'Sichere Formulierungen für Verträge, Kündigungen und Bürokratie.',
    icon: Scale,
    color: 'violet',
    category: 'business',
    href: '/tools/legal',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'tough-msg',
    title: 'Chat-Coach',
    description: 'Perfekte Antworten für WhatsApp, Dating & Social Media.',
    icon: MessageCircleHeart,
    color: 'indigo',
    category: 'communication',
    href: '/tools/difficult',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'summarize',
    title: 'Klartext',
    description: 'Fasse lange Dokumente prägnant zusammen und spare Lesezeit.',
    icon: FileInput,
    color: 'amber',
    category: 'writing',
    href: '/actions/summarize',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'polish',
    title: 'Wortschliff',
    description: 'Verwandle Notizen in geschliffene Texte. Korrektur & Stil-Upgrade.',
    icon: Pencil,
    color: 'teal',
    category: 'writing',
    href: '/actions/polish',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'travel',
    title: 'Travel-Agent',
    description: 'Komplette Reise-Routen mit Tagesplan, Hidden Gems & Food-Tipps.',
    icon: Plane,
    color: 'blue',
    category: 'lifestyle',
    href: '/tools/travel',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'shopping-list',
    title: 'Einkaufslisten',
    description: 'Mehrere Listen verwalten – Supermarkt, Drogerie, Geburtstag & mehr.',
    icon: ShoppingCart,
    color: 'orange',
    category: 'lifestyle',
    href: '/tools/shopping-list',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'pdf',
    title: 'PDF Creator',
    description: 'Bilder (JPEG, PNG, WebP) zu einer PDF-Datei zusammenfügen.',
    icon: FileImage,
    color: 'red',
    category: 'professional',
    href: '/tools/pdf',
    available: true,
    size: 'medium',
    priority: 'medium',
  },
  {
    id: 'translate',
    title: 'Sprachbrücke',
    description: 'Übersetze nicht nur Wörter, sondern die Bedeutung.',
    icon: Languages,
    color: 'indigo',
    category: 'communication',
    href: '/actions/translate',
    available: true,
    size: 'small',
    priority: 'low',
  },
  {
    id: 'fitness',
    title: 'Fit-Coach',
    description: 'Maßgeschneiderte Trainingspläne für Zuhause & Gym.',
    icon: Dumbbell,
    color: 'rose',
    category: 'lifestyle',
    href: '/tools/fitness',
    available: true,
    size: 'small',
    priority: 'low',
  },
  {
    id: 'code',
    title: 'Codefix',
    description: 'Finde Bugs, optimiere Code und lass dir Lösungen erklären.',
    icon: Terminal,
    color: 'slate',
    category: 'dev',
    href: '/actions/code',
    available: false,
    status: 'soon',
    size: 'small',
    priority: 'low',
  },
  {
    id: 'social',
    title: 'Social Media Creator',
    description: 'Ideen & Texte für LinkedIn, Instagram und TikTok.',
    icon: Share2,
    color: 'pink',
    category: 'social',
    href: '/actions/social',
    available: false,
    status: 'soon',
    size: 'small',
    priority: 'low',
  },
];

/** Workflow-Sektionen (nur Content-Struktur, keine Navigation) */
const WORKFLOW_SECTIONS = [
  { id: 'productivity', label: 'Produktivität', icon: ShoppingCart, toolIds: ['recipe', 'shopping-list', 'excel'] },
  { id: 'communication', label: 'Kommunikation', icon: Mail, toolIds: ['email', 'tough-msg', 'translate'] },
  { id: 'personal', label: 'Persönlich', icon: Dumbbell, toolIds: ['fitness', 'travel', 'polish'] },
  { id: 'professional', label: 'Professionell', icon: FileText, toolIds: ['legal', 'invoice', 'pdf', 'summarize', 'code', 'social'] },
] as const;

const TOOL_WORKFLOW: Record<string, (typeof WORKFLOW_SECTIONS)[number]['id']> = {
  recipe: 'productivity',
  'shopping-list': 'productivity',
  pdf: 'professional',
  excel: 'productivity',
  email: 'communication',
  'tough-msg': 'communication',
  translate: 'communication',
  fitness: 'personal',
  travel: 'personal',
  polish: 'personal',
  legal: 'professional',
  invoice: 'professional',
  summarize: 'professional',
  code: 'professional',
  social: 'professional',
};

function getHeaderContent(date: Date): { headline: string; subline: string } {
  const weekday = date.toLocaleDateString('de-DE', { weekday: 'long' });
  const dateStr = date.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  return {
    headline: `${weekday}.`,
    subline: dateStr,
  };
}

/** Zeitbasiertes Greeting (ohne Name – Name kommt aus Einstellungen) */
function getSunriseGreetingBase(): { base: string; subline: string } {
  const h = new Date().getHours();
  if (h < 12) return { base: 'Guten Morgen', subline: 'Alles im Griff für heute.' };
  if (h < 18) return { base: 'Guten Tag', subline: 'Zeit für Fokus.' };
  return { base: 'Guten Abend', subline: 'Alles im Griff für heute.' };
}

/** Day (06:00–18:00) = sunrise, Night (18:00–06:00) = night */
function getTimeOfDay(): 'sunrise' | 'night' {
  const h = new Date().getHours();
  return h >= 6 && h < 18 ? 'sunrise' : 'night';
}

// PREMIUM HIGH-FIDELITY: Helper-Funktion für Akzentfarben (RGB-Werte)
const getAccentColorRGB = (accentColor: string): { r: number; g: number; b: number } => {
  const colorMap: Record<string, { r: number; g: number; b: number }> = {
    orange: { r: 249, g: 115, b: 22 },
    pink: { r: 244, g: 114, b: 182 },
    blue: { r: 59, g: 130, b: 246 },
    emerald: { r: 16, g: 185, b: 129 },
    green: { r: 34, g: 197, b: 94 },
    violet: { r: 139, g: 92, b: 246 },
    indigo: { r: 99, g: 102, b: 241 },
    amber: { r: 245, g: 158, b: 11 },
    cyan: { r: 6, g: 182, b: 212 },
    rose: { r: 244, g: 63, b: 94 },
    red: { r: 239, g: 68, b: 68 },
    slate: { r: 100, g: 116, b: 139 },
  };
  return colorMap[accentColor] || colorMap.blue;
};

// FESTES MAPPING: Desktop Hover-Klassen für jede Tool-Farbe (explizit, damit Tailwind sie erkennt)
const desktopHoverClasses: Record<string, { border: string; bg: string }> = {
  orange: {
    border: 'md:group-hover:border-orange-500',
    bg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-orange-50 md:group-hover:to-pink-50',
  },
  pink: {
    border: 'md:group-hover:border-pink-500',
    bg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-pink-50 md:group-hover:to-orange-50',
  },
  rose: {
    border: 'md:group-hover:border-rose-500',
    bg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-pink-50 md:group-hover:to-rose-50',
  },
  emerald: {
    border: 'md:group-hover:border-emerald-500',
    bg: 'md:group-hover:bg-emerald-50',
  },
  blue: {
    border: 'md:group-hover:border-blue-500',
    bg: 'md:group-hover:bg-blue-50',
  },
  green: {
    border: 'md:group-hover:border-green-500',
    bg: 'md:group-hover:bg-green-50',
  },
  violet: {
    border: 'md:group-hover:border-violet-500',
    bg: 'md:group-hover:bg-violet-50',
  },
  indigo: {
    border: 'md:group-hover:border-indigo-500',
    bg: 'md:group-hover:bg-indigo-50',
  },
  amber: {
    border: 'md:group-hover:border-amber-500',
    bg: 'md:group-hover:bg-amber-50',
  },
  cyan: {
    border: 'md:group-hover:border-cyan-500',
    bg: 'md:group-hover:bg-cyan-50',
  },
  slate: {
    border: 'md:group-hover:border-gray-500',
    bg: 'md:group-hover:bg-gray-50',
  },
  red: {
    border: 'md:group-hover:border-red-500',
    bg: 'md:group-hover:bg-red-50',
  },
};

// PREMIUM FLOATING DESIGN: Permanent Floating Cards mit vollumfänglichem farbigen Rahmen
const toolColors: Record<string, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
  hoverBorder: string;
  hoverBg: string;
  gradient?: string;
  accentColor: string; // Vollumfänglicher farbiger Rahmen (1px solid)
}> = {
  emerald: {
    bg: 'bg-white',
    border: 'border-emerald-300',
    text: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    hoverBorder: 'md:group-hover:border-emerald-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-emerald-50', // Nur Desktop
    accentColor: 'emerald',
  },
  blue: {
    bg: 'bg-white',
    border: 'border-blue-300',
    text: 'text-blue-600',
    iconBg: 'bg-blue-50',
    hoverBorder: 'md:group-hover:border-blue-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-blue-50', // Nur Desktop
    accentColor: 'blue',
  },
  green: {
    bg: 'bg-white',
    border: 'border-green-300',
    text: 'text-green-600',
    iconBg: 'bg-green-50',
    hoverBorder: 'md:group-hover:border-green-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-green-50', // Nur Desktop
    accentColor: 'green',
  },
  violet: {
    bg: 'bg-white',
    border: 'border-violet-300',
    text: 'text-violet-600',
    iconBg: 'bg-violet-50',
    hoverBorder: 'md:group-hover:border-violet-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-violet-50', // Nur Desktop
    accentColor: 'violet',
  },
  indigo: {
    bg: 'bg-white',
    border: 'border-indigo-300',
    text: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    hoverBorder: 'md:group-hover:border-indigo-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-indigo-50', // Nur Desktop
    accentColor: 'indigo',
  },
  amber: {
    bg: 'bg-white',
    border: 'border-amber-300',
    text: 'text-amber-600',
    iconBg: 'bg-amber-50',
    hoverBorder: 'md:group-hover:border-amber-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-amber-50', // Nur Desktop
    accentColor: 'amber',
  },
  cyan: {
    bg: 'bg-white',
    border: 'border-cyan-300',
    text: 'text-cyan-600',
    iconBg: 'bg-cyan-50',
    hoverBorder: 'md:group-hover:border-cyan-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-cyan-50', // Nur Desktop
    accentColor: 'cyan',
  },
  orange: {
    bg: 'bg-white',
    border: 'border-orange-300',
    text: 'text-orange-600',
    iconBg: 'bg-gradient-to-br from-orange-50 to-pink-50',
    hoverBorder: 'md:group-hover:border-orange-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-orange-50 md:group-hover:to-pink-50', // Nur Desktop
    gradient: 'from-orange-500 to-pink-500',
    accentColor: 'orange',
  },
  rose: {
    bg: 'bg-white',
    border: 'border-rose-300',
    text: 'text-rose-600',
    iconBg: 'bg-gradient-to-br from-pink-50 to-rose-50',
    hoverBorder: 'md:group-hover:border-rose-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-pink-50 md:group-hover:to-rose-50', // Nur Desktop
    gradient: 'from-pink-500 to-rose-500',
    accentColor: 'rose',
  },
  slate: {
    bg: 'bg-white',
    border: 'border-gray-300',
    text: 'text-gray-600',
    iconBg: 'bg-gray-50',
    hoverBorder: 'md:group-hover:border-gray-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-gray-50', // Nur Desktop
    accentColor: 'gray',
  },
  pink: {
    bg: 'bg-white',
    border: 'border-pink-300',
    text: 'text-pink-600',
    iconBg: 'bg-gradient-to-br from-pink-50 to-orange-50',
    hoverBorder: 'md:group-hover:border-pink-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-gradient-to-br md:group-hover:from-pink-50 md:group-hover:to-orange-50', // Nur Desktop
    gradient: 'from-pink-500 to-orange-500',
    accentColor: 'pink',
  },
  red: {
    bg: 'bg-white',
    border: 'border-red-300',
    text: 'text-red-600',
    iconBg: 'bg-red-50',
    hoverBorder: 'md:group-hover:border-red-400', // Nur Desktop
    hoverBg: 'md:group-hover:bg-red-50', // Nur Desktop
    accentColor: 'red',
  },
};

export default function DashboardClient() {
  const [pullDistance, setPullDistance] = useState(0);
  const [usageStats, setUsageStats] = useState<Record<string, { count7d: number; count30d: number; isTrending: boolean }>>({});
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(new Set());
  const [displayName, setDisplayName] = useState<string>('');
  const [timeOfDay, setTimeOfDay] = useState<'sunrise' | 'night'>(() => getTimeOfDay());

  // Time-of-day aktualisieren (z. B. jede Minute), damit Theme wechselt
  useEffect(() => {
    setTimeOfDay(getTimeOfDay());
    const interval = setInterval(() => setTimeOfDay(getTimeOfDay()), 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Display-Name aus Einstellungen (User kann in Profil festlegen)
  useEffect(() => {
    fetch('/api/user/display-name')
      .then((res) => res.json())
      .then((data) => {
        if (data?.displayName) setDisplayName(String(data.displayName).trim());
      })
      .catch(() => {});
  }, []);

  // Fetch usage stats AFTER initial render (non-blocking)
  // Delay auf Mobile länger für bessere Performance
  useEffect(() => {
    // Delay für bessere initial load performance
    const delay = typeof window !== 'undefined' && window.innerWidth < 768 ? 1000 : 300;
    
    const timeoutId = setTimeout(() => {
      getToolUsageStats().then((result) => {
        if (result.success && result.stats) {
          setUsageStats(result.stats);
        }
      }).catch((error) => {
        console.error('Failed to load usage stats:', error);
        // Fail silently - dashboard works without stats
      });
    }, delay);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const root = containerRef.current?.parentElement;
    if (!root || root.scrollTop !== 0) return;
    const touch = e.touches[0];
    touchStartRef.current = {
      y: touch.clientY,
      scrollTop: root.scrollTop,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !containerRef.current) return;
    const root = containerRef.current.parentElement;
    if (!root || root.scrollTop > 0) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.touches[0];
    const deltaY = touch.clientY - touchStartRef.current.y;

    // Deutlich unempfindlicher: Erst ab 50px Pull reagieren, Reload erst bei 150px
    if (deltaY > 50) {
      if (e.cancelable) {
        e.preventDefault();
      }
      requestAnimationFrame(() => {
        const maxPull = 160;
        const limitedDeltaY = Math.min(maxPull, deltaY);
        setPullDistance(limitedDeltaY);

        if (limitedDeltaY >= 150 && pullDistance < 150) {
          triggerHaptic('light');
        }
      });
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 150) {
      triggerHaptic('success');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      setPullDistance(0);
    }
    touchStartRef.current = null;
  };

  // Default hierarchy for new users (Top 4)
  const defaultTop4 = ['recipe', 'invoice', 'email', 'tough-msg'];

  const sortedTools = useMemo(() => {
    return [...allTools].sort((a, b) => {
      const aStats = usageStats[a.id];
      const bStats = usageStats[b.id];
      
      // If no usage stats, use default hierarchy
      if (!aStats && !bStats) {
        const aIndex = defaultTop4.indexOf(a.id);
        const bIndex = defaultTop4.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return 0;
      }
      
      // Sort by 7-day usage count (descending)
      const aCount = aStats?.count7d || 0;
      const bCount = bStats?.count7d || 0;
      if (aCount !== bCount) return bCount - aCount;
      
      // If equal, check default hierarchy
      const aIndex = defaultTop4.indexOf(a.id);
      const bIndex = defaultTop4.indexOf(b.id);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      return 0;
    });
  }, [usageStats]);

  const sunriseGreeting = getSunriseGreetingBase();
  const greetingText = displayName ? `${sunriseGreeting.base}, ${displayName}! 👋` : `${sunriseGreeting.base}! 👋`;

  return (
    <div
      ref={containerRef}
      className="min-h-screen w-full relative bg-gray-50/50"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: pullDistance > 0 ? `translateY(${Math.min(pullDistance, 160)}px)` : 'none',
        transition: pullDistance === 0 ? 'transform 0.3s ease-out' : 'none',
      }}
    >
      {/* Ambient-Blobs liegen im globalen Layout (hinter Sidebar + Content) */}

      {/* Pull-to-Refresh Indicator */}
      {pullDistance > 50 && (
        <div
          className={cn(
            'fixed top-0 left-0 right-0 flex items-center justify-center h-16 z-50',
            timeOfDay === 'sunrise' ? 'bg-white' : 'bg-slate-900'
          )}
        >
          {pullDistance >= 150 ? (
            <div className={cn('flex items-center gap-2', timeOfDay === 'sunrise' ? 'text-orange-500' : 'text-violet-400')}>
              <div className={cn('w-5 h-5 border-2 border-t-transparent rounded-full animate-spin', timeOfDay === 'sunrise' ? 'border-orange-500' : 'border-violet-400')} />
              <span className={cn('text-sm font-medium', timeOfDay === 'sunrise' ? 'text-gray-700' : 'text-white/90')}>Loslassen zum Aktualisieren</span>
            </div>
          ) : (
            <div className={cn('flex items-center gap-2', timeOfDay === 'sunrise' ? 'text-gray-500' : 'text-white/70')}>
              <span className="text-sm font-medium">Ziehen zum Aktualisieren</span>
            </div>
          )}
        </div>
      )}

      {/* Header: Dynamic Day/Night – sunrise (06–18) / night (18–06) */}
      <header
        className={cn(
          'relative z-[1] min-h-[260px] sm:min-h-[300px] md:min-h-[350px]',
          'w-[calc(100%+1.5rem)] -mx-3 sm:w-[calc(100%+2rem)] sm:-mx-4 md:w-[calc(100%+3rem)] md:-mx-6 lg:w-[calc(100%+4rem)] lg:-mx-8',
          '-mt-[max(1rem,env(safe-area-inset-top))] md:-mt-6 lg:-mt-8'
        )}
      >
        {/* 1. Hintergrund – absolut, kein weißer Rand (h-[450px] für Overscroll), z-0 */}
        <div
          className={cn(
            'absolute top-0 left-0 w-full z-0 rounded-b-[40px] overflow-hidden',
            'h-[450px] min-h-[260px] sm:min-h-[300px] md:min-h-[350px]',
            timeOfDay === 'sunrise'
              ? 'bg-gradient-to-br from-orange-200 via-rose-200 to-violet-200'
              : 'bg-gradient-to-br from-slate-900 via-violet-900 to-slate-900'
          )}
          aria-hidden
        >
          {timeOfDay === 'sunrise' ? (
            <>
              <div className="absolute top-0 left-0 w-[80%] h-[300px] rounded-full bg-orange-200/60 blur-[100px] pointer-events-none" aria-hidden />
              <div className="absolute bottom-0 right-0 w-[60%] h-[300px] rounded-full bg-purple-200/60 blur-[100px] pointer-events-none" aria-hidden />
            </>
          ) : (
            <>
              <div className="absolute top-0 left-0 w-[80%] h-[300px] rounded-full bg-indigo-500/20 blur-[100px] pointer-events-none" aria-hidden />
              <div className="absolute bottom-0 right-0 w-[60%] h-[300px] rounded-full bg-purple-500/20 blur-[100px] pointer-events-none" aria-hidden />
            </>
          )}
        </div>
        {/* 2. Inhalt darüber: z-10 */}
        <div className="relative z-10 pt-[max(3rem,env(safe-area-inset-top))] md:pt-14 px-4 sm:px-6 md:px-8 min-h-[260px] sm:min-h-[300px] md:min-h-[350px] flex flex-col">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <h1
                className={cn(
                  'text-[1.625rem] sm:text-[1.9375rem] md:text-[2.125rem] font-medium tracking-tight mt-0',
                  timeOfDay === 'sunrise' ? 'text-gray-900' : 'text-white'
                )}
                style={{ letterSpacing: '-0.3px' }}
              >
                {greetingText}
              </h1>
              <p
                className={cn(
                  'text-sm sm:text-base mt-1 font-normal',
                  timeOfDay === 'sunrise' ? 'text-gray-500 opacity-65' : 'text-white/80'
                )}
                style={{ letterSpacing: '0.1px' }}
              >
                {sunriseGreeting.subline}
              </p>
              {/* Info-Chips */}
              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={cn(
                    'backdrop-blur-md rounded-lg px-3 py-1.5 text-xs font-medium flex items-center shrink-0',
                    timeOfDay === 'sunrise'
                      ? 'bg-white/20 border border-white/20 text-gray-800'
                      : 'bg-white/10 border border-white/20 text-white/80'
                  )}
                >
                  <Calendar className="w-3 h-3 mr-1.5 opacity-90 shrink-0" aria-hidden />
                  2 Termine
                </span>
                <span
                  className={cn(
                    'backdrop-blur-md rounded-lg px-3 py-1.5 text-xs font-medium flex items-center shrink-0',
                    timeOfDay === 'sunrise'
                      ? 'bg-white/20 border border-white/20 text-gray-800'
                      : 'bg-white/10 border border-white/20 text-white/80'
                  )}
                >
                  <ShoppingCart className="w-3 h-3 mr-1.5 opacity-90 shrink-0" aria-hidden />
                  4 Offen
                </span>
                <span
                  className={cn(
                    'backdrop-blur-md rounded-lg px-3 py-1.5 text-xs font-medium flex items-center shrink-0',
                    timeOfDay === 'sunrise'
                      ? 'bg-white/20 border border-white/20 text-gray-800'
                      : 'bg-white/10 border border-white/20 text-white/80'
                  )}
                >
                  <CheckCircle className="w-3 h-3 mr-1.5 opacity-90 shrink-0" aria-hidden />
                  Alles erledigt
                </span>
              </div>
            </div>
            <div className="absolute right-0 top-0 pointer-events-none" aria-hidden>
              {timeOfDay === 'sunrise' ? (
                <div className="translate-x-[30%] -translate-y-[30%] text-orange-500">
                  <Sun className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56" />
                </div>
              ) : (
                <div
                  className="translate-x-[30%] -translate-y-[30%] text-yellow-100"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,200,0.5))' }}
                >
                  <Moon className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56" />
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Grid ragt in den Header (Glass über Orange) */}
      <PageTransition className="relative z-10 mx-auto max-w-7xl w-full px-4 sm:px-4 md:px-6 lg:px-8 pb-[calc(70px+env(safe-area-inset-bottom))] md:pb-32 -mt-24">
        {/* Content: Zuletzt verwendet + Kategorie-Sektionen */}
        {sortedTools.length > 0 ? (
          <div className="space-y-6 md:space-y-8">
            {/* Zuletzt verwendet: Top 4 */}
            <section className="mb-8 md:mb-10">
              <h2 className="text-sm font-bold text-gray-600 mb-4">Zuletzt verwendet</h2>
              <div className="grid grid-cols-2 gap-4 md:gap-4">
                {sortedTools.slice(0, 4).map((tool) => {
                  const Icon = tool.icon;
                  const subtitle = TOOL_SUBTITLES[tool.id];
                  const liveBadge = TOOL_LIVE_BADGE[tool.id];
                  const card = (
                    <div
                      key={tool.id}
                      className={cn(
                        'group relative flex flex-col justify-between h-full items-start min-h-[160px] rounded-2xl overflow-hidden',
                        'hover:scale-[1.02] transition-all duration-300',
                        'p-5',
                        tool.available ? 'cursor-pointer active:scale-[0.98]' : 'opacity-60 cursor-not-allowed'
                      )}
                      style={{
                        background: 'rgba(255,255,255,0.16)',
                        border: '1px solid rgba(255,255,255,0.22)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.08), 0 16px 48px -12px rgba(0,0,0,0.06)',
                        WebkitBackdropFilter: 'blur(8px)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      {/* Status-Badge: dezent oben rechts (einheitliches Micro-Design) */}
                      {(liveBadge || (!tool.available && tool.status === 'soon')) && (
                        <div className="absolute top-4 right-4 flex flex-col items-end gap-0.5">
                          {liveBadge && (
                            <span className="bg-gray-50/90 text-gray-700 text-[10px] uppercase font-semibold px-2 py-1 rounded shadow-sm shrink-0" style={{ letterSpacing: '0.6px' }}>
                              {liveBadge.label}
                            </span>
                          )}
                          {!tool.available && tool.status === 'soon' && (
                            <span className="bg-gray-50/90 text-gray-700 text-[10px] uppercase font-semibold px-2 py-1 rounded shadow-sm" style={{ letterSpacing: '0.6px' }}>Bald</span>
                          )}
                        </div>
                      )}
                      {/* Squircle (App-Icon-Style) */}
                      <div className="flex w-full justify-between items-start gap-2">
                        {(() => {
                          const sq = TOOL_SQUIRCLE[tool.id] ?? SQUIRCLE_FALLBACK;
                          return (
                            <div className={cn('w-16 h-16 rounded-[22px] flex items-center justify-center shrink-0', sq.gradient, sq.shadow)}>
                              {createElement(Icon, { className: 'w-8 h-8 shrink-0 text-white', strokeWidth: 2.5, 'aria-hidden': true } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number })}
                            </div>
                          );
                        })()}
                      </div>
                      {/* Unten: Titel + Subtext */}
                      <div className="w-full text-left">
                        <h3 className="font-semibold text-[1.0625rem] text-gray-900 leading-tight line-clamp-2">{tool.title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{subtitle}</p>
                      </div>
                    </div>
                  );
                  return tool.available ? (
                    <Link key={tool.id} href={tool.href} className="block h-full min-h-[160px]" onClick={async () => { triggerHaptic('light'); await trackToolUsage(tool.id, tool.title); setTimeout(() => getToolUsageStats().then((r) => r.success && r.stats && setUsageStats(r.stats)), 500); }}>
                      {card}
                    </Link>
                  ) : (
                    <div key={tool.id} className="h-full min-h-[160px]">{card}</div>
                  );
                })}
              </div>
            </section>

            {/* Smart Glass Accordions – sekundäre Tools nach Kategorie */}
            {WORKFLOW_SECTIONS.map((section) => {
              const featuredIds = sortedTools.slice(0, 4).map((t) => t.id);
              const tools = sortedTools.filter(
                (t) => TOOL_WORKFLOW[t.id] === section.id && !featuredIds.includes(t.id)
              );
              if (tools.length === 0) return null;
              const isOpen = openAccordions.has(section.id);
              const SectionIcon = section.icon;
              return (
                <div
                  key={section.id}
                  className="rounded-2xl overflow-hidden mb-4"
                  style={{
                    background: 'rgba(255,255,255,0.16)',
                    border: '1px solid rgba(255,255,255,0.22)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 8px rgba(0,0,0,0.04), 0 8px 24px -4px rgba(0,0,0,0.08), 0 16px 48px -12px rgba(0,0,0,0.06)',
                    WebkitBackdropFilter: 'blur(8px)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => { triggerHaptic('light'); toggleAccordion(section.id); }}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-white/30 transition-colors"
                  >
                    <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <SectionIcon className="w-4 h-4 text-gray-500" />
                      {section.label}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-gray-500"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        {tools.map((tool) => {
                          const Icon = tool.icon;
                          const subtitle = TOOL_SUBTITLES[tool.id];
                          const sq = TOOL_SQUIRCLE[tool.id] ?? SQUIRCLE_FALLBACK;
                          const row = (
                            <div className="flex items-center gap-3 py-4 px-4 border-b border-white/20 last:border-0 hover:bg-white/40 transition-colors">
                              <div className={cn('w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 shadow-sm', sq.gradient)}>
                                {createElement(Icon, { className: 'w-5 h-5 shrink-0 text-white', strokeWidth: 2, 'aria-hidden': true } as React.HTMLAttributes<SVGElement> & { strokeWidth?: number })}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate">{tool.title}</p>
                                <p className="text-sm text-gray-500 truncate">{subtitle}</p>
                              </div>
                              <ChevronRight className="w-5 h-5 shrink-0 text-gray-400" />
                            </div>
                          );
                          return tool.available ? (
                            <Link
                              key={tool.id}
                              href={tool.href}
                              onClick={async () => { triggerHaptic('light'); await trackToolUsage(tool.id, tool.title); setTimeout(() => getToolUsageStats().then((r) => r.success && r.stats && setUsageStats(r.stats)), 500); }}
                              className="block"
                            >
                              {row}
                            </Link>
                          ) : (
                            <div key={tool.id} className="opacity-60 cursor-not-allowed">
                              {row}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24">
            <Search className="w-16 h-16 mx-auto mb-6 text-gray-300" />
            <p className="text-gray-600 text-lg font-medium tracking-wide mb-2">Keine Tools gefunden.</p>
            <p className="text-gray-500 text-sm font-normal">
              Versuche eine andere Suche oder Kategorie.
            </p>
          </div>
        )}
      </PageTransition>
    </div>
  );
}
