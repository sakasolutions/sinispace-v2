'use client';

import { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '@/actions/ai-actions';
import ReactMarkdown from 'react-markdown';

// 1. NEUE IMPORTS FÜR SYNTAX HIGHLIGHTING
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newHistory = [...messages, userMessage];
    
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    const response = await chatWithAI(newHistory);

    if (response.result) {
      setMessages([...newHistory, { role: 'assistant', content: response.result }]);
    } else {
      setMessages([...newHistory, { role: 'assistant', content: "⚠️ Fehler: " + response.error }]);
    }
    
    setIsLoading(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] max-w-5xl mx-auto relative">
      
      <div className="shrink-0 mb-4 px-4">
        <h1 className="text-2xl font-bold text-zinc-900">Freier Chat</h1>
        <p className="text-zinc-500">Frag mich alles – mit Code, Tabellen und Struktur.</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-zinc-400 opacity-50">
            <span className="text-6xl mb-4">💬</span>
            <p className="text-lg font-medium">Ich bin bereit.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex w-full gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-green-100 text-lg border border-green-200">
                ✨
              </div>
            )}

            <div
              className={`relative max-w-[85%] rounded-2xl px-5 py-3 shadow-sm text-sm leading-relaxed overflow-hidden ${
                msg.role === 'user'
                  ? 'bg-zinc-900 text-white rounded-br-none'
                  : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-none'
              }`}
            >
              {msg.role === 'assistant' ? (
                // 2. HIER PASSIERT DIE MAGIE
                <ReactMarkdown
                  components={{
                    // Code Blöcke (dunkel & bunt)
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '')
                      return !inline && match ? (
                        <div className="rounded-md overflow-hidden my-4 border border-zinc-200 shadow-sm">
                          <div className="bg-zinc-800 px-4 py-1 text-xs text-zinc-400 flex justify-between">
                            <span>{match[1]}</span>
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ margin: 0, borderRadius: 0 }}
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code className="bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded font-mono text-xs border border-zinc-200" {...props}>
                          {children}
                        </code>
                      )
                    },
                    // Tabellen schön machen
                    table({children}) {
                      return <div className="overflow-x-auto my-4 border border-zinc-200 rounded-lg"><table className="min-w-full divide-y divide-zinc-200">{children}</table></div>
                    },
                    thead({children}) {
                      return <thead className="bg-zinc-50">{children}</thead>
                    },
                    th({children}) {
                      return <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{children}</th>
                    },
                    td({children}) {
                      return <td className="px-4 py-3 whitespace-nowrap text-sm text-zinc-700 border-t border-zinc-100">{children}</td>
                    },
                    // Listen und Überschriften anpassen
                    ul({children}) { return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul> },
                    ol({children}) { return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol> },
                    h1({children}) { return <h1 className="text-xl font-bold mt-6 mb-2">{children}</h1> },
                    h2({children}) { return <h2 className="text-lg font-bold mt-5 mb-2">{children}</h2> },
                    h3({children}) { return <h3 className="text-md font-bold mt-4 mb-2">{children}</h3> },
                    p({children}) { return <p className="mb-3 last:mb-0">{children}</p> },
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-600 border border-zinc-300">
                DU
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex w-full gap-4 justify-start">
             <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 border border-green-200">✨</div>
             <div className="flex items-center space-x-1 rounded-2xl bg-white border border-zinc-200 px-4 py-3 shadow-sm">
               <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]"></div>
               <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]"></div>
               <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      <div className="shrink-0 pt-4 pb-6 px-4 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent">
        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 rounded-xl border border-zinc-300 bg-white p-2 shadow-sm focus-within:ring-2 focus-within:ring-zinc-900 transition-all">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Schreib eine Nachricht..."
            className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="mb-1 mr-1 rounded-lg bg-zinc-900 p-2 text-white hover:bg-zinc-700 disabled:opacity-50 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-zinc-400">
          KI kann Fehler machen. Überprüfe wichtige Informationen.
        </p>
      </div>
    </div>
  );
}