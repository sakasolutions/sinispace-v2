'use client';

import { useActionState } from 'react';
import { useState } from 'react';
import { Plane, Loader2, ChevronDown } from 'lucide-react';
import { ToolHeader } from '@/components/tool-header';
import { FeedbackButton } from '@/components/ui/feedback-button';
import { useFormStatus } from 'react-dom';
import { generateTravelPlan } from '@/actions/travel-ai';

type ItineraryDay = {
  day: number;
  focus: string;
  morning: string;
  afternoon: string;
  evening: string;
  hiddenGem: string;
};

type TravelPlan = {
  title: string;
  summary: string;
  itinerary: ItineraryDay[];
  packingTip: string;
  localDish: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white hover:from-blue-600 hover:to-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 min-h-[44px]"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Route wird erstellt...</span>
        </>
      ) : (
        <>
          <Plane className="w-4 h-4" />
          <span>Reiseplan generieren</span>
        </>
      )}
    </button>
  );
}

export default function TravelPage() {
  // @ts-ignore
  const [state, formAction] = useActionState(generateTravelPlan, null);

  const [destination, setDestination] = useState('');
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState('Mittel');
  const [companions, setCompanions] = useState('Paar');
  const [vibe, setVibe] = useState<string[]>([]);
  const [openDay, setOpenDay] = useState(1);

  const budgetOptions = [
    { id: 'low', label: '€', value: 'Low Budget' },
    { id: 'mid', label: '€€', value: 'Mittel' },
    { id: 'high', label: '€€€', value: 'Luxus' },
  ];

  const companionOptions = [
    { id: 'solo', label: 'Solo', value: 'Solo' },
    { id: 'pair', label: 'Paar', value: 'Paar' },
    { id: 'family', label: 'Familie', value: 'Familie' },
    { id: 'friends', label: 'Freunde', value: 'Freunde' },
  ];

  const vibeOptions = [
    { id: 'culture', label: 'Kultur', value: 'Kultur' },
    { id: 'relax', label: 'Entspannung', value: 'Entspannung' },
    { id: 'party', label: 'Party', value: 'Party' },
    { id: 'foodie', label: 'Foodie', value: 'Foodie' },
    { id: 'adventure', label: 'Abenteuer', value: 'Abenteuer' },
    { id: 'nature', label: 'Natur', value: 'Natur' },
  ];

  const toggleVibe = (value: string) => {
    setVibe((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  let plan: TravelPlan | null = null;
  if (state?.result && !state.error) {
    try {
      if (!state.result.includes('🔒 Premium Feature')) {
        plan = JSON.parse(state.result) as TravelPlan;
      }
    } catch (e) {
      console.error('Parse error:', e);
    }
  }

  const mapUrl = (place: string) => {
    const dest = destination || plan?.title || '';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place} ${dest}`)}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ToolHeader
        title="Travel-Agent"
        description="Komplette Reise-Routen mit klarer Tagesstruktur, Hidden Gems und lokalen Food-Tipps."
        icon={Plane}
        color="blue"
        backLink="/dashboard"
        toolId="travel"
      />

      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
        <div className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl p-4 sm:p-5 md:p-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] h-fit">
          <form action={formAction} className="space-y-4 sm:space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Wohin?</label>
              <input
                name="destination"
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="z.B. Lissabon"
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all min-h-[44px]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Dauer <span className="text-zinc-500 text-xs font-normal">(max. 7 Tage)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  name="days"
                  min={1}
                  max={7}
                  value={days}
                  onChange={(e) => setDays(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-sm text-white w-10 text-right">{days}d</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Budget</label>
              <div className="flex gap-2">
                {budgetOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBudget(opt.value)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                      budget === opt.value
                        ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-300'
                        : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="budget" value={budget} />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Mit wem?</label>
              <div className="flex flex-wrap gap-2">
                {companionOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCompanions(opt.value)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                      companions === opt.value
                        ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-300'
                        : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="companions" value={companions} />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Vibe</label>
              <div className="flex flex-wrap gap-2">
                {vibeOptions.map((opt) => {
                  const active = vibe.includes(opt.value);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleVibe(opt.value)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all min-h-[44px] ${
                        active
                          ? 'bg-blue-500/20 border-2 border-blue-500/50 text-blue-300'
                          : 'bg-zinc-900/50 border border-white/10 text-zinc-400 hover:bg-zinc-800/50 hover:border-white/20'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {vibe.map((v) => (
                <input key={v} type="hidden" name="vibe" value={v} />
              ))}
            </div>

            <SubmitButton />
          </form>

          {state?.error && <p className="mt-4 text-sm text-red-400">{state.error}</p>}
        </div>

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
                <div className="mb-4">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{plan.title}</h2>
                  <p className="text-sm text-zinc-300">{plan.summary}</p>
                </div>

                <div className="space-y-3">
                  {plan.itinerary.map((day) => {
                    const isOpen = openDay === day.day;
                    return (
                      <div key={day.day} className="border border-white/10 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenDay(isOpen ? 0 : day.day)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/60 hover:bg-zinc-900/80 transition-colors"
                        >
                          <div className="text-left">
                            <p className="text-xs uppercase tracking-wider text-zinc-500">Tag {day.day}</p>
                            <p className="text-sm sm:text-base text-white font-medium">{day.focus}</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="px-4 py-3 bg-zinc-900/40 space-y-3 text-sm text-zinc-300">
                            <div>
                              <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Morgen</div>
                              <div>{day.morning}</div>
                              <a
                                href={mapUrl(day.morning)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-300 hover:text-blue-200 inline-flex mt-1"
                              >
                                🔍 Auf Karte zeigen
                              </a>
                            </div>
                            <div>
                              <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Nachmittag</div>
                              <div>{day.afternoon}</div>
                              <a
                                href={mapUrl(day.afternoon)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-300 hover:text-blue-200 inline-flex mt-1"
                              >
                                🔍 Auf Karte zeigen
                              </a>
                            </div>
                            <div>
                              <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Abend</div>
                              <div>{day.evening}</div>
                              <a
                                href={mapUrl(day.evening)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-300 hover:text-blue-200 inline-flex mt-1"
                              >
                                🔍 Auf Karte zeigen
                              </a>
                            </div>
                            <div>
                              <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">Hidden Gem</div>
                              <div>{day.hiddenGem}</div>
                              <a
                                href={mapUrl(day.hiddenGem)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-300 hover:text-blue-200 inline-flex mt-1"
                              >
                                🔍 Auf Karte zeigen
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-3 text-sm text-zinc-300">
                    <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Packing-Tipp</div>
                    {plan.packingTip}
                  </div>
                  <div className="rounded-lg border border-white/10 bg-zinc-900/60 p-3 text-sm text-zinc-300">
                    <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Local Dish</div>
                    {plan.localDish}
                  </div>
                </div>
              </div>
              <div className="p-4 sm:p-5 md:p-6 border-t border-white/5">
                <FeedbackButton
                  toolId="travel"
                  toolName="Travel-Agent"
                  resultId={state?.result ? `travel-${Date.now()}` : undefined}
                />
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-zinc-500 p-4 sm:p-5 md:p-6">
              <Plane className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Dein Reiseplan erscheint hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
