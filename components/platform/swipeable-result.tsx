'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { Maximize2, Copy, X } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic-feedback';

type SwipeableResultProps = {
  children: ReactNode;
  onCopy?: () => void;
  copyText?: string;
};

export function SwipeableResult({ children, onCopy, copyText }: SwipeableResultProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [longPressActive, setLongPressActive] = useState(false);
  const touchStartRef = useRef<{ y: number; time: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 50;
  const FULLSCREEN_THRESHOLD = 80;
  const LONG_PRESS_DURATION = 500;

  // Touch-Handler für Swipe nach oben (Vollbild)
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      y: touch.clientY,
      time: Date.now(),
    };

    // Long-Press Timer für Copy-Button
    const timer = setTimeout(() => {
      triggerHaptic('medium');
      setLongPressActive(true);
      if (onCopy) {
        onCopy();
      } else if (copyText) {
        navigator.clipboard.writeText(copyText).then(() => {
          triggerHaptic('success');
        }).catch(() => {});
      }
      touchStartRef.current = null;
    }, LONG_PRESS_DURATION);
    longPressTimerRef.current = timer;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    // Long-Press abbrechen wenn User bewegt
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const touch = e.touches[0];
    const deltaY = touchStartRef.current.y - touch.clientY; // Negativ = nach oben
    const deltaX = Math.abs(touch.clientX - (touchStartRef.current as any).x || 0);

    // Nur vertikal swipen (nach oben)
    if (deltaY > deltaX && deltaY > 10) {
      // Nur preventDefault wenn wirklich geswiped wird und Event cancelable ist
      if (e.cancelable) {
        e.preventDefault();
      }
      setIsSwiping(true);
      
      // Performance: requestAnimationFrame für smooth updates
      requestAnimationFrame(() => {
        const maxSwipe = 150;
        const limitedDeltaY = Math.min(maxSwipe, deltaY);
        setSwipeOffset(limitedDeltaY);

        if (limitedDeltaY >= FULLSCREEN_THRESHOLD && swipeOffset < FULLSCREEN_THRESHOLD) {
          triggerHaptic('light');
        }
      });
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (!isSwiping) {
      touchStartRef.current = null;
      return;
    }

    // Swipe nach oben (Vollbild)
    if (swipeOffset >= FULLSCREEN_THRESHOLD) {
      triggerHaptic('medium');
      setShowFullscreen(true);
      setSwipeOffset(0);
    } else {
      setSwipeOffset(0);
    }

    setIsSwiping(false);
    touchStartRef.current = null;
  };

  // Long-Press Feedback
  useEffect(() => {
    if (longPressActive) {
      const timer = setTimeout(() => setLongPressActive(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [longPressActive]);

  return (
    <>
      <div
        ref={resultRef}
        className="relative"
        style={{
          transform: isSwiping ? `translateY(-${swipeOffset}px)` : 'none',
          transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Fullscreen Indicator (oben) */}
        {swipeOffset > 50 && isSwiping && (
          <div
            className="absolute -top-16 left-0 right-0 flex items-center justify-center bg-blue-500/20 rounded-lg pointer-events-none"
            style={{ opacity: Math.min(1, swipeOffset / 100) }}
          >
            <Maximize2 className="w-5 h-5 text-blue-400" />
          </div>
        )}

        {/* Long-Press Feedback */}
        {longPressActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 rounded-lg pointer-events-none z-10">
            <div className="flex items-center gap-2 text-green-400">
              <Copy className="w-5 h-5" />
              <span className="text-sm font-medium">Kopiert!</span>
            </div>
          </div>
        )}

        {children}
      </div>

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div
          className="fixed inset-0 z-[200] bg-zinc-950 flex flex-col"
          onClick={() => setShowFullscreen(false)}
        >
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Vollbild-Ansicht</h2>
            <button
              onClick={() => setShowFullscreen(false)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            {children}
          </div>
        </div>
      )}
    </>
  );
}
