'use client';

import { generateEmailWithChat } from '@/actions/ai-actions';
import { useActionState } from 'react';
import { useState } from 'react';
import { Mail, MessageSquare, Loader2 } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { LabelWithTooltip } from '@/components/ui/tooltip';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { CustomSelect } from '@/components/ui/custom-select';

function ActionButtons({ text, recipientEmail }: { text: string; recipientEmail?: string }) {
  const router = useRouter();

  const handleOpenMailto = () => {
    // Extrahiere Betreff aus dem ersten Zeile, falls vorhanden
    const lines = text.split('\n');
    const subject = lines[0]?.replace(/^Betreff:\s*/i, '').trim() || 'E-Mail';
    const body = text.replace(/^Betreff:.*\n/i, '').trim();
    
    const email = recipientEmail ? `mailto:${recipientEmail}?` : 'mailto:?';
    const mailtoLink = `${email}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
  };

  const handleGoToChat = () => {
    router.push('/chat');
  };

  return (
    <div className="flex justify-between items-center border-b border-white/5 bg-white/5 p-3 rounded-t-xl mb-4">
      <span className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Dein Entwurf</span>
      <div className="flex gap-1.5">
        <CopyButton text={text} size="sm" variant="default" className="h-8" />
        
        <button
          onClick={handleOpenMailto}
          className="h-8 px-2 rounded-md bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/10 transition-all flex items-center gap-1.5 text-xs font-medium"
          title="In E-Mail-Client öffnen"
        >
          <Mail className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Öffnen</span>
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
      className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-sm font-semibold text-white hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 min-h-[44px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Schreibe E-Mail...</span>
        </>
      ) : (
        <span>E-Mail generieren ✨</span>
      )}
    </button>
  );
}

export default function EmailPage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateEmailWithChat, null);
  
  // State für Formularfelder, damit sie nicht geleert werden
  const [senderName, setSenderName] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipient, setRecipient] = useState('');
  const [tone, setTone] = useState('Professionell');
  const [formality, setFormality] = useState<'Sie' | 'Du'>('Sie');
  const [language, setLanguage] = useState('Deutsch');
  const [length, setLength] = useState<'Kurz' | 'Mittel' | 'Ausführlich'>('Mittel');
  const [topic, setTopic] = useState('');

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">E-Mail Verfasser</h1>
        <p className="text-sm sm:text-base text-zinc-400 mt-1 sm:mt-2">
          Wirf mir ein paar Stichpunkte hin, ich mache daraus eine professionelle Mail.
        </p>
        <div className="mt-3 p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-sm text-blue-300">
          💡 <strong>Tipp:</strong> Der generierte Inhalt wird automatisch in <strong>SiniChat</strong> gespeichert, damit du ihn dort weiter bearbeiten kannst.
        </div>
      </div>

      {/* MOBILE FIRST: flex-col auf Mobile, md:grid auf Desktop */}
      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Absender Name <span className="text-zinc-500 text-xs font-normal">(optional)</span>
              </label>
              <input
                name="senderName"
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="z.B. Max Mustermann"
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Empfänger Name <span className="text-zinc-500 text-xs font-normal">(optional)</span>
              </label>
              <input
                name="recipientName"
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="z.B. Dr. Anna Schmidt"
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Empfänger E-Mail <span className="text-zinc-500 text-xs font-normal">(optional)</span>
              </label>
              <input
                name="recipientEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="z.B. anna.schmidt@example.com"
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">An wen geht es?</label>
              <input
                name="recipient"
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="z.B. Chef, Kunden, Vermieter"
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-h-[44px]"
              />
            </div>

            <div>
              <LabelWithTooltip
                label="Tonfall"
                tooltip="Wähle den passenden Ton für deine E-Mail. Professionell für Geschäftliches, Freundlich für lockere Kommunikation, Bestimmt für dringende Angelegenheiten."
                variant="help"
              />
              <CustomSelect
                name="tone"
                value={tone}
                onChange={(value) => setTone(value)}
                options={[
                  { value: 'Professionell', label: 'Professionell & Sachlich' },
                  { value: 'Freundlich', label: 'Freundlich & Locker' },
                  { value: 'Bestimmt', label: 'Bestimmt & Dringend' },
                  { value: 'Verkaufend', label: 'Verkaufend & Überzeugend' },
                  { value: 'Einfühlsam', label: 'Einfühlsam & Taktvoll' },
                  { value: 'Entschuldigend', label: 'Entschuldigend' },
                ]}
                placeholder="Tonfall auswählen..."
              />
            </div>

            <div>
              <LabelWithTooltip
                label="Anrede"
                tooltip="Sie = formell (Geschäftlich, Unbekannte Personen). Du = informell (Kollegen, Bekannte, Freunde)."
                variant="help"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormality('Sie')}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    formality === 'Sie'
                      ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                >
                  Sie
                </button>
                <button
                  type="button"
                  onClick={() => setFormality('Du')}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    formality === 'Du'
                      ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                >
                  Du
                </button>
              </div>
              <input type="hidden" name="formality" value={formality} />
            </div>

            <div>
              <LabelWithTooltip
                label="Sprache"
                tooltip="Die E-Mail wird in der gewählten Sprache mit natürlichen, idiomatischen Formulierungen verfasst - keine wörtlichen Übersetzungen!"
                variant="tip"
              />
              <CustomSelect
                name="language"
                value={language}
                onChange={(value) => setLanguage(value)}
                options={[
                  'Deutsch',
                  'Englisch',
                  'Französisch',
                  'Italienisch',
                  'Spanisch',
                  'Türkisch',
                ]}
                placeholder="Sprache auswählen..."
              />
            </div>

            <div>
              <LabelWithTooltip
                label="Länge"
                tooltip="Kurz = 2-3 Sätze (Quick Updates). Mittel = 1-2 Absätze (Standard). Ausführlich = Mehrere Absätze (Detaillierte Erklärungen)."
                variant="help"
              />
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setLength('Kurz')}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    length === 'Kurz'
                      ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                >
                  Kurz
                </button>
                <button
                  type="button"
                  onClick={() => setLength('Mittel')}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    length === 'Mittel'
                      ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                >
                  Mittel
                </button>
                <button
                  type="button"
                  onClick={() => setLength('Ausführlich')}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                    length === 'Ausführlich'
                      ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-300'
                      : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                  }`}
                >
                  Ausführlich
                </button>
              </div>
              <input type="hidden" name="length" value={length} />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Worum geht's? (Stichpunkte reichen)</label>
              <textarea
                name="topic"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="z.B. Bitte um Meeting nächste Woche, Projekt X ist fertig, brauche Feedback bis Freitag..."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none transition-all min-h-[150px]"
                rows={6}
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
              <ActionButtons text={state.result} recipientEmail={recipientEmail} />
              {/* TEXT BEREICH DARUNTER */}
              <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto">
                <div className="prose prose-sm max-w-none text-white whitespace-pre-wrap leading-relaxed prose-invert">
                  {state.result}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <Mail className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm sm:text-base">Warte auf Input...</p>
              <p className="text-xs mt-1 text-zinc-600">Die generierte E-Mail erscheint hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
