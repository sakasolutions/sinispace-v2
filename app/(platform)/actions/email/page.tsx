'use client';

import { generateEmail } from '@/actions/ai-actions';
import { useActionState } from 'react';

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
  const [state, formAction] = useActionState(generateEmail, null);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">E-Mail Verfasser</h1>
        <p className="text-zinc-500">
          Wirf mir ein paar Stichpunkte hin, ich mache daraus eine professionelle Mail.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* LINKE SEITE: EINGABE */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm h-fit">
          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">An wen geht es?</label>
              <input
                name="recipient"
                type="text"
                placeholder="z.B. Chef, Kunden, Vermieter"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Tonfall</label>
              <select
                name="tone"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 bg-white"
              >
                <option value="Professionell">Professionell & Sachlich</option>
                <option value="Freundlich">Freundlich & Locker</option>
                <option value="Bestimmt">Bestimmt & Dringend</option>
                <option value="Entschuldigend">Entschuldigend</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Worum geht's? (Stichpunkte reichen)</label>
              <textarea
                name="topic"
                required
                rows={6}
                placeholder="z.B. Bitte um Meeting nächste Woche, Projekt X ist fertig, brauche Feedback bis Freitag..."
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
            </div>

            <SubmitButton />
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm text-red-500">{state.error}</p>
          )}
        </div>

        {/* RECHTE SEITE: ERGEBNIS */}
        <div className="relative rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-inner min-h-[400px]">
          {state?.result ? (
            <div className="prose prose-sm max-w-none text-zinc-800 whitespace-pre-wrap leading-relaxed">
              {state.result}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400">
              <span className="text-4xl mb-2">✉️</span>
              <p>Das Ergebnis erscheint hier.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}