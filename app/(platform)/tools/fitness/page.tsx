'use client';

import { generateFitnessPlan } from '@/actions/fitness-ai';
import { useActionState } from 'react';
import { useState } from 'react';
import { Dumbbell, Loader2, CheckCircle2, Sparkles, Target, LayoutGrid } from 'lucide-react';
import { FeedbackButton } from '@/components/ui/feedback-button';
import { useFormStatus } from 'react-dom';
import { CustomSelect } from '@/components/ui/custom-select';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

type FitnessPlan = {
  title: string;
  summary: string;
  warmup: string[];
  exercises: { name: string; setsReps: string; visualCue: string; youtubeQuery: string }[];
  cooldown: string[];
};

const filledInputTriggerClass =
  '!border-0 bg-gray-100 rounded-2xl pl-12 pr-6 py-5 text-base sm:text-lg font-medium min-h-[52px] focus:!ring-2 focus:!ring-violet-500 focus:!ring-offset-0 transition-all touch-manipulation';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-lg sm:text-xl font-bold py-4 sm:py-5 rounded-2xl shadow-xl shadow-violet-200 hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 disabled:shadow-xl flex items-center justify-center gap-2 min-h-[52px] sm:min-h-[56px] touch-manipulation"
    >
      {pending ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Plan wird erstellt...</span>
        </>
      ) : (
        <>
          <Dumbbell className="w-5 h-5" />
          <span>Trainingsplan generieren</span>
        </>
      )}
    </button>
  );
}

