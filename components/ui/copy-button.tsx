'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

type CopyButtonProps = {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'icon';
};

export function CopyButton({ 
  text, 
  className = '', 
  size = 'md',
  variant = 'default'
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
    }
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10',
    ghost: 'bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-white',
    icon: 'bg-transparent hover:bg-zinc-800/50 text-zinc-400 hover:text-white p-1.5',
  };

  // Icon sizes
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleCopy}
        className={`rounded-md transition-all ${variantClasses.icon} ${className}`}
        title={copied ? 'Kopiert!' : 'In Zwischenablage kopieren'}
      >
        {copied ? (
          <Check className={iconSizes[size]} />
        ) : (
          <Copy className={iconSizes[size]} />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 rounded-md font-medium transition-all ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      title={copied ? 'Kopiert!' : 'In Zwischenablage kopieren'}
    >
      {copied ? (
        <>
          <Check className={iconSizes[size]} />
          <span>Kopiert!</span>
        </>
      ) : (
        <>
          <Copy className={iconSizes[size]} />
          <span>Kopieren</span>
        </>
      )}
    </button>
  );
}
