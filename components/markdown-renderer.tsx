'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  /** Dunkle Flächen (z. B. Admin-Chat): `prose-invert`, helle Schrift, keine grau-900-Defaults */
  darkSurface?: boolean;
  /**
   * Admin-Chat: nur Typografie-Spacing (`prose`), keine Prose-Farben – Textfarben kommen vom Eltern-Container
   * (`[&_*]:!text-gray-…`), damit keine hellen/dunkelblauen Defaults durchschlagen.
   */
  inheritParentColors?: boolean;
  /** Zusätzliche Klassen am Prose-Container */
  className?: string;
}

// Lazy-loaded Code Block Component (aus chat/page.tsx)
function CodeBlock({
  language,
  children,
  variant = 'light',
}: {
  language: string;
  children: string;
  variant?: 'light' | 'dark';
}) {
  const [SyntaxHighlighter, setSyntaxHighlighter] = useState<any>(null);
  const [style, setStyle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const dark = variant === 'dark';

  useEffect(() => {
    Promise.all([
      import('react-syntax-highlighter').then((mod) => mod.Prism),
      import('react-syntax-highlighter/dist/esm/styles/prism').then((mod) => mod.oneDark),
    ]).then(([Highlighter, oneDarkStyle]) => {
      setSyntaxHighlighter(() => Highlighter);
      setStyle(oneDarkStyle);
      setIsLoading(false);
    });
  }, []);

  if (isLoading || !SyntaxHighlighter || !style) {
    return (
      <div
        className={`rounded-lg overflow-hidden my-3 border shadow-sm ${
          dark ? 'border-white/15 bg-zinc-900/90' : 'border-gray-200 bg-white'
        }`}
      >
        <div
          className={`px-3 py-1.5 text-xs flex items-center justify-between border-b ${
            dark
              ? 'bg-zinc-800/80 text-zinc-300 border-white/10'
              : 'bg-gray-50 text-gray-600 border-gray-200'
          }`}
        >
          <span className="font-mono">{language}</span>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(children.replace(/\n$/, ''))}
            className={dark ? 'text-zinc-400 hover:text-white transition-colors' : 'hover:text-gray-900 transition-colors'}
          >
            Copy
          </button>
        </div>
        <pre
          className={`text-sm font-mono whitespace-pre overflow-x-auto p-4 ${
            dark ? 'bg-zinc-950 text-zinc-200' : 'text-gray-800 bg-white'
          }`}
        >
          <code>{children.replace(/\n$/, '')}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg overflow-hidden my-3 border shadow-sm ${
        dark ? 'border-white/15 bg-zinc-900/80' : 'border-gray-200 bg-white'
      }`}
    >
      <div
        className={`px-3 py-1.5 text-xs flex items-center justify-between border-b ${
          dark
            ? 'bg-zinc-800/80 text-zinc-300 border-white/10'
            : 'bg-gray-50 text-gray-600 border-gray-200'
        }`}
      >
        <span className="font-mono">{language}</span>
        <button
          type="button"
          onClick={() => navigator.clipboard.writeText(children.replace(/\n$/, ''))}
          className={dark ? 'text-zinc-400 hover:text-white transition-colors' : 'hover:text-gray-900 transition-colors'}
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

const lightProseClass =
  'prose prose-sm md:prose-base lg:prose-lg max-w-none ' +
  'prose-headings:text-gray-900 prose-headings:font-bold ' +
  'prose-strong:text-gray-900 prose-strong:font-semibold ' +
  'prose-code:text-orange-600 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:border prose-code:border-gray-200 ' +
  'prose-pre:bg-white prose-pre:border prose-pre:border-gray-200 prose-pre:rounded-lg prose-pre:shadow-sm ' +
  'prose-a:text-orange-500 prose-a:no-underline hover:prose-a:text-pink-500 hover:prose-a:underline ' +
  'prose-blockquote:border-l-orange-500/30 prose-blockquote:bg-orange-50/50 prose-blockquote:text-gray-700 ' +
  'prose-table:border-gray-200 prose-th:bg-gray-50 prose-th:text-gray-900 prose-td:text-gray-700 ' +
  'prose-hr:border-gray-200 ' +
  'prose-ul:my-4 prose-ol:my-4 prose-li:my-1.5';

const darkProseClass =
  'prose prose-sm md:prose-base max-w-none prose-invert ' +
  'prose-headings:text-white prose-headings:font-bold ' +
  'prose-p:text-gray-300 prose-li:text-gray-300 ' +
  'prose-strong:text-white prose-strong:font-semibold ' +
  'prose-code:text-orange-300 prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:border prose-code:border-white/20 ' +
  'prose-pre:bg-zinc-900/80 prose-pre:border prose-pre:border-white/15 prose-pre:rounded-lg ' +
  'prose-a:text-sky-400 prose-a:no-underline hover:prose-a:text-sky-300 hover:prose-a:underline ' +
  'prose-blockquote:border-l-white/25 prose-blockquote:border-white/20 prose-blockquote:bg-white/5 prose-blockquote:text-gray-300 ' +
  'prose-table:border-white/20 prose-th:bg-white/10 prose-th:text-white prose-td:text-gray-300 ' +
  'prose-hr:border-white/20 ' +
  'prose-ul:my-4 prose-ol:my-4 prose-li:my-1.5 ' +
  '[&>h1]:text-white [&>h2]:text-white [&>h3]:text-white [&>h4]:text-white';

/** Nur Struktur/Abstände, keine Typography-Farben (Eltern erzwingt !text-*) */
const inheritParentProseClass =
  'prose prose-sm max-w-none ' +
  'prose-ul:my-4 prose-ol:my-4 prose-li:my-1.5 ' +
  'prose-headings:font-bold prose-strong:font-semibold';

function createMarkdownComponents(darkSurface: boolean, inheritParentColors: boolean) {
  const inlineCodeClass = inheritParentColors
    ? 'bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono !text-orange-300 border border-white/15'
    : darkSurface
      ? 'bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-orange-300 border border-white/15'
      : 'bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-orange-600 border border-gray-200';

  return {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');

      if (!inline && match) {
        return (
          <CodeBlock language={match[1]} variant={darkSurface || inheritParentColors ? 'dark' : 'light'}>
            {String(children)}
          </CodeBlock>
        );
      }

      return (
        <code className={inlineCodeClass} {...props}>
          {children}
        </code>
      );
    },
  };
}

/**
 * MarkdownRenderer - Perfektes Markdown-Rendering wie ChatGPT/Gemini
 *
 * `darkSurface`: für Admin / dunkle Panels; erzwingt `prose-invert` und helle Typografie.
 * `inheritParentColors`: Admin-Chat mit Brute-Force-Farben am Wrapper – keine Prose-Farb-Utilities.
 */
export function MarkdownRenderer({
  content,
  darkSurface = false,
  inheritParentColors = false,
  className,
}: MarkdownRendererProps) {
  const rootClass = inheritParentColors
    ? inheritParentProseClass
    : darkSurface
      ? darkProseClass
      : lightProseClass;

  return (
    <div className={cn(rootClass, className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={createMarkdownComponents(darkSurface, inheritParentColors)}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
