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
          fixed md:relative top-0 left-0 h-full w-64 bg-white z-50 md:z-auto shrink-0
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          md:border-r md:border-zinc-200
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-zinc-200">
            <h2 className="font-bold text-zinc-900">Chats</h2>
            <Link
              href="/chat"
              className="px-3 py-1.5 text-sm font-medium text-white bg-zinc-900 rounded-lg hover:bg-zinc-800 transition-colors"
              onClick={onClose}
            >
              Neu
            </Link>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="p-4 text-center text-zinc-400 text-sm">Lade Chats...</div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-zinc-400 text-sm">
                <p className="mb-2">Noch keine Chats</p>
                <Link
                  href="/chat"
                  className="text-zinc-900 font-medium hover:underline"
                  onClick={onClose}
                >
                  Ersten Chat starten
                </Link>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`
                      group relative rounded-lg transition-colors
                      ${pathname === `/chat/${chat.id}` 
                        ? 'bg-zinc-100' 
                        : 'hover:bg-zinc-50 active:bg-zinc-100'
                      }
                    `}
                    onMouseEnter={() => setHoveredChatId(chat.id)}
                    onMouseLeave={() => setHoveredChatId(null)}
                    onTouchStart={() => setHoveredChatId(chat.id)}
                  >
                    {editingChatId === chat.id ? (
                      // Edit-Modus
                      <div className="p-3">
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
                          className="w-full px-2 py-1 text-sm font-medium border border-zinc-300 rounded focus:outline-none focus:ring-2 focus:ring-zinc-900 mb-1"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => handleSaveEdit(chat.id)}
                            className="p-1 rounded hover:bg-zinc-200 transition-colors"
                            aria-label="Speichern"
                          >
                            <Check className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 rounded hover:bg-zinc-200 transition-colors"
                            aria-label="Abbrechen"
                          >
                            <X className="w-4 h-4 text-zinc-600" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Normal-Modus
                      <>
                        <Link
                          href={`/chat/${chat.id}`}
                          className="block p-3 pr-12"
                          onClick={onClose}
                        >
                          <div className={`font-medium text-sm truncate mb-1 ${
                            pathname === `/chat/${chat.id}` 
                              ? 'text-zinc-900' 
                              : 'text-zinc-600'
                          }`}>
                            {chat.title}
                          </div>
                          <div className="text-xs text-zinc-400">{formatDate(chat.updatedAt)}</div>
                        </Link>
                        
                        {/* Action Buttons (immer sichtbar auf Mobile, beim Hover auf Desktop) */}
                        <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 ${
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
                            className="p-1.5 rounded hover:bg-zinc-200 active:bg-zinc-300 transition-colors touch-manipulation"
                            aria-label="Chat umbenennen"
                            title="Umbenennen"
                          >
                            <Pencil className="w-3.5 h-3.5 text-zinc-600" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDelete(chat.id);
                            }}
                            disabled={deletingChatId === chat.id}
                            className="p-1.5 rounded hover:bg-red-100 active:bg-red-200 transition-colors disabled:opacity-50 touch-manipulation"
                            aria-label="Chat löschen"
                            title="Löschen"
                          >
                            <Trash2 className={`w-3.5 h-3.5 ${deletingChatId === chat.id ? 'text-zinc-400' : 'text-red-600'}`} />
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
            <div className="p-4 border-t border-zinc-200 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-sm font-medium text-zinc-900 truncate">{userEmail}</span>
                  <span className={`text-xs font-medium ${
                    isPro 
                      ? 'text-green-600' 
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

