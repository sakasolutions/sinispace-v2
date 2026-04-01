'use client';

import { useState, useEffect } from 'react';
import { Eye, MessageSquare, User, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';
import { MarkdownRenderer } from '@/components/markdown-renderer';

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

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
};

export function AdminChatsView({ chats }: AdminChatsViewProps) {
  const [expandedChat, setExpandedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [loadingChat, setLoadingChat] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const loadMessages = async (chatId: string) => {
    if (messages[chatId]) return; // Bereits geladen

    setLoadingChat(chatId);
    try {
      const response = await fetch(`/api/admin/chat/${chatId}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => ({ ...prev, [chatId]: data.messages }));
      }
    } catch (error) {
      console.error('Fehler beim Laden der Messages:', error);
    } finally {
      setLoadingChat(null);
    }
  };

  const toggleChat = (chatId: string) => {
    if (expandedChat === chatId) {
      setExpandedChat(null);
    } else {
      setExpandedChat(chatId);
      loadMessages(chatId);
    }
  };

  return (
    <div className="space-y-4">
      {chats.length === 0 ? (
        <div className="p-8 text-center text-zinc-500">
          <p>Noch keine Chats vorhanden.</p>
        </div>
      ) : (
        chats.map((chat) => {
          const isExpanded = expandedChat === chat.id;
          const chatMessages = messages[chat.id] || [];
          const isLoading = loadingChat === chat.id;

          return (
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
                
                <button
                  onClick={() => toggleChat(chat.id)}
                  className="px-3 py-1.5 rounded-md bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-all flex items-center gap-1.5 text-xs font-medium"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      Ausblenden
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Ansehen
                    </>
                  )}
                </button>
              </div>

              {/* Messages anzeigen wenn expanded */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  {isLoading ? (
                    <div className="p-4 text-center text-zinc-500">
                      <p>Lade Nachrichten...</p>
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="p-4 text-center text-zinc-500">
                      <p>Keine Nachrichten in diesem Chat.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {chatMessages.map((message) => {
                        const isUser = message.role === 'user';
                        const bubbleClass = isUser
                          ? 'p-3 rounded-lg border border-white/10 bg-white/5 text-gray-200 [&_*]:!text-gray-200'
                          : 'p-3 rounded-lg border border-white/10 bg-transparent text-gray-300 [&_*]:!text-gray-300 [&_h1]:!text-white [&_h2]:!text-white [&_h3]:!text-white [&_strong]:!text-white [&_a]:!text-blue-400';

                        return (
                          <div key={message.id} className="flex items-start gap-3">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                                isUser
                                  ? 'bg-white/10 !text-gray-200'
                                  : 'bg-purple-500/20 !text-purple-300'
                              }`}
                            >
                              {isUser ? '👤' : '🤖'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs !text-slate-400 mb-1.5">
                                {isUser ? 'User' : 'Assistant'} • {formatDate(message.createdAt)}
                              </div>
                              <div className={bubbleClass}>
                                <MarkdownRenderer
                                  content={message.content}
                                  inheritParentColors
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
