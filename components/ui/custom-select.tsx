'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

type Option = string | { value: string; label: string };

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  name?: string; // Für Form-Integration
  disabled?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Auswählen...',
  icon: Icon,
  name,
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Optionen normalisieren
  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Aktuelle Option finden
  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  // Klick außerhalb schließt das Dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Hidden input für Form-Integration
  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Hidden Input für Form-Integration */}
      {name && (
        <input type="hidden" name={name} value={value} />
      )}

      {/* Select Button (Closed State) */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm transition-all min-h-[44px] flex justify-between items-center ${
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50'
        } ${
          value ? 'text-white' : 'text-zinc-500'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown List (Open State) */}
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 w-full mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[100] max-h-[200px] overflow-auto">
          {normalizedOptions.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={`w-full p-3 text-left text-sm transition-colors flex items-center justify-between ${
                  isSelected
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-zinc-300 hover:bg-zinc-800'
                } ${
                  normalizedOptions.indexOf(option) === 0 ? 'rounded-t-xl' : ''
                } ${
                  normalizedOptions.indexOf(option) === normalizedOptions.length - 1 ? 'rounded-b-xl' : ''
                }`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <Check className="w-4 h-4 text-indigo-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
