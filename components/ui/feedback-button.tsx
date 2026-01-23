'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check } from 'lucide-react';

type FeedbackButtonProps = {
  toolId: string;
  toolName: string;
  resultId?: string; // Optional: ID des generierten Ergebnisses
  className?: string;
};

export function FeedbackButton({ toolId, toolName, resultId, className = '' }: FeedbackButtonProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = async (type: 'positive' | 'negative') => {
    if (submitted) return;

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toolId,
          toolName,
          resultId,
          type,
        }),
      });

      if (response.ok) {
        setFeedback(type);
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Fehler beim Senden des Feedbacks:', error);
    }
  };

  if (submitted) {
    return (
      <div className={`flex items-center gap-2 text-sm text-green-400 ${className}`}>
        <Check className="w-4 h-4" />
        <span>Danke für dein Feedback!</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm text-zinc-400">War das hilfreich?</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleFeedback('positive')}
          className={`p-2 rounded-lg transition-all ${
            feedback === 'positive'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-green-400 border border-white/10'
          }`}
          title="Hilfreich"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleFeedback('negative')}
          className={`p-2 rounded-lg transition-all ${
            feedback === 'negative'
              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
              : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-red-400 border border-white/10'
          }`}
          title="Nicht hilfreich"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
