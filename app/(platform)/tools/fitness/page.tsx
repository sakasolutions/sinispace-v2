'use client';

import { generateFitnessPlan } from '@/actions/fitness-ai';
import { useActionState } from 'react';
import { useState } from 'react';
import { Dumbbell, Loader2, CheckCircle2 } from 'lucide-react';
import { ToolHeader } from '@/components/tool-header';
import { useFormStatus } from 'react-dom';

type FitnessPlan = {
  title: string;
  summary: string;
  warmup: string[];
  exercises: { name: string; setsReps: string; visualCue: string; youtubeQuery: string }[];
  cooldown: string[];
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white hover:from-rose-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-500/30 flex items-center justify-center gap-2 min-h-[44px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Plan wird erstellt...</span>
        </>
      ) : (
        <>
          <Dumbbell className="w-4 h-4" />
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
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-8">
      <ToolHeader
        title="Fit-Coach"
        description="Maßgeschneiderte Trainingspläne in Sekunden."
        icon={Dumbbell}
        color="rose"
        toolId="fitness"
        backLink="/dashboard"
      />

      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        {/* LINKE SEITE: EINGABE */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Ziel</label>
              <select
                name="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all"
              >
                {goalOptions.map((opt) => (
                  <option key={opt.id} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Fokus</label>
              <select
                name="focus"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500/50 transition-all"
              >
                {focusOptions.map((opt) => (
                  <option key={opt.id} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Level</label>
              <div className="flex flex-wrap gap-2">
                {levelOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLevel(opt.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                      level === opt.value
                        ? 'bg-rose-500/20 border-2 border-rose-500/50 text-rose-300'
                        : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="level" value={level} />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Zeit</label>
              <div className="flex flex-wrap gap-2">
                {durationOptions.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => setDuration(min)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                      duration === min
                        ? 'bg-rose-500/20 border-2 border-rose-500/50 text-rose-300'
                        : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                    }`}
                  >
                    {min} Min
                  </button>
                ))}
              </div>
              <input type="hidden" name="duration" value={duration} />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Equipment</label>
              <div className="flex flex-wrap gap-2">
                {equipmentOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleEquipment(opt.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                      equipment.includes(opt.value)
                        ? 'bg-rose-500/20 border-2 border-rose-500/50 text-rose-300'
                        : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
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
              <label className="block text-sm font-medium text-zinc-300 mb-2">Besonderheiten</label>
              <div className="flex flex-wrap gap-2">
                {constraintOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleConstraint(opt.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                      constraints.includes(opt.value)
                        ? 'bg-rose-500/20 border-2 border-rose-500/50 text-rose-300'
                        : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
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
              <label className="block text-sm font-medium text-zinc-300 mb-2">Energie</label>
              <div className="flex flex-wrap gap-2">
                {energyOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEnergy(opt.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                      energy === opt.value
                        ? 'bg-rose-500/20 border-2 border-rose-500/50 text-rose-300'
                        : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="energy" value={energy} />
            </div>

            <SubmitButton />
          </form>

          {state?.error && <p className="mt-4 text-sm text-red-400">{state.error}</p>}
        </div>

        {/* RECHTE SEITE: ERGEBNIS */}
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-h-[300px] sm:min-h-[400px] overflow-hidden">
          {state?.result && state.result.includes('🔒 Premium Feature') ? (
            <div className="p-4 sm:p-5 md:p-6">
              <div className="prose prose-sm max-w-none text-white prose-invert">
                <div dangerouslySetInnerHTML={{ __html: state.result.replace(/\n/g, '<br />') }} />
              </div>
            </div>
          ) : plan ? (
            <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex-1 p-4 sm:p-5 md:p-6 overflow-y-auto">
                <div className="rounded-xl border border-rose-500/20 bg-zinc-900/80 backdrop-blur-xl p-5 sm:p-6 shadow-lg">
                  <div className="mb-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{plan.title}</h2>
                    <p className="text-sm text-zinc-300">{plan.summary}</p>
                  </div>

                  <div className="mb-6 bg-zinc-800/40 border border-white/10 rounded-lg p-3">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Warm-up</h3>
                    <ul className="text-sm text-zinc-300 space-y-1">
                      {plan.warmup.map((w, i) => (
                        <li key={i}>• {w}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-3">Hauptteil</h3>
                    <ul className="space-y-3">
                      {plan.exercises.map((ex, i) => (
                        <li key={i} className="flex items-start gap-3 text-zinc-300">
                          <div className="mt-1.5 w-5 h-5 rounded border-2 border-rose-500/30 bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-rose-400 opacity-80" />
                          </div>
                          <div className="text-sm sm:text-base">
                            <div className="text-white font-medium">{ex.name}</div>
                            <div className="text-zinc-400">
                              {ex.setsReps}
                            </div>
                            {ex.visualCue && (
                              <div className="text-zinc-500 text-xs mt-1 italic">„{ex.visualCue}“</div>
                            )}
                            {ex.youtubeQuery && (
                              <a
                                href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtubeQuery)}+Tutorial`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center text-xs text-rose-300 hover:text-rose-200 mt-1"
                              >
                                ▶️ Technik-Video
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-zinc-800/40 border border-white/10 rounded-lg p-3">
                    <h3 className="text-sm font-semibold text-zinc-200 mb-2">Cool-down</h3>
                    <ul className="text-sm text-zinc-300 space-y-1">
                      {plan.cooldown.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <div className="text-center">
                <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Dein Trainingsplan erscheint hier</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
