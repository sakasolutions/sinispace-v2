'use client';

import { generateEmailWithChat } from '@/actions/ai-actions';
import { useActionState } from 'react';
import { useState } from 'react';

// Kleiner Hack für TypeScript, falls useActionState noch zickt
// @ts-ignore
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 transition-all"
    >
      {pending ? 'KI schreibt gerade...' : 'E-Mail generieren ✨'}
    </button>
  );
}

export default function EmailPage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateEmailWithChat, null);
  
  // State für Formularfelder, damit sie nicht geleert werden
  const [recipient, setRecipient] = useState('');
  const [tone, setTone] = useState('Professionell');
  const [topic, setTopic] = useState('');

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">E-Mail Verfasser</h1>
        <p className="text-sm sm:text-base text-zinc-400">
          Wirf mir ein paar Stichpunkte hin, ich mache daraus eine professionelle Mail.
        </p>
        <div className="mt-3 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
          💡 <strong>Tipp:</strong> Der generierte Inhalt wird automatisch in <strong>Sinichat</strong> gespeichert, damit du ihn dort weiter bearbeiten kannst.
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 md:gap-8 md:grid-cols-2">
        {/* LINKE SEITE: EINGABE */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">An wen geht es?</label>
              <input
                name="recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="z.B. Chef, Kunden, Vermieter"
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Tonfall</label>
              <select
                name="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              >
                <option value="Professionell">Professionell & Sachlich</option>
                <option value="Freundlich">Freundlich & Locker</option>
                <option value="Bestimmt">Bestimmt & Dringend</option>
                <option value="Entschuldigend">Entschuldigend</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Worum geht's? (Stichpunkte reichen)</label>
              <textarea
                name="topic"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={6}
                placeholder="z.B. Bitte um Meeting nächste Woche, Projekt X ist fertig, brauche Feedback bis Freitag..."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none"
              />
            </div>

            <SubmitButton />
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm text-red-400">{state.error}</p>
          )}
        </div>

        {/* RECHTE SEITE: ERGEBNIS */}
        <div className="relative rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-h-[300px] sm:min-h-[400px]">
          {state?.result ? (
            <div className="prose prose-sm max-w-none text-white whitespace-pre-wrap leading-relaxed prose-invert">
              {state.result}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500">
              <span className="text-4xl mb-2">✉️</span>
              <p>Das Ergebnis erscheint hier.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}