'use client';

import Link from 'next/link';
import { getIcon } from '@/lib/tool-icons';

interface DashboardCardProps {
  title: string;
  desc: string;
  href: string;
  icon: string; // Icon-Name als String
  accentColor: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'indigo' | 'teal';
}

const colorMap = {
  blue: {
    icon: 'text-blue-500',
    glow: 'bg-blue-500/20',
    border: 'border-blue-500/10',
  },
  green: {
    icon: 'text-green-500',
    glow: 'bg-green-500/20',
    border: 'border-green-500/10',
  },
  purple: {
    icon: 'text-purple-500',
    glow: 'bg-purple-500/20',
    border: 'border-purple-500/10',
  },
  orange: {
    icon: 'text-orange-500',
    glow: 'bg-orange-500/20',
    border: 'border-orange-500/10',
  },
  red: {
    icon: 'text-red-500',
    glow: 'bg-red-500/20',
    border: 'border-red-500/10',
  },
  pink: {
    icon: 'text-pink-500',
    glow: 'bg-pink-500/20',
    border: 'border-pink-500/10',
  },
  indigo: {
    icon: 'text-indigo-500',
    glow: 'bg-indigo-500/20',
    border: 'border-indigo-500/10',
  },
  teal: {
    icon: 'text-teal-500',
    glow: 'bg-teal-500/20',
    border: 'border-teal-500/10',
  },
};

export function DashboardCard({ title, desc, href, icon: iconName, accentColor }: DashboardCardProps) {
  const colors = colorMap[accentColor];
  const Icon = getIcon(iconName);

  // Dynamischer Hover-Glow basierend auf accentColor
  const hoverGlowMap: Record<string, string> = {
    blue: 'hover:shadow-[0_8px_32px_0_rgba(37,99,235,0.1)]',
    green: 'hover:shadow-[0_8px_32px_0_rgba(34,197,94,0.1)]',
    purple: 'hover:shadow-[0_8px_32px_0_rgba(168,85,247,0.1)]',
    orange: 'hover:shadow-[0_8px_32px_0_rgba(249,115,22,0.1)]',
    red: 'hover:shadow-[0_8px_32px_0_rgba(239,68,68,0.1)]',
    pink: 'hover:shadow-[0_8px_32px_0_rgba(236,72,153,0.1)]',
    indigo: 'hover:shadow-[0_8px_32px_0_rgba(99,102,241,0.1)]',
    teal: 'hover:shadow-[0_8px_32px_0_rgba(20,184,166,0.1)]',
  };

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden flex flex-col w-full rounded-3xl border border-white/5 bg-zinc-900/40 backdrop-blur-xl p-4 sm:p-5 md:p-6 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-white/20 ${hoverGlowMap[accentColor]}`}
    >
      {/* Inner Glow - Radial Gradient von oben */}
      <div className="absolute -inset-px bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none" />
      
      {/* Icon mit Leuchteffekt */}
      <div className="relative mb-3 sm:mb-4 z-10">
        {/* Glow-Hintergrund */}
        <div className={`absolute -inset-2 rounded-full ${colors.glow} blur-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
        {/* Icon Container */}
        <div className={`relative ${colors.icon} group-hover:drop-shadow-[0_0_12px_currentColor] transition-all duration-500`}>
          <Icon 
            className={`h-10 w-10 sm:h-12 sm:w-12 transition-transform duration-500 group-hover:scale-110`} 
            strokeWidth={1.5}
          />
        </div>
      </div>

      {/* Content */}
      <h3 className="mb-1.5 sm:mb-2 text-base sm:text-lg font-bold text-white leading-tight tracking-tight z-10" style={{ fontFamily: 'var(--font-plus-jakarta-sans), sans-serif' }}>{title}</h3>
      <p className="mb-3 sm:mb-4 flex-1 text-xs sm:text-sm leading-relaxed text-zinc-400 tracking-wide z-10">{desc}</p>

      {/* CTA */}
      <div className="flex items-center text-xs sm:text-sm font-medium text-zinc-400 transition-colors group-hover:text-white tracking-wide z-10">
        <span>Starten</span>
        <span className="ml-2 transition-transform duration-500 group-hover:translate-x-1">
          →
        </span>
      </div>
    </Link>
  );
}
