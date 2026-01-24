'use server';

import { createChatCompletion } from '@/lib/openai-wrapper';
import { isUserPremium } from '@/lib/subscription';
import { createHelperChat } from '@/actions/chat-actions';

const UPSELL_MESSAGE = `### 🔒 Premium Feature

Diese Funktion steht nur **Pro-Usern** zur Verfügung.
Upgrade deinen Account, um unbegrenzten Zugriff auf alle KI-Tools zu erhalten.

[👉 **Hier klicken zum Freischalten**](/settings)`;

type ItineraryDay = {
  day: number;
  title: string;
  morning: { place?: string; desc?: string; mapQuery?: string; tag?: string };
  afternoon: { place?: string; desc?: string; mapQuery?: string; tag?: string };
  evening: { place?: string; desc?: string; mapQuery?: string; tag?: string };
};

type TravelPlan = {
  tripTitle: string;
  vibeDescription: string;
  itinerary: ItineraryDay[];
};

export async function generateTravelPlan(prevState: any, formData: FormData) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const destination = (formData.get('destination') as string) || 'Dein Zielort';
  const days = Math.min(7, Math.max(1, Number(formData.get('days') || 3)));
  const season = (formData.get('season') as string) || 'Sommer';
  const budget = (formData.get('budget') as string) || '€€';
  const companions = (formData.get('companions') as string) || 'Paar';
  const pace = Math.min(5, Math.max(1, Number(formData.get('pace') || 3)));
  const diet = (formData.get('diet') as string) || 'Alles';
  const extras = (formData.get('extras') as string) || '';

  const systemPrompt = `Du bist ein lokaler Insider. Erstelle einen Reiseplan für ${destination}.

LOGIK-PRIORITÄTEN:
1. Geographie: Der Plan muss laufbar/fahrbar sein. Keine Sprünge quer durch die Stadt.
2. User-Wünsche: ${extras || 'Keine speziellen Wünsche genannt'} <- DAS HAT VORRANG! Wenn der User 'Shisha' will, baue JEDEN Abend oder zumindest einmal prominent eine Top-Shisha-Lounge ein. Wenn er 'Fußball' will, finde das Stadion oder eine Sportsbar.
3. Varianz: Nenne nicht nur die Top-10 Touri-Spots. Streue Hidden Gems ein, die nur Locals kennen.

INPUT CONTEXT:
- Pace: ${pace} (Wenn 'Chillig': Max 1-2 Aktivitäten, lange Pausen. Wenn 'Power': Volles Programm).
- Diet: ${diet} (Restaurant-Tipps müssen passen!).

INPUT: ${days} Tage in ${destination}, Saison: ${season}, Budget: ${budget}, Reisende: ${companions}.

OUTPUT STRUKTUR (JSON):
{
  "tripTitle": "Titel des Trips",
  "vibeDescription": "Kurze Intro zum Vibe (z.B. 'Kulinarische Entdeckungstour').",
  "itinerary": [
    {
      "day": 1,
      "title": "Ankunft & Das Herz der Stadt",
      "morning": { "place": "Kolosseum", "desc": "Früh starten, Tickets vorab buchen.", "mapQuery": "Colosseum Rome" },
      "afternoon": { "place": "Trastevere", "desc": "Bummeln & kleine Läden entdecken.", "mapQuery": "Trastevere Rome" },
      "evening": { "place": "Ali Baba Shisha Lounge", "desc": "Wie gewünscht: Die beste Doppel-Apfel der Stadt.", "mapQuery": "Shisha Lounge Rome", "tag": "Dein Wunsch ✨" }
    }
  ]
}`;

  const userPrompt = `Ziel: ${destination}
Tage: ${days}
Saison: ${season}
Budget: ${budget}
Reisende: ${companions}
Pace: ${pace}
Ernährung: ${diet}
Extras: ${extras || 'Keine'}

Bitte erstelle den Reiseplan im JSON-Format.`;

  try {
    const response = await createChatCompletion(
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      },
      'travel',
      'Travel-Agent'
    );

    const content = response.choices[0].message.content;
    if (!content) {
      return { error: 'Keine Antwort von der KI erhalten.' };
    }

    let plan: TravelPlan;
    try {
      plan = JSON.parse(content) as TravelPlan;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return { error: 'Fehler beim Verarbeiten der Antwort. Bitte versuche es erneut.' };
    }

    if (!plan.tripTitle || !plan.itinerary) {
      return { error: 'Ungültiges Format. Bitte versuche es erneut.' };
    }

    const formattedPlan = `# ${plan.tripTitle}

${plan.vibeDescription}

${plan.itinerary
  .map((d) => {
    const lines = [
      `Tag ${d.day}: ${d.title}`,
      d.morning?.place ? `- Morgen: ${d.morning.place}` : '',
      d.afternoon?.place ? `- Nachmittag: ${d.afternoon.place}` : '',
      d.evening?.place ? `- Abend: ${d.evening.place}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  })
  .join('\n\n')}`;

    const userInput = `${days} Tage in ${destination} (${budget}, ${season}, Pace ${pace})${extras ? ` · Extras: ${extras}` : ''}`;
    await createHelperChat('travel', userInput, formattedPlan);

    return { result: JSON.stringify(plan) };
  } catch (error: any) {
    console.error('Travel generation error:', error);
    return { error: 'Fehler beim Generieren des Reiseplans. Bitte versuche es erneut.' };
  }
}
