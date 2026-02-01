'use client';

import { useState, useRef } from 'react';
import { Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/actions/calendar-actions';

type Props = {
  event: CalendarEvent;
  children: React.ReactNode;
  onDelete: (id: string) => void;
  onEdit?: (event: CalendarEvent) => void;
  enableSwipe?: boolean;
};

const SWIPE_THRESHOLD = 60;

export function SwipeableEventItem({ event, children, onDelete, onEdit, enableSwipe = true }: Props) {
  const [swipeX, setSwipeX] = useState(0);
  const startRef = useRef<{ x: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!enableSwipe) return;
    startRef.current = { x: e.touches[0].clientX };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!enableSwipe || !startRef.current) return;
    const dx = e.touches[0].clientX - startRef.current.x;
    setSwipeX(Math.max(-80, Math.min(80, dx)));
  };

  const handleTouchEnd = () => {
    if (!enableSwipe) return;
    if (swipeX < -SWIPE_THRESHOLD) onDelete(event.id);
    else if (swipeX > SWIPE_THRESHOLD && onEdit) onEdit(event);
    setSwipeX(0);
    startRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enableSwipe) return;
    startRef.current = { x: e.clientX };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!enableSwipe || !startRef.current || e.buttons !== 1) return;
    const dx = e.clientX - startRef.current.x;
    setSwipeX(Math.max(-80, Math.min(80, dx)));
  };

  const handleMouseUp = () => {
    if (!enableSwipe) return;
    if (swipeX < -SWIPE_THRESHOLD) onDelete(event.id);
    else if (swipeX > SWIPE_THRESHOLD && onEdit) onEdit(event);
    setSwipeX(0);
    startRef.current = null;
  };

  const showSwipeUI = enableSwipe;

  if (!showSwipeUI) {
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

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Swipe Links (Karte nach links) → rechts sichtbar: Delete (rot) */}
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center',
          swipeX < -20 ? 'opacity-100' : 'opacity-0'
        )}
      >
        <div className="flex items-center justify-center w-full h-full bg-red-500">
          <Trash2 className="w-5 h-5 text-white" />
        </div>
      </div>
      {/* Swipe Rechts (Karte nach rechts) → links sichtbar: Edit (blau-grau) */}
      {onEdit && (
        <div
          className={cn(
            'absolute left-0 top-0 bottom-0 w-20 flex items-center justify-center',
            swipeX > 20 ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="flex items-center justify-center w-full h-full bg-blue-600">
            <Pencil className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
      <div className="relative transition-transform duration-150" style={{ transform: `translateX(${swipeX}px)` }}>
        {children}
      </div>
    </div>
  );
}
