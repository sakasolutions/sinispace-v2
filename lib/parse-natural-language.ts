/**
 * Natürlichsprachliches Parsing für Kalender-Eingaben.
 * Erkennt: Datum, Zeit, Wiederholung, Dauer, Ort, Personen.
 */

import { RRule } from 'rrule';
// RRule weekdays: MO=0, TU=1, WE=2, TH=3, FR=4, SA=5, SU=6
const RRULE_DAYS = [RRule.SU, RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA] as const;

const PAD = (n: number) => n.toString().padStart(2, '0');

const WEEKDAYS: [number, string][] = [
  [0, 'sonntag'], [1, 'montag'], [2, 'dienstag'], [3, 'mittwoch'],
  [4, 'donnerstag'], [5, 'freitag'], [6, 'samstag'],
];

const MONTH_NAMES: Record<string, number> = {
  januar: 0, februar: 1, märz: 2, april: 3, mai: 4, juni: 5,
  juli: 6, august: 7, september: 8, oktober: 9, november: 10, dezember: 11,
};

export type ParsedEvent = {
  date: string;
  time: string;
  endTime?: string;
  title: string;
  isMeal: boolean;
  durationMinutes?: number;
  location?: string;
  withPerson?: string;
  rrule?: string;
  until?: string;
  recurrenceLabel?: string;
};

export type SmartTag = { type: 'date' | 'time' | 'recurrence' | 'duration' | 'location' | 'person'; label: string };

