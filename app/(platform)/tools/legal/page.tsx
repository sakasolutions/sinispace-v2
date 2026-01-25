'use client';

import { generateLegal } from '@/actions/legal-ai';
import { useActionState } from 'react';
import { useState } from 'react';
import { Copy, MessageSquare, Loader2, Scale, FileX, AlertTriangle, Handshake, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { ToolHeader } from '@/components/tool-header';
import { FeedbackButton } from '@/components/ui/feedback-button';

type LegalMode = 'cancellation' | 'reminder' | 'contract' | 'dispute' | null;

const modeOptions = [
  { 
    id: 'cancellation', 
    label: 'Kündigung', 
    description: 'Verträge rechtssicher beenden.',
    icon: FileX, 
    color: 'rose' 
  },
  { 
    id: 'reminder', 
    label: 'Mahnung', 
    description: 'Zahlungserinnerung & Fristen.',
    icon: AlertTriangle, 
    color: 'amber' 
  },
  { 
    id: 'contract', 
    label: 'Vertrag', 
    description: 'Dienstleistung, Kauf oder NDA.',
    icon: Handshake, 
    color: 'emerald' 
  },
  { 
    id: 'dispute', 
    label: 'Beschwerde / Einspruch', 
    description: 'Mängelrüge oder Widerspruch.',
    icon: ShieldAlert, 
    color: 'blue' 
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  rose: { bg: 'bg-rose-500/20', border: 'border-rose-500/50', text: 'text-rose-300', hover: 'hover:bg-rose-500/30' },
  amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-300', hover: 'hover:bg-amber-500/30' },
  emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-300', hover: 'hover:bg-emerald-500/30' },
  blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-300', hover: 'hover:bg-blue-500/30' },
};

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
      <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Rechtstext erstellt</span>
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
      className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-3 text-sm font-semibold text-white hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/30 flex items-center justify-center gap-2 min-h-[44px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Erstelle Entwurf...</span>
        </>
      ) : (
        <>
          <Scale className="w-4 h-4" />
          <span>Rechtssicheren Entwurf erstellen ⚖️</span>
        </>
      )}
    </button>
  );
}

