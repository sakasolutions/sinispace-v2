'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Pencil, Trash2, Archive, Star, Share2, X, Check } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptic-feedback';

type Chat = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

type SwipeableChatItemProps = {
  chat: Chat;
  isActive: boolean;
  pathname: string | null;
  onEdit: (chat: Chat) => void;
  onDelete: (chatId: string) => void;
  onArchive?: (chatId: string) => void;
  onFavorite?: (chatId: string) => void;
  onShare?: (chatId: string) => void;
  onClose?: () => void;
  editingChatId: string | null;
  deletingChatId: string | null;
  editingTitle: string;
  onSaveEdit: (chatId: string) => void;
  onCancelEdit: () => void;
  onTitleChange: (title: string) => void;
};

export function SwipeableChatItem({
  chat,
  isActive,
  pathname,
  onEdit,
  onDelete,
  onArchive,
  onFavorite,
  onShare,
  onClose,
  editingChatId,
  deletingChatId,
  editingTitle,
  onSaveEdit,
  onCancelEdit,
  onTitleChange,
}: SwipeableChatItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 50; // Mindest-Distanz für Swipe
  const DELETE_THRESHOLD = 100; // Distanz für Delete-Aktion
  const ARCHIVE_THRESHOLD = 100; // Distanz für Archive-Aktion
  const LONG_PRESS_DURATION = 500; // 500ms für Long-Press

  // Touch-Handler
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    // Long-Press Timer starten
    const timer = setTimeout(() => {
      triggerHaptic('medium');
      setShowContextMenu(true);
      touchStartRef.current = null; // Reset um Swipe zu verhindern
    }, LONG_PRESS_DURATION);
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    // Long-Press abbrechen wenn User bewegt
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // Nur horizontal swipen (deltaY < deltaX)
    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
      // Nur preventDefault wenn wirklich geswiped wird und Event cancelable ist
      if (e.cancelable) {
        e.preventDefault(); // Verhindere Scroll
      }
      setIsSwiping(true);
      
      // Performance: requestAnimationFrame für smooth updates
      requestAnimationFrame(() => {
        // Limit Swipe-Distanz
        const maxSwipe = 150;
        const limitedDeltaX = Math.max(-maxSwipe, Math.min(maxSwipe, deltaX));
        setSwipeOffset(limitedDeltaX);

        // Haptic Feedback bei Threshold
        if (Math.abs(limitedDeltaX) >= DELETE_THRESHOLD && swipeOffset < DELETE_THRESHOLD) {
          triggerHaptic('light');
        }
      });
    }
  };

  const handleTouchEnd = () => {
    // Long-Press Timer löschen
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (!isSwiping) {
      touchStartRef.current = null;
      return;
    }

    const absOffset = Math.abs(swipeOffset);

    // Swipe nach links (löschen)
    if (swipeOffset < -DELETE_THRESHOLD) {
      triggerHaptic('medium');
      onDelete(chat.id);
      setSwipeOffset(0);
    }
    // Swipe nach rechts (archivieren/favorisieren)
    else if (swipeOffset > ARCHIVE_THRESHOLD) {
      triggerHaptic('medium');
      if (onArchive) {
        onArchive(chat.id);
      } else if (onFavorite) {
        onFavorite(chat.id);
      }
      setSwipeOffset(0);
    }
    // Zurück zur Mitte
    else {
      setSwipeOffset(0);
    }

    setIsSwiping(false);
    touchStartRef.current = null;
  };

  // Context Menu schließen bei Klick außerhalb
  useEffect(() => {
    if (!showContextMenu) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = (e as MouseEvent).target || (e as TouchEvent).touches?.[0]?.target || (e as any).target;
      if (itemRef.current && target && !itemRef.current.contains(target as Node)) {
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

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Gestern';
    if (diffDays < 7) return `Vor ${diffDays} Tagen`;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  };

  // Swipe-Action Hintergründe
  const deleteBgOpacity = swipeOffset < -50 ? Math.min(1, Math.abs(swipeOffset) / 100) : 0;
  const archiveBgOpacity = swipeOffset > 50 ? Math.min(1, swipeOffset / 100) : 0;

  if (editingChatId === chat.id) {
    return (
      <div className="p-2.5 sm:p-3">
        <input
          type="text"
          value={editingTitle}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              onSaveEdit(chat.id);
            } else if (e.key === 'Escape') {
              onCancelEdit();
            }
          }}
          className="w-full px-2 py-1 text-xs sm:text-sm font-medium border border-gray-200 bg-white rounded focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 mb-1 text-gray-900 placeholder:text-gray-400"
          autoFocus
        />
        <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
          <button
            onClick={() => onSaveEdit(chat.id)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Speichern"
          >
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
          </button>
          <button
            onClick={onCancelEdit}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Abbrechen"
          >
            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={itemRef}
      className="relative group rounded-lg transition-colors overflow-hidden"
      style={{
        transform: `translateX(${swipeOffset}px)`,
        transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete Background (links) */}
      {swipeOffset < 0 && (
        <div
          className="absolute inset-0 flex items-center justify-start pl-4 bg-red-500/20"
          style={{ opacity: deleteBgOpacity }}
        >
          <Trash2 className="w-5 h-5 text-red-400" />
        </div>
      )}

      {/* Archive Background (rechts) */}
      {swipeOffset > 0 && (
        <div
          className="absolute inset-0 flex items-center justify-end pr-4 bg-blue-500/20"
          style={{ opacity: archiveBgOpacity }}
        >
          <Archive className="w-5 h-5 text-blue-400" />
        </div>
      )}

      {/* Chat Item - Dashboard Style */}
      <div
        className={`
          relative bg-transparent rounded-lg transition-colors
          ${isActive ? 'bg-gradient-to-r from-orange-50 to-pink-50' : 'hover:bg-gray-50 active:bg-gray-100'}
        `}
      >
        <Link
          href={`/chat/${chat.id}`}
          className="block p-2.5 sm:p-3 pr-10 sm:pr-12"
          onClick={onClose}
        >
          <div className={`font-medium text-xs sm:text-sm truncate mb-0.5 sm:mb-1 ${
            isActive 
              ? 'bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent font-bold' 
              : 'text-gray-700'
          }`}>
            {chat.title}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-500">{formatDate(chat.updatedAt)}</div>
        </Link>

        {/* Action Buttons (Desktop Hover) */}
        <div className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(chat);
            }}
            className="p-1 sm:p-1.5 rounded hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
            aria-label="Chat umbenennen"
            title="Umbenennen"
          >
            <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 hover:text-gray-700" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete(chat.id);
            }}
            disabled={deletingChatId === chat.id}
            className="p-1 sm:p-1.5 rounded hover:bg-red-50 active:bg-red-100 transition-colors disabled:opacity-50 touch-manipulation"
            aria-label="Chat löschen"
            title="Löschen"
          >
            <Trash2 className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${deletingChatId === chat.id ? 'text-gray-400' : 'text-red-500'}`} />
          </button>
        </div>
      </div>

      {/* Context Menu (Long-Press) - Dashboard Style */}
      {showContextMenu && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowContextMenu(false)}>
          <div
            className="bg-white border border-gray-200 rounded-xl p-4 max-w-xs w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">{chat.title}</h3>
              <button
                onClick={() => setShowContextMenu(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  onEdit(chat);
                  setShowContextMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <Pencil className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">Umbenennen</span>
              </button>
              {onArchive && (
                <button
                  onClick={() => {
                    onArchive(chat.id);
                    setShowContextMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Archive className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-700">Archivieren</span>
                </button>
              )}
              {onFavorite && (
                <button
                  onClick={() => {
                    onFavorite(chat.id);
                    setShowContextMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-700">Favorisieren</span>
                </button>
              )}
              {onShare && (
                <button
                  onClick={() => {
                    onShare(chat.id);
                    setShowContextMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                >
                  <Share2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-700">Teilen</span>
                </button>
              )}
              <div className="h-px bg-gray-200 my-2" />
              <button
                onClick={() => {
                  onDelete(chat.id);
                  setShowContextMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-left"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-500">Löschen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
