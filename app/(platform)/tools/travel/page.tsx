'use client';

import { useActionState } from 'react';
import { useState, useEffect, useRef } from 'react';
import { Map, Loader2, ChevronDown, Star } from 'lucide-react';
import { ToolHeader } from '@/components/tool-header';
import { FeedbackButton } from '@/components/ui/feedback-button';
import { useFormStatus } from 'react-dom';
import { generateTravelPlan } from '@/actions/travel-ai';
import { CustomSelect } from '@/components/ui/custom-select';

type ItineraryDay = {
  day: number;
  title: string;
  morning: { place?: string; desc?: string; mapQuery?: string; tag?: string };
  afternoon: { place?: string; desc?: string; mapQuery?: string; tag?: string };
  evening: { place?: string; desc?: string; mapQuery?: string; tag?: string };
  googleMapsRouteUrl?: string;
};

type TravelPlan = {
  tripTitle: string;
  vibeDescription: string;
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
  const [extras, setExtras] = useState('');
  const [openDay, setOpenDay] = useState(1);
  const resultRef = useRef<HTMLDivElement>(null);

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

  const isExtra = (tag?: string) => Boolean(tag && tag.toLowerCase().includes('wunsch'));

  useEffect(() => {
    if (plan && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [plan]);

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

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Besondere Wünsche / Extras ✨</label>
              <textarea
                name="extras"
                value={extras}
                onChange={(e) => setExtras(e.target.value)}
                placeholder="z.B. 'Suche eine gute Shisha-Bar', 'Will Fußball schauen', 'Wir lieben Vintage-Shopping'..."
                className="w-full rounded-md border border-white/10 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 resize-none transition-all min-h-[110px]"
                rows={4}
              />
            </div>

            <SubmitButton />
          </form>

          {state?.error && <p className="mt-4 text-sm text-red-400">{state.error}</p>}
        </div>

        <div
          ref={resultRef}
          className="rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/30 to-zinc-900/30 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] min-h-[300px] sm:min-h-[400px] overflow-hidden"
        >
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
                            <p className="text-sm sm:text-base text-white font-medium">{day.title}</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen && (
                          <div className="px-4 py-3 bg-zinc-900/40 space-y-3 text-sm text-zinc-300">
                            <div>
                              <div className="text-zinc-400 text-xs uppercase tracking-wider mb-1">🌅 Morgen</div>
                              <div className={`flex items-start justify-between gap-3 ${isExtra(day.morning.tag) ? 'rounded-lg border border-amber-400/40 bg-amber-500/5 p-2' : ''}`}>
                                <div>
                                  <div className="text-white">{day.morning.place}</div>
                                  {day.morning.desc && <div className="text-xs text-zinc-500 mt-1">{day.morning.desc}</div>}
                                  {isExtra(day.morning.tag) && (
                                    <div className="text-xs text-amber-300 mt-1 inline-flex items-center gap-1">
                                      <Star className="w-3.5 h-3.5" /> {day.morning.tag}
                                    </div>
                                  )}
                                </div>
                                {day.morning.mapQuery && (
                                  <a
                                    href={mapUrl(day.morning.mapQuery)}
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
                              <div className={`flex items-start justify-between gap-3 ${isExtra(day.afternoon.tag) ? 'rounded-lg border border-amber-400/40 bg-amber-500/5 p-2' : ''}`}>
                                <div>
                                  <div className="text-white">{day.afternoon.place}</div>
                                  {day.afternoon.desc && <div className="text-xs text-zinc-500 mt-1">{day.afternoon.desc}</div>}
                                  {isExtra(day.afternoon.tag) && (
                                    <div className="text-xs text-amber-300 mt-1 inline-flex items-center gap-1">
                                      <Star className="w-3.5 h-3.5" /> {day.afternoon.tag}
                                    </div>
                                  )}
                                </div>
                                {day.afternoon.mapQuery && (
                                  <a
                                    href={mapUrl(day.afternoon.mapQuery)}
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
                              <div className={`flex items-start justify-between gap-3 ${isExtra(day.evening.tag) ? 'rounded-lg border border-amber-400/40 bg-amber-500/5 p-2' : ''}`}>
                                <div>
                                  <div className="text-white">{day.evening.place}</div>
                                  {day.evening.desc && <div className="text-xs text-zinc-500 mt-1">{day.evening.desc}</div>}
                                  {isExtra(day.evening.tag) && (
                                    <div className="text-xs text-amber-300 mt-1 inline-flex items-center gap-1">
                                      <Star className="w-3.5 h-3.5" /> {day.evening.tag}
                                    </div>
                                  )}
                                </div>
                                {day.evening.mapQuery && (
                                  <a
                                    href={mapUrl(day.evening.mapQuery)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
                                  >
                                    📍 Auf Karte
                                  </a>
                                )}
                              </div>
                            </div>
                            {day.googleMapsRouteUrl && (
                              <a
                                href={day.googleMapsRouteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full mt-4 flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                              >
                                🗺️ Ganze Tages-Route auf Maps öffnen
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-500 mt-4">
                  Hinweis: Öffnungszeiten und Verfügbarkeiten können variieren. Bitte prüfe die Orte kurz vor dem Besuch.
                </p>
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
