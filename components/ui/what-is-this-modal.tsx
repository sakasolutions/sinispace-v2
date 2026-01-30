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
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 transition-all text-sm font-medium tracking-tight shrink-0"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Was ist das?</span>
        </button>
      )}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white border border-gray-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
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
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    💡 Tipps
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
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-medium py-2.5 transition-colors shadow-md"
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
