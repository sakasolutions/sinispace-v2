'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { chatWithAI } from '@/actions/ai-actions';
import { createChat, saveMessage } from '@/actions/chat-actions';
import { getChatDocuments, deleteDocument } from '@/actions/document-actions';
// KEIN Sidebar Import mehr nötig!
// KEINE Icons (Menu, X) mehr nötig!
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { SuggestedActions } from '@/components/suggested-actions';
import { CopyButton } from '@/components/ui/copy-button';
import { Tooltip } from '@/components/ui/tooltip';

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
        className="bg-zinc-900 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" 
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-zinc-300 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
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

  const bgColor = type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-zinc-800';

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg border border-white/10`}>
      {message}
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
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
  
  // sidebarOpen State ist WEG (macht jetzt das Layout)
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // WICHTIG: Dokumente werden NICHT automatisch beim Chat-Laden geladen
  // Dokumente werden nur beim Upload geladen (in handleFileUpload)
  // Gesendete Dateien sind bereits Teil der Nachrichten und sollten nicht nochmal gesendet werden

  // File Upload Handler
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log('📤 Upload gestartet:', file.name, file.size, 'bytes', file.type);
    setIsUploading(true);
    try {
      let chatIdToUse = currentChatId;

      // Falls noch kein Chat existiert, erstelle einen
      if (!chatIdToUse) {
        console.log('💬 Erstelle neuen Chat für Datei...');
        const chatResult = await createChat(`Datei hochgeladen: ${file.name}`);
        if (chatResult.success && chatResult.chatId) {
          chatIdToUse = chatResult.chatId;
          setCurrentChatId(chatIdToUse);
          console.log('✅ Chat erstellt:', chatIdToUse);
        } else {
          console.error('❌ Fehler beim Erstellen des Chats:', chatResult);
          setToast({ message: 'Fehler beim Erstellen des Chats', type: 'error' });
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          return;
        }
      } else {
        console.log('💬 Verwende existierenden Chat:', chatIdToUse);
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', chatIdToUse);

      console.log('📡 Sende Upload-Request zu /api/documents/upload...');
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('📨 Upload-Response Status:', response.status, response.statusText);
      
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
      console.log('📨 Upload-Response Body:', result);

      if (result.success) {
        console.log('✅ Upload erfolgreich, füge neues Dokument zum State hinzu...');
        // WICHTIG: Nur das neue Dokument zum State hinzufügen, nicht alle Dokumente neu laden
        // Gesendete Dokumente sollen nicht mehr im State sein
        if (result.document) {
          setDocuments(prev => {
            // Prüfe ob Dokument bereits im State ist (sollte nicht passieren, aber sicherheitshalber)
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
        
        // WICHTIG: Redirect NACH erfolgreichem Upload
        if (!currentChatId) {
          console.log('🔄 Redirect zu /chat/' + chatIdToUse);
          router.push(`/chat/${chatIdToUse}`);
        }
      } else {
        console.error('❌ Upload fehlgeschlagen:', result.error);
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
    if (isLoading) return;

    const userMessage: Message = { role: 'user', content: messageContent };
    const newHistory = [...messages, userMessage];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    let chatIdToUse = currentChatId;

    if (!chatIdToUse) {
      const chatTitle = messageContent.substring(0, 50) || 'Neuer Chat';
      console.log('💬 Erstelle neuen Chat:', chatTitle);
      const chatResult = await createChat(chatTitle);
      if (chatResult.success && chatResult.chatId) {
        chatIdToUse = chatResult.chatId;
        setCurrentChatId(chatIdToUse);
        console.log('✅ Chat erstellt:', chatIdToUse);
        
        await saveMessage(chatIdToUse, 'user', messageContent);
        
        const response = await chatWithAI(newHistory);
        console.log('🤖 chatWithAI Response:', { hasResult: !!response.result, hasError: !!response.error });
        
        if (response.result) {
          const assistantMessage: Message = { role: 'assistant', content: response.result };
          setMessages([...newHistory, assistantMessage]);
          await saveMessage(chatIdToUse, 'assistant', response.result);
        } else {
          console.error('❌ Keine Antwort von AI:', response.error);
          setMessages([...newHistory, { role: 'assistant', content: "⚠️ Fehler: " + response.error }]);
        }
        
        setIsLoading(false);
        router.push(`/chat/${chatIdToUse}`);
        return;
      } else {
        console.error('❌ Fehler beim Erstellen des Chats:', chatResult);
        setIsLoading(false);
        return;
      }
    }

    if (chatIdToUse) {
      await saveMessage(chatIdToUse, 'user', messageContent);
    }

    const response = await chatWithAI(newHistory);
    console.log('🤖 chatWithAI Response:', { hasResult: !!response.result, hasError: !!response.error });

    if (response.result) {
      const assistantMessage: Message = { role: 'assistant', content: response.result };
      setMessages([...newHistory, assistantMessage]);
      
      if (chatIdToUse) {
        await saveMessage(chatIdToUse, 'assistant', response.result);
      }
    } else {
      console.error('❌ Keine Antwort von AI:', response.error);
      setMessages([...newHistory, { role: 'assistant', content: "⚠️ Fehler: " + response.error }]);
    }
    
    setIsLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Erlaube Submit wenn Text ODER Dokumente vorhanden sind
    if ((!input.trim() && documents.length === 0) || isLoading) {
      console.log('⏸️ Submit verhindert:', { hasInput: !!input.trim(), documentsCount: documents.length, isLoading });
      return;
    }

    console.log('📨 Submit gestartet:', { 
      inputLength: input.trim().length, 
      documentsCount: documents.length,
      documents: documents.map(d => ({ id: d.id, fileName: d.fileName, openaiFileId: d.openaiFileId })),
      currentChatId 
    });

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
    const originalMessageContent = input.trim();
    setInput('');
    setIsLoading(true);

    let chatIdToUse = currentChatId;

      // Wenn noch kein Chat existiert, erstelle einen neuen
      if (!chatIdToUse) {
        const chatTitle = originalMessageContent || (documents.length > 0 ? `Datei: ${documents[documents.length - 1].fileName}` : 'Neuer Chat');
      console.log('💬 Erstelle neuen Chat:', chatTitle);
      const chatResult = await createChat(chatTitle);
      if (chatResult.success && chatResult.chatId) {
        chatIdToUse = chatResult.chatId;
        setCurrentChatId(chatIdToUse);
        console.log('✅ Chat erstellt:', chatIdToUse);
        
        // ✅ User-Nachricht speichern (mit Dateinamen, wenn vorhanden)
        await saveMessage(chatIdToUse, 'user', messageContent);
        
        // ✅ KI-Response holen BEVOR Redirect (mit hochgeladenen Dokumenten)
        // WICHTIG: Bilder haben möglicherweise null openaiFileId - das ist ok, Vision API nutzt Base64
        // Filtere null-Werte heraus, da chatWithAI nur string[] erwartet
        const docFileIds = documents.length > 0 
          ? documents.map(doc => doc.openaiFileId).filter((id): id is string => id !== null)
          : undefined;
        const docMimeTypes = documents.length > 0 ? documents.map(doc => doc.mimeType) : undefined;
        console.log('🤖 Rufe chatWithAI auf mit', docFileIds?.length || 0, 'Datei(en):', docFileIds);
        
        // ✅ Dokumente aus der Liste entfernen NACH dem AI-Call (sie sind ja schon gesendet)
        setDocuments([]);
        
        const response = await chatWithAI(newHistory, docFileIds, docMimeTypes);
        console.log('🤖 chatWithAI Response:', { hasResult: !!response.result, hasError: !!response.error, error: response.error });
        
        if (response.result) {
          const assistantMessage: Message = { role: 'assistant', content: response.result };
          setMessages([...newHistory, assistantMessage]);
          
          // ✅ Assistant-Nachricht speichern
          await saveMessage(chatIdToUse, 'assistant', response.result);
        } else {
          console.error('❌ Keine Antwort von AI:', response.error);
          setMessages([...newHistory, { role: 'assistant', content: "⚠️ Fehler: " + response.error }]);
        }
        
        setIsLoading(false);
        
        // ✅ Redirect zu /chat/[id] damit der Chat in der Sidebar als aktiv erscheint
        console.log('🔄 Redirect zu /chat/' + chatIdToUse);
        router.push(`/chat/${chatIdToUse}`);
        return;
      } else {
        // Fehler beim Erstellen
        console.error('❌ Fehler beim Erstellen des Chats:', chatResult);
        setIsLoading(false);
        return;
      }
    }

    // User-Nachricht speichern (wenn Chat bereits existiert, mit Dateinamen, wenn vorhanden)
    if (chatIdToUse) {
      await saveMessage(chatIdToUse, 'user', messageContent);
    }

    // KI-Response holen (mit hochgeladenen Dokumenten)
    // WICHTIG: Bilder haben möglicherweise null openaiFileId - das ist ok, Vision API nutzt Base64
    // Filtere null-Werte heraus, da chatWithAI nur string[] erwartet
    const docFileIds = documents.length > 0 
      ? documents.map(doc => doc.openaiFileId).filter((id): id is string => id !== null)
      : undefined;
    const docMimeTypes = documents.length > 0 ? documents.map(doc => doc.mimeType) : undefined;
    console.log('🤖 Rufe chatWithAI auf (existierender Chat) mit', docFileIds?.length || 0, 'Datei(en):', docFileIds);
    
    // ✅ Dokumente aus der Liste entfernen NACH dem AI-Call (sie sind ja schon gesendet)
    setDocuments([]);
    
    const response = await chatWithAI(newHistory, docFileIds, docMimeTypes);
    console.log('🤖 chatWithAI Response:', { hasResult: !!response.result, hasError: !!response.error, error: response.error });

    if (response.result) {
      const assistantMessage: Message = { role: 'assistant', content: response.result };
      setMessages([...newHistory, assistantMessage]);
      
      // Assistant-Nachricht speichern
      if (chatIdToUse) {
        await saveMessage(chatIdToUse, 'assistant', response.result);
      }
    } else {
      console.error('❌ Keine Antwort von AI:', response.error);
      setMessages([...newHistory, { role: 'assistant', content: "⚠️ Fehler: " + response.error }]);
    }
    
    setIsLoading(false);
  }

  return (
    // WICHTIG: Nur noch ein einfacher Container, der den Platz vom Layout füllt.
    // Keine Sidebar-Komponente mehr hier drin!
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
      <div className="flex flex-col h-[100dvh] w-full overflow-hidden pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      
      {/* HEADER: Logo + SiniChat Branding */}
      {/* Mobile: Safe-Area-Padding oben für Statusbar */}
      <div className="shrink-0 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 border-b border-transparent sm:border-white/5 pt-[calc(env(safe-area-inset-top)+0.5rem)] md:pt-2.5">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative h-8 w-8 sm:h-9 sm:w-9 overflow-hidden rounded-full shadow-lg shadow-orange-500/10 border border-white/10 bg-white shrink-0">
            <Image 
              src="/assets/logos/logo.webp" 
              alt="Sinispace Logo" 
              fill 
              className="object-contain p-1.5" 
              priority 
            />
          </div>
          <div>
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">SiniChat</h1>
            <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-zinc-400">Frag mich alles – mit Code, Tabellen und Struktur.</p>
          </div>
        </div>
      </div>

      {/* NACHRICHTEN BEREICH - Modern KI-Assistant Design (Gemini/Claude Style) */}
      {/* Central Layout: max-w-3xl (48rem), centered, mit genug Padding unten für Floating Bar */}
      <div className="flex-1 overflow-y-auto scroll-smooth pb-[calc(5rem+env(safe-area-inset-bottom)+9rem)] md:pb-40">
        {/* Central Container: Begrenzte Breite, zentriert */}
        <div className="mx-auto max-w-3xl px-4 sm:px-6 md:px-8 py-6 md:py-8 space-y-6 md:space-y-8">
          {messages.length === 0 && (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-zinc-400 opacity-50">
              <span className="text-5xl sm:text-6xl mb-4">💬</span>
              <p className="text-lg font-medium">Ich bin bereit.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className="w-full">
              {msg.role === 'user' ? (
                /* USER MESSAGE: Elegante Card, rechtsbündig */
                <div className="flex w-full justify-end items-start gap-3">
                  {/* User Message Card */}
                  <div className="group relative max-w-[85%] sm:max-w-[80%] md:max-w-[90%] rounded-2xl px-4 md:px-5 py-3 md:py-4 shadow-md border border-zinc-700/50 dark:bg-zinc-800 bg-gray-50 dark:text-white text-zinc-900">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <CopyButton text={msg.content} variant="icon" size="md" />
                    </div>
                    <div className="flex items-start gap-3">
                      <p className="flex-1 whitespace-pre-wrap break-words text-sm md:text-base leading-relaxed">{msg.content}</p>
                      {/* User Avatar innerhalb der Card */}
                      <div className="h-6 w-6 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-[10px] font-semibold text-white flex">
                        DU
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* AI MESSAGE: Invisible Container, linksbündig, volle Breite */
                <div className="flex w-full justify-start items-start gap-3">
                  {/* SiniChat Logo/Avatar links oben */}
                  <div className="h-8 w-8 shrink-0 select-none items-center justify-center rounded-full shadow-lg shadow-orange-500/10 border border-white/10 bg-white overflow-hidden mt-0.5">
                    <Image 
                      src="/assets/logos/logo.webp" 
                      alt="Sinispace Logo" 
                      width={32}
                      height={32}
                      className="object-contain p-1.5" 
                    />
                  </div>
                  {/* AI Text Block - KEINE Card, kein Hintergrund */}
                  <div className="flex-1 group relative">
                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <CopyButton text={msg.content} variant="icon" size="md" />
                    </div>
                    {/* Perfektes Markdown-Rendering mit verbesserter Typografie */}
                    <div className="prose prose-invert prose-sm md:prose-base max-w-none">
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
            </div>
          ))}
          
          {isLoading && (
            <div className="flex w-full gap-4 justify-start">
               <div className="hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-lg shadow-orange-500/10 border border-white/10 bg-white overflow-hidden">
                 <Image 
                   src="/assets/logos/logo.webp" 
                   alt="Sinispace Logo" 
                   width={32}
                   height={32}
                   className="object-contain p-1.5" 
                 />
               </div>
               <div className="flex items-center space-x-1.5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 px-4 py-3 shadow-sm">
                 <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></div>
                 <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></div>
                 <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* INPUT BEREICH - Floating Bar Design */}
      {/* Mobile: Über der Bottom Nav positioniert (5rem = Nav-Höhe + Safe Area) */}
      {/* Desktop: Fixed bottom-6, zentriert, max-w-3xl */}
      <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom)+1.5rem)] md:bottom-6 left-0 right-0 z-40 flex justify-center px-4 md:px-6">
        <div className="w-full max-w-3xl">
          {/* Dokumente Liste - Über der Floating Bar */}
          {documents.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 justify-center md:justify-start">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-1.5 rounded-lg bg-zinc-800/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-white/10 px-2.5 py-1.5 text-xs shadow-md"
                >
                  <span className="text-zinc-400">📄</span>
                  <span className="text-zinc-300 dark:text-zinc-300 max-w-[150px] truncate" title={doc.fileName}>
                    {formatFileName(doc.fileName, 20)}
                  </span>
                  <span className="text-zinc-500">({formatFileSize(doc.fileSize)})</span>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="ml-1 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Löschen"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Floating Bar - Schwebende Pille/Box */}
          <form 
            onSubmit={handleSubmit} 
            className="relative flex items-center gap-2 rounded-2xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl border border-zinc-200/50 dark:border-white/10 p-2 md:p-3 shadow-xl focus-within:ring-2 focus-within:ring-orange-500/50 focus-within:shadow-2xl transition-all"
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.html,.css,.js,.json,.xml,.py,.java,.c,.cpp,.cs,.php,.rb,.go,.ts,.sh,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tiff,.csv"
            />
            {/* Upload Button */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="rounded-xl bg-zinc-100 dark:bg-zinc-700/50 p-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-all"
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
              <div className="absolute -top-1 -right-1">
                <Tooltip 
                  content={
                    <div className="space-y-1">
                      <p className="font-semibold mb-1">Unterstützte Dateitypen:</p>
                      <p>📄 Dokumente: PDF, Word, Excel, PowerPoint, TXT, Markdown</p>
                      <p>💻 Code: JS, TS, Python, Java, C++, PHP, Ruby, Go, etc.</p>
                      <p>🖼️ Bilder: JPG, PNG, GIF, WebP, SVG</p>
                      <p>📊 Daten: CSV, JSON, XML</p>
                    </div>
                  }
                  variant="info"
                  position="top"
                  iconOnly
                />
              </div>
            </div>
            
            {/* Input Field - Kein eigener Rahmen */}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Schreib eine Nachricht..."
              className="flex-1 bg-transparent px-3 md:px-4 py-2 text-base md:text-sm focus:outline-none border-none min-w-0 text-zinc-900 dark:text-white placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
              autoFocus
            />
            
            {/* Send Button - Mit Akzentfarbe */}
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && documents.length === 0)}
              className="rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 p-2.5 text-white hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 shadow-md hover:shadow-lg"
              aria-label="Nachricht senden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m22 2-7 20-4-9-9-4Z"/>
                <path d="M22 2 11 13"/>
              </svg>
            </button>
          </form>
          
          {/* Disclaimer Text */}
          <p className="mt-2 text-center text-[10px] md:text-xs text-zinc-500 dark:text-zinc-400">
            KI kann Fehler machen. Überprüfe wichtige Informationen.
          </p>
        </div>
      </div>
    </div>
    </>
  );
}