export default function FitnessPage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateFitnessPlan, null);

  const [goal, setGoal] = useState('Muskelaufbau');
  const [level, setLevel] = useState('Anfänger');
  const [duration, setDuration] = useState('30');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [focus, setFocus] = useState('Ganzkörper (Balance)');
  const [constraints, setConstraints] = useState<string[]>([]);
  const [energy, setEnergy] = useState('Normal');
  const [workspaceId, setWorkspaceId] = useState<string>('');

  const goalOptions = [
    { id: 'muscle', label: 'Muskeln', value: 'Muskelaufbau' },
    { id: 'fat', label: 'Fettabbau', value: 'Abnehmen' },
    { id: 'mobility', label: 'Beweglichkeit', value: 'Ausdauer' },
  ];

  const levelOptions = [
    { id: 'beginner', label: 'Anfänger', value: 'Anfänger' },
    { id: 'intermediate', label: 'Mittel', value: 'Fortgeschritten' },
    { id: 'pro', label: 'Profi', value: 'Beast' },
  ];

  const durationOptions = ['15', '30', '45', '60', '90'];

  const equipmentOptions = [
    { id: 'bodyweight', label: 'Keine Geräte', value: 'Bodyweight' },
    { id: 'dumbbells', label: 'Hanteln', value: 'Kurzhanteln' },
    { id: 'bands', label: 'Bänder', value: 'Bänder' },
    { id: 'gym', label: 'Fitnessstudio', value: 'Fitnessstudio' },
  ];

  const focusOptions = [
    { id: 'full', label: 'Ganzkörper (Balance)', value: 'Ganzkörper (Balance)' },
    { id: 'upper', label: 'Oberkörper & Arme (Beach)', value: 'Oberkörper & Arme (Beach)' },
    { id: 'lower', label: 'Beine & Po (Booty)', value: 'Beine & Po (Booty)' },
    { id: 'core', label: 'Core & Sixpack', value: 'Core & Sixpack' },
    { id: 'back', label: 'Rücken fit (Anti-Schmerz)', value: 'Rücken fit (Anti-Schmerz)' },
    { id: 'cardio', label: 'Cardio & Burn (Abnehmen)', value: 'Cardio & Burn (Abnehmen)' },
  ];

  const constraintOptions = [
    { id: 'quiet', label: '🤫 Leise / Keine Sprünge', value: 'Leise / Keine Sprünge' },
    { id: 'knee', label: '🦵 Knie-schonend', value: 'Knie-schonend' },
    { id: 'low-energy', label: '🧘‍♂️ Wenig Energie / Flow', value: 'Wenig Energie / Flow' },
  ];

  const energyOptions = [
    { id: 'low', label: 'Wenig Energie', value: 'Wenig Energie' },
    { id: 'normal', label: 'Normal', value: 'Normal' },
    { id: 'high', label: 'High Energy', value: 'High Energy' },
  ];

  const toggleEquipment = (value: string) => {
    setEquipment((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleConstraint = (value: string) => {
    setConstraints((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  let plan: FitnessPlan | null = null;
  if (state?.result && !state.error) {
    try {
      if (!state.result.includes('🔒 Premium Feature')) {
        plan = JSON.parse(state.result) as FitnessPlan;
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-50 relative overflow-x-hidden">
      {/* Ambient Background: kräftiger auf Mobile für Referenz-Look */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden
      >
        <div className="absolute top-0 left-0 w-[800px] h-[800px] sm:w-[1000px] sm:h-[1000px] rounded-full bg-gradient-to-tr from-violet-300/40 to-fuchsia-300/40 sm:from-violet-300/30 sm:to-fuchsia-300/30 blur-[120px] sm:blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] rounded-full bg-gradient-to-tl from-orange-200/35 to-rose-200/35 sm:from-orange-200/30 sm:to-rose-200/30 blur-[100px] sm:blur-[150px] translate-x-1/2 translate-y-1/2" />
        {/* Leichter Violet-Top für „Header-Bereich“ wie Referenz */}
        <div className="absolute top-0 left-0 right-0 h-48 sm:h-56 bg-gradient-to-b from-violet-400/20 to-transparent pointer-events-none" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-8 pb-[env(safe-area-inset-bottom)]">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors min-h-[44px] min-w-[44px] -ml-2 items-center justify-center sm:justify-start"
          aria-label="Zurück zum Dashboard"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück</span>
        </Link>

        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8 mt-2 sm:mt-4">
          {/* Bottom-Sheet: sehr starke Rundung oben, mehr Abstand auf Mobile */}
          <div
            className="bg-white rounded-t-[32px] sm:rounded-t-[40px] shadow-[0_-8px_32px_rgba(0,0,0,0.08)] sm:shadow-[0_-10px_40px_rgba(0,0,0,0.1)] mt-8 sm:mt-12 lg:mt-20 p-6 pt-10 sm:p-8 sm:pt-12 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
          >
            {/* Premium Visual Hook – auf Mobile etwas kompakter, trotzdem präsent */}
            <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto mb-8 sm:mb-10 rounded-[32px] sm:rounded-[40px] bg-gradient-to-bl from-violet-100 to-white shadow-xl shadow-violet-100/50 flex items-center justify-center border border-white/80">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Sparkles className="w-10 h-10 sm:w-14 sm:h-14 text-white" />
              </div>
            </div>

            {/* Typografie – auf Mobile etwas kleiner, bessere Lesbarkeit */}
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2 sm:mb-3 text-center tracking-tight">
              Hi, ich bin Sini! 👋
            </h1>
            <p className="text-base sm:text-lg text-gray-500 text-center leading-relaxed mb-8 sm:mb-10 px-1">
              Dein persönlicher AI-Coach für Fitness & Ernährung. Lass uns deine Ziele angehen!
            </p>

            <form action={formAction} className="space-y-4 sm:space-y-5">
              <div>
                <label className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide ml-2 mb-2 block">Ziel</label>
                <CustomSelect
                  value={goal}
                  onChange={(value) => setGoal(value)}
                  options={goalOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
                  name="goal"
                  theme="light"
                  triggerClassName={filledInputTriggerClass}
                  icon={Target}
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide ml-2 mb-2 block">Fokus</label>
                <CustomSelect
                  value={focus}
                  onChange={(value) => setFocus(value)}
                  options={focusOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
                  name="focus"
                  theme="light"
                  triggerClassName={filledInputTriggerClass}
                  icon={LayoutGrid}
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide ml-2 mb-2 block">Level</label>
                <div className="flex flex-wrap gap-2">
                  {levelOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setLevel(opt.value)}
                      className={`px-4 py-3 rounded-2xl text-sm sm:text-base font-medium transition-all min-h-[48px] touch-manipulation ${
                        level === opt.value
                          ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-500/30'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="level" value={level} />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide ml-2 mb-2 block">Zeit</label>
                <div className="flex flex-wrap gap-2">
                  {durationOptions.map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setDuration(min)}
                      className={`px-4 py-3 rounded-2xl text-sm sm:text-base font-medium transition-all min-h-[48px] touch-manipulation ${
                        duration === min
                          ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-500/30'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {min} Min
                    </button>
                  ))}
                </div>
                <input type="hidden" name="duration" value={duration} />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide ml-2 mb-2 block">Equipment</label>
                <div className="flex flex-wrap gap-2">
                  {equipmentOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleEquipment(opt.value)}
                      className={`px-4 py-3 rounded-2xl text-sm sm:text-base font-medium transition-all min-h-[48px] touch-manipulation ${
                        equipment.includes(opt.value)
                          ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-500/30'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {equipment.map((eq) => (
                  <input key={eq} type="hidden" name="equipment" value={eq} />
                ))}
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide ml-2 mb-2 block">Besonderheiten</label>
                <div className="flex flex-wrap gap-2">
                  {constraintOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleConstraint(opt.value)}
                      className={`px-4 py-3 rounded-2xl text-sm sm:text-base font-medium transition-all min-h-[48px] touch-manipulation ${
                        constraints.includes(opt.value)
                          ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-500/30'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {constraints.map((c) => (
                  <input key={c} type="hidden" name="constraints" value={c} />
                ))}
              </div>

              <div>
                <label className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wide ml-2 mb-2 block">Energie</label>
                <div className="flex flex-wrap gap-2">
                  {energyOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setEnergy(opt.value)}
                      className={`px-4 py-3 rounded-2xl text-sm sm:text-base font-medium transition-all min-h-[48px] touch-manipulation ${
                        energy === opt.value
                          ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-500/30'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <input type="hidden" name="energy" value={energy} />
              </div>

              <div className="pt-2">
                <SubmitButton />
              </div>
            </form>

            {state?.error && <p className="mt-4 text-sm text-red-500 text-center">{state.error}</p>}
          </div>

          {/* RECHTE SEITE: ERGEBNIS – auf Mobile gleicher Sheet-Look */}
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] sm:shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 min-h-[280px] sm:min-h-[400px] overflow-hidden lg:mt-20">
            {state?.result && state.result.includes('🔒 Premium Feature') ? (
              <div className="p-6">
                <div className="prose prose-sm max-w-none text-gray-700">
                  <div dangerouslySetInnerHTML={{ __html: state.result.replace(/\n/g, '<br />') }} />
                </div>
              </div>
            ) : plan ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="rounded-2xl border border-violet-100 bg-gray-50/80 p-6">
                  <div className="mb-5">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{plan.title}</h2>
                    <p className="text-sm text-gray-600">{plan.summary}</p>
                  </div>

                  <div className="mb-6 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Warm-up</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {plan.warmup.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Hauptteil</h3>
                    <ul className="space-y-3">
                      {plan.exercises.map((ex, i) => (
                        <li key={i} className="flex items-start gap-3 text-gray-700">
                          <div className="mt-1.5 w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-violet-600" />
                          </div>
                          <div className="text-sm sm:text-base">
                            <div className="font-semibold text-gray-900">{ex.name}</div>
                            <div className="text-gray-500">{ex.setsReps}</div>
                            {ex.visualCue && (
                              <div className="text-zinc-500 text-xs mt-1 italic">„{ex.visualCue}“</div>
                            )}
                            {ex.youtubeQuery && (
                              <a
                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtubeQuery)}+Tutorial`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-violet-600 hover:text-violet-700 font-medium mt-1"
                              >
                                ▶️ Technik-Video
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-2">Cool-down</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {plan.cooldown.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-100">
                <FeedbackButton
                  toolId="fitness"
                  toolName="Fit-Coach"
                  resultId={state?.result ? `fitness-${Date.now()}` : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-gray-400 p-8">
              <div className="text-center">
                <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-40" />
                <p className="text-sm font-medium">Dein Trainingsplan erscheint hier</p>
                <p className="text-xs mt-1">Fülle die Felder aus und klicke auf „Trainingsplan generieren".</p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
