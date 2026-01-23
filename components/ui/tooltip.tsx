'use client';

import { useState, ReactNode } from 'react';
import { HelpCircle, Info, Lightbulb } from 'lucide-react';

type TooltipProps = {
  content: string | ReactNode;
  children?: ReactNode;
  variant?: 'info' | 'help' | 'tip';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  iconOnly?: boolean;
};

export function Tooltip({ 
  content, 
  children, 
  variant = 'info',
  position = 'top',
  className = '',
  iconOnly = false
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const iconMap = {
    info: Info,
    help: HelpCircle,
    tip: Lightbulb,
  };

  const Icon = iconMap[variant];

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const variantColors = {
    info: 'bg-blue-500/90 border-blue-400/50 text-blue-50',
    help: 'bg-zinc-800/95 border-zinc-700/50 text-zinc-200',
    tip: 'bg-amber-500/90 border-amber-400/50 text-amber-50',
  };

  const iconColors = {
    info: 'text-blue-400',
    help: 'text-zinc-400',
    tip: 'text-amber-400',
  };

  return (
    <div 
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || (
        <button
          type="button"
          className={`inline-flex items-center justify-center ${iconOnly ? 'w-4 h-4' : 'w-5 h-5'} ${iconColors[variant]} hover:opacity-80 transition-opacity`}
          aria-label="Information"
        >
          <Icon className="w-full h-full" />
        </button>
      )}
      
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} pointer-events-none`}
        >
          <div className={`relative rounded-lg border px-3 py-2 text-xs font-normal shadow-lg max-w-xs ${variantColors[variant]}`}>
            <div className="whitespace-normal break-words">
              {typeof content === 'string' ? (
                <p>{content}</p>
              ) : (
                content
              )}
            </div>
            {/* Arrow */}
            <div
              className={`absolute ${
                position === 'top' ? 'top-full left-1/2 -translate-x-1/2 border-t-4 border-t-blue-500/90 border-x-4 border-x-transparent' :
                position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 border-b-4 border-b-blue-500/90 border-x-4 border-x-transparent' :
                position === 'left' ? 'left-full top-1/2 -translate-y-1/2 border-l-4 border-l-blue-500/90 border-y-4 border-y-transparent' :
                'right-full top-1/2 -translate-y-1/2 border-r-4 border-r-blue-500/90 border-y-4 border-y-transparent'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Convenience Component für Label mit Tooltip
type LabelWithTooltipProps = {
  label: string;
  tooltip: string | ReactNode;
  variant?: 'info' | 'help' | 'tip';
  required?: boolean;
  className?: string;
};

export function LabelWithTooltip({ 
  label, 
  tooltip, 
  variant = 'info',
  required = false,
  className = ''
}: LabelWithTooltipProps) {
  return (
    <label className={`block text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2 ${className}`}>
      <span>{label}</span>
      {required && <span className="text-red-400">*</span>}
      <Tooltip content={tooltip} variant={variant} iconOnly />
    </label>
  );
}
