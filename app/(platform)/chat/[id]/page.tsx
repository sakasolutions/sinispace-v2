'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { chatWithAI } from '@/actions/ai-actions';
import { getChat, saveMessage } from '@/actions/chat-actions';
import { getChatDocuments, deleteDocument } from '@/actions/document-actions';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { SuggestedActions } from '@/components/suggested-actions';
import { CopyButton } from '@/components/ui/copy-button';
import { FeedbackButton } from '@/components/ui/feedback-button';
import { Tooltip } from '@/components/ui/tooltip';
import { triggerHaptic } from '@/lib/haptic-feedback';
import { Copy, RefreshCw, X, Menu, Upload, Send } from 'lucide-react';
import { getChats, deleteChat, updateChatTitle } from '@/actions/chat-actions';
import { Pencil, Trash2, Check } from 'lucide-react';
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

// Custom Alert/Toast
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

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [swipingMessageIndex, setSwipingMessageIndex] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [longPressMessageIndex, setLongPressMessageIndex] = useState<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number; index: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modal/Toast State
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; chatId?: string | null }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    chatId: null,
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
  
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Chat beim Laden aus DB holen
  useEffect(() => {
    async function loadChat() {
      if (!chatId) return;
      
      const chat = await getChat(chatId);
      if (chat) {
        setMessages(chat.messages);
        // WICHTIG: Dokumente NICHT automatisch laden beim Chat-Laden
        // Dokumente werden nur beim Upload geladen, nicht beim Chat-Laden
        // Gesendete Dateien sind bereits Teil der Nachrichten
        setDocuments([]);
      } else {
        // Chat nicht gefunden, zurück zur Chat-Liste
        router.push('/chat');
      }
      setIsLoadingChat(false);
    }
    loadChat();
  }, [chatId, router]);

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
    if (!file || !chatId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatId);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      // Prüfe ob Response OK ist
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload Response nicht OK:', response.status, errorText);
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
        // WICHTIG: Nur das neue Dokument zum State hinzufügen, nicht alle Dokumente neu laden
        // Gesendete Dokumente sollen nicht mehr im State sein
        if (result.document) {
          setDocuments(prev => {
            // Prüfe ob Dokument bereits im State ist
            const exists = prev.some(doc => doc.id === result.document.id);
            if (exists) {
              return prev;
            }
            // Neues Dokument hinzufügen
            return [...prev, {
              id: result.document.id,
              fileName: result.document.fileName,
              fileSize: result.document.fileSize,
              mimeType: result.document.mimeType,
              openaiFileId: result.document.openaiFileId, // Wichtig für AI-Call
              createdAt: new Date(result.document.createdAt || Date.now()),
            }];
          });
        }
      } else {
        setToast({ message: result.error || 'Fehler beim Hochladen', type: 'error' });
      }
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      console.error('❌ Upload error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      // Bessere Fehlermeldungen für verschiedene Fehlertypen
      let errorMessage = 'Fehler beim Hochladen der Datei';
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Netzwerkfehler. Bitte prüfe deine Internetverbindung.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Upload-Timeout. Die Datei könnte zu groß sein.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  // Dokument löschen
  async function handleDeleteDocument(documentId: string) {
    setConfirmModal({
      isOpen: true,
      title: 'Dokument löschen',
      message: 'Möchtest du dieses Dokument wirklich löschen?',
      onConfirm: async () => {
        const result = await deleteDocument(documentId);
        if (result.success) {
          // WICHTIG: Nur das gelöschte Dokument aus dem State entfernen, nicht alle Dokumente neu laden
          setDocuments(prev => prev.filter(doc => doc.id !== documentId));
          setToast({ message: 'Dokument gelöscht', type: 'success' });
        } else {
          setToast({ message: result.error || 'Fehler beim Löschen', type: 'error' });
        }
      },
    });
  }

  // Dateigröße formatieren
  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // Dateinamen kürzen wenn zu lang
  function formatFileName(fileName: string, maxLength: number = 20): string {
    if (fileName.length <= maxLength) return fileName;
    
    // Trenne Name und Extension
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex === -1) {
      // Keine Extension
      return fileName.substring(0, maxLength - 3) + '...';
    }
    
    const name = fileName.substring(0, lastDotIndex);
    const ext = fileName.substring(lastDotIndex);
    const maxNameLength = maxLength - ext.length - 3; // 3 für "..."
    
    if (name.length <= maxNameLength) return fileName;
    return name.substring(0, maxNameLength) + '...' + ext;
  }

  // Hilfsfunktion zum Senden einer Nachricht programmatisch (für SuggestedActions)
  async function sendMessage(messageContent: string) {
    if (isLoading || !chatId) return;

    const userMessage: Message = { role: 'user', content: messageContent };
    const newHistory = [...messages, userMessage];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    await saveMessage(chatId, 'user', messageContent);

    // Streaming für Suggested Actions
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newHistory,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Fehler beim Streamen');
      }

      // Erstelle leere Assistant-Nachricht für Streaming
      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages([...newHistory, assistantMessage]);

      // Lese Stream zeichenweise
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          
          // Update sofort für bessere Performance (Server sendet bereits in Wörtern)
          setMessages([...newHistory, { role: 'assistant', content: fullContent }]);
        }

        // Speichere vollständige Nachricht in DB
        await saveMessage(chatId, 'assistant', fullContent);
      }
    } catch (error: any) {
      console.error('Stream error:', error);
      setMessages([...newHistory, { role: 'assistant', content: "⚠️ Fehler: " + (error.message || 'Verbindungsproblem.') }]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Erlaube Submit wenn Text ODER Dokumente vorhanden sind
    if ((!input.trim() && documents.length === 0) || isLoading || !chatId) return;

    // Nachricht mit Dateinamen erstellen, wenn Dateien angehängt sind
    let messageContent = input.trim();
    if (documents.length > 0) {
      // Format: "📎 Datei: dateiname.html" oder bei mehreren "📎 Dateien: datei1.html, datei2.html"
      const fileNames = documents.map(d => formatFileName(d.fileName)).join(', ');
      const fileLabel = documents.length === 1 ? '📎 Datei:' : '📎 Dateien:';
      if (messageContent) {
        messageContent += `\n\n${fileLabel} ${fileNames}`;
      } else {
        messageContent = `${fileLabel} ${fileNames}`;
      }
    } else if (!messageContent) {
      messageContent = 'Siehe angehängte Datei(en).';
    }

    const userMessage: Message = { role: 'user', content: messageContent };
    const newHistory = [...messages, userMessage];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    // User-Nachricht in DB speichern (mit Dateinamen, wenn vorhanden)
    await saveMessage(chatId, 'user', messageContent);

    // KI-Response holen (mit hochgeladenen Dokumenten)
    // WICHTIG: Bilder haben möglicherweise null openaiFileId - das ist ok, Vision API nutzt Base64
    // Filtere null-Werte heraus, da chatWithAI nur string[] erwartet
    const docFileIds = documents.length > 0 
      ? documents.map(doc => doc.openaiFileId).filter((id): id is string => id !== null)
      : undefined;
    const docMimeTypes = documents.length > 0 ? documents.map(doc => doc.mimeType) : undefined;
    
    // ✅ Dokumente aus der Liste entfernen NACH dem AI-Call (sie sind ja schon gesendet)
    setDocuments([]);
    
    // Prüfe ob Streaming möglich ist (nur wenn keine Dokumente oder nur Bilder)
    const hasNonImageDocs = docMimeTypes?.some(mime => !mime?.startsWith('image/')) || false;
    
    if (hasNonImageDocs) {
      // Fallback auf nicht-streaming für Dokumente
      const response = await chatWithAI(newHistory, docFileIds, docMimeTypes);
      if (response.result) {
        const assistantMessage: Message = { role: 'assistant', content: response.result };
        setMessages([...newHistory, assistantMessage]);
        await saveMessage(chatId, 'assistant', response.result);
      } else {
        const errorMessage: Message = { role: 'assistant', content: "⚠️ Fehler: " + response.error };
        setMessages([...newHistory, errorMessage]);
      }
      setIsLoading(false);
    } else {
      // Streaming für normale Chats und Bilder
      try {
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: newHistory,
            fileIds: docFileIds,
            fileMimeTypes: docMimeTypes,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Fehler beim Streamen');
        }

        // Erstelle leere Assistant-Nachricht für Streaming
        const assistantMessage: Message = { role: 'assistant', content: '' };
        setMessages([...newHistory, assistantMessage]);

        // Lese Stream zeichenweise
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          
          // Update sofort für bessere Performance (Server sendet bereits in Wörtern)
          setMessages([...newHistory, { role: 'assistant', content: fullContent }]);
          }

          // Speichere vollständige Nachricht in DB
          await saveMessage(chatId, 'assistant', fullContent);
        }
      } catch (error: any) {
        console.error('Stream error:', error);
        const errorMessage: Message = { role: 'assistant', content: "⚠️ Fehler: " + (error.message || 'Verbindungsproblem.') };
        setMessages([...newHistory, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  }

  if (isLoadingChat) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center bg-white">
        <div className="text-gray-500">Lade Chat...</div>
      </div>
    );
  }

  return (
    <>
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
      {/* Chat Layout: Einfaches Flex-Layout */}
      <div data-no-padding className="h-full flex w-full overflow-hidden bg-white">
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
          {/* STICKY HEADER - Glassmorphism */}
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

          {/* NACHRICHTEN BEREICH - Dashboard Style Design */}
          {/* Central Layout: max-w-3xl (48rem), centered, mit genug Padding unten für Floating Bar */}
          <div className="flex-1 overflow-y-auto scroll-smooth bg-white pb-[calc(5rem+env(safe-area-inset-bottom)+9rem)] md:pb-40">
            {/* Central Container: Begrenzte Breite, zentriert (wie Dokument) */}
            <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
              {messages.length === 0 && (
                <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-gray-400">
                  <span className="text-5xl sm:text-6xl mb-4">💬</span>
                  <p className="text-lg font-medium text-gray-600">Ich bin bereit.</p>
                </div>
              )}

              {messages.map((msg, i) => {
          const isSwiping = swipingMessageIndex === i;
          const showContextMenu = longPressMessageIndex === i;
          const COPY_THRESHOLD = 80;
          const LONG_PRESS_DURATION = 500;

          const handleTouchStart = (e: React.TouchEvent) => {
            const touch = e.touches[0];
            touchStartRef.current = {
              x: touch.clientX,
              y: touch.clientY,
              time: Date.now(),
              index: i,
            };

            const timer = setTimeout(() => {
              triggerHaptic('medium');
              setLongPressMessageIndex(i);
              touchStartRef.current = null;
            }, LONG_PRESS_DURATION);
            longPressTimerRef.current = timer;
          };

          const handleTouchMove = (e: React.TouchEvent) => {
            if (!touchStartRef.current || touchStartRef.current.index !== i) return;

            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }

            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartRef.current.x;
            const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

            if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
              // Nur preventDefault wenn Event cancelable ist
              if (e.cancelable) {
                e.preventDefault();
              }
              setSwipingMessageIndex(i);
              
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
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }

            if (swipingMessageIndex !== i) {
              touchStartRef.current = null;
              return;
            }

            if (swipeOffset < -COPY_THRESHOLD) {
              triggerHaptic('success');
              navigator.clipboard.writeText(msg.content).catch(() => {});
              setSwipeOffset(0);
              setSwipingMessageIndex(null);
            } else {
              setSwipeOffset(0);
              setSwipingMessageIndex(null);
            }

            touchStartRef.current = null;
          };

          const copyBgOpacity = swipeOffset < -50 && isSwiping ? Math.min(1, Math.abs(swipeOffset) / 100) : 0;

          return (
            <div
              key={i}
              className="w-full relative"
              style={{
                transform: isSwiping ? `translateX(${swipeOffset}px)` : 'none',
                transition: isSwiping ? 'none' : 'transform 0.2s ease-out',
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Copy Background (links) */}
              {swipeOffset < 0 && isSwiping && (
                <div
                  className="absolute inset-0 flex items-center justify-start pl-4 bg-blue-500/20 rounded-lg pointer-events-none"
                  style={{ opacity: copyBgOpacity }}
                >
                  <Copy className="w-5 h-5 text-blue-400" />
                </div>
              )}

                <div className="w-full">
                  {msg.role === 'user' ? (
                    /* USER MESSAGE: Dashboard Style Card, rechtsbündig */
                    <div className="flex w-full justify-end items-start gap-3">
                      {/* User Message Card - Dashboard Style */}
                      <div className="group relative max-w-[85%] sm:max-w-[80%] md:max-w-[90%] rounded-xl px-4 md:px-5 py-3 md:py-4 shadow-sm border border-gray-200/50 bg-white">
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <CopyButton text={msg.content} variant="icon" size="md" />
                        </div>
                        <div className="flex items-start gap-3">
                          <p className="flex-1 whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed text-gray-900">{msg.content}</p>
                          {/* User Avatar innerhalb der Card - Dashboard Gradient */}
                          <div className="h-7 w-7 shrink-0 select-none items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 text-[10px] font-semibold text-white flex shadow-sm">
                            DU
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* AI MESSAGE: Dashboard Style, linksbündig, volle Breite */
                    <div className="flex w-full justify-start items-start gap-3">
                      {/* SiniChat Logo/Avatar links oben - Dashboard Style */}
                      <div className="h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl shadow-md border border-gray-200/50 bg-white overflow-hidden mt-0.5">
                        <Image 
                          src="/assets/logos/logo.webp" 
                          alt="Sinispace Logo" 
                          width={32}
                          height={32}
                          className="object-contain p-1.5" 
                        />
                      </div>
                      {/* AI Text Block - Dashboard Style (kein Hintergrund, Text auf weiß) */}
                      <div className="flex-1 group relative">
                        <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <CopyButton text={msg.content} variant="icon" size="md" />
                        </div>
                        {/* Tailwind Typography: Blogartikel-ähnliches Formatting */}
                        <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Suggested Actions - Nur bei der letzten AI-Nachricht */}
                  {msg.role === 'assistant' && i === messages.length - 1 && !isLoading && (
                    <div className="ml-11 mt-4">
                      <SuggestedActions 
                        content={msg.content} 
                        onActionClick={(prompt) => sendMessage(prompt)}
                      />
                    </div>
                  )}
                  {msg.role === 'assistant' && i === messages.length - 1 && !isLoading && (
                    <div className="ml-11 mt-3">
                      <FeedbackButton
                        toolId="chat"
                        toolName="SiniChat"
                        resultId={msg.content ? `chat-${i}-${Date.now()}` : undefined}
                      />
                    </div>
                  )}
                </div>

              {/* Context Menu (Long-Press) - Dashboard Style */}
              {showContextMenu && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setLongPressMessageIndex(null)}>
                  <div
                    className="bg-white border border-gray-200 rounded-xl p-4 max-w-xs w-full mx-4 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Nachricht</h3>
                      <button
                        onClick={() => setLongPressMessageIndex(null)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(msg.content);
                          triggerHaptic('success');
                          setLongPressMessageIndex(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <Copy className="w-4 h-4 text-blue-500" />
                        <span className="text-sm text-gray-700">Kopieren</span>
                      </button>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => {
                            sendMessage('Bitte generiere diese Antwort neu.');
                            setLongPressMessageIndex(null);
                            triggerHaptic('medium');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                        >
                          <RefreshCw className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-700">Neu generieren</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </div>
            );
          })}
          
          {isLoading && (
            <div className="flex w-full gap-4 justify-start">
               <div className="h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-md border border-gray-200/50 bg-white overflow-hidden flex">
                 <Image 
                   src="/assets/logos/logo.webp" 
                   alt="Sinispace Logo" 
                   width={32}
                   height={32}
                   className="object-contain p-1.5" 
                 />
               </div>
               <div className="flex items-center space-x-1.5 rounded-xl bg-white border border-gray-200/50 px-4 py-3 shadow-sm">
                 <div className="h-2 w-2 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.3s]"></div>
                 <div className="h-2 w-2 animate-bounce rounded-full bg-pink-500 [animation-delay:-0.15s]"></div>
                 <div className="h-2 w-2 animate-bounce rounded-full bg-orange-500"></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
            </div>
          </div>

          {/* INPUT BEREICH - Premium Floating Bar */}
          {/* Mobile: Über der Bottom Nav positioniert (5rem = Nav-Höhe + Safe Area) */}
          {/* Desktop: Fixed bottom-6, zentriert, max-w-3xl */}
          <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom)+1rem)] md:bottom-6 left-0 md:left-[calc(16rem+20rem)] right-0 z-40 flex justify-center px-4 md:px-6">
            <div className="w-full max-w-3xl">
              {/* Dokumente Liste - Premium Style */}
              {documents.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2 justify-center md:justify-start">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200/50 px-2.5 py-1.5 text-xs"
                    >
                      <span className="text-gray-500">📄</span>
                      <span className="text-gray-700 max-w-[150px] truncate" title={doc.fileName}>
                        {formatFileName(doc.fileName, 20)}
                      </span>
                      <span className="text-gray-500">({formatFileSize(doc.fileSize)})</span>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Löschen"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Disclaimer Text */}
              <div className="mb-3 text-center">
                <p className="text-[10px] md:text-xs text-gray-500">KI kann Fehler machen. Überprüfe wichtige Informationen.</p>
              </div>

              {/* Input Container - Brand New Design */}
              <form 
                onSubmit={handleSubmit}
                className="flex items-center gap-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  disabled={!chatId || isUploading}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.html,.css,.js,.json,.xml,.py,.java,.c,.cpp,.cs,.php,.rb,.go,.ts,.sh,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tiff,.csv"
                />
                
                {/* Upload Button - Left Side */}
                {chatId && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center"
                    title="Datei hochladen"
                  >
                    {isUploading ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                      </svg>
                    )}
                  </button>
                )}
                
                {/* Input Field - Brand New Design */}
                <div className="relative flex-1 min-w-0 isolate z-0">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Schreib eine Nachricht..."
                    className="w-full h-14 py-0 px-6 pr-16 text-base leading-normal text-gray-900 placeholder:text-gray-500 bg-white border-2 border-gray-200 rounded-2xl shadow-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all resize-none"
                    style={{
                      minHeight: '56px', // Touch-friendly on mobile
                    }}
                    autoFocus
                  />
                  
                  {/* Send Button - Absolute inside Input Field */}
                  <button
                    type="submit"
                    disabled={isLoading || (!input.trim() && documents.length === 0)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-md hover:shadow-lg hover:scale-105 active:scale-95 backdrop-blur-none"
                    aria-label="Nachricht senden"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m22 2-7 20-4-9-9-4Z"/>
                      <path d="M22 2 11 13"/>
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

