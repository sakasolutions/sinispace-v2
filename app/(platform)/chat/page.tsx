'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { chatWithAI } from '@/actions/ai-actions';
import { createChat, saveMessage, getChats, deleteChat, updateChatTitle } from '@/actions/chat-actions';
import { getChatDocuments, deleteDocument } from '@/actions/document-actions';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { SuggestedActions } from '@/components/suggested-actions';
import { CopyButton } from '@/components/ui/copy-button';
import { Pencil, Trash2, X, Check, Menu, Upload, Send } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type Document = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
  openaiFileId: string;
};

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
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
    </div>
  );
}

// Custom Toast
function Toast({ message, type = 'info', onClose }: { message: string; type?: 'info' | 'error' | 'success'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-gray-800';

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg border border-gray-200`}>
      {message}
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal/Toast State
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  
  // Chat-Liste State
  const [chats, setChats] = useState<Array<{ id: string; title: string; createdAt: Date; updatedAt: Date }>>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  
  // Mobile Chat-Liste State
  const [isChatListOpen, setIsChatListOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Chat-Liste laden
  const loadChats = async () => {
    const loadedChats = await getChats();
    setChats(loadedChats);
    setIsLoadingChats(false);
  };

  useEffect(() => {
    loadChats();
  }, []);

  // Chat-Funktionen
  const handleEdit = (chat: { id: string; title: string }) => {
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

  const handleDelete = async (chatId: string) => {
    setDeletingChatId(chatId);
    const result = await deleteChat(chatId);
    if (result.success) {
      await loadChats();
      if (pathname === `/chat/${chatId}`) {
        router.push('/chat');
      }
    }
    setDeletingChatId(null);
  };

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

  // File Upload Handler
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let chatIdToUse = currentChatId;

      if (!chatIdToUse) {
        const chatResult = await createChat(`Datei hochgeladen: ${file.name}`);
        if (chatResult.success && chatResult.chatId) {
          chatIdToUse = chatResult.chatId;
          setCurrentChatId(chatIdToUse);
        } else {
          setToast({ message: 'Fehler beim Erstellen des Chats', type: 'error' });
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatIdToUse);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Fehler beim Hochladen';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || `Server-Fehler (${response.status})`;
        }
        setToast({ message: errorMessage, type: 'error' });
        return;
      }

      const result = await response.json();

      if (result.success) {
        if (result.document) {
          setDocuments(prev => {
            const exists = prev.some(doc => doc.id === result.document.id);
            if (exists) {
              return prev;
            }
            return [...prev, {
              id: result.document.id,
              fileName: result.document.fileName,
              fileSize: result.document.fileSize,
              mimeType: result.document.mimeType,
              openaiFileId: result.document.openaiFileId,
              createdAt: new Date(result.document.createdAt || Date.now()),
            }];
          });
        }
        
        if (!currentChatId) {
          router.push(`/chat/${chatIdToUse}`);
        }
      } else {
        setToast({ message: result.error || 'Fehler beim Hochladen', type: 'error' });
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setToast({ message: error.message || 'Fehler beim Hochladen', type: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function sendMessage(messageContent?: string) {
    const content = messageContent || input.trim();
    if (!content && documents.length === 0) return;

    setIsLoading(true);
    const newHistory: Message[] = [...messages, { role: 'user', content }];
    setMessages(newHistory);
    setInput('');

    let chatIdToUse = currentChatId;

    if (!chatIdToUse) {
      const chatResult = await createChat(content);
      if (chatResult.success && chatResult.chatId) {
        chatIdToUse = chatResult.chatId;
        setCurrentChatId(chatIdToUse);
        
        await saveMessage(chatIdToUse, 'user', content);
        
        const docFileIds = documents.length > 0 
          ? documents.map(doc => doc.openaiFileId).filter((id): id is string => id !== null)
          : undefined;
        const docMimeTypes = documents.length > 0 ? documents.map(doc => doc.mimeType) : undefined;
        
        setDocuments([]);
        
        const response = await chatWithAI(newHistory, docFileIds, docMimeTypes);

        if (response.result) {
          const assistantMessage: Message = { role: 'assistant', content: response.result };
          setMessages([...newHistory, assistantMessage]);
          await saveMessage(chatIdToUse, 'assistant', response.result);
        } else {
          setMessages([...newHistory, { role: 'assistant', content: "⚠️ Fehler: " + response.error }]);
        }
        
        setIsLoading(false);
        router.push(`/chat/${chatIdToUse}`);
        return;
      } else {
        setIsLoading(false);
        return;
      }
    }

    if (chatIdToUse) {
      await saveMessage(chatIdToUse, 'user', content);
    }

    const docFileIds = documents.length > 0 
      ? documents.map(doc => doc.openaiFileId).filter((id): id is string => id !== null)
      : undefined;
    const docMimeTypes = documents.length > 0 ? documents.map(doc => doc.mimeType) : undefined;
    
    setDocuments([]);
    
    const response = await chatWithAI(newHistory, docFileIds, docMimeTypes);

    if (response.result) {
      const assistantMessage: Message = { role: 'assistant', content: response.result };
      setMessages([...newHistory, assistantMessage]);
      
      if (chatIdToUse) {
        await saveMessage(chatIdToUse, 'assistant', response.result);
      }
    } else {
      setMessages([...newHistory, { role: 'assistant', content: "⚠️ Fehler: " + response.error }]);
    }
    
    setIsLoading(false);
  }

  return (
    <div data-no-padding className="h-full flex w-full overflow-hidden bg-white">
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* LINKS: Chat-Liste (Desktop: w-80, Mobile: Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 md:left-64 z-40 md:z-auto
        w-80 shrink-0 !bg-white border-r border-gray-100 
        flex flex-col overflow-hidden
        transform transition-transform duration-300 ease-in-out
        ${isChatListOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 className="text-sm font-bold text-gray-900">Chats</h2>
          <div className="flex items-center gap-2">
            <Link
              href="/chat"
              onClick={() => setIsChatListOpen(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              Neu
            </Link>
            <button
              onClick={() => setIsChatListOpen(false)}
              className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Chat-Liste schließen"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoadingChats ? (
            <div className="p-4 text-center text-gray-500 text-xs">Lade Chats...</div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-xs">
              <p className="mb-2">Noch keine Chats</p>
              <Link
                href="/chat"
                onClick={() => setIsChatListOpen(false)}
                className="text-gray-900 font-medium hover:text-orange-500 transition-colors"
              >
                Ersten Chat starten
              </Link>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {chats.map((chat) => {
                const isActive = pathname === `/chat/${chat.id}`;
                
                if (editingChatId === chat.id) {
                  return (
                    <div key={chat.id} className="p-3">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit(chat.id);
                          } else if (e.key === 'Escape') {
                            setEditingChatId(null);
                            setEditingTitle('');
                          }
                        }}
                        className="w-full px-2 py-1 text-xs font-medium border border-gray-200 bg-white rounded focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 mb-1 text-gray-900 placeholder:text-gray-400"
                        autoFocus
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => handleSaveEdit(chat.id)}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          aria-label="Speichern"
                        >
                          <Check className="w-3.5 h-3.5 text-green-600" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingChatId(null);
                            setEditingTitle('');
                          }}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          aria-label="Abbrechen"
                        >
                          <X className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={chat.id}
                    className={`group relative rounded-lg transition-colors ${
                      isActive ? 'bg-gradient-to-r from-orange-50 to-pink-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <Link
                      href={`/chat/${chat.id}`}
                      onClick={() => setIsChatListOpen(false)}
                      className="block p-3 pr-10"
                    >
                      <div className={`font-medium text-xs truncate mb-0.5 ${
                        isActive 
                          ? 'bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent font-bold' 
                          : 'text-gray-700'
                      }`}>
                        {chat.title}
                      </div>
                      <div className="text-[10px] text-gray-500">{formatDate(chat.updatedAt)}</div>
                    </Link>

                    {/* Action Buttons (Desktop Hover) */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEdit(chat);
                        }}
                        className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                        aria-label="Chat umbenennen"
                        title="Umbenennen"
                      >
                        <Pencil className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setConfirmModal({
                            isOpen: true,
                            title: 'Chat löschen',
                            message: 'Möchtest du diesen Chat wirklich endgültig löschen?',
                            onConfirm: () => handleDelete(chat.id),
                          });
                        }}
                        disabled={deletingChatId === chat.id}
                        className="p-1.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                        aria-label="Chat löschen"
                        title="Löschen"
                      >
                        <Trash2 className={`w-3.5 h-3.5 ${deletingChatId === chat.id ? 'text-gray-400' : 'text-red-500'}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isChatListOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsChatListOpen(false)}
        />
      )}

      {/* RECHTS: Chat-Window (flex-1, Rest des Platzes) */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-20 shrink-0 px-4 sm:px-6 md:px-8 py-3 md:py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsChatListOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Chat-Liste öffnen"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            
            <div className="relative h-10 w-10 sm:h-12 sm:w-12 overflow-hidden rounded-xl shadow-md border border-gray-200/50 bg-white shrink-0">
              <Image 
                src="/assets/logos/logo.webp" 
                alt="Sinispace Logo" 
                fill 
                className="object-contain p-2" 
                priority 
              />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                SiniChat
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-600">Frag mich alles – mit Code, Tabellen und Struktur.</p>
            </div>
          </div>
        </div>

        {/* NACHRICHTEN BEREICH */}
        <div className="flex-1 overflow-y-auto scroll-smooth bg-white pb-[calc(5rem+env(safe-area-inset-bottom)+9rem)] md:pb-40">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
            {messages.length === 0 && (
              <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-gray-400">
                <span className="text-5xl sm:text-6xl mb-4">💬</span>
                <p className="text-lg font-medium text-gray-600">Ich bin bereit.</p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className="w-full">
                {msg.role === 'user' ? (
                  <div className="flex w-full justify-end items-start gap-3">
                    <div className="group relative max-w-[85%] sm:max-w-[80%] md:max-w-[90%] rounded-xl px-4 md:px-5 py-3 md:py-4 shadow-sm border border-gray-200/50 bg-white">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <CopyButton text={msg.content} variant="icon" size="md" />
                      </div>
                      <div className="flex items-start gap-3">
                        <p className="flex-1 whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed text-gray-900">{msg.content}</p>
                        <div className="h-7 w-7 shrink-0 select-none items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 text-[10px] font-semibold text-white flex shadow-sm">
                          DU
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full justify-start items-start gap-3">
                    <div className="h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl shadow-md border border-gray-200/50 bg-white overflow-hidden mt-0.5">
                      <Image 
                        src="/assets/logos/logo.webp" 
                        alt="Sinispace Logo" 
                        width={32}
                        height={32}
                        className="object-contain p-1.5" 
                      />
                    </div>
                    <div className="flex-1 group relative">
                      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <CopyButton text={msg.content} variant="icon" size="md" />
                      </div>
                      <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none">
                        <MarkdownRenderer content={msg.content} />
                      </div>
                    </div>
                  </div>
                )}
                {msg.role === 'assistant' && i === messages.length - 1 && !isLoading && (
                  <div className="ml-11 mt-4">
                    <SuggestedActions 
                      content={msg.content} 
                      onActionClick={(prompt) => sendMessage(prompt)}
                    />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-gray-500">
                <div className="h-8 w-8 shrink-0 rounded-xl shadow-md border border-gray-200/50 bg-white overflow-hidden flex items-center justify-center">
                  <Image 
                    src="/assets/logos/logo.webp" 
                    alt="Sinispace Logo" 
                    width={32}
                    height={32}
                    className="object-contain p-1.5" 
                  />
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} className="h-1" />
          </div>
        </div>

        {/* INPUT BEREICH - Branded Input Field */}
        <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom)+1rem)] md:bottom-6 left-0 md:left-[calc(16rem+20rem)] right-0 z-40 flex justify-center px-4 md:px-6">
          <div className="w-full max-w-3xl">
            {/* Disclaimer Text */}
            <div className="mb-2 text-center">
              <p className="text-[10px] md:text-xs text-gray-500">KI kann Fehler machen. Überprüfe wichtige Informationen.</p>
            </div>
            
            {/* Input Container - Clean White Theme */}
            <div className="relative flex items-center gap-2 bg-transparent">
              {/* Upload Button - Left Side */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="shrink-0 p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Datei hochladen"
              >
                <Upload className={`w-5 h-5 ${isUploading ? 'animate-pulse' : ''}`} />
              </button>
              
              {/* Input Field Container - Relative for absolute Send Button */}
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Schreib eine Nachricht..."
                  className="w-full min-h-12 md:min-h-[3rem] py-3 px-4 pr-14 md:pr-16 text-lg md:text-base text-gray-900 placeholder:text-gray-400 !bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:shadow-md transition-all"
                />
                
                {/* Send Button - Absolute inside Input Field */}
                <button
                  onClick={() => sendMessage()}
                  disabled={isLoading || (!input.trim() && documents.length === 0)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:scale-105 active:scale-95 ${
                    input.trim() ? 'opacity-100' : 'opacity-50'
                  }`}
                  aria-label="Nachricht senden"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dokumente Liste (wenn vorhanden) */}
        {documents.length > 0 && (
          <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom)+8rem)] md:bottom-28 left-0 md:left-[calc(16rem+20rem)] right-0 z-30 flex justify-center px-4 md:px-6">
            <div className="w-full max-w-3xl bg-white border border-gray-200/50 rounded-xl shadow-lg p-3 space-y-2">
              <div className="text-xs font-medium text-gray-700 mb-2">Hochgeladene Dateien:</div>
              <div className="flex flex-wrap gap-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200/50 px-2.5 py-1.5 text-xs">
                    <span className="text-gray-500">📄</span>
                    <span className="text-gray-700 max-w-[150px] truncate" title={doc.fileName}>{doc.fileName}</span>
                    <button
                      onClick={() => setDocuments(prev => prev.filter(d => d.id !== doc.id))}
                      className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Datei entfernen"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
