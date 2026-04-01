'use client';

import { useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';

export type FeedbackStatus = 'idle' | 'positive' | 'negative' | 'submitted';

const NEGATIVE_REASONS = [
  'Zutaten unpassend',
  'Zu kompliziert',
  'Formatierung fehlerhaft',
  'Sonstiges',
] as const;

type Props = {
  messageId: string;
};

export function AssistantMessageFeedback({ messageId }: Props) {
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>('idle');
  const [submittedKind, setSubmittedKind] = useState<'positive' | 'negative' | null>(null);

  async function postFeedback(
    type: 'positive' | 'negative',
    extra?: { reason?: string }
  ) {
    const metadata: Record<string, string> = { messageId };
    if (type === 'negative' && extra?.reason) {
      metadata.reason = extra.reason;
    }
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toolId: 'chat',
        toolName: 'SiniChat',
        type,
        resultId: messageId,
        metadata,
      }),
    });
  }

  function handlePositive() {
    if (feedbackStatus === 'submitted') return;
    if (feedbackStatus === 'negative') {
      setSubmittedKind('positive');
      setFeedbackStatus('submitted');
      void postFeedback('positive');
      return;
    }
    if (feedbackStatus !== 'idle') return;
    setSubmittedKind('positive');
    setFeedbackStatus('submitted');
    void postFeedback('positive');
  }

  function handleNegativeStart() {
    if (feedbackStatus !== 'idle') return;
    setFeedbackStatus('negative');
  }

  function handleReason(reason: string) {
    setSubmittedKind('negative');
    setFeedbackStatus('submitted');
    void postFeedback('negative', { reason });
  }

  const iconIdle = 'text-gray-500 hover:text-gray-300';
  const disabled = feedbackStatus === 'submitted';

  return (
    <div className="mt-2 w-full flex flex-col items-end gap-2">
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          disabled={disabled}
          onClick={handlePositive}
          aria-label="Positives Feedback"
          className={`p-1.5 rounded-md transition-colors disabled:cursor-default ${
            submittedKind === 'positive'
              ? 'text-emerald-500'
              : disabled
                ? 'text-gray-300'
                : iconIdle
          }`}
        >
          <ThumbsUp className="w-4 h-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleNegativeStart}
          aria-label="Negatives Feedback"
          className={`p-1.5 rounded-md transition-colors disabled:cursor-default ${
            submittedKind === 'negative'
              ? 'text-orange-500'
              : disabled
                ? 'text-gray-300'
                : iconIdle
          }`}
        >
          <ThumbsDown className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {feedbackStatus === 'negative' && (
        <div className="flex flex-wrap justify-end gap-1.5 max-w-full">
          {NEGATIVE_REASONS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handleReason(label)}
              className="text-xs rounded-full border border-gray-200/80 bg-gray-50/90 px-2 py-1 text-gray-700 transition-colors hover:bg-gray-100"
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
