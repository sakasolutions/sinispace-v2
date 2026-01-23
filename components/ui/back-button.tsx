'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type BackButtonProps = {
  href?: string;
  label?: string;
  className?: string;
};

export function BackButton({ href = '/dashboard', label = 'Zurück', className = '' }: BackButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-4 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{label}</span>
    </Link>
  );
}