export default function LegalPage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateLegal, null);
  
  const [selectedMode, setSelectedMode] = useState<LegalMode>(null);
  
  // Formular-State je nach Modus
  const [partner, setPartner] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [debtorName, setDebtorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [dueSince, setDueSince] = useState('');
  const [details, setDetails] = useState('');

  // Baue details-String basierend auf Modus
  const buildDetails = (): string => {
    if (selectedMode === 'cancellation') {
      return `Vertragspartner: ${partner}${customerNumber ? `, Kundennummer: ${customerNumber}` : ''}${desiredDate ? `, Gewünschtes Datum: ${desiredDate}` : ''}`;
    } else if (selectedMode === 'reminder') {
      return `Schuldner: ${debtorName}, Rechnungsnummer: ${invoiceNumber}, Betrag: ${amount}${dueSince ? `, Fällig seit: ${dueSince}` : ''}`;
    } else {
      return details;
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
      {/* WARN-BANNER GANZ OBEN */}
      <div className="mb-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
        ⚠️ <strong>Wichtiger Hinweis:</strong> Dieses Tool erstellt Entwürfe auf Basis von KI. Es ersetzt keine anwaltliche Beratung. Nutzung auf eigene Verantwortung.
      </div>

      <ToolHeader
        title="Rechtssicherheit"
        description="Rechtssichere Schreiben für Kündigung, Mahnung, Vertrag & Beschwerde."
        icon={Scale}
        color="violet"
        toolId="legal"
        backLink="/dashboard"
      />

      {/* MOBILE FIRST: flex-col auf Mobile, md:grid auf Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE */}
        <div className="space-y-6">
          {/* STEP 1: Auswahl-Kacheln */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Was möchtest du erstellen?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {modeOptions.map((option) => {
                const Icon = option.icon;
                const colors = colorMap[option.color];
                const isSelected = selectedMode === option.id;
                
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedMode(option.id as LegalMode)}
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

          {/* STEP 2: Dynamisches Formular */}
          {selectedMode && (
            <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]">
              <form 
                action={formAction} 
                className="space-y-4 sm:space-y-5"
                onSubmit={(e) => {
                  if (!selectedMode) {
                    e.preventDefault();
                    return;
                  }
                  // Stelle sicher, dass der Modus-Wert im FormData gesetzt ist
                  const form = e.currentTarget;
                  const modeInput = form.querySelector('input[name="mode"]') as HTMLInputElement;
                  if (modeInput) {
                    modeInput.value = selectedMode;
                  }
                }}
              >
                <input type="hidden" name="mode" value={selectedMode} />
                {selectedMode === 'cancellation' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Vertragspartner <span className="text-zinc-500 text-xs">(z.B. Vodafone)</span>
                      </label>
                      <input
                        type="text"
                        name="partner"
                        required
                        value={partner}
                        onChange={(e) => setPartner(e.target.value)}
                        placeholder="z.B. Vodafone, Fitnessstudio, Vermieter..."
                        className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Kundennummer <span className="text-zinc-500 text-xs">(optional)</span>
                      </label>
                      <input
                        type="text"
                        name="customerNumber"
                        value={customerNumber}
                        onChange={(e) => setCustomerNumber(e.target.value)}
                        placeholder="z.B. 12345678"
                        className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Gewünschtes Kündigungsdatum <span className="text-zinc-500 text-xs">(optional)</span>
                      </label>
                      <input
                        type="date"
                        name="desiredDate"
                        value={desiredDate}
                        onChange={(e) => setDesiredDate(e.target.value)}
                        className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all min-h-[44px]"
                      />
                    </div>
                    <input type="hidden" name="details" value={buildDetails()} />
                  </>
                )}

                {selectedMode === 'reminder' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Schuldner Name
                      </label>
                      <input
                        type="text"
                        name="debtorName"
                        required
                        value={debtorName}
                        onChange={(e) => setDebtorName(e.target.value)}
                        placeholder="z.B. Max Mustermann GmbH"
                        className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Rechnungsnummer
                      </label>
                      <input
                        type="text"
                        name="invoiceNumber"
                        required
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder="z.B. RE-2026-001"
                        className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Offener Betrag
                      </label>
                      <input
                        type="text"
                        name="amount"
                        required
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="z.B. 1.250,00 €"
                        className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all min-h-[44px]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-2">
                        Fällig seit <span className="text-zinc-500 text-xs">(optional)</span>
                      </label>
                      <input
                        type="date"
                        name="dueSince"
                        value={dueSince}
                        onChange={(e) => setDueSince(e.target.value)}
                        className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all min-h-[44px]"
                      />
                    </div>
                    <input type="hidden" name="details" value={buildDetails()} />
                  </>
                )}

                {selectedMode === 'contract' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Was soll geregelt werden?
                    </label>
                    <textarea
                      name="details"
                      required
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="z.B. Ich erstelle eine Webseite für 500€. Der Kunde zahlt 50% Vorkasse, 50% nach Fertigstellung. Laufzeit: 4 Wochen."
                      className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none transition-all min-h-[150px]"
                      rows={6}
                    />
                  </div>
                )}

                {selectedMode === 'dispute' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Was ist passiert?
                    </label>
                    <textarea
                      name="details"
                      required
                      value={details}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="z.B. Ware kaputt geliefert. Bestellt am 15.01., erhalten am 20.01. Verpackung beschädigt, Produkt funktioniert nicht."
                      className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 resize-none transition-all min-h-[150px]"
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
              
              {/* Dokumenten-Preview (weißer Hintergrund, schwarze Schrift) */}
              <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 sm:p-8 text-black">
                  <div className="prose prose-sm max-w-none text-black whitespace-pre-wrap leading-relaxed">
                    {state.result}
                  </div>
                </div>
              </div>
              
              {/* Footer Disclaimer */}
              <div className="border-t border-white/5 bg-white/5 p-3 rounded-b-xl">
                <p className="text-xs text-zinc-500 text-center mb-3">
                  Keine Rechtsberatung. Bitte vor Verwendung prüfen.
                </p>
                {/* FEEDBACK BUTTON */}
                <div className="pt-3 border-t border-white/5">
                  <FeedbackButton 
                    toolId="legal" 
                    toolName="Rechtstexte & Formales"
                    resultId={state?.result ? `legal-${Date.now()}` : undefined}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <Scale className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Wähle eine Option aus...</p>
              <p className="text-xs mt-1 text-zinc-600">Der rechtssichere Entwurf erscheint hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
