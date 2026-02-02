'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarPlus, Minus, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { addCalendarEvent, type CalendarEvent } from '@/actions/calendar-actions';
import { getShoppingLists, saveShoppingLists } from '@/actions/shopping-list-actions';
import { appendToList } from '@/lib/shopping-lists-storage';

type MealSlot = 'breakfast' | 'lunch' | 'dinner';

const SLOT_OPTIONS: { id: MealSlot; label: string; defaultTime: string }[] = [
  { id: 'breakfast', label: 'Frühstück', defaultTime: '08:00' },
  { id: 'lunch', label: 'Mittag', defaultTime: '12:30' },
  { id: 'dinner', label: 'Abend', defaultTime: '19:00' },
];

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeString(h: number, min: number): string {
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Default: Morgen 19:00 (Abend) */
function getDefaultDateAndTime(slot: MealSlot): { date: string; time: string } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const date = toDateKey(tomorrow);
  const opt = SLOT_OPTIONS.find((o) => o.id === slot) ?? SLOT_OPTIONS[2];
  const [h, m] = opt.defaultTime.split(':').map(Number);
  const time = toTimeString(h, m);
  return { date, time };
}

export interface PlanToCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipeName: string;
  resultId: string;
  ingredients: string[];
  defaultServings: number;
  onSuccess: (message: string) => void;
}

export function PlanToCalendarModal({
  isOpen,
  onClose,
  recipeName,
  resultId,
  ingredients,
  defaultServings,
  onSuccess,
}: PlanToCalendarModalProps) {
  const [slot, setSlot] = useState<MealSlot>('dinner');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('19:00');
  const [servings, setServings] = useState(defaultServings);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set(ingredients));
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(typeof window !== 'undefined' && window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const { date: d, time: t } = getDefaultDateAndTime('dinner');
    setDate(d);
    setTime(t);
    setSlot('dinner');
    setServings(defaultServings);
    setSelectedIngredients(new Set(ingredients));
  }, [isOpen, defaultServings, ingredients]);

  const handleSlotChange = (newSlot: MealSlot) => {
    setSlot(newSlot);
    const opt = SLOT_OPTIONS.find((o) => o.id === newSlot);
    if (opt) setTime(opt.defaultTime);
  };

  const toggleIngredient = (ing: string) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ing)) next.delete(ing);
      else next.add(ing);
      return next;
    });
  };

  const selectAllIngredients = () => setSelectedIngredients(new Set(ingredients));
  const deselectAllIngredients = () => setSelectedIngredients(new Set());

  const handleSave = async () => {
    if (!date || !time) return;
    setSaving(true);
    try {
      const event: CalendarEvent = {
        id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        type: 'meal',
        slot,
        date,
        time,
        recipeId: resultId,
        resultId,
        recipeName,
        servings,
        mealType: slot,
      };
      const calendarRes = await addCalendarEvent(event);
      if (!calendarRes.success) {
        onSuccess('Fehler beim Eintragen in den Kalender.');
        setSaving(false);
        return;
      }

      let ingredientsAdded = 0;
      const toAdd = Array.from(selectedIngredients);
      if (toAdd.length > 0) {
        const lists = await getShoppingLists();
        const listId = lists.length > 0 ? lists[0].id : '__new__';
        const { lists: next, appendedCount } = appendToList(
          lists,
          listId,
          toAdd,
          listId === '__new__' ? 'Allgemein' : undefined
        );
        const saveRes = await saveShoppingLists(next);
        if (saveRes.success) ingredientsAdded = appendedCount;
      }

      const dayName = new Date(date + 'T12:00').toLocaleDateString('de-DE', { weekday: 'long' });
      const msg =
        ingredientsAdded > 0
          ? `🍽️ Geplant für ${dayName}! ${ingredientsAdded} ${ingredientsAdded === 1 ? 'Zutat' : 'Zutaten'} auf der Liste.`
          : `🍽️ Geplant für ${dayName}!`;
      onSuccess(msg);
      onClose();
    } catch (e) {
      console.error('[PlanToCalendar]', e);
      onSuccess('Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          'w-full bg-white shadow-xl flex flex-col',
          isMobile ? 'max-h-[90vh] rounded-t-3xl' : 'max-w-md max-h-[90vh] rounded-2xl overflow-hidden'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-violet-500" />
            In Kalender eintragen
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Schließen">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 pb-32">
          {/* Wann? */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Wann?</h3>
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs text-gray-500 mb-1">Datum</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none"
                />
              </div>
              <div className="flex-1 min-w-[100px]">
                <label className="block text-xs text-gray-500 mb-1">Uhrzeit</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Typ? */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Typ?</h3>
            <div className="flex flex-wrap gap-2">
              {SLOT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSlotChange(opt.id)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-medium transition-all',
                    slot === opt.id ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Portionen */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Portionen?</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setServings((s) => Math.max(1, s - 1))}
                disabled={servings <= 1}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-700"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-lg font-bold text-gray-900 w-8 text-center">{servings}</span>
              <button
                type="button"
                onClick={() => setServings((s) => Math.min(8, s + 1))}
                disabled={servings >= 8}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Auf die Einkaufsliste? */}
          {ingredients.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Auf die Einkaufsliste?</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllIngredients}
                    className="text-xs text-violet-600 hover:underline"
                  >
                    Alle
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllIngredients}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Keine
                  </button>
                </div>
              </div>
              <ul className="space-y-2 max-h-48 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-3">
                {ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleIngredient(ing)}
                      className={cn(
                        'w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors',
                        selectedIngredients.has(ing)
                          ? 'bg-violet-600 border-violet-600 text-white'
                          : 'border-gray-300 bg-white hover:border-violet-300'
                      )}
                    >
                      {selectedIngredients.has(ing) ? <Check className="w-3 h-3" /> : null}
                    </button>
                    <span className="text-sm text-gray-800 truncate">{ing}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !date || !time}
            className="w-full py-4 rounded-full font-bold text-white bg-gradient-to-r from-violet-600 to-pink-500 shadow-lg hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {saving ? 'Wird gespeichert…' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
}
