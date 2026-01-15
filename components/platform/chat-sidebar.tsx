'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getChats, deleteChat, updateChatTitle } from '@/actions/chat-actions';
import { Pencil, Trash2, X, Check } from 'lucide-react';

type Chat = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

interface ChatSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  isPro?: boolean;
}

export function ChatSidebar({ isOpen, onClose, userEmail, isPro }: ChatSidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  const loadChats = async () => {
    const loadedChats = await getChats();
    setChats(loadedChats);
    setIsLoading(false);
  };

  useEffect(() => {
    loadChats();
  }, []);

  const handleEdit = (chat: Chat) => {
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveEdit = async (chatId: string) => {
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }

    const result = await updateChatTitle(chatId, editingTitle);
    if (result.success) {
      await loadChats();
      setEditingChatId(null);
      setEditingTitle('');
    }
  };

  const handleCancelEdit = () => {
    setEditingChatId(null);
    setEditingTitle('');
  };

  const handleDelete = async (chatId: string) => {
    if (!confirm('Möchtest du diesen Chat wirklich endgültig löschen?')) {
      return;
    }

    setDeletingChatId(chatId);
    const result = await deleteChat(chatId);
    
    if (result.success) {
      await loadChats();
      // Wenn der gelöschte Chat aktuell geöffnet ist, zur Chat-Liste navigieren
      if (pathname === `/chat/${chatId}`) {
        router.push('/chat');
      }
    }
    setDeletingChatId(null);
  };

  // Sidebar schließen wenn Route wechselt (nur auf Mobile)
  const prevPathnameRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Nur schließen wenn pathname sich tatsächlich geändert hat (nicht beim Mount)
    // Und nur wenn Sidebar offen ist (Mobile)
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname && isOpen) {
      onCloseRef.current();
    }
    prevPathnameRef.current = pathname;
  }, [pathname, isOpen]);

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

  return (
    <>
      {/* Mobile Overlay (nur auf Mobile, z-40 unter Sidebar) */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar: Fixed auf Mobile (z-50), Relative auf Desktop */}
      <aside
        className={`
          fixed md:relative top-0 left-0 h-full w-64 bg-zinc-950/50 backdrop-blur-xl z-50 md:z-auto shrink-0
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:border-r md:border-white/5
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/5">
            <h2 className="text-sm sm:text-base font-bold text-white">Chats</h2>
            <Link
              href="/chat"
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
              onClick={onClose}
            >
              Neu
            </Link>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="p-3 sm:p-4 text-center text-zinc-500 text-xs sm:text-sm">Lade Chats...</div>
            ) : chats.length === 0 ? (
              <div className="p-3 sm:p-4 text-center text-zinc-500 text-xs sm:text-sm">
                <p className="mb-2">Noch keine Chats</p>
                <Link
                  href="/chat"
                  className="text-white font-medium hover:text-zinc-300 transition-colors"
                  onClick={onClose}
                >
                  Ersten Chat starten
                </Link>
              </div>
            ) : (
              <div className="p-1.5 sm:p-2 space-y-0.5 sm:space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`
                      group relative rounded-lg transition-colors
                      ${pathname === `/chat/${chat.id}` 
                        ? 'bg-white/10' 
                        : 'hover:bg-white/5 active:bg-white/10'
                      }
                    `}
                    onMouseEnter={() => setHoveredChatId(chat.id)}
                    onMouseLeave={() => setHoveredChatId(null)}
                    onTouchStart={() => setHoveredChatId(chat.id)}
                  >
                    {editingChatId === chat.id ? (
                      // Edit-Modus
                      <div className="p-2.5 sm:p-3">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(chat.id);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          className="w-full px-2 py-1 text-xs sm:text-sm font-medium border border-white/10 bg-zinc-900/50 rounded focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 mb-1 text-white placeholder:text-zinc-500"
                          autoFocus
                        />
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
                          <button
                            onClick={() => handleSaveEdit(chat.id)}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            aria-label="Speichern"
                          >
                            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-400" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 rounded hover:bg-white/10 transition-colors"
                            aria-label="Abbrechen"
                          >
                            <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Normal-Modus
                      <>
                        <Link
                          href={`/chat/${chat.id}`}
                          className="block p-2.5 sm:p-3 pr-10 sm:pr-12"
                          onClick={onClose}
                        >
                          <div className={`font-medium text-xs sm:text-sm truncate mb-0.5 sm:mb-1 ${
                            pathname === `/chat/${chat.id}` 
                              ? 'text-white' 
                              : 'text-zinc-300'
                          }`}>
                            {chat.title}
                          </div>
                          <div className="text-[10px] sm:text-xs text-zinc-500">{formatDate(chat.updatedAt)}</div>
                        </Link>
                        
                        {/* Action Buttons (immer sichtbar auf Mobile, beim Hover auf Desktop) */}
                        <div className={`absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 sm:gap-1 ${
                          hoveredChatId === chat.id || deletingChatId === chat.id 
                            ? 'opacity-100' 
                            : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
                        } transition-opacity`}>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEdit(chat);
                            }}
                            className="p-1 sm:p-1.5 rounded hover:bg-white/10 active:bg-white/20 transition-colors touch-manipulation"
                            aria-label="Chat umbenennen"
                            title="Umbenennen"
                          >
                            <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-400 hover:text-white" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(chat.id);
                            }}
                            disabled={deletingChatId === chat.id}
                            className="p-1 sm:p-1.5 rounded hover:bg-red-500/20 active:bg-red-500/30 transition-colors disabled:opacity-50 touch-manipulation"
                            aria-label="Chat löschen"
                            title="Löschen"
                          >
                            <Trash2 className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${deletingChatId === chat.id ? 'text-zinc-500' : 'text-red-400'}`} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User Footer mit Premium-Status (wenn userEmail vorhanden) */}
          {userEmail && (
            <div className="p-3 sm:p-4 border-t border-white/5 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold shrink-0">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs sm:text-sm font-medium text-white truncate">{userEmail}</span>
                  <span className={`text-[10px] sm:text-xs font-medium ${
                    isPro 
                      ? 'text-green-400' 
                      : 'text-zinc-500'
                  }`}>
                    {isPro ? 'Premium Plan' : 'Free Plan'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

