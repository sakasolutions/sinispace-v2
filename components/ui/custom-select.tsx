'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  variant?: 'dropdown' | 'modal';
  theme?: 'dark' | 'light'; // 'light' = weißes SiniSpace-Design (z.B. Settings)
  /** Dropdown-Liste per Portal rendern (z.B. in Modals mit overflow), damit nichts abgeschnitten wird */
  dropdownInPortal?: boolean;
  /** Zusätzliche Klassen für den Trigger-Button (z.B. filled-Style) */
  triggerClassName?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Auswählen...',
  icon: Icon,
  name,
  disabled = false,
  variant = 'dropdown',
  theme = 'dark',
  dropdownInPortal = false,
  triggerClassName,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalRect, setPortalRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Optionen normalisieren
  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Aktuelle Option finden
  const selectedOption = normalizedOptions.find(opt => opt.value === value);

  // Klick außerhalb schließt das Dropdown/Modal
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (variant === 'modal') {
        const target = event.target as HTMLElement;
        if (target.classList.contains('custom-select-modal-backdrop')) {
          setIsOpen(false);
        }
      } else {
        const target = event.target as Node;
        const inContainer = containerRef.current?.contains(target);
        const inDropdown = dropdownInPortal && dropdownRef.current?.contains(target);
        if (!inContainer && !inDropdown) {
          setIsOpen(false);
        }
      }
    }

    // Escape-Taste schließt Modal/Dropdown
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      if (variant === 'modal') {
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
        if (variant === 'modal') {
          document.body.style.overflow = '';
        }
      };
    }
  }, [isOpen, variant, dropdownInPortal]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Bei dropdownInPortal: Position messen wenn geöffnet
  useEffect(() => {
    if (!isOpen || !dropdownInPortal || variant !== 'dropdown' || !containerRef.current) {
      setPortalRect(null);
      return;
    }
    const update = () => {
      const r = containerRef.current?.getBoundingClientRect();
      if (r) setPortalRect({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isOpen, dropdownInPortal, variant]);

  const dropdownList = (
    <div
      ref={dropdownRef}
      className={`custom-select-dropdown rounded-xl z-[100] max-h-[200px] overflow-auto ${
        theme === 'light'
          ? 'bg-white border-2 border-orange-200 shadow-lg shadow-orange-500/15 ring-2 ring-orange-100/80'
          : 'bg-zinc-900 border border-white/10 shadow-xl'
      } ${dropdownInPortal && portalRect ? 'fixed' : 'absolute top-full left-0 w-full mt-2'}`}
      style={
        dropdownInPortal && portalRect
          ? { top: portalRect.top, left: portalRect.left, width: portalRect.width }
          : undefined
      }
    >
      {normalizedOptions.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`appearance-none w-full p-3 text-left text-sm transition-colors flex items-center justify-between ${
              theme === 'light'
                ? isSelected
                  ? 'bg-orange-50 text-orange-700 font-medium shadow-[inset_4px_0_0_0_#f97316]'
                  : 'text-gray-700 hover:bg-orange-50/50'
                : isSelected
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
              <Check className={`w-4 h-4 shrink-0 ${theme === 'light' ? 'text-orange-500' : 'text-indigo-400'}`} />
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={containerRef} className="custom-select relative w-full">
      {/* Hidden Input für Form-Integration */}
      {name && (
        <input type="hidden" name={name} value={value} />
      )}

      {/* Select Button (Closed State) – appearance-none verhindert System-/Mac-Dropdown-Look */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`appearance-none w-full rounded-xl px-4 py-3 text-sm transition-all min-h-[44px] flex justify-between items-center relative ${
          theme === 'light'
            ? `border border-gray-200 bg-white ${value ? 'text-gray-900' : 'text-gray-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-orange-200 hover:bg-orange-50/50 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-500'}`
            : `border border-white/10 bg-zinc-900/50 ${value ? 'text-white' : 'text-zinc-500'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50'}`
        } ${triggerClassName ?? ''}`}
      >
        {Icon && triggerClassName && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400 pointer-events-none">
            <Icon className="w-5 h-5" />
          </span>
        )}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {Icon && !triggerClassName && <Icon className={`w-4 h-4 flex-shrink-0 ${theme === 'light' ? 'text-gray-500' : ''}`} />}
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${theme === 'light' ? 'text-gray-400' : ''} ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown List (Open State - Variant: dropdown) */}
      {isOpen && !disabled && variant === 'dropdown' &&
        (dropdownInPortal && portalRect
          ? createPortal(dropdownList, document.body)
          : !dropdownInPortal
            ? dropdownList
            : null)}

      {/* Modal Popup (Open State - Variant: modal) */}
      {isOpen && !disabled && variant === 'modal' && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] custom-select-modal-backdrop"
            onClick={() => setIsOpen(false)}
          />
          {/* Modal Content - Zentriert */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-zinc-900 border border-white/10 rounded-xl shadow-2xl max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col pointer-events-auto animate-in fade-in-0 zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="w-4 h-4 text-zinc-400" />}
                  <span className="text-sm font-medium text-zinc-300">Auswählen</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-zinc-400 hover:text-white transition-colors"
                  aria-label="Schließen"
                >
                  ×
                </button>
              </div>
              {/* Modal Options List */}
              <div className="overflow-y-auto flex-1">
                {normalizedOptions.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`w-full p-4 text-left text-sm transition-colors flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-500/10 text-indigo-400'
                          : 'text-zinc-300 hover:bg-zinc-800'
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
