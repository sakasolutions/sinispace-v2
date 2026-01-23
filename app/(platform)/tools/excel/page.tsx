'use client';

import { generateExcel } from '@/actions/excel-ai';
import { useActionState } from 'react';
import { useState } from 'react';
import { Copy, MessageSquare, Loader2, Table2, FunctionSquare, BrainCircuit, FileCode, Wand2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { ToolHeader } from '@/components/tool-header';
import { Tooltip } from '@/components/ui/tooltip';
import { FeedbackButton } from '@/components/ui/feedback-button';

type ExcelMode = 'generator' | 'explainer' | 'script' | 'data' | null;
type Software = 'excel-de' | 'excel-en' | 'sheets' | null;

const modeOptions = [
  { 
    id: 'generator', 
    label: 'Formel Generator', 
    description: 'Beschreibe dein Problem, erhalte die Formel.',
    icon: FunctionSquare, 
    color: 'emerald' 
  },
  { 
    id: 'explainer', 
    label: 'Formel Erklärer', 
    description: 'Füge eine Formel ein, ich erkläre sie dir.',
    icon: BrainCircuit, 
    color: 'blue' 
  },
  { 
    id: 'script', 
    label: 'Makro & Script', 
    description: 'VBA oder Apps Script für Automationen.',
    icon: FileCode, 
    color: 'violet' 
  },
  { 
    id: 'data', 
    label: 'Daten-Retter', 
    description: 'Chaos beseitigen (z.B. Duplikate, Trennung).',
    icon: Wand2, 
    color: 'amber' 
  },
];

const softwareOptions = [
  { id: 'excel-de', label: 'Excel (Deutsch)' },
  { id: 'excel-en', label: 'Excel (Englisch)' },
  { id: 'sheets', label: 'Google Sheets' },
];

const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', hover: 'hover:bg-emerald-500/30' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-300', hover: 'hover:bg-blue-500/30' },
  violet: { bg: 'bg-violet-500/20', border: 'border-violet-500/50', text: 'text-violet-300', hover: 'hover:bg-violet-500/30' },
  amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-300', hover: 'hover:bg-amber-500/30' },
};

