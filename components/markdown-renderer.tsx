'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useEffect } from 'react';

interface MarkdownRendererProps {
  content: string;
}

// Lazy-loaded Code Block Component (aus chat/page.tsx)
function CodeBlock({ language, children }: { language: string; children: string }) {
  const [SyntaxHighlighter, setSyntaxHighlighter] = useState<any>(null);
  const [style, setStyle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      import('react-syntax-highlighter').then(mod => mod.Prism),
      import('react-syntax-highlighter/dist/esm/styles/prism').then(mod => mod.oneDark)
    ]).then(([Highlighter, oneDarkStyle]) => {
      setSyntaxHighlighter(() => Highlighter);
      setStyle(oneDarkStyle);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !SyntaxHighlighter || !style) {
    return (
      <div className="rounded-lg overflow-hidden my-3 border border-gray-200 shadow-sm bg-white">
        <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-600 flex items-center justify-between border-b border-gray-200">
          <span className="font-mono">{language}</span>
          <button
            onClick={() => navigator.clipboard.writeText(children.replace(/\n$/, ''))}
            className="hover:text-gray-900 transition-colors"
          >
            Copy
          </button>
        </div>
        <pre className="text-sm text-gray-800 font-mono whitespace-pre overflow-x-auto p-4 bg-white">
          <code>{children.replace(/\n$/, '')}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden my-3 border border-gray-200 shadow-sm bg-white">
      <div className="bg-gray-50 px-3 py-1.5 text-xs text-gray-600 flex items-center justify-between border-b border-gray-200">
        <span className="font-mono">{language}</span>
        <button
          onClick={() => navigator.clipboard.writeText(children.replace(/\n$/, ''))}
          className="hover:text-gray-900 transition-colors"
        >
          Copy
        </button>
      </div>
      <SyntaxHighlighter
        style={style}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0, padding: '1rem', fontSize: '0.85rem' }}
      >
        {children.replace(/\n$/, '')}
      </SyntaxHighlighter>
    </div>
  );
}

/**
 * MarkdownRenderer - Perfektes Markdown-Rendering wie ChatGPT/Gemini
 * 
 * Features:
 * - Hoher Kontrast (helle Schrift auf dunklem Hintergrund)
 * - Saubere Listen und Code-Blöcke
 * - Gute Lesbarkeit mit richtigen Abständen
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-invert prose-sm max-w-none 
      prose-p:leading-relaxed prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-white/10
      prose-headings:text-white prose-headings:font-semibold
      prose-strong:text-white prose-strong:font-semibold
      prose-code:text-blue-300 prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
      prose-pre:overflow-x-auto prose-pre:my-4 prose-pre:p-4 prose-pre:rounded-xl prose-pre:bg-black/50
      prose-ul:my-4 prose-ol:my-4 prose-li:my-2 prose-li:text-zinc-200
      prose-blockquote:text-zinc-300 prose-blockquote:border-l-zinc-700
      prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
      prose-table:text-zinc-200 prose-th:text-zinc-300 prose-td:text-zinc-200
      prose-hr:border-zinc-700"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Paragraphs - Dashboard Style (dunkler Text auf weißem Hintergrund)
        p({ children }) {
          return (
            <p className="text-gray-700 text-[15px] md:text-base leading-relaxed mb-4 last:mb-0">
              {children}
            </p>
          );
        },
        // Strong/Bold - Dashboard Style
        strong({ children }) {
          return (
            <strong className="font-semibold text-gray-900">
              {children}
            </strong>
          );
        },
        // Lists - Dashboard Style
        ul({ children }) {
          return (
            <ul className="my-4 pl-6 space-y-2 list-disc list-outside text-gray-700">
              {children}
            </ul>
          );
        },
        ol({ children }) {
          return (
            <ol className="my-4 pl-6 space-y-2 list-decimal list-outside text-gray-700">
              {children}
            </ol>
          );
        },
        // List Items - Dashboard Style
        li({ children }) {
          return (
            <li className="text-gray-700 marker:text-gray-500 leading-relaxed">
              {children}
            </li>
          );
        },
        // Inline Code - Blau auf dunklem Hintergrund
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          
          // Code Block (mehrzeilig) - nutze CodeBlock Component
          if (!inline && match) {
            return <CodeBlock language={match[1]}>{String(children)}</CodeBlock>;
          }
          
          // Inline Code - Dashboard Style
          return (
            <code 
              className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-orange-600 border border-gray-200" 
              {...props}
            >
              {children}
            </code>
          );
        },
        // Headings - Dashboard Style
        h1({ children }) {
          return <h1 className="text-gray-900 font-bold text-xl md:text-2xl mt-6 mb-3 first:mt-0 leading-tight">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-gray-900 font-bold text-lg md:text-xl mt-5 mb-2 first:mt-0 leading-tight">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-gray-900 font-semibold text-base md:text-lg mt-4 mb-2 first:mt-0 leading-tight">{children}</h3>;
        },
        // Blockquote - Dashboard Style
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-orange-500/30 pl-4 py-2 my-4 text-gray-600 italic bg-orange-50/50 rounded-r leading-relaxed">
              {children}
            </blockquote>
          );
        },
        // Links - Dashboard Style (Orange-Pink Gradient)
        a({ href, children }) {
          return (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-orange-500 hover:text-pink-500 underline transition-colors font-medium"
            >
              {children}
            </a>
          );
        },
        // Tables - Dashboard Style
        table({ children }) {
          return (
            <div className="overflow-x-auto my-4 border border-gray-200 rounded-lg bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                {children}
              </table>
            </div>
          );
        },
        thead({ children }) {
          return <thead className="bg-gray-50">{children}</thead>;
        },
        th({ children }) {
          return (
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
              {children}
            </th>
          );
        },
        td({ children }) {
          return (
            <td className="px-4 py-2 text-sm text-gray-700 border-t border-gray-200 leading-relaxed">
              {children}
            </td>
          );
        },
        // Horizontal Rule
        hr() {
          return <hr className="my-6 border-zinc-700" />;
        },
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
