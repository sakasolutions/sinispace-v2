'use client';

import { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CalendarEvent } from '@/actions/calendar-actions';

type Props = {
  event: CalendarEvent;
  children: React.ReactNode;
  onDelete: (id: string) => void;
  colorClass: string;
};

export function SwipeableEventItem({ event, children, onDelete, colorClass }: Props) {
  const [swipeX, setSwipeX] = useState(0);
  const startRef = useRef<{ x: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    startRef.current = { x: e.touches[0].clientX };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startRef.current) return;
    const dx = e.touches[0].clientX - startRef.current.x;
    if (dx < 0) setSwipeX(Math.max(-100, dx));
  };

  const handleTouchEnd = () => {
    if (swipeX < -60) {
      onDelete(event.id);
    }
    setSwipeX(0);
    startRef.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startRef.current = { x: e.clientX };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startRef.current || e.buttons !== 1) return;
    const dx = e.clientX - startRef.current.x;
    if (dx < 0) setSwipeX(Math.max(-100, dx));
  };

  const handleMouseUp = () => {
    if (swipeX < -60) onDelete(event.id);
    setSwipeX(0);
    startRef.current = null;
  };

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Delete-Bereich (wird beim Swipe sichtbar) */}
      <div className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center bg-red-500">
        <Trash2 className="w-5 h-5 text-white" />
      </div>
      <div
        className={cn('relative bg-inherit', colorClass)}
        style={{ transform: `translateX(${swipeX}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
