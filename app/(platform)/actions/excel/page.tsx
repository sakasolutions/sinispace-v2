'use client';

import { generateExcelWithChat } from '@/actions/ai-actions';
import { useActionState } from 'react';
import { useState } from 'react';
// @ts-ignore
import { useFormStatus } from 'react-dom';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fehler beim Kopieren:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 px-2 py-1 text-xs font-medium rounded-md bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all"
      title="In Zwischenablage kopieren"
    >
      {copied ? '✓ Kopiert' : '📋 Kopieren'}
    </button>
  );
}

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
  const [state, formAction] = useActionState(generateExcelWithChat, null);
  
  // State für Formularfelder, damit sie nicht geleert werden
  const [platform, setPlatform] = useState('Microsoft Excel');
  const [problem, setProblem] = useState('');

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Excel & Sheets Retter</h1>
        <p className="text-sm sm:text-base text-zinc-400">
          Beschreibe dein Problem, ich gebe dir die fertige Formel.
        </p>
        <div className="mt-3 p-3 rounded-md bg-green-500/10 border border-green-500/20 text-sm text-green-300">
          💡 <strong>Tipp:</strong> Der generierte Inhalt wird automatisch in <strong>Sinichat</strong> gespeichert, damit du ihn dort weiter bearbeiten kannst.
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 md:gap-8 md:grid-cols-2">
        {/* INPUT */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-3 sm:space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Welches Programm?</label>
              <select
                name="platform"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50"
              >
                <option value="Microsoft Excel">Microsoft Excel</option>
                <option value="Google Sheets">Google Sheets</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">Was willst du berechnen?</label>
              <textarea
                name="problem"
                required
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                rows={6}
                placeholder="z.B. Ich will die Summe von Spalte A, aber nur wenn in Spalte B 'bezahlt' steht."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 resize-none"
              />
            </div>
            <SubmitButton />
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm text-red-400">{state.error}</p>
          )}
        </div>

        {/* OUTPUT */}
        <div className="relative rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-h-[250px] sm:min-h-[300px]">
          {state?.result ? (
            <>
              <CopyButton text={state.result} />
              <div className="prose prose-sm max-w-none prose-invert">
                <div className="bg-zinc-900/50 border border-white/10 p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto text-green-400 font-bold shadow-sm">
                  {/* Wir filtern den Codeblock grob raus für schöne Optik, oder zeigen einfach alles an */}
                  {state.result}
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500">
              <span className="text-4xl mb-2">📊</span>
              <p>Formel erscheint hier.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}