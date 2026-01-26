'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getChats, deleteChat, updateChatTitle } from '@/actions/chat-actions';
import { Pencil, Trash2, X, Check } from 'lucide-react';
import { SwipeableChatItem } from './swipeable-chat-item';

// Custom Confirm Modal
function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string;
}) {
  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white border border-gray-200 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" 
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-700 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:from-orange-600 hover:to-pink-600 transition-colors"
          >
            Bestätigen
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

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
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; chatId: string | null }>({
    isOpen: false,
    chatId: null,
  });
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

  const handleDelete = (chatId: string) => {
    setConfirmModal({
      isOpen: true,
      chatId: chatId,
    });
  };

  const confirmDelete = async () => {
    if (!confirmModal.chatId) return;

    const chatId = confirmModal.chatId;
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
    setConfirmModal({ isOpen: false, chatId: null });
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
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, chatId: null })}
        onConfirm={confirmDelete}
        title="Chat löschen"
        message="Möchtest du diesen Chat wirklich endgültig löschen?"
      />
      {/* Mobile Overlay (nur auf Mobile, z-40 unter Sidebar) */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar: Dashboard Style - Hell */}
      <aside
        className={`
          fixed md:relative top-0 left-0 h-full w-64 bg-white md:bg-gray-50/50 backdrop-blur-md z-50 md:z-auto shrink-0
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          border-r border-gray-100
        `}
      >
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header - Dashboard Style */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100">
            <h2 className="text-sm sm:text-base font-bold text-gray-900">Chats</h2>
            <Link
              href="/chat"
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              onClick={onClose}
            >
              Neu
            </Link>
          </div>

          {/* Chat List - Dashboard Style */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="p-3 sm:p-4 text-center text-gray-500 text-xs sm:text-sm">Lade Chats...</div>
            ) : chats.length === 0 ? (
              <div className="p-3 sm:p-4 text-center text-gray-500 text-xs sm:text-sm">
                <p className="mb-2">Noch keine Chats</p>
                <Link
                  href="/chat"
                  className="text-gray-900 font-medium hover:text-orange-500 transition-colors"
                  onClick={onClose}
                >
                  Ersten Chat starten
                </Link>
              </div>
            ) : (
              <div className="p-1.5 sm:p-2 space-y-0.5 sm:space-y-1">
                {chats.map((chat) => (
                  <SwipeableChatItem
                    key={chat.id}
                    chat={chat}
                    isActive={pathname === `/chat/${chat.id}`}
                    pathname={pathname}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClose={onClose}
                    editingChatId={editingChatId}
                    deletingChatId={deletingChatId}
                    editingTitle={editingTitle}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onTitleChange={setEditingTitle}
                  />
                ))}
              </div>
            )}
          </div>

          {/* User Footer - Dashboard Style */}
          {userEmail && (
            <div className="p-3 sm:p-4 border-t border-gray-100 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-[10px] sm:text-xs font-bold shrink-0 shadow-sm">
                  {userEmail.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{userEmail}</span>
                  <span className={`text-[10px] sm:text-xs font-medium ${
                    isPro 
                      ? 'text-green-600' 
                      : 'text-gray-500'
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

