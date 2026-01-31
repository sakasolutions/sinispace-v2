'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';

/** Einfaches Text-Parsing: "Morgen 15 Uhr Zahnarzt" → date, time, title */
function parseQuickInput(text: string, baseDate: Date): { date: string; time: string; title: string } | null {
  const t = text.trim().toLowerCase();
  if (t.length < 2) return null;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const today = new Date(baseDate);
  today.setHours(0, 0, 0, 0);

  let date = new Date(today);
  let time = '09:00';
  let title = '';

  // Zeit-Pattern: "15 uhr", "15:00", "15.00", "9 uhr"
  const timeMatch = t.match(/(\d{1,2})[:\s.]*(\d{2})?\s*uhr/i) || t.match(/(\d{1,2})[:\s.](\d{2})\b/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) time = `${pad(h)}:${pad(m)}`;
  }

  // Datum: "morgen", "übermorgen", "montag", "dienstag", ...
  const wdays: Record<string, number> = { so: 0, mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6 };
  const wdayNames = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
  const todayWday = (baseDate.getDay() + 7) % 7; // 0=So

  if (t.includes('übermorgen')) {
    date.setDate(date.getDate() + 2);
  } else if (t.includes('morgen')) {
    date.setDate(date.getDate() + 1);
  } else {
    for (let i = 0; i < wdayNames.length; i++) {
      if (t.includes(wdayNames[i])) {
        let diff = (wdays[wdayNames[i].slice(0, 2)] - todayWday + 7) % 7;
        if (diff === 0) diff = 7; // "Montag" nächste Woche wenn heute Montag
        date.setDate(date.getDate() + diff);
        break;
      }
    }
  }

  // Titel: Alles außer Zeit/Datum
  title = t
    .replace(/\b(morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, '')
    .replace(/\d{1,2}[:\s.]?\d{0,2}\s*uhr/gi, '')
    .replace(/\d{1,2}[:\s.]\d{2}\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) return null;

  return {
    date: date.toISOString().slice(0, 10),
    time,
    title: title.charAt(0).toUpperCase() + title.slice(1),
  };
}

type Props = {
  onAdd: (data: { title: string; date: string; time: string }) => void;
  dateKey: string;
  placeholder?: string;
};

export function SmartQuickAdd({ onAdd, dateKey, placeholder }: Props) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const baseDate = new Date(dateKey + 'T12:00');
    const parsed = parseQuickInput(value, baseDate);
    if (parsed) {
      onAdd(parsed);
      setValue('');
    } else if (value.trim()) {
      // Fallback: nur Titel, heute + 09:00
      onAdd({
        title: value.trim().charAt(0).toUpperCase() + value.trim().slice(1),
        date: dateKey,
        time: '09:00',
      });
      setValue('');
    }
  };

  const canSubmit = value.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder || 'z.B. Morgen 15 Uhr Zahnarzt oder Dienstag Friseur'}
        className="flex-1 min-h-[48px] px-4 rounded-xl border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-base"
        autoComplete="off"
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-orange-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
        aria-label="Hinzufügen"
      >
        <Send className="w-5 h-5" />
      </button>
    </form>
  );
}