function ActionButtons({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  // Extrahiere Code aus Markdown Code-Blöcken
  const extractCode = (text: string): string => {
    const codeBlockMatch = text.match(/```[\s\S]*?```/);
    if (codeBlockMatch) {
      return codeBlockMatch[0].replace(/```[\w]*\n?/g, '').trim();
    }
    // Fallback: Suche nach Zeilen die mit = beginnen (Formeln)
    const lines = text.split('\n');
    const formulaLine = lines.find(line => line.trim().startsWith('='));
    return formulaLine?.trim() || text.substring(0, 200);
  };

  const codeToCopy = extractCode(text);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeToCopy);
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
      <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Lösung generiert</span>
      <div className="flex gap-1.5">
        <button
          onClick={handleCopy}
          className="h-8 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
          title="Code in Zwischenablage kopieren"
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
      className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-semibold text-white hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 min-h-[44px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Generiere Lösung...</span>
        </>
      ) : (
        <>
          <Table2 className="w-4 h-4" />
          <span>Lösung generieren ⚡️</span>
        </>
      )}
    </button>
  );
}

export default function ExcelPage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateExcel, null);
  
  const [selectedMode, setSelectedMode] = useState<ExcelMode>(null);
  const [selectedSoftware, setSelectedSoftware] = useState<Software>(null);
  const [query, setQuery] = useState('');

  // Extrahiere Code-Block aus Ergebnis
  const extractCodeBlock = (text: string): { code: string; explanation: string } => {
    const codeBlockMatch = text.match(/```[\w]*\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      const code = codeBlockMatch[1].trim();
      const explanation = text.replace(/```[\s\S]*?```/, '').trim();
      return { code, explanation };
    }
    // Fallback: Suche nach Zeilen die mit = beginnen
    const lines = text.split('\n');
    const formulaIndex = lines.findIndex(line => line.trim().startsWith('='));
    if (formulaIndex !== -1) {
      const code = lines[formulaIndex].trim();
      const explanation = lines.slice(formulaIndex + 1).join('\n').trim();
      return { code, explanation };
    }
    return { code: '', explanation: text };
  };

  const { code, explanation } = state?.result ? extractCodeBlock(state.result) : { code: '', explanation: '' };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
      <ToolHeader
        title="Excel-Coach"
        description="Formeln verstehen, erstellen und Daten blitzschnell analysieren."
        icon={Table2}
        color="green"
        toolId="excel"
      />

      {/* MOBILE FIRST: flex-col auf Mobile, md:grid auf Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE */}
        <div className="space-y-6">
          {/* STEP 1: Software Wahl (Tabs) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <label className="block text-sm font-medium text-zinc-300">
                Software wählen
              </label>
              <Tooltip
                content={
                  <div className="space-y-1">
                    <p className="font-semibold mb-1">Warum ist das wichtig?</p>
                    <p>📊 <strong>Excel (Deutsch):</strong> Formeln wie SVERWEIS, WENN, SUMMEWENN. Trennzeichen: Semikolon (;)</p>
                    <p>📊 <strong>Excel (Englisch):</strong> Formeln wie VLOOKUP, IF, SUMIF. Trennzeichen: Komma (,)</p>
                    <p>📊 <strong>Google Sheets:</strong> Meist englische Syntax, internationales Format</p>
                    <p className="mt-2 text-xs opacity-90">Die richtige Auswahl sorgt für korrekte Formel-Syntax!</p>
                  </div>
                }
                variant="tip"
                position="top"
                iconOnly
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {softwareOptions.map((option) => {
                const isSelected = selectedSoftware === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedSoftware(option.id as Software)}
                    className={`px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-lg'
                        : 'bg-zinc-900/50 border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: Modus Wahl (Grid) */}
          {selectedSoftware && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <label className="block text-sm font-medium text-zinc-300">
                  Was möchtest du tun?
                </label>
                <Tooltip
                  content="Wähle den passenden Modus für dein Problem. Jeder Modus ist speziell auf bestimmte Aufgaben optimiert."
                  variant="help"
                  position="top"
                  iconOnly
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modeOptions.map((option) => {
                  const Icon = option.icon;
                  const colors = colorMap[option.color];
                  const isSelected = selectedMode === option.id;
                  
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedMode(option.id as ExcelMode)}
                      className={`rounded-xl border-2 p-4 transition-all text-left ${
                        isSelected
                          ? `${colors.bg} ${colors.border} ${colors.text} shadow-lg`
                          : 'bg-zinc-900/50 border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isSelected ? colors.bg : 'bg-zinc-800/50'
                        }`}>
                          <Icon className={`w-5 h-5 ${isSelected ? colors.text : 'text-zinc-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-sm mb-1 ${isSelected ? colors.text : 'text-white'}`}>
                            {option.label}
                          </h3>
                          <p className="text-xs text-zinc-500">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Eingabe (Kontext-sensitiv) */}
          {selectedMode && selectedSoftware && (
            <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
              <form 
                action={formAction} 
                className="space-y-4 sm:space-y-5"
                onSubmit={(e) => {
                  if (!selectedMode || !selectedSoftware) {
                    e.preventDefault();
                    return;
                  }
                  const form = e.currentTarget;
                  const modeInput = form.querySelector('input[name="mode"]') as HTMLInputElement;
                  const softwareInput = form.querySelector('input[name="software"]') as HTMLInputElement;
                  if (modeInput) modeInput.value = selectedMode;
                  if (softwareInput) softwareInput.value = selectedSoftware;
                }}
              >
                <input type="hidden" name="mode" value={selectedMode} />
                <input type="hidden" name="software" value={selectedSoftware} />
                
                {selectedMode === 'generator' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Was soll passieren? <span className="text-zinc-500 text-xs">(z.B. Summiere Spalte A, wenn B 'bezahlt' ist)</span>
                    </label>
                    <textarea
                      name="query"
                      required
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="z.B. Ich will Spalte A summieren, aber nur wenn in Spalte B 'Bezahlt' steht. Spalte A geht von A2 bis A500."
                      className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all min-h-[150px]"
                      rows={6}
                    />
                  </div>
                )}

                {selectedMode === 'explainer' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Füge hier die Formel ein
                    </label>
                    <textarea
                      name="query"
                      required
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="z.B. =SUMMEWENN(B2:B500;&quot;Bezahlt&quot;;A2:A500)"
                      className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all font-mono min-h-[150px]"
                      rows={6}
                    />
                  </div>
                )}

                {selectedMode === 'script' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Was soll automatisiert werden?
                    </label>
                    <textarea
                      name="query"
                      required
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="z.B. Ich möchte alle Zeilen löschen, wo Spalte C leer ist. Oder: Erstelle ein Makro, das jeden Tag um 9 Uhr eine E-Mail mit dem Tagesumsatz sendet."
                      className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all min-h-[150px]"
                      rows={6}
                    />
                  </div>
                )}

                {selectedMode === 'data' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Beschreibe dein Datenproblem
                    </label>
                    <textarea
                      name="query"
                      required
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="z.B. Ich habe Duplikate in Spalte A. Oder: In Spalte B sind Vor- und Nachname zusammen, ich will sie trennen. Oder: Ich will alle leeren Zeilen entfernen."
                      className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all min-h-[150px]"
                      rows={6}
                    />
                  </div>
                )}

                <SubmitButton />
              </form>
              
              {state?.error && (
                <p className="mt-4 text-sm text-red-400">{state.error}</p>
              )}
            </div>
          )}
        </div>

        {/* RECHTE SEITE: ERGEBNIS */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-h-[300px] sm:min-h-[400px] overflow-hidden">
          {state?.result && state.result.includes('🔒 Premium Feature') ? (
            <div className="p-4 sm:p-5 md:p-6">
              <div className="prose prose-sm max-w-none text-white prose-invert">
                <div dangerouslySetInnerHTML={{ __html: state.result.replace(/\n/g, '<br />') }} />
              </div>
            </div>
          ) : state?.result ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <ActionButtons text={state.result} />
              
              {/* CODE-BLOCK (dunkel, Monospace) */}
              <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto space-y-4">
                {code && (
                  <div className="bg-black/70 border border-emerald-500/30 rounded-lg p-4 overflow-x-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Code / Formel</span>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(code);
                          } catch (err) {
                            console.error('Fehler beim Kopieren:', err);
                          }
                        }}
                        className="h-7 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Kopieren</span>
                      </button>
                    </div>
                    <pre className="font-mono text-sm text-emerald-400 whitespace-pre-wrap break-words">
                      <code>{code}</code>
                    </pre>
                  </div>
                )}
                
                {/* ERKLÄRUNG */}
                {explanation && (
                  <div className="prose prose-sm max-w-none text-white prose-invert">
                    <div className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {explanation}
                    </div>
                  </div>
                )}
              </div>
              {/* FEEDBACK BUTTON */}
              <div className="p-4 sm:p-5 md:p-6 border-t border-white/5">
                <FeedbackButton 
                  toolId="excel" 
                  toolName="Excel-Coach"
                  resultId={state?.result ? `excel-${Date.now()}` : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <Table2 className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Wähle Software und Modus...</p>
              <p className="text-xs mt-1 text-zinc-600">Die Lösung erscheint hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
