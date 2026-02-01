'use client';

import { Trash2 } from 'lucide-react';
import type { CalendarEvent } from '@/actions/calendar-actions';

type Props = {
  event: CalendarEvent;
  children: React.ReactNode;
  onDelete: (id: string) => void;
};

export function SwipeableEventItem({ event, children, onDelete }: Props) {
  return (
    <div className="group relative">
      {children}
      <button
        onClick={() => onDelete(event.id)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-300 opacity-40 md:opacity-0 md:group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
        aria-label="Löschen"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
