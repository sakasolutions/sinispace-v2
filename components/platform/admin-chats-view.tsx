'use client';

import { useState } from 'react';
import { Eye, MessageSquare, User, Calendar } from 'lucide-react';
import Link from 'next/link';

type Chat = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
  _count: {
    messages: number;
    documents: number;
  };
};

type AdminChatsViewProps = {
  chats: Chat[];
};

export function AdminChatsView({ chats }: AdminChatsViewProps) {
  const [expandedChat, setExpandedChat] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-4">
      {chats.length === 0 ? (
        <div className="p-8 text-center text-zinc-500">
          <p>Noch keine Chats vorhanden.</p>
        </div>
      ) : (
        chats.map((chat) => (
          <div
            key={chat.id}
            className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white truncate">{chat.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {chat.user.name || chat.user.email || 'Unbekannt'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(chat.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-3 text-sm text-zinc-400">
                  <span>{chat._count.messages} Nachrichten</span>
                  <span>•</span>
                  <span>{chat._count.documents} Dokumente</span>
                </div>
              </div>
              
              <Link
                href={`/chat/${chat.id}`}
                target="_blank"
                className="px-3 py-1.5 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-all flex items-center gap-1.5 text-xs font-medium"
              >
                <Eye className="w-3.5 h-3.5" />
                Ansehen
              </Link>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
