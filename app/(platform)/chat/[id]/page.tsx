'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { chatWithAI } from '@/actions/ai-actions';
import { getChat, saveMessage } from '@/actions/chat-actions';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Syntax Highlighting
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const chatId = params.id as string;
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading || !chatId) return;

    const userMessage: Message = { role: 'user', content: input };
    const newHistory = [...messages, userMessage];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    // User-Nachricht in DB speichern
    await saveMessage(chatId, 'user', input);

    const response = await chatWithAI(newHistory);

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
    <div className="flex flex-col h-full w-full">
      {/* Chat Titel - nur auf Desktop mit Padding, Mobile ohne extra Padding */}
      <div className="shrink-0 px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 border-b border-transparent sm:border-white/5">
        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-white">Freier Chat</h1>
        <p className="text-[11px] sm:text-xs md:text-sm lg:text-base text-zinc-400">Frag mich alles – mit Code, Tabellen und Struktur.</p>
      </div>

      {/* NACHRICHTEN BEREICH */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 space-y-3 sm:space-y-4 md:space-y-6 scroll-smooth">
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
              <div className="hidden md:flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-green-500/20 text-lg border border-green-500/30 mt-1">
                ✨
              </div>
            )}

            <div
              className={`relative max-w-[88%] xs:max-w-[85%] sm:max-w-[80%] md:max-w-[75%] lg:max-w-[70%] rounded-lg sm:rounded-xl md:rounded-2xl px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 shadow-sm text-[13px] sm:text-sm md:text-[15px] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-zinc-900/80 backdrop-blur-sm text-white rounded-br-none border border-white/10'
                  : 'bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl border border-white/10 text-white rounded-bl-none'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-zinc prose-sm max-w-none dark:prose-invert 
                  prose-p:my-1 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 
                  prose-headings:mt-4 prose-headings:mb-2 prose-headings:font-bold
                  prose-pre:my-2 prose-pre:bg-zinc-900 prose-pre:p-0
                  prose-table:my-2 prose-th:p-2 prose-td:p-2
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
             <div className="hidden md:flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20 border border-green-500/30">✨</div>
             <div className="flex items-center space-x-1 rounded-2xl bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl border border-white/10 px-4 py-3 shadow-sm">
               <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></div>
               <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></div>
               <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      {/* INPUT BEREICH */}
      <div className="shrink-0 p-2 sm:p-3 md:p-4 lg:p-5 border-t border-white/5 z-10">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-1.5 sm:p-2 md:p-2.5 shadow-sm focus-within:ring-2 focus-within:ring-orange-500/50 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Schreib eine Nachricht..."
            className="flex-1 bg-transparent px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2.5 text-[13px] sm:text-sm md:text-[15px] focus:outline-none min-w-0 text-white placeholder:text-zinc-500"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="mb-0.5 sm:mb-1 mr-0.5 sm:mr-1 rounded-lg bg-zinc-900 p-1.5 sm:p-2 md:p-2.5 text-white hover:bg-zinc-700 disabled:opacity-50 transition-all shrink-0"
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