function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${PAD(d.getMonth() + 1)}-${PAD(d.getDate())}`;
}

/** Extrahiert die Basis-Info und bereinigt den Titel */
function extractAndClean(
  text: string,
  baseDate: Date
): { date: string; time: string; endTime?: string; title: string; durationMinutes?: number; location?: string; withPerson?: string } {
  let t = text.trim();
  const today = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 12, 0, 0);
  let resultDate = new Date(today);
  let time = '18:00';
  let endTime: string | undefined;
  let durationMinutes: number | undefined;
  let location: string | undefined;
  let withPerson: string | undefined;

  // Zeit: "18 Uhr", "14:30", "bis 20 Uhr"
  const timeMatch = t.match(/(\d{1,2})[:\s.]*(\d{2})?\s*uhr/i) || t.match(/(\d{1,2})[:\s.](\d{2})\b/);
  if (timeMatch) {
    const h = parseInt(timeMatch[1], 10);
    const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    time = `${PAD(h)}:${PAD(m)}`;
  }

  const bisTimeMatch = t.match(/bis\s+(\d{1,2})[:\s.]*(\d{2})?\s*uhr/i);
  if (bisTimeMatch) {
    const h = parseInt(bisTimeMatch[1], 10);
    const m = bisTimeMatch[2] ? parseInt(bisTimeMatch[2], 10) : 0;
    endTime = `${PAD(h)}:${PAD(m)}`;
  }

  // Dauer: "für 2 Stunden", "1 Stunde", "30 min", "2h"
  const durationMatch = t.match(/(?:f[üu]r\s+)?(\d+)\s*(?:stunden?|h(?:ours?)?)/i)
    || t.match(/(?:f[üu]r\s+)?(\d+)\s*min(?:uten?)?/i);
  if (durationMatch) {
    const n = parseInt(durationMatch[1], 10);
    durationMinutes = t.toLowerCase().includes('min') ? n : n * 60;
  } else if (t.match(/(\d+)\s*h\b/i)) {
    durationMinutes = parseInt(t.match(/(\d+)\s*h\b/i)![1], 10) * 60;
  }
  if (!durationMinutes && endTime) {
    const [sh, sm] = time.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    durationMinutes = (eh * 60 + em) - (sh * 60 + sm);
  }
  if (!durationMinutes) durationMinutes = 60; // Default 1h

  // Ort: "im Vapiano", "in der Stadt", "bei Maria", "Essen im Restaurant"
  const locationMatch = t.match(/(?:in\s+der?|im|bei)\s+([A-Za-zÄäÖöÜüß\s]+?)(?=\s+(?:bis|für|um|\d|$)|$)/i)
    || t.match(/(?:in|im|bei)\s+([A-Za-zÄäÖöÜüß]+)/i);
  if (locationMatch) {
    location = locationMatch[1].trim();
  }

  // Personen: "mit Anna", "mit Max und Lisa"
  const personMatch = t.match(/mit\s+([A-Za-zÄäÖöÜüß][A-Za-zÄäÖöÜüß\s]+?)(?=\s+(?:bis|für|um|in|im|bei|\d|$)|$)/i);
  if (personMatch) {
    withPerson = personMatch[1].trim();
  }

  // Datum: explizit (18.02.2026, 18.2.26, 18/02/2026) ODER morgen, übermorgen, Wochentag
  const explicitDateMatch = t.match(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})\b/);
  if (explicitDateMatch) {
    const day = parseInt(explicitDateMatch[1], 10);
    const month = parseInt(explicitDateMatch[2], 10) - 1;
    let year = parseInt(explicitDateMatch[3], 10);
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    resultDate = new Date(year, month, day, 12, 0, 0);
  } else {
    const todayDay = today.getDay();
    if (t.includes('morgen') && !t.includes('übermorgen')) {
      resultDate.setDate(resultDate.getDate() + 1);
    } else if (t.includes('übermorgen')) {
      resultDate.setDate(resultDate.getDate() + 2);
    } else {
      for (const [targetDay, name] of WEEKDAYS) {
        if (t.includes(name)) {
          let diff = (targetDay - todayDay + 7) % 7;
          if (diff === 0) diff = 7;
          resultDate.setDate(resultDate.getDate() + diff);
          break;
        }
      }
    }
  }

  // Titel bereinigen
  let title = t
    .replace(/\b(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})\b/g, '')
    .replace(/\b(morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/gi, '')
    .replace(/\b(jeden|jede|wöchentlich|täglich|daily|weekly)\b/gi, '')
    .replace(/\b(jeden\s+\d+\.?)\s*/gi, '')
    .replace(/\d{1,2}[:\s.]?\d{0,2}\s*uhr/gi, '')
    .replace(/\d{1,2}[:\s.]\d{2}\b/g, '')
    .replace(/\bbis\s+(?:ende\s+)?\w+/gi, '')
    .replace(/\bbis\s+\d{1,2}\.\d{1,2}\.?\s*/gi, '')
    .replace(/(?:f[üu]r\s+)?\d+\s*(?:stunden?|h|min(?:uten?)?)/gi, '')
    .replace(/(?:in\s+der?|im|bei)\s+[A-Za-zÄäÖöÜüß\s]+/gi, '')
    .replace(/mit\s+[A-Za-zÄäÖöÜüß\s]+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!title) title = t;
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    date: toLocalDateString(resultDate),
    time,
    endTime,
    title,
    durationMinutes,
    location,
    withPerson,
  };
}

/** Parst "bis Ende Mai", "bis 20.12.", "für 3 Wochen" */
function parseUntil(text: string, baseDate: Date): Date | null {
  const t = text.toLowerCase();

  const endOfMonthMatch = t.match(/bis\s+ende\s+(\w+)/i);
  if (endOfMonthMatch) {
    const monthName = endOfMonthMatch[1];
    const month = MONTH_NAMES[monthName];
    if (month !== undefined) {
      const year = baseDate.getFullYear();
      const d = new Date(year, month + 1, 0); // letzter Tag des Monats
      if (d < baseDate) d.setFullYear(year + 1);
      return d;
    }
  }

  const dateMatch = t.match(/bis\s+(\d{1,2})\.(\d{1,2})\.?(\d{4})?/i);
  if (dateMatch) {
    const day = parseInt(dateMatch[1], 10);
    const month = parseInt(dateMatch[2], 10) - 1;
    const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : baseDate.getFullYear();
    return new Date(year, month, day);
  }

  const weeksMatch = t.match(/f[üu]r\s+(\d+)\s*wochen/i);
  if (weeksMatch) {
    const n = parseInt(weeksMatch[1], 10);
    const d = new Date(baseDate);
    d.setDate(d.getDate() + n * 7);
    return d;
  }

  return null;
}

/** Parst Wiederholung: jeden Freitag, wöchentlich, täglich, jeden 2. Montag */
function parseRecurrence(
  text: string,
  baseDate: Date,
  firstDate: Date,
  time: string
): { rrule: string; until: string; recurrenceLabel: string } | null {
  const t = text.toLowerCase();
  if (!/\b(jeden|jede|wöchentlich|täglich|daily|weekly)\b/i.test(t)) return null;

  const [th, tm] = time.split(':').map(Number);
  const dtstart = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate(), th, tm, 0);
  const until = parseUntil(text, baseDate);
  const untilDate = until || new Date(baseDate.getFullYear() + 1, 11, 31);

  let freq: number = RRule.WEEKLY;
  let byweekday: (typeof RRULE_DAYS)[number][] | undefined;
  let interval = 1;
  let foundDow: number | null = null;

  if (/\b(täglich|daily)\b/i.test(t)) {
    freq = RRule.DAILY;
  } else if (/\b(wöchentlich|weekly)\b/i.test(t) || /\bjeden\s+\w+tag\b/i.test(t)) {
    freq = RRule.WEEKLY;
    for (const [dow, name] of WEEKDAYS) {
      if (t.includes(name)) {
        byweekday = [RRULE_DAYS[dow]];
        foundDow = dow;
        break;
      }
    }
    const nthMatch = t.match(/jeden\s+(\d+)\.\s*/i);
    if (nthMatch) {
      interval = parseInt(nthMatch[1], 10) || 1;
    }
  }

  const rule = new RRule({
    freq,
    dtstart,
    until: untilDate,
    byweekday: byweekday,
    interval,
  });

  const rruleStr = rule.toString();
  const untilStr = toLocalDateString(untilDate);

  const dayNames: Record<number, string> = { 0: 'So', 1: 'Mo', 2: 'Di', 3: 'Mi', 4: 'Do', 5: 'Fr', 6: 'Sa' };
  const monthName = Object.keys(MONTH_NAMES).find((k) => MONTH_NAMES[k] === untilDate.getMonth()) ?? '';
  let label = 'Wiederholt sich ';
  if (freq === RRule.DAILY) label += 'täglich';
  else if (freq === RRule.WEEKLY && foundDow !== null) label += `wöchentlich (${dayNames[foundDow]})`;
  else label += 'wöchentlich';
  label += ` bis ${untilDate.getDate()}. ${monthName}`;

  return { rrule: rruleStr, until: untilStr, recurrenceLabel: label };
}

/** Prüft ob Input nach Essen klingt */
function looksLikeFood(text: string): boolean {
  const t = text.toLowerCase();
  const keywords = ['essen', 'pizza', 'abendessen', 'mittag', 'frühstück', 'kochen', 'rezept', 'pasta', 'salat', 'suppe', 'brunch'];
  return keywords.some((k) => t.includes(k));
}

export function parseNaturalLanguage(text: string, baseDate: Date): ParsedEvent {
  const base = extractAndClean(text, baseDate);
  const firstDate = new Date(base.date + 'T12:00');
  const recurrence = parseRecurrence(text, baseDate, firstDate, base.time);

  return {
    date: base.date,
    time: base.time,
    endTime: base.endTime,
    title: base.title,
    isMeal: looksLikeFood(text),
    durationMinutes: base.durationMinutes,
    location: base.location,
    withPerson: base.withPerson,
    rrule: recurrence?.rrule,
    until: recurrence?.until,
    recurrenceLabel: recurrence?.recurrenceLabel,
  };
}

export function getSmartTags(parsed: ParsedEvent, baseDate: Date): SmartTag[] {
  const tags: SmartTag[] = [];
  const d = new Date(parsed.date + 'T12:00');
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const dayLabel = parsed.date === toLocalDateString(baseDate) ? 'Heute' : dayNames[d.getDay()];
  tags.push({ type: 'date', label: `🗓️ ${dayLabel}, ${parsed.time}` });
  if (parsed.recurrenceLabel) {
    tags.push({ type: 'recurrence', label: `🔄 ${parsed.recurrenceLabel.replace('Wiederholt sich ', '')}` });
  }
  if (parsed.durationMinutes && parsed.durationMinutes !== 60) {
    const h = Math.floor(parsed.durationMinutes / 60);
    const m = parsed.durationMinutes % 60;
    tags.push({ type: 'duration', label: `⏳ ${h > 0 ? h + 'h' : ''}${m > 0 ? m + 'min' : ''}`.trim() });
  }
  if (parsed.location) tags.push({ type: 'location', label: `📍 ${parsed.location}` });
  if (parsed.withPerson) tags.push({ type: 'person', label: `👤 mit ${parsed.withPerson}` });
  return tags;
}
