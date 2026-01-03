'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getChats } from '@/actions/chat-actions';
import { Menu, X } from 'lucide-react';

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
  const pathname = usePathname();

  useEffect(() => {
    async function loadChats() {
      const loadedChats = await getChats();
      setChats(loadedChats);
      setIsLoading(false);
    }
    loadChats();
  }, []);

  // Sidebar schließen wenn Route wechselt (Mobile) - nur wenn pathname sich ändert, nicht beim Mount
  const prevPathnameRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  
  // Update ref when onClose changes
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // Nur schließen wenn pathname sich tatsächlich geändert hat (nicht beim Mount)
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      onCloseRef.current();
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

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
          fixed md:relative top-0 left-0 h-full w-64 bg-white border-r border-zinc-200 z-50 md:z-auto shrink-0
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full">
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
          <div className="flex-1 overflow-y-auto">
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
              <div className="p-2">
                {chats.map((chat) => (
                  <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    className={`
                      block p-3 rounded-lg mb-1 transition-colors
                      ${pathname === `/chat/${chat.id}` 
                        ? 'bg-zinc-100 text-zinc-900' 
                        : 'text-zinc-600 hover:bg-zinc-50'
                      }
                    `}
                    onClick={onClose}
                  >
                    <div className="font-medium text-sm truncate mb-1">{chat.title}</div>
                    <div className="text-xs text-zinc-400">{formatDate(chat.updatedAt)}</div>
                  </Link>
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

