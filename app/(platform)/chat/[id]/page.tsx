'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { chatWithAI } from '@/actions/ai-actions';
import { getChat, saveMessage } from '@/actions/chat-actions';
import { getChatDocuments, deleteDocument } from '@/actions/document-actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Syntax Highlighting
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all opacity-0 group-hover:opacity-100"
      title="In Zwischenablage kopieren"
    >
      {copied ? '✓' : '📋'}
    </button>
  );
}

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
        // Dokumente laden
        const docs = await getChatDocuments(chatId);
        setDocuments(docs);
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

      const result = await response.json();

      if (result.success) {
        const docs = await getChatDocuments(chatId);
        setDocuments(docs);
      } else {
        alert(result.error || 'Fehler beim Hochladen');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Fehler beim Hochladen der Datei');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  // Dokument löschen
  async function handleDeleteDocument(documentId: string) {
    if (!confirm('Dokument wirklich löschen?')) return;

    const result = await deleteDocument(documentId);
    if (result.success && chatId) {
      const docs = await getChatDocuments(chatId);
      setDocuments(docs);
    } else {
      alert(result.error || 'Fehler beim Löschen');
    }
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
    const docFileIds = documents.length > 0 ? documents.map(doc => doc.openaiFileId) : undefined;
    const docMimeTypes = documents.length > 0 ? documents.map(doc => doc.mimeType) : undefined;
    
    // ✅ Dokumente aus der Liste entfernen NACH dem AI-Call (sie sind ja schon gesendet)
    setDocuments([]);
    
    const response = await chatWithAI(newHistory, docFileIds, docMimeTypes);

    if (response.result) {
      const assistantMessage: Message = { role: 'assistant', content: response.result };
      setMessages([...newHistory, assistantMessage]);
      
      // Assistant-Nachricht in DB speichern
      await saveMessage(chatId, 'assistant', response.result);
    } else {
      const errorMessage: Message = { role: 'assistant', content: "⚠️ Fehler: " + response.error };
      setMessages([...newHistory, errorMessage]);
    }
    
    setIsLoading(false);
  }

  if (isLoadingChat) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center">
        <div className="text-zinc-400">Lade Chat...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden">
      {/* Chat Titel - Logo + SiniChat Branding */}
      <div className="shrink-0 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 border-b border-transparent sm:border-white/5">
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

      {/* NACHRICHTEN BEREICH */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 space-y-3 sm:space-y-4 md:space-y-6 scroll-smooth pb-[calc(env(safe-area-inset-bottom)+120px)] sm:pb-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-zinc-400 opacity-50">
            <span className="text-5xl sm:text-6xl mb-4">💬</span>
            <p className="text-lg font-medium">Ich bin bereit.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex w-full gap-2 sm:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="hidden md:flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full shadow-lg shadow-orange-500/10 border border-white/10 bg-white mt-1 overflow-hidden">
                <Image 
                  src="/assets/logos/logo.webp" 
                  alt="Sinispace Logo" 
                  width={32}
                  height={32}
                  className="object-contain p-1.5" 
                />
              </div>
            )}

            <div
              className={`group relative max-w-[88%] xs:max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[70%] rounded-lg sm:rounded-xl md:rounded-2xl px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 shadow-sm text-[13px] sm:text-sm md:text-[15px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-zinc-900/80 backdrop-blur-sm text-white rounded-br-none border border-white/10'
                  : 'bg-zinc-800/50 backdrop-blur-xl border border-white/10 text-white rounded-bl-none'
              }`}
            >
              <CopyButton text={msg.content} />
              {msg.role === 'assistant' ? (
                <div className="prose prose-zinc prose-sm max-w-none dark:prose-invert 
                  prose-p:my-1 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 
                  prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-bold prose-headings:text-white
                  prose-pre:my-2 prose-pre:bg-zinc-900 prose-pre:p-0
                  prose-table:my-2 prose-th:p-2 prose-td:p-2
                  prose-p:text-white prose-ul:text-white prose-ol:text-white prose-li:text-white
                  break-words overflow-hidden"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({node, inline, className, children, ...props}: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <div className="rounded-lg overflow-hidden my-3 border border-zinc-700 shadow-sm">
                            <div className="bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400 flex items-center justify-between border-b border-zinc-700">
                              <span className="font-mono">{match[1]}</span>
                              <button
                                onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
                                className="hover:text-white transition-colors"
                              >
                                Copy
                              </button>
                            </div>
                            <SyntaxHighlighter
                              style={oneDark}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{ margin: 0, borderRadius: 0, padding: '1rem', fontSize: '0.85rem' }}
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className="bg-zinc-800/50 px-1 py-0.5 rounded font-mono text-xs border border-white/10 break-words" {...props}>
                            {children}
                          </code>
                        )
                      },
                      table({children}) {
                        return (
                          <div className="overflow-x-auto my-4 border border-white/10 rounded-lg">
                            <table className="min-w-full divide-y divide-white/10">{children}</table>
                          </div>
                        )
                      },
                      thead({children}) { return <thead className="bg-zinc-800/50">{children}</thead> },
                      th({children}) { return <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">{children}</th> },
                      td({children}) { return <td className="px-3 py-2 text-sm text-zinc-300 border-t border-white/10 whitespace-nowrap sm:whitespace-normal">{children}</td> }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="hidden md:flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-zinc-800/50 text-xs font-bold text-zinc-300 border border-white/10 mt-1">
                DU
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
             <div className="flex items-center space-x-1 rounded-2xl bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl border border-white/10 px-4 py-3 shadow-sm">
               <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></div>
               <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></div>
               <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* INPUT BEREICH - Fixed für Mobile, damit Tastatur nicht darüber liegt */}
      <div className="fixed bottom-0 left-0 right-0 sm:relative shrink-0 p-2 sm:p-3 md:p-4 lg:p-5 border-t border-white/5 bg-zinc-950 z-30 pb-[env(safe-area-inset-bottom)] sm:pb-2 md:pb-4 lg:pb-5">
        {/* Dokumente Liste */}
        {documents.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-1.5 rounded-md bg-zinc-800/50 border border-white/10 px-2 py-1 text-xs"
              >
                <span className="text-zinc-400">📄</span>
                <span className="text-zinc-300 max-w-[150px] truncate" title={doc.fileName}>
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

        <form onSubmit={handleSubmit} className="relative flex items-end gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-1.5 sm:p-2 md:p-2.5 shadow-sm focus-within:ring-2 focus-within:ring-orange-500/50 transition-all">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            disabled={!chatId || isUploading}
            className="hidden"
            accept=".pdf,.doc,.docx,.xlsx,.pptx,.txt,.md,.html,.css,.js,.json,.xml,.py,.java,.c,.cpp,.cs,.php,.rb,.go,.ts,.sh,.jpg,.jpeg,.png,.gif,.zip,.tar"
          />
          {chatId && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mb-0.5 sm:mb-1 rounded-lg bg-zinc-800 p-1.5 sm:p-2 md:p-2.5 text-white hover:bg-zinc-700 disabled:opacity-50 transition-all shrink-0"
              title="Datei hochladen"
            >
              {isUploading ? (
                <svg className="w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
              )}
            </button>
          )}
          {input.trim() && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(input);
                } catch (err) {
                  console.error('Fehler beim Kopieren:', err);
                }
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-medium rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all"
              title="Eingabe kopieren"
            >
              📋
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Schreib eine Nachricht..."
            className={`flex-1 bg-transparent px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-base md:text-sm focus:outline-none min-w-0 text-white placeholder:text-zinc-500 ${input.trim() ? 'pl-8 sm:pl-10' : ''}`}
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || (!input.trim() && documents.length === 0)}
            className="mb-0.5 sm:mb-1 mr-0.5 sm:mr-1 rounded-lg bg-zinc-900 p-1.5 sm:p-2 md:p-2.5 text-white hover:bg-zinc-700 disabled:opacity-50 transition-all shrink-0"
            aria-label="Nachricht senden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
        <p className="mt-1.5 sm:mt-2 text-center text-[9px] sm:text-[10px] md:text-xs text-zinc-500">
          KI kann Fehler machen. Überprüfe wichtige Informationen.
        </p>
      </div>
    </div>
  );
}

