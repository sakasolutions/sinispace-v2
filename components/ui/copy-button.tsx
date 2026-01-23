'use client';

import { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic-feedback';

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
  const [longPressActive, setLongPressActive] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ time: number } | null>(null);

  const LONG_PRESS_DURATION = 500;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      triggerHaptic('success');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
    }
  };

  // Long-Press Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { time: Date.now() };
    const timer = setTimeout(() => {
      triggerHaptic('medium');
      setLongPressActive(true);
      handleCopy();
      touchStartRef.current = null;
    }, LONG_PRESS_DURATION);
    longPressTimerRef.current = timer;
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressActive) {
      setTimeout(() => setLongPressActive(false), 1000);
    }
    touchStartRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

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
      <div className="relative">
        <button
          onClick={handleCopy}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`rounded-md transition-all ${variantClasses.icon} ${className} ${longPressActive ? 'bg-green-500/20' : ''}`}
          title={copied ? 'Kopiert!' : 'In Zwischenablage kopieren (Long-Press für direktes Kopieren)'}
        >
          {copied ? (
            <Check className={iconSizes[size]} />
          ) : (
            <Copy className={iconSizes[size]} />
          )}
        </button>
        {longPressActive && (
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
            Kopiert!
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`inline-flex items-center gap-2 rounded-md font-medium transition-all ${sizeClasses[size]} ${variantClasses[variant]} ${className} ${longPressActive ? 'bg-green-500/20 border-green-500/50' : ''}`}
        title={copied ? 'Kopiert!' : 'In Zwischenablage kopieren (Long-Press für direktes Kopieren)'}
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
      {longPressActive && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-green-500/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50">
          Kopiert!
        </div>
      )}
    </div>
  );
}
