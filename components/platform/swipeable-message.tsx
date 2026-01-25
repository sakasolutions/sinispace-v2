'use client';

import { useState, useRef, useEffect } from 'react';
import { Copy, RefreshCw, Edit3, X, MoreVertical } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { CopyButton } from '@/components/ui/copy-button';
import { MarkdownRenderer } from '@/components/markdown-renderer';

type SwipeableMessageProps = {
  message: {
    role: 'user' | 'assistant';
    content: string;
  };
  onCopy?: () => void;
  onRegenerate?: () => void;
  onEdit?: () => void;
  isAssistant?: boolean;
};

export function SwipeableMessage({
  message,
  onCopy,
  onRegenerate,
  onEdit,
  isAssistant = false,
}: SwipeableMessageProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 50;
  const COPY_THRESHOLD = 80;
  const LONG_PRESS_DURATION = 500;

  // Touch-Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Long-Press Timer
    const timer = setTimeout(() => {
      triggerHaptic('medium');
      setShowContextMenu(true);
      touchStartRef.current = null;
    }, LONG_PRESS_DURATION);
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Nur horizontal swipen
    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
      // Nur preventDefault wenn wirklich geswiped wird
      if (e.cancelable) {
        e.preventDefault();
      }
      setIsSwiping(true);
      
      // Performance: requestAnimationFrame für smooth updates
      requestAnimationFrame(() => {
        const maxSwipe = 120;
        const limitedDeltaX = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
        setSwipeOffset(limitedDeltaX);

        if (Math.abs(limitedDeltaX) >= COPY_THRESHOLD && Math.abs(swipeOffset) < COPY_THRESHOLD) {
          triggerHaptic('light');
        }
      });
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (!isSwiping) {
      touchStartRef.current = null;
      return;
    }

    // Swipe nach links (kopieren)
    if (swipeOffset < -COPY_THRESHOLD && onCopy) {
      triggerHaptic('success');
      onCopy();
      setSwipeOffset(0);
    } else {
      setSwipeOffset(0);
    }

    setIsSwiping(false);
    touchStartRef.current = null;
  };

  // Context Menu schließen
  useEffect(() => {
    if (!showContextMenu) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = (e as MouseEvent).target || (e as TouchEvent).touches?.[0]?.target || (e as any).target;
      if (messageRef.current && target && !messageRef.current.contains(target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside as EventListener);
    document.addEventListener('touchstart', handleClickOutside as EventListener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickOutside as EventListener);
      document.removeEventListener('touchstart', handleClickOutside as EventListener);
    };
  }, [showContextMenu]);

  const copyBgOpacity = swipeOffset < -50 ? Math.min(1, Math.abs(swipeOffset) / 100) : 0;

  return (
    <div
      ref={messageRef}
      className="relative"
      style={{
        transform: `translateX(${swipeOffset}px)`,
        transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Copy Background (links) */}
      {swipeOffset < 0 && (
        <div
          className="absolute inset-0 flex items-center justify-start pl-4 bg-blue-500/20 rounded-lg"
          style={{ opacity: copyBgOpacity }}
        >
          <Copy className="w-5 h-5 text-blue-400" />
        </div>
      )}

      {/* Message Content */}
      <div className={`flex gap-3 mb-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
          <div
            className={`
              inline-block max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3
              ${message.role === 'user'
                ? 'bg-orange-500/10 border border-orange-500/20 text-orange-200'
                : 'bg-zinc-800/80 border border-zinc-700 text-zinc-300'
              }
            `}
          >
            {isAssistant ? (
              <div className="group relative">
                <MarkdownRenderer content={message.content} />
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                  <CopyButton text={message.content} variant="icon" size="md" />
                </div>
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </div>
        </div>
      </div>

      {/* Context Menu (Long-Press) */}
      {showContextMenu && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowContextMenu(false)}>
          <div
            className="bg-zinc-900 border border-white/10 rounded-xl p-4 max-w-xs w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Nachricht</h3>
              <button
                onClick={() => setShowContextMenu(false)}
                className="p-1 rounded hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <div className="space-y-2">
              {onCopy && (
                <button
                  onClick={() => {
                    onCopy();
                    setShowContextMenu(false);
                    triggerHaptic('success');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <Copy className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-white">Kopieren</span>
                </button>
              )}
              {onRegenerate && isAssistant && (
                <button
                  onClick={() => {
                    onRegenerate();
                    setShowContextMenu(false);
                    triggerHaptic('medium');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <RefreshCw className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-white">Neu generieren</span>
                </button>
              )}
              {onEdit && !isAssistant && (
                <button
                  onClick={() => {
                    onEdit();
                    setShowContextMenu(false);
                    triggerHaptic('medium');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  <Edit3 className="w-4 h-4 text-orange-400" />
                  <span className="text-sm text-white">Bearbeiten</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
