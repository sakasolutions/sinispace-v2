'use client';

import { generateToughMessageWithChat } from '@/actions/ai-actions';
import { useActionState } from 'react';
import { useState } from 'react';
import { Copy, MessageSquare, Loader2, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { CustomSelect } from '@/components/ui/custom-select';
import { BackButton } from '@/components/ui/back-button';
import { FeedbackButton } from '@/components/ui/feedback-button';
import { WorkspaceSelect } from '@/components/ui/workspace-select';

function ActionButtons({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
    }
  };

  const handleGoToChat = () => {
    router.push('/chat');
  };

  return (
    <div className="flex justify-between items-center border-b border-white/5 bg-white/5 p-3 rounded-t-xl mb-4">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Nachricht formuliert</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
          🛡️ Konflikt entschärft
        </span>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={handleCopy}
          className="h-8 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
          title="In Zwischenablage kopieren"
        >
          {copied ? (
            <>
              <span className="text-green-400">✓</span>
              <span className="hidden sm:inline">Kopiert!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kopieren</span>
            </>
          )}
        </button>
        
        <button
          onClick={handleGoToChat}
          className="h-8 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
          title="Zu SiniChat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Zu SiniChat</span>
        </button>
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
      className="w-full rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-3 text-sm font-semibold text-white hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 min-h-[44px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Formuliere...</span>
        </>
      ) : (
        <>
          <Shield className="w-4 h-4" />
          <span>Nachricht formulieren 🛡️</span>
        </>
      )}
    </button>
  );
}

export default function ToughMessagePage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateToughMessageWithChat, null);
  
  // State für Formularfelder, damit sie nicht geleert werden
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [strategy, setStrategy] = useState('Empathisch & Weich');
  const [workspaceId, setWorkspaceId] = useState<string>('');

  const strategies = [
    'Empathisch & Weich',
    'Sachlich & Neutral',
    'Entschuldigend & Demütig',
    'Bestimmt & Rechtssicher',
    'Konstruktiv & Fördernd',
  ];

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
      <BackButton />
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Schwierige Nachrichten</h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-1 sm:mt-2">
          Formuliere schwierige Botschaften empathisch und klar.
        </p>
        <div className="mt-3 p-3 rounded-md bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300">
          💡 <strong>Tipp:</strong> Der generierte Inhalt wird automatisch in <strong>SiniChat</strong> gespeichert, damit du ihn dort weiter bearbeiten kannst.
        </div>
      </div>

      {/* MOBILE FIRST: flex-col auf Mobile, md:grid auf Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">An wen geht es?</label>
              <input
                type="text"
                name="recipient"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="z.B. Mitarbeiter, Chef, Vermieter, Kunde"
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Was ist die schlechte Nachricht?</label>
              <textarea
                name="message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="z.B. Ich muss dem Kunden sagen, dass wir die Deadline verpassen. Oder: Ich muss dem Bewerber absagen."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 resize-none transition-all min-h-[120px]"
                rows={5}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Strategie / Härtegrad</label>
              <CustomSelect
                name="strategy"
                value={strategy}
                onChange={(value) => setStrategy(value)}
                options={strategies}
                placeholder="Strategie auswählen..."
                variant="modal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Workspace</label>
              <WorkspaceSelect value={workspaceId} onChange={setWorkspaceId} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
            </div>

            <SubmitButton />
            
            <p className="text-xs text-zinc-500 mt-2">
              Rechtlicher Hinweis: Dies ist ein KI-Entwurf und keine anwaltliche Rechtsberatung.
            </p>
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm text-red-400">{state.error}</p>
          )}
        </div>

        {/* RECHTE SEITE: ERGEBNIS */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-h-[300px] sm:min-h-[400px] overflow-hidden">
          {state?.result ? (
            <div className="h-full flex flex-col">
              {/* HEADER LEISTE OBERHALB DES TEXTES */}
              <ActionButtons text={state.result} />
              {/* TEXT BEREICH DARUNTER */}
              <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto">
                <div className="prose prose-sm max-w-none text-white whitespace-pre-wrap leading-relaxed prose-invert">
                  {state.result}
                </div>
              </div>
              <div className="p-4 sm:p-5 md:p-6 border-t border-white/5">
                <FeedbackButton
                  toolId="tough-msg"
                  toolName="Schwierige Nachrichten"
                  resultId={state?.result ? `tough-msg-${Date.now()}` : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <Shield className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Warte auf Input...</p>
              <p className="text-xs mt-1 text-zinc-600">Die formulierte Nachricht erscheint hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
