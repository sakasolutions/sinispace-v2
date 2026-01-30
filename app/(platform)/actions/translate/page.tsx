'use client';

import { generateTranslateWithChat } from '@/actions/ai-actions';
import { useActionState } from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  Copy,
  Loader2,
  Languages,
  ArrowRightLeft,
  Sparkles,
  Volume2,
  ChevronDown,
} from 'lucide-react';
import { useFormStatus } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BackButton } from '@/components/ui/back-button';
import { WhatIsThisModal } from '@/components/ui/what-is-this-modal';

const VIBE_OPTIONS = [
  {
    id: 'business',
    label: 'Business',
    emoji: '👔',
    description: 'Seriös, distanziert',
    value: 'Business & Professionell',
  },
  {
    id: 'casual',
    label: 'Casual',
    emoji: '😎',
    description: 'Wie Freunde sprechen',
    value: 'Umgangssprache & Locker',
  },
  {
    id: 'native',
    label: 'Slang/Street',
    emoji: '🔥',
    description: 'Native Speaker Level',
    value: 'Wie ein Muttersprachler',
  },
  {
    id: 'romantic',
    label: 'Romantisch',
    emoji: '❤️',
    description: 'Für Dating/Partner',
    value: 'Romantisch & Charmant',
  },
] as const;

const LANGUAGES = [
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'en-us', name: 'Englisch (US)', flag: '🇺🇸' },
  { code: 'en-uk', name: 'Englisch (UK)', flag: '🇬🇧' },
  { code: 'tr', name: 'Türkisch', flag: '🇹🇷' },
  { code: 'es', name: 'Spanisch', flag: '🇪🇸' },
  { code: 'fr', name: 'Französisch', flag: '🇫🇷' },
  { code: 'it', name: 'Italienisch', flag: '🇮🇹' },
  { code: 'pt', name: 'Portugiesisch', flag: '🇵🇹' },
  { code: 'nl', name: 'Niederländisch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polnisch', flag: '🇵🇱' },
  { code: 'ru', name: 'Russisch', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanisch', flag: '🇯🇵' },
  { code: 'ko', name: 'Koreanisch', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinesisch', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabisch', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'sv', name: 'Schwedisch', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegisch', flag: '🇳🇴' },
  { code: 'da', name: 'Dänisch', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnisch', flag: '🇫🇮' },
  { code: 'el', name: 'Griechisch', flag: '🇬🇷' },
  { code: 'cs', name: 'Tschechisch', flag: '🇨🇿' },
  { code: 'hu', name: 'Ungarisch', flag: '🇭🇺' },
  { code: 'ro', name: 'Rumänisch', flag: '🇷🇴' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamesisch', flag: '🇻🇳' },
];

interface TranslationResult {
  translation: string;
  context_note: string;
  alternatives: string[];
}

function parseResult(text: string): TranslationResult {
  const result: TranslationResult = { translation: '', context_note: '', alternatives: [] };
  if (!text) return result;

  try {
    // Versuche JSON zu parsen
    const parsed = JSON.parse(text);
    if (parsed.translation && typeof parsed.translation === 'string') {
      return {
        translation: parsed.translation,
        context_note: parsed.context_note || '',
        alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
      };
    }
  } catch {
    // Fallback: Text-basiertes Parsing (für alte Responses)
    const translationMatch = text.match(/---ÜBERSETZUNG---\s*([\s\S]*?)\s*(?:---ERKLÄRUNG---|$)/);
    const explanationMatch = text.match(/---ERKLÄRUNG---\s*([\s\S]*?)\s*(?:---ALTERNATIVEN---|$)/);
    const alternativesMatch = text.match(/---ALTERNATIVEN---\s*([\s\S]*?)$/);

    if (translationMatch) {
      result.translation = translationMatch[1]?.trim() || '';
    } else {
      result.translation = text.trim();
    }

    if (explanationMatch) {
      result.context_note = explanationMatch[1]?.trim() || '';
    }

    if (alternativesMatch) {
      const altText = alternativesMatch[1]?.trim() || '';
      const alts = altText.split(/\d+\.\s+/).filter(Boolean).map(s => s.trim());
      result.alternatives = alts.slice(0, 3);
    }
  }

  return result;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        'w-full rounded-xl py-3.5 font-semibold text-white tracking-tight',
        'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600',
        'disabled:opacity-50 disabled:cursor-not-allowed transition-all',
        'flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25'
      )}
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Übersetze…
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Übersetzen ✨
        </>
      )}
    </button>
  );
}

