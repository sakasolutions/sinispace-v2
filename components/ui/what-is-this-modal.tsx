'use client';

import { useState } from 'react';
import { X, HelpCircle, Lightbulb } from 'lucide-react';

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
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 transition-all text-sm font-medium tracking-tight shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Was ist das?</span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white/95 backdrop-blur-2xl rounded-[2rem] shadow-2xl border border-white/20 p-6 sm:p-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Schließen"
              className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            {/* Header */}
            <div className="pr-10 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-600 to-rose-500 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
            </div>

            {/* Content */}
            <div className="space-y-6">
              {/* Main Description */}
              <div>
                {typeof content === 'string' ? (
                  <p className="text-gray-700 leading-relaxed">{content}</p>
                ) : (
                  content
                )}
              </div>

              {/* Use Cases */}
              {useCases.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2 tracking-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    Wofür nutzt du es?
                  </h3>
                  <ul className="space-y-2">
                    {useCases.map((useCase, index) => (
                      <li key={index} className="text-gray-700 text-sm flex items-start gap-2">
                        <span className="text-orange-500 mt-1">•</span>
                        <span>{useCase}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Examples */}
              {examples.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2 tracking-tight">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Beispiele
                  </h3>
                  <div className="space-y-2">
                    {examples.map((example, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-700 font-mono"
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
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2 tracking-tight">
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    Tipps
                  </h3>
                  <ul className="space-y-2">
                    {tips.map((tip, index) => (
                      <li key={index} className="text-gray-700 text-sm flex items-start gap-2">
                        <span className="text-amber-500 mt-1">→</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full rounded-xl bg-gradient-to-r from-orange-600 to-rose-500 hover:from-orange-700 hover:to-rose-600 text-white font-medium py-2.5 transition-colors shadow-lg shadow-rose-500/20"
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
