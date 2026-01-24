'use client';

import { useActionState } from 'react';
import { useState } from 'react';
import { Map, Loader2, ChevronDown, Footprints, Train } from 'lucide-react';
import { ToolHeader } from '@/components/tool-header';
import { FeedbackButton } from '@/components/ui/feedback-button';
import { useFormStatus } from 'react-dom';
import { generateTravelPlan } from '@/actions/travel-ai';
import { CustomSelect } from '@/components/ui/custom-select';

type ItineraryDay = {
  day: number;
  areaFocus: string;
  morning: {
    activity?: string;
    logistics?: string;
    mapsQuery?: string;
  };
  lunch: {
    name?: string;
    description?: string;
    mapsQuery?: string;
  };
  afternoon: {
    activity?: string;
    logistics?: string;
    mapsQuery?: string;
  };
  dinner: {
    name?: string;
    description?: string;
    mapsQuery?: string;
  };
  evening: {
    activity?: string;
    vibe?: string;
    mapsQuery?: string;
  };
};

type TravelPlan = {
  tripTitle: string;
  vibeDescription: string;
  generalTips: string[];
  itinerary: ItineraryDay[];
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
          <Map className="w-4 h-4" />
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
  const [season, setSeason] = useState('Sommer');
  const [budget, setBudget] = useState('€€');
  const [companions, setCompanions] = useState('Paar');
  const [pace, setPace] = useState(3);
  const [diet, setDiet] = useState('Alles');
  const [openDay, setOpenDay] = useState(1);

  const budgetOptions = [
    { id: 'low', label: '€', value: '€' },
    { id: 'mid', label: '€€', value: '€€' },
    { id: 'high', label: '€€€', value: '€€€' },
  ];

  const companionOptions = [
    { id: 'solo', label: 'Solo', value: 'Solo' },
    { id: 'pair', label: 'Paar', value: 'Paar' },
    { id: 'family', label: 'Familie', value: 'Familie' },
    { id: 'friends', label: 'Freunde', value: 'Freunde' },
  ];

  const seasonOptions = [
    { value: 'Frühling', label: 'Frühling' },
    { value: 'Sommer', label: 'Sommer' },
    { value: 'Herbst', label: 'Herbst' },
    { value: 'Winter', label: 'Winter' },
  ];

  const dietOptions = [
    { value: 'Alles', label: 'Allesesser' },
    { value: 'Vegetarisch', label: 'Vegetarisch' },
    { value: 'Vegan', label: 'Vegan' },
    { value: 'Glutenfrei', label: 'Glutenfrei' },
  ];

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

  const mapUrl = (query?: string) => {
    if (!query) return '#';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ToolHeader
        title="Travel-Agent"
        description="Logische Tagesrouten mit Logistik, Food-Spots und Karten-Links."
        icon={Map}
        color="cyan"
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
              <label className="block text-sm font-medium text-zinc-300 mb-2">Reisezeit</label>
              <CustomSelect
                name="season"
                value={season}
                onChange={(value) => setSeason(value)}
                options={seasonOptions}
                placeholder="Saison auswählen..."
                variant="dropdown"
              />
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
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Reise-Stil <span className="text-zinc-500 text-xs font-normal">(Pace)</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">Entspannt 🐢</span>
                <input
                  type="range"
                  name="pace"
                  min={1}
                  max={5}
                  value={pace}
                  onChange={(e) => setPace(Number(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs text-zinc-500">Aktiv 🏃‍♂️</span>
              </div>
              <div className="mt-1 text-xs text-zinc-500">Stufe {pace} von 5</div>
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
              <label className="block text-sm font-medium text-zinc-300 mb-2">Ernährung</label>
              <CustomSelect
                name="diet"
                value={diet}
                onChange={(value) => setDiet(value)}
                options={dietOptions}
                placeholder="Ernährung auswählen..."
                variant="dropdown"
              />
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
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">{plan.tripTitle}</h2>
                  <p className="text-sm text-zinc-300">{plan.vibeDescription}</p>
                </div>

                <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-white/10">
                  {plan.itinerary.map((day) => {
                    const isOpen = openDay === day.day;
                    return (
                      <div key={day.day} className="border border-white/10 rounded-xl overflow-hidden ml-6">
                        <button
                          type="button"
                          onClick={() => setOpenDay(isOpen ? 0 : day.day)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/60 hover:bg-zinc-900/80 transition-colors"
                        >
                          <div className="text-left">
                            <p className="text-xs uppercase tracking-wider text-zinc-500">Tag {day.day}</p>
                            <p className="text-sm sm:text-base text-white font-medium">{day.areaFocus}</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="px-4 py-3 bg-zinc-900/40 space-y-3 text-sm text-zinc-300">
                            <div>
                              <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">🌅 Morgen</div>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div>{day.morning.activity}</div>
                                  {day.morning.logistics && (
                                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                                      <Footprints className="w-3.5 h-3.5" />
                                      {day.morning.logistics}
                                    </div>
                                  )}
                                </div>
                                {day.morning.mapsQuery && (
                                  <a
                                    href={mapUrl(day.morning.mapsQuery)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
                                  >
                                    📍 Auf Karte
                                  </a>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">🍽️ Mittag</div>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-white">{day.lunch.name}</div>
                                  {day.lunch.description && <div className="text-xs text-zinc-500 mt-1">{day.lunch.description}</div>}
                                </div>
                                {day.lunch.mapsQuery && (
                                  <a
                                    href={mapUrl(day.lunch.mapsQuery)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
                                  >
                                    📍 Auf Karte
                                  </a>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">☀️ Nachmittag</div>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div>{day.afternoon.activity}</div>
                                  {day.afternoon.logistics && (
                                    <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2">
                                      <Train className="w-3.5 h-3.5" />
                                      {day.afternoon.logistics}
                                    </div>
                                  )}
                                </div>
                                {day.afternoon.mapsQuery && (
                                  <a
                                    href={mapUrl(day.afternoon.mapsQuery)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
                                  >
                                    📍 Auf Karte
                                  </a>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">🍷 Abend</div>
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-white">{day.dinner.name}</div>
                                  {day.dinner.description && <div className="text-xs text-zinc-500 mt-1">{day.dinner.description}</div>}
                                  {day.evening.activity && (
                                    <div className="text-xs text-zinc-400 mt-2">
                                      {day.evening.activity}
                                      {day.evening.vibe ? ` · ${day.evening.vibe}` : ''}
                                    </div>
                                  )}
                                </div>
                                {(day.dinner.mapsQuery || day.evening.mapsQuery) && (
                                  <a
                                    href={mapUrl(day.dinner.mapsQuery || day.evening.mapsQuery)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
                                  >
                                    📍 Auf Karte
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {plan.generalTips?.length ? (
                  <div className="mt-5 rounded-lg border border-white/10 bg-zinc-900/60 p-3 text-sm text-zinc-300">
                    <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">General Tips</div>
                    <ul className="space-y-1">
                      {plan.generalTips.map((tip, i) => (
                        <li key={i}>• {tip}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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
              <Map className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Dein Reiseplan erscheint hier</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
