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
    <div className="prose prose-sm md:prose-base lg:prose-lg max-w-none
      prose-headings:text-gray-900 prose-headings:font-bold
      prose-strong:text-gray-900 prose-strong:font-semibold
      prose-code:text-orange-600 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:border prose-code:border-gray-200
      prose-pre:bg-white prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg prose-pre:shadow-sm
      prose-a:text-orange-500 prose-a:no-underline hover:prose-a:text-pink-500 hover:prose-a:underline
      prose-blockquote:border-l-orange-500/30 prose-blockquote:bg-orange-50/50 prose-blockquote:text-gray-700
      prose-table:border-gray-200 prose-th:bg-gray-50 prose-th:text-gray-900 prose-td:text-gray-700
      prose-hr:border-gray-200
      prose-ul:my-4 prose-ol:my-4 prose-li:my-1.5"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Prose übernimmt die meisten Styles - nur Code Blocks brauchen Custom Handling
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
        // Prose übernimmt Headings, Blockquotes, Links, Tables, HR - nur Code Blocks brauchen Custom Handling
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