export default function TranslatePage() {
  const [state, formAction] = useActionState(generateTranslateWithChat, null);

  const [text, setText] = useState('');
  const [sourceLang, setSourceLang] = useState('de');
  const [targetLang, setTargetLang] = useState('en-us');
  const [vibe, setVibe] = useState('Business & Professionell');
  const [toast, setToast] = useState<string | null>(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState<number | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const sourceLanguage = LANGUAGES.find((l) => l.code === sourceLang);
  const targetLanguage = LANGUAGES.find((l) => l.code === targetLang);

  const parsed = state?.result ? parseResult(state.result) : null;
  
  // Der angezeigte Text: Original oder gewählte Alternative
  const displayedTranslation = parsed 
    ? (selectedAlternative !== null && parsed.alternatives[selectedAlternative] 
        ? parsed.alternatives[selectedAlternative] 
        : parsed.translation)
    : '';

  useEffect(() => {
    if (state?.result && !state.error) {
      // Reset Alternative-Auswahl bei neuem Ergebnis
      setSelectedAlternative(null);
      setShowAlternatives(false);
      
      // Auto-scroll on mobile
      if (window.innerWidth < 1024 && resultRef.current) {
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
      }
    }
  }, [state?.result, state?.error]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSwapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  const handleCopy = async () => {
    if (!displayedTranslation) return;
    try {
      await navigator.clipboard.writeText(displayedTranslation);
      setToast('In Zwischenablage kopiert!');
    } catch {
      setToast('Kopieren fehlgeschlagen.');
    }
  };

  const handleSpeak = () => {
    if (!displayedTranslation) return;
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(displayedTranslation);
      utterance.lang = targetLang === 'en-us' ? 'en-US' : targetLang === 'en-uk' ? 'en-GB' : targetLang;
      window.speechSynthesis.speak(utterance);
      setToast('Vorlesen gestartet...');
    } else {
      setToast('Vorlesen nicht unterstützt.');
    }
  };
  
  const handleSelectAlternative = (idx: number) => {
    if (selectedAlternative === idx) {
      // Deselect: zurück zum Original
      setSelectedAlternative(null);
      setToast('Original wiederhergestellt');
    } else {
      setSelectedAlternative(idx);
      setToast(`Variante ${idx + 1} ausgewählt`);
    }
  };

  return (
    <div className="flex flex-col mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
      <div className="flex items-center justify-between mb-3">
        <BackButton href="/dashboard" className="text-gray-600 hover:text-gray-900 tracking-tight" />
        <WhatIsThisModal
          title="Sprachbrücke – Kultur-Dolmetscher"
          content={
            <div className="space-y-3 text-gray-700">
              <p>
                Dein intelligenter <strong>Kultur-Dolmetscher</strong> mit Kontext-Verständnis. Übersetzt nicht wörtlich, sondern <strong>sinngemäß</strong> – inklusive Idiome, Redewendungen und kulturelle Nuancen.
              </p>
              <p className="text-sm text-gray-600">
                <strong>Safety Check:</strong> Die AI erklärt dir, wie deine Übersetzung beim Empfänger ankommt.
              </p>
            </div>
          }
          examples={[
            '"Ich glaub mein Schwein pfeift" → "I can\'t believe my eyes" (nicht wörtlich!)',
            'Business-Vibe: "Sehr geehrte Damen und Herren" → "Dear Sir or Madam"',
            'Casual-Vibe: "Hey, was geht?" → "Hey, what\'s up?"',
          ]}
          useCases={[
            '4 Vibe-Modi: Business, Casual, Slang/Street, Romantisch',
            'Idiom-Handling: Sprichwörter werden kulturell übersetzt',
            'Safety Check: Erklärung warum so übersetzt wurde',
            'Alternativen: 2-3 weitere Varianten zum Vergleich',
            '25+ Sprachen mit Flaggen-Icons',
          ]}
          tips={[
            'Nutze Slang/Street für authentische Native-Speaker-Formulierungen',
            'Der Safety Check erklärt, wie der Ton beim Empfänger ankommt',
            'Alternativen zeigen dir formellere oder lockerere Optionen',
          ]}
        />
      </div>

      <div
        className={cn(
          'flex flex-col lg:flex-row border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm',
          'min-h-[calc(100vh-140px)]'
        )}
      >
        {/* Left: Das Cockpit (35%) */}
        <aside className="w-full lg:w-[35%] flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 bg-white shrink-0">
          <form ref={formRef} action={formAction} className="flex flex-col flex-1 min-h-0">
            <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1">
              {/* Sprach-Wahl */}
              <div>
                <label className="block text-sm font-medium text-gray-700 tracking-tight mb-3">
                  Sprachen
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 tracking-tight"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleSwapLanguages}
                    className="p-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                    title="Sprachen tauschen"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                  </button>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 tracking-tight"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input type="hidden" name="targetLanguage" value={targetLanguage?.name || 'Englisch (US)'} />
              </div>

              {/* Input-Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 tracking-tight mb-2">
                  Was möchtest du sagen?
                </label>
                <textarea
                  name="text"
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Gib hier deinen Text ein oder füge ihn ein..."
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 resize-none min-h-[180px] tracking-tight"
                  rows={8}
                />
              </div>

              {/* Vibe-Check */}
              <div>
                <label className="block text-sm font-medium text-gray-700 tracking-tight mb-3">
                  Vibe-Check – Wie soll es klingen?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {VIBE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setVibe(option.value)}
                      className={cn(
                        'flex flex-col items-center justify-center gap-1 rounded-xl py-3 px-2 text-center transition-all tracking-tight',
                        vibe === option.value
                          ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/30'
                          : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                      )}
                    >
                      <span className="text-lg">{option.emoji}</span>
                      <span className="text-xs font-medium">{option.label}</span>
                      <span className="text-[10px] opacity-70">{option.description}</span>
                    </button>
                  ))}
                </div>
                <input type="hidden" name="mode" value={vibe} />
                <input type="hidden" name="workspaceId" value="" />
              </div>

              <SubmitButton />

              {state?.error && (
                <p className="text-sm text-red-600 tracking-tight">{state.error}</p>
              )}
            </div>
          </form>
        </aside>

        {/* Right: Ergebnis & Analyse (65%) */}
        <main ref={resultRef} className="flex-1 min-w-0 flex flex-col bg-gray-50 lg:bg-gray-50/80">
          <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
            {parsed?.translation ? (
              <div className="space-y-4">
                {/* Haupt-Karte: Übersetzung */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
                >
                  <div className="border-b border-gray-100 px-4 sm:px-6 py-3 bg-gray-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{targetLanguage?.flag}</span>
                      <span className="text-sm font-medium text-gray-700 tracking-tight">
                        {targetLanguage?.name}
                      </span>
                      {vibe === 'Wie ein Muttersprachler' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 font-medium">
                          🔥 Native Mode
                        </span>
                      )}
                      {selectedAlternative !== null && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">
                          Variante {selectedAlternative + 1}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSpeak}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                        title="Vorlesen"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Kopieren
                      </button>
                    </div>
                  </div>
                  <div className="px-4 sm:px-6 py-5">
                    <p className="text-lg text-gray-900 leading-relaxed tracking-tight whitespace-pre-wrap">
                      {displayedTranslation}
                    </p>
                  </div>
                  
                  {/* Context Note - innerhalb der Karte */}
                  {parsed.context_note && (
                    <div className="px-4 sm:px-6 pb-5">
                      <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-3">
                        <div className="flex items-start gap-2.5">
                          <span className="text-base shrink-0">💡</span>
                          <p className="text-sm text-blue-800 leading-relaxed">
                            {parsed.context_note}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* Alternativen (Klickbar!) */}
                {parsed.alternatives.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => setShowAlternatives(!showAlternatives)}
                      className="w-full px-4 sm:px-5 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-700 tracking-tight">
                        Andere Möglichkeiten ({parsed.alternatives.length})
                      </span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-gray-500 transition-transform',
                          showAlternatives && 'rotate-180'
                        )}
                      />
                    </button>
                    <AnimatePresence>
                      {showAlternatives && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-gray-100"
                        >
                          <div className="p-4 sm:p-5 space-y-3">
                            <p className="text-xs text-gray-500 mb-2">
                              Klicke auf eine Variante, um sie als Haupttext zu verwenden:
                            </p>
                            {parsed.alternatives.map((alt, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectAlternative(idx)}
                                className={cn(
                                  'w-full text-left p-3 rounded-lg border transition-all',
                                  selectedAlternative === idx
                                    ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-200'
                                    : 'bg-gray-50 border-gray-100 hover:border-gray-300 hover:bg-gray-100'
                                )}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className={cn(
                                    'text-xs font-medium',
                                    selectedAlternative === idx ? 'text-orange-600' : 'text-gray-500'
                                  )}>
                                    {selectedAlternative === idx ? '✓ Ausgewählt' : `Variante ${idx + 1}`}
                                  </span>
                                  <span
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await navigator.clipboard.writeText(alt);
                                      setToast('Variante kopiert!');
                                    }}
                                    className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                                  >
                                    Kopieren
                                  </span>
                                </div>
                                <p className="text-sm text-gray-800 leading-relaxed">{alt}</p>
                              </button>
                            ))}
                            {selectedAlternative !== null && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAlternative(null);
                                  setToast('Original wiederhergestellt');
                                }}
                                className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-2"
                              >
                                ← Zurück zum Original
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center py-16 text-center"
              >
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <Languages className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium tracking-tight">Die Übersetzung</p>
                <p className="text-sm text-gray-400 mt-1 tracking-tight">
                  Deine Übersetzung erscheint hier – mit Erklärung und Alternativen.
                </p>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium shadow-lg tracking-tight"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
