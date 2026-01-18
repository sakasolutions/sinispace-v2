'use client';

import { generateExcelWithChat } from '@/actions/ai-actions';
import { useActionState } from 'react';
import { useState } from 'react';
import { Copy, MessageSquare, Loader2, Calculator } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { CustomSelect } from '@/components/ui/custom-select';

function ActionButtons({ text, formulaOnly }: { text: string; formulaOnly: string }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const handleCopy = async () => {
    try {
      // Kopiere nur die Formel (formulaOnly), nicht die ganze Erklärung
      await navigator.clipboard.writeText(formulaOnly);
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
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Lösung generiert</span>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={handleCopy}
          className="h-8 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
          title="Formel in Zwischenablage kopieren"
        >
          {copied ? (
            <>
              <span className="text-green-400">✓</span>
              <span className="hidden sm:inline">Kopiert!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Formel kopieren</span>
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
      className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 min-h-[44px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generiere Lösung...</span>
        </>
      ) : (
        <>
          <Calculator className="w-4 h-4" />
          <span>Lösung generieren ⚡️</span>
        </>
      )}
    </button>
  );
}

export default function ExcelPage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateExcelWithChat, null);
  
  // State für Formularfelder, damit sie nicht geleert werden
  const [version, setVersion] = useState('Excel (Deutsch)');
  const [taskType, setTaskType] = useState('Formel erstellen');
  const [problem, setProblem] = useState('');

  const versions = [
    'Excel (Deutsch)',
    'Excel (Englisch)',
    'Google Sheets',
    'VBA / Makro',
  ];

  const taskTypes = [
    'Formel erstellen',
    'Formel reparieren',
    'Erklärung',
    'VBA Makro schreiben',
  ];

  // Extrahiere die Formel aus dem Ergebnis (erste Zeile oder Code-Block)
  const extractFormula = (result: string): string => {
    // Suche nach Code-Block oder erster markierter Zeile
    const codeBlockMatch = result.match(/```[\s\S]*?```/);
    if (codeBlockMatch) {
      return codeBlockMatch[0].replace(/```/g, '').trim();
    }
    // Suche nach erster Zeile mit Formel-Zeichen (=, SUMME, IF, etc.)
    const lines = result.split('\n');
    const formulaLine = lines.find(line => 
      line.trim().startsWith('=') || 
      line.includes('SUMME') || 
      line.includes('SUM') ||
      line.includes('WENN') ||
      line.includes('IF') ||
      line.includes('SVERWEIS') ||
      line.includes('VLOOKUP')
    );
    return formulaLine?.trim() || lines[0]?.trim() || result.substring(0, 100);
  };

  const formulaOnly = state?.result ? extractFormula(state.result) : '';

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Excel & Sheets Retter</h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-1 sm:mt-2">
          Löse komplexe Spreadsheet-Probleme mit version-spezifischer Syntax.
        </p>
        <div className="mt-3 p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
          💡 <strong>Tipp:</strong> Der generierte Inhalt wird automatisch in <strong>SiniChat</strong> gespeichert, damit du ihn dort weiter bearbeiten kannst.
        </div>
      </div>

      {/* MOBILE FIRST: flex-col auf Mobile, md:grid auf Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Software / Version</label>
              <CustomSelect
                name="version"
                value={version}
                onChange={(value) => setVersion(value)}
                options={versions}
                placeholder="Software auswählen..."
                variant="modal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Was brauchst du?</label>
              <CustomSelect
                name="taskType"
                value={taskType}
                onChange={(value) => setTaskType(value)}
                options={taskTypes}
                placeholder="Aufgabe auswählen..."
                variant="modal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Problembeschreibung</label>
              <textarea
                name="problem"
                required
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="z.B. Ich will Spalte A summieren, aber nur wenn in Spalte B 'Bezahlt' steht. Spalte A geht von A2 bis A500."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all min-h-[150px]"
                rows={8}
              />
            </div>

            <SubmitButton />
          </form>
          
          {state?.error && (
            <p className="mt-4 text-sm text-red-400">{state.error}</p>
          )}
        </div>

        {/* RECHTE SEITE: ERGEBNIS */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-h-[300px] sm:min-h-[400px] overflow-hidden flex flex-col">
          {state?.result ? (
            <>
              {/* HEADER LEISTE OBERHALB DES TEXTES */}
              <ActionButtons text={state.result} formulaOnly={formulaOnly} />
              {/* CODE-BLOCK + ERKLÄRUNG */}
              <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto space-y-4">
                {/* CODE-BLOCK - Das Herzstück */}
                <div className="bg-black/50 border border-white/10 font-mono text-emerald-400 p-4 rounded-xl text-sm sm:text-base overflow-x-auto whitespace-pre-wrap">
                  {formulaOnly}
                </div>
                {/* ERKLÄRUNG - Darunter */}
                <div className="prose prose-sm max-w-none text-white leading-relaxed prose-invert">
                  <div className="text-zinc-300 whitespace-pre-wrap">
                    {state.result.replace(formulaOnly, '').trim() || 'Die Erklärung zur Formel erscheint hier.'}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <Calculator className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Warte auf Input...</p>
              <p className="text-xs mt-1 text-zinc-600">Die Lösung erscheint hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
