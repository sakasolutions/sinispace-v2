'use client';

import { useState, useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomEventType } from '@/actions/calendar-actions';

const EVENT_TYPES: { id: CustomEventType; label: string; icon: string; color: string }[] = [
  { id: 'meeting', label: 'Meeting', icon: '👔', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'reminder', label: 'Erinnerung', icon: '🔔', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'personal', label: 'Persönlich', icon: '👤', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { id: 'work', label: 'Arbeit', icon: '💼', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

type SubmitPayload = { type: CustomEventType; title: string; date: string; time: string; endTime?: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  defaultTime?: string;
  editEvent?: { id: string; eventType: CustomEventType; title: string; date: string; time: string; endTime?: string };
  onSubmit: (event: SubmitPayload & { id?: string }) => void;
};

export function EventCreateModal({ isOpen, onClose, date, defaultTime = '09:00', editEvent, onSubmit }: Props) {
  const [eventType, setEventType] = useState<CustomEventType>('meeting');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState(defaultTime);
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (editEvent) {
        setEventType(editEvent.eventType);
        setTitle(editEvent.title);
        setTime(editEvent.time);
        setEndTime(editEvent.endTime ?? '');
      } else {
        setEventType('meeting');
        setTitle('');
        setTime(defaultTime);
        setEndTime('');
      }
    }
  }, [isOpen, editEvent, defaultTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ type: eventType, title: title.trim(), date: editEvent?.date ?? date, time, endTime: endTime || undefined, id: editEvent?.id });
    setTitle('');
    setTime(defaultTime);
    setEndTime('');
    setEventType('meeting');
    onClose();
  };

  const handleClose = () => {
    setTitle('');
    setEventType('meeting');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} aria-hidden />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
        role="dialog"
        aria-labelledby="event-modal-title"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h2 id="event-modal-title" className="text-lg font-semibold text-gray-900">
            {editEvent ? 'Termin bearbeiten' : 'Termin erstellen'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Schließen"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-5">
          {/* Typ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Art</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEventType(t.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border text-sm font-medium transition-all',
                    eventType === t.id ? t.color + ' border-2' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  <span className="text-lg">{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Titel */}
          <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-gray-700 mb-2">
              Titel
            </label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Team Call, Zahnarzt..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
              autoFocus
              required
            />
          </div>

          {/* Datum & Zeit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="event-date" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" /> Datum
              </label>
              <input
                id="event-date"
                type="date"
                value={editEvent?.date ?? date}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-700"
              />
            </div>
            <div>
              <label htmlFor="event-time" className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-1" /> Von
              </label>
              <input
                id="event-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="event-end" className="block text-sm font-medium text-gray-700 mb-2">
              Bis (optional)
            </label>
            <input
              id="event-end"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium hover:shadow-lg hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {editEvent ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
