'use client';

import { generateExcel } from '@/actions/ai-actions';
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
      className="w-full rounded-md bg-green-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50 transition-all"
    >
      {pending ? 'Rechne...' : 'Formel generieren 🧮'}
    </button>
  );
}

export default function ExcelPage() {
  // @ts-ignore
  const [state, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    const result = await generateExcel(prevState, formData);
    
    // Wenn erfolgreich, Chat in DB speichern
    if (result?.result && !result.error) {
      const platform = formData.get('platform') as string || 'Microsoft Excel';
      const problem = formData.get('problem') as string || '';
      
      const userInput = `Programm: ${platform}, Problem: ${problem}`;
      
      await createHelperChat('excel', userInput, result.result);
    }
    
    return result;
  }, null);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Excel & Sheets Retter</h1>
        <p className="text-zinc-500">
          Beschreibe dein Problem, ich gebe dir die fertige Formel.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* INPUT */}
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm h-fit">
          <form action={formAction} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Welches Programm?</label>
              <select
                name="platform"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
              >
                <option value="Microsoft Excel">Microsoft Excel</option>
                <option value="Google Sheets">Google Sheets</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Was willst du berechnen?</label>
              <textarea
                name="problem"
                required
                rows={6}
                placeholder="z.B. Ich will die Summe von Spalte A, aber nur wenn in Spalte B 'bezahlt' steht."
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none"
              />
            </div>
            <SubmitButton />
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm text-red-500">{state.error}</p>
          )}
        </div>

        {/* OUTPUT */}
        <div className="relative rounded-xl border border-zinc-200 bg-zinc-50 p-6 shadow-inner min-h-[300px]">
          {state?.result ? (
            <div className="prose prose-sm max-w-none text-zinc-800">
              <div className="bg-white border border-zinc-200 p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto text-green-700 font-bold shadow-sm">
                {/* Wir filtern den Codeblock grob raus für schöne Optik, oder zeigen einfach alles an */}
                {state.result}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-400">
              <span className="text-4xl mb-2">📊</span>
              <p>Formel erscheint hier.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}