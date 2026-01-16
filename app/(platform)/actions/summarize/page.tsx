'use client';

import { generateSummaryWithChat } from '@/actions/ai-actions';
import { useActionState } from 'react';
import { useState } from 'react';
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
      {pending ? 'Analysiere...' : 'Zusammenfassen ⚡️'}
    </button>
  );
}

export default function SummarizePage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateSummaryWithChat, null);
  
  // State für Formularfeld, damit es nicht geleert wird
  const [text, setText] = useState('');

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Text Zusammenfasser</h1>
        <p className="text-sm sm:text-base text-zinc-400">
          Zu viel Text, zu wenig Zeit? Ich gib dir die Kernaussagen.
        </p>
        <div className="mt-3 p-3 rounded-md bg-teal-500/10 border border-teal-500/20 text-sm text-teal-300">
          💡 <strong>Tipp:</strong> Der generierte Inhalt wird automatisch in <strong>Sinichat</strong> gespeichert, damit du ihn dort weiter bearbeiten kannst.
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 md:gap-8 md:grid-cols-2">
        {/* INPUT */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Dein langer Text</label>
              <textarea
                name="text"
                required
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                placeholder="Füge hier den Text ein (Artikel, E-Mail, Bericht)..."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/50 resize-none"
              />
            </div>
            <SubmitButton />
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm text-red-400">{state.error}</p>
          )}
        </div>

        {/* OUTPUT */}
        <div className="relative rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-h-[300px] sm:min-h-[400px]">
          {state?.result ? (
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-400">Kernaussagen:</h3>
              <div className="prose prose-sm max-w-none text-white whitespace-pre-wrap leading-relaxed prose-invert">
                {state.result}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500">
              <span className="text-4xl mb-2">📑</span>
              <p>Ergebnis erscheint hier.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}