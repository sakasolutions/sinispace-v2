'use client';

import { generateChatCoach } from '@/actions/chat-coach';
import { useActionState } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Copy, MessageSquare, Loader2, Send, Users } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { WhatIsThisModal } from '@/components/ui/what-is-this-modal';
import { FeedbackButton } from '@/components/ui/feedback-button';
import { toolInfoMap } from '@/lib/tool-info';
import { BackButton } from '@/components/ui/back-button';

type ChatOption = {
  tone: string;
  text: string;
};

type ChatCoachResponse = {
  options: ChatOption[];
};

function OptionCard({ option, index }: { option: ChatOption; index: number }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(option.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
    }
  };

  const handleGoToChat = () => {
    router.push('/chat');
  };

  // Farben je nach Tone
  const toneColors: Record<string, { bg: string; border: string; text: string; accent: string }> = {
    'Diplomatisch 🤝': {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-300',
      accent: 'blue',
    },
    'Locker 😎': {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-300',
      accent: 'emerald',
    },
    'Klartext 🔥': {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/30',
      text: 'text-orange-300',
      accent: 'orange',
    },
  };

  const colors = toneColors[option.tone] || toneColors['Diplomatisch 🤝'];

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} backdrop-blur-xl p-4 sm:p-5 shadow-lg`}>
      <div className="flex items-start justify-between mb-3">
        <h3 className={`text-sm font-semibold ${colors.text}`}>{option.tone}</h3>
        <div className="flex gap-1.5">
          <button
            onClick={handleCopy}
            className="h-7 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
            title="In Zwischenablage kopieren"
          >
            {copied ? (
              <>
                <span className="text-green-400">✓</span>
                <span className="hidden sm:inline">Kopiert!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span className="hidden sm:inline">Kopieren</span>
              </>
            )}
          </button>
          
          <button
            onClick={handleGoToChat}
            className="h-7 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
            title="Zu SiniChat"
          >
            <MessageSquare className="w-3 h-3" />
            <span className="hidden sm:inline">Zu SiniChat</span>
          </button>
        </div>
      </div>
      
      <div className="bg-zinc-900/50 rounded-lg p-3 sm:p-4 border border-white/5">
        <p className="text-sm sm:text-base text-white leading-relaxed whitespace-pre-wrap">
          {option.text}
        </p>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 min-h-[44px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generiere Antworten...</span>
        </>
      ) : (
        <>
          <Send className="w-4 h-4" />
          <span>Antworten generieren 💬</span>
        </>
      )}
    </button>
  );
}

export default function ChatCoachPage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateChatCoach, null);
  const searchParams = useSearchParams();
  
  const [recipient, setRecipient] = useState('');
  const [situation, setSituation] = useState('');
  const [toastMessage, setToastMessage] = useState<{ title: string; description: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const chain = searchParams.get('chain');
  const recipeName = searchParams.get('recipe');
  const ingredients = searchParams.get('ingredients');

  // Smart Pre-fill für Gourmet Chain
  useEffect(() => {
    if (chain === 'gourmet' && recipeName && ingredients) {
      const prefillText =
        `Erstelle eine übersichtliche Einkaufsliste für '${recipeName}' basierend auf diesen Zutaten: ${ingredients}. ` +
        `Format: WhatsApp-Nachricht mit Emojis (Listen-Format). Zusatztext: 'Kannst du das bitte mitbringen?'`;
      setSituation(prefillText);
      setRecipient('Partner');

      setToastMessage({
        title: '🥦 Zutaten übernommen! Bereit für WhatsApp.',
        description: 'Die Nachricht ist vorbereitet.',
      });
    }
  }, [chain, recipeName, ingredients]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Auto-Focus auf Generieren-Button bei aktivem Chain
  useEffect(() => {
    if (!chain || !formRef.current) return;
    const submitButton = formRef.current.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (submitButton) {
      submitButton.focus();
      submitButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [chain]);

  // Parse Response aus State
  let chatOptions: ChatOption[] | null = null;
  if (state?.result && !state.error) {
    try {
      // Prüfe ob es die Upsell-Nachricht ist (Markdown)
      if (state.result.includes('🔒 Premium Feature')) {
        chatOptions = null; // Zeige Upsell-Nachricht
      } else {
        const parsed = JSON.parse(state.result) as ChatCoachResponse;
        if (parsed.options && Array.isArray(parsed.options)) {
          chatOptions = parsed.options;
        }
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  }

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8 animate-fade-in-up">
      <BackButton />
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/90 text-white px-4 py-3 rounded-lg shadow-lg border border-emerald-400/30 backdrop-blur-sm max-w-sm">
          <div className="font-semibold">{toastMessage.title}</div>
          <div className="text-sm text-emerald-50/90 mt-0.5">{toastMessage.description}</div>
        </div>
      )}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Chat-Coach</h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-1 sm:mt-2">
          Die perfekte Antwort für WhatsApp, Dating & Co.
        </p>
        <div className="mt-3 p-3 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-300">
          💡 <strong>Tipp:</strong> Du bekommst immer 3 Varianten zur Auswahl - diplomatisch, locker oder direkt. Wähle die passende für deine Situation.
        </div>
      </div>

      {/* MOBILE FIRST: flex-col auf Mobile, md:grid auf Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form ref={formRef} action={formAction} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                An wen geht's?
              </label>
              <input
                name="recipient"
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="z.B. Crush, Chef, Vermieter, Nachbar..."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Was ist die Situation? Was willst du sagen?
              </label>
              <textarea
                name="situation"
                required
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="z.B. Will Date absagen aber Tür offen lassen... oder: Nachbar ist zu laut..."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all min-h-[150px]"
                rows={6}
              />
            </div>

            <SubmitButton />
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm text-red-400">{state.error}</p>
          )}
        </div>

        {/* RECHTE SEITE: ERGEBNIS */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-h-[300px] sm:min-h-[400px] overflow-hidden">
          {state?.result && state.result.includes('🔒 Premium Feature') ? (
            <div className="p-4 sm:p-5 md:p-6">
              <div className="prose prose-sm max-w-none text-white prose-invert">
                <div dangerouslySetInnerHTML={{ __html: state.result.replace(/\n/g, '<br />') }} />
              </div>
            </div>
          ) : chatOptions && chatOptions.length > 0 ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="p-4 sm:p-5 md:p-6 overflow-y-auto space-y-4">
                {chatOptions.map((option, index) => (
                  <OptionCard key={index} option={option} index={index} />
                ))}
              </div>
              {/* FEEDBACK BUTTON */}
              <div className="p-4 sm:p-5 md:p-6 border-t border-white/5">
                <FeedbackButton 
                  toolId="tough-msg" 
                  toolName="Chat-Coach"
                  resultId={chatOptions && chatOptions.length > 0 ? `chat-coach-${Date.now()}` : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <Send className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Warte auf Input...</p>
              <p className="text-xs mt-1 text-zinc-600">Die 3 Antwort-Varianten erscheinen hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
