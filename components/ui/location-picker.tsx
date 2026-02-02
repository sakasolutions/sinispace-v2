'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin } from 'lucide-react';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

export type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
  };
};

export type LocationValue = {
  name: string;
  lat: number;
  lon: number;
};

type LocationPickerProps = {
  value: string;
  onChange: (name: string, coords?: { lat: number; lon: number }) => void;
  placeholder?: string;
  id?: string;
  className?: string;
};

function formatDisplayName(result: NominatimResult): string {
  return result.display_name;
}

export function LocationPicker({ value, onChange, placeholder = 'z.B. Büro, Vapiano, Praxis', id = 'event-location', className }: LocationPickerProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external value into local query when it changes from outside (e.g. suggestion applied)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < MIN_QUERY_LENGTH) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        format: 'json',
        q: q.trim(),
        addressdetails: '1',
        limit: '5',
      });
      const res = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'SiniSpace-Calendar/1.0 (https://sinispace.app; calendar location search)',
        },
      });
      const data = (await res.json()) as NominatimResult[];
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const scheduleSearch = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (q.trim().length < MIN_QUERY_LENGTH) {
        setResults([]);
        debounceRef.current = null;
        return;
      }
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        fetchSuggestions(q);
      }, DEBOUNCE_MS);
    },
    [fetchSuggestions]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    onChange(v);
    setResults([]);
    scheduleSearch(v);
    setIsOpen(true);
  };

  const handleSelect = (result: NominatimResult) => {
    const name = formatDisplayName(result);
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setQuery(name);
    onChange(name, { lat, lon });
    setResults([]);
    setIsOpen(false);
  };

  const handleBlur = () => {
    // Close dropdown after a short delay so click on item registers
    setTimeout(() => setIsOpen(false), 150);
  };

  const handleFocus = () => {
    if (results.length > 0) setIsOpen(true);
  };

  // Click outside to close
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDocClick = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-gray-600 mb-2">
        <MapPin className="w-4 h-4 inline mr-1" /> Ort (optional)
      </label>
      <input
        id={id}
        type="text"
        value={query}
        onChange={handleInputChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        className={className ?? 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 outline-none transition-all'}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={isOpen ? `${id}-listbox` : undefined}
        role="combobox"
      />
      {isOpen && (results.length > 0 || isLoading) && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 left-0 right-0 mt-1 py-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto"
        >
          {isLoading && (
            <li className="px-4 py-3 text-sm text-gray-500">Suche…</li>
          )}
          {!isLoading && results.map((r, i) => (
            <li
              key={`${r.lat}-${r.lon}-${i}`}
              role="option"
              tabIndex={0}
              className="px-4 py-2.5 text-sm text-gray-900 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(r);
              }}
            >
              {formatDisplayName(r)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
