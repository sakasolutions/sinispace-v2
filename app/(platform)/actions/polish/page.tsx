'use client';

import { generatePolishWithChat } from '@/actions/ai-actions';
import { useActionState } from 'react';
import { useState } from 'react';
import { Copy, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { CustomSelect } from '@/components/ui/custom-select';
import { WhatIsThisModal } from '@/components/ui/what-is-this-modal';
import { toolInfoMap } from '@/lib/tool-info';

function ActionButtons({ text, mode }: { text: string; mode: string }) {
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

  // Badge-Texte für verschiedene Modi
  const getBadgeText = (mode: string) => {
    const badgeMap: Record<string, string> = {
      'Grammatik & Rechtschreibung': '✍️ Grammatik korrigiert',
      'Professionell & Business': '💼 Business Stil',
      'Eloquent & Gehoben': '✨ Eloquent',
      'Direkt & Knackig': '⚡ Direkt',
      'Einfacher & Verständlicher': '📖 Verständlich',
    };
    return badgeMap[mode] || `✨ ${mode}`;
  };

  return (
    <div className="flex justify-between items-center border-b border-white/5 bg-white/5 p-3 rounded-t-xl mb-4">
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Aufpolierter Text</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          {getBadgeText(mode)}
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
      className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 min-h-[44px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Polieren...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          <span>Text aufpolieren ✨</span>
        </>
      )}
    </button>
  );
}

export default function PolishPage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generatePolishWithChat, null);
  
  // State für Formularfelder, damit sie nicht geleert werden
  const [text, setText] = useState('');
  const [mode, setMode] = useState('Professionell & Business');

  const polishModes = [
    'Grammatik & Rechtschreibung',
    'Professionell & Business',
    'Eloquent & Gehoben',
    'Direkt & Knackig',
    'Einfacher & Verständlicher',
  ];

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Text Aufpolierer</h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-1 sm:mt-2">
          Verbessere Texte: professioneller, klarer, überzeugender.
        </p>
        <div className="mt-3 p-3 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-300">
          💡 <strong>Tipp:</strong> Der generierte Inhalt wird automatisch in <strong>SiniChat</strong> gespeichert, damit du ihn dort weiter bearbeiten kannst.
        </div>
      </div>

      {/* MOBILE FIRST: flex-col auf Mobile, md:grid auf Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Dein Textentwurf...</label>
              <textarea
                name="text"
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Füge hier deinen Text ein, den du aufpolieren möchtest..."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none transition-all min-h-[200px]"
                rows={10}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Veredelungs-Modus</label>
              <CustomSelect
                name="mode"
                value={mode}
                onChange={(value) => setMode(value)}
                options={polishModes}
                placeholder="Modus auswählen..."
                variant="modal"
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
              <ActionButtons text={state.result} mode={mode} />
              {/* TEXT BEREICH DARUNTER */}
              <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto">
                <div className="prose prose-sm max-w-none text-white whitespace-pre-wrap leading-relaxed prose-invert">
                  {state.result}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <Sparkles className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Warte auf Input...</p>
              <p className="text-xs mt-1 text-zinc-600">Der aufpolierte Text erscheint hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
