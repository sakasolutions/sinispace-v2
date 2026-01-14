'use client';

import { generateSummary } from '@/actions/ai-actions';
import { createHelperChat } from '@/actions/chat-actions';
import { useActionState } from 'react';
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
  const [state, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    const result = await generateSummary(prevState, formData);
    
    // Wenn erfolgreich, Chat in DB speichern
    if (result?.result && !result.error) {
      const text = formData.get('text') as string || '';
      const userInput = text.slice(0, 500); // Erste 500 Zeichen als Input
      
      await createHelperChat('summarize', userInput, result.result);
    }
    
    return result;
  }, null);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Text Zusammenfasser</h1>
        <p className="text-zinc-500">
          Zu viel Text, zu wenig Zeit? Ich gib dir die Kernaussagen.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* INPUT */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm h-fit">
          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Dein langer Text</label>
              <textarea
                name="text"
                required
                rows={12}
                placeholder="Füge hier den Text ein (Artikel, E-Mail, Bericht)..."
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
            </div>
            <SubmitButton />
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm text-red-500">{state.error}</p>
          )}
        </div>

        {/* OUTPUT */}
        <div className="relative rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-inner min-h-[400px]">
          {state?.result ? (
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-zinc-500">Kernaussagen:</h3>
              <div className="prose prose-sm max-w-none text-zinc-800 whitespace-pre-wrap leading-relaxed">
                {state.result}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400">
              <span className="text-4xl mb-2">📑</span>
              <p>Ergebnis erscheint hier.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}