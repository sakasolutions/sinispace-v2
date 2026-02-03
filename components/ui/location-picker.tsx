'use client';

type LocationPickerProps = {
  id: string;
  value: string;
  onChange: (name: string, coords?: { lat: number; lon: number }) => void;
  placeholder?: string;
  className?: string;
};

/**
 * Einfacher Ort-Eingabe: Textfeld für Adresse/Ort.
 * Koordinaten (z. B. via Nominatim) können später ergänzt werden.
 */
export function LocationPicker({ id, value, onChange, placeholder, className = '' }: LocationPickerProps) {
  return (
    <input
      type="text"
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
