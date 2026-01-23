'use client';

import { useState } from 'react';
import { X, HelpCircle } from 'lucide-react';

type WhatIsThisModalProps = {
  title: string;
  content: string | React.ReactNode;
  examples?: string[];
  useCases?: string[];
  tips?: string[];
  trigger?: React.ReactNode;
};

export function WhatIsThisModal({
  title,
  content,
  examples = [],
  useCases = [],
  tips = [],
  trigger
}: WhatIsThisModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-800/50 hover:bg-zinc-700/50 text-zinc-300 hover:text-white border border-white/10 transition-all text-sm font-medium"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Was ist das?</span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-zinc-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Main Description */}
              <div>
                {typeof content === 'string' ? (
                  <p className="text-zinc-200 leading-relaxed">{content}</p>
                ) : (
                  content
                )}
              </div>

              {/* Use Cases */}
              {useCases.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    Wofür nutzt du es?
                  </h3>
                  <ul className="space-y-2">
                    {useCases.map((useCase, index) => (
                      <li key={index} className="text-zinc-300 text-sm flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Examples */}
              {examples.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                    Beispiele
                  </h3>
                  <div className="space-y-2">
                    {examples.map((example, index) => (
                      <div
                        key={index}
                        className="bg-zinc-800/50 border border-white/5 rounded-lg p-3 text-sm text-zinc-300 font-mono"
                      >
                        {example}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips */}
              {tips.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    💡 Tipps
                  </h3>
                  <ul className="space-y-2">
                    {tips.map((tip, index) => (
                      <li key={index} className="text-zinc-300 text-sm flex items-start gap-2">
                        <span className="text-amber-400 mt-1">→</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-zinc-900 border-t border-white/10 px-6 py-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 transition-colors"
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
