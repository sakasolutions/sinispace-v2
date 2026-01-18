'use client';

import { generateSummaryWithChat } from '@/actions/ai-actions';
import { useActionState } from 'react';
import { useState } from 'react';
import { Copy, MessageSquare, Zap, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';

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
      <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Zusammenfassung</span>
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

function StatisticsBar({ inputLength, outputLength }: { inputLength: number; outputLength: number }) {
  const reduction = inputLength > 0 ? Math.round((1 - (outputLength / inputLength)) * 100) : 0;
  const readingTime = Math.max(0.5, outputLength / 200); // ~200 Wörter pro Minute (~200 Zeichen pro Minute)
  
  return (
    <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-white/5">
      <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1 text-xs font-medium">
        <Zap className="w-3 h-3" />
        Effizienz: Text um ~{reduction}% gekürzt
      </div>
      <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1 text-xs font-medium">
        ⏱️ Lesezeit: {readingTime < 1 ? '< 1 Min.' : `~${Math.ceil(readingTime)} Min.`}
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
      className={`w-full rounded-lg bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3 text-sm font-semibold text-white hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 min-h-[44px] ${
        pending ? 'animate-pulse' : ''
      }`}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Analysiere Text...</span>
        </>
      ) : (
        <>
          <Zap className="w-4 h-4" />
          <span>Zusammenfassen ⚡️</span>
        </>
      )}
    </button>
  );
}

export default function SummarizePage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateSummaryWithChat, null);
  
  // State für Formularfelder, damit sie nicht geleert werden
  const [text, setText] = useState('');
  const [format, setFormat] = useState<'Stichpunkte' | 'Fließtext' | 'Action Items'>('Stichpunkte');
  const [length, setLength] = useState<'Kernaussage' | 'Standard' | 'Detailliert'>('Standard');

  // Berechne Statistiken
  const inputLength = text.length;
  const outputLength = state?.result?.length || 0;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Text Zusammenfasser</h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-1 sm:mt-2">
          Zu viel Text, zu wenig Zeit? Ich gib dir die Kernaussagen.
        </p>
        <div className="mt-3 p-3 rounded-md bg-teal-500/10 border border-teal-500/20 text-sm text-teal-300">
          💡 <strong>Tipp:</strong> Der generierte Inhalt wird automatisch in <strong>SiniChat</strong> gespeichert, damit du ihn dort weiter bearbeiten kannst.
        </div>
      </div>

      {/* MOBILE FIRST: flex-col auf Mobile, md:grid auf Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Format</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormat('Stichpunkte')}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    format === 'Stichpunkte'
                      ? 'bg-teal-500/20 border-2 border-teal-500/50 text-teal-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                >
                  Stichpunkte
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('Fließtext')}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    format === 'Fließtext'
                      ? 'bg-teal-500/20 border-2 border-teal-500/50 text-teal-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                >
                  Fließtext
                </button>
                <button
                  type="button"
                  onClick={() => setFormat('Action Items')}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    format === 'Action Items'
                      ? 'bg-teal-500/20 border-2 border-teal-500/50 text-teal-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                >
                  Action Items
                </button>
              </div>
              <input type="hidden" name="format" value={format} />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Länge</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLength('Kernaussage')}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    length === 'Kernaussage'
                      ? 'bg-teal-500/20 border-2 border-teal-500/50 text-teal-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                  title="Sehr kurz"
                >
                  Kernaussage
                </button>
                <button
                  type="button"
                  onClick={() => setLength('Standard')}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    length === 'Standard'
                      ? 'bg-teal-500/20 border-2 border-teal-500/50 text-teal-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                  title="Ausgewogen"
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setLength('Detailliert')}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    length === 'Detailliert'
                      ? 'bg-teal-500/20 border-2 border-teal-500/50 text-teal-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                  title="Alles drin"
                >
                  Detailliert
                </button>
              </div>
              <input type="hidden" name="length" value={length} />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Dein langer Text</label>
              <textarea
                name="text"
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Füge hier den Text ein (Artikel, E-Mail, Bericht)..."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 resize-none transition-all min-h-[200px]"
                rows={12}
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
          {state?.result ? (
            <div className="h-full flex flex-col">
              {/* HEADER LEISTE OBERHALB DES TEXTES */}
              <ActionButtons text={state.result} />
              {/* STATISTIK-LEISTE */}
              <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto">
                <StatisticsBar inputLength={inputLength} outputLength={outputLength} />
                {/* TEXT INHALT */}
                <div className="prose prose-sm max-w-none text-white whitespace-pre-wrap leading-relaxed prose-invert">
                  {state.result}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <Zap className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Warte auf Input...</p>
              <p className="text-xs mt-1 text-zinc-600">Die Zusammenfassung erscheint hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
