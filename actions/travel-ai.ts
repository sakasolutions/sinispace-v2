'use server';

import { createChatCompletion } from '@/lib/openai-wrapper';
import { isUserPremium } from '@/lib/subscription';
import { createHelperChat } from '@/actions/chat-actions';

const UPSELL_MESSAGE = `### 🔒 Premium Feature

Diese Funktion steht nur **Pro-Usern** zur Verfügung.
Upgrade deinen Account, um unbegrenzten Zugriff auf alle KI-Tools zu erhalten.

[👉 **Hier klicken zum Freischalten**](/settings)`;

type ItinerarySlot = {
  activity?: string;
  logistics?: string;
  mapsQuery?: string;
  name?: string;
  description?: string;
  vibe?: string;
};

type ItineraryDay = {
  day: number;
  areaFocus: string;
  morning: ItinerarySlot;
  lunch: ItinerarySlot;
  afternoon: ItinerarySlot;
  dinner: ItinerarySlot;
  evening: ItinerarySlot;
};

type TravelPlan = {
  tripTitle: string;
  vibeDescription: string;
  generalTips: string[];
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

  const systemPrompt = `Du bist ein lokaler Reise-Experte und Logistik-Genie. Erstelle einen Reiseplan, der GEOGRAPHISCH Sinn macht (kein Zick-Zack durch die Stadt).

INPUT CONTEXT:
- Pace: ${pace} (Wenn 'Chillig': Max 1-2 Aktivitäten, lange Pausen. Wenn 'Power': Volles Programm).
- Diet: ${diet} (Restaurant-Tipps müssen passen!).

INPUT: ${days} Tage in ${destination}, Saison: ${season}, Budget: ${budget}, Reisende: ${companions}.

OUTPUT JSON STRUKTUR:
{
  "tripTitle": "Titel des Trips",
  "vibeDescription": "Kurze Intro zum Vibe (z.B. 'Kulinarische Entdeckungstour').",
  "generalTips": ["Packliste Tipp 1", "Betrugsmasche X vermeiden"],
  "itinerary": [
    {
      "day": 1,
      "areaFocus": "Das antike Zentrum",
      "morning": {
         "activity": "Kolosseum & Palatin",
         "logistics": "Metro B bis 'Colosseo'. Tickets online buchen!",
         "mapsQuery": "Colosseum Rome"
      },
      "lunch": {
         "name": "Trattoria Geheimtipp",
         "description": "Beste Carbonara, keine Touristen.",
         "mapsQuery": "Trattoria X Rome"
      },
      "afternoon": {
         "activity": "Forum Romanum & Kapitol",
         "logistics": "Zu Fuß 12 Min.",
         "mapsQuery": "Roman Forum Rome"
      },
      "dinner": {
         "name": "Osteria Locale",
         "description": "Regionale Küche, ${diet}-Optionen vorhanden.",
         "mapsQuery": "Osteria Rome"
      },
      "evening": {
         "activity": "Spaziergang am Tiber",
         "vibe": "Romantisch",
         "mapsQuery": "Tiber River Rome"
      }
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

    if (!plan.tripTitle || !plan.itinerary || !plan.generalTips) {
      return { error: 'Ungültiges Format. Bitte versuche es erneut.' };
    }

    const formattedPlan = `# ${plan.tripTitle}

${plan.vibeDescription}

${plan.itinerary
  .map((d) => {
    const lines = [
      `Tag ${d.day}: ${d.areaFocus}`,
      d.morning?.activity ? `- Morgen: ${d.morning.activity}` : '',
      d.lunch?.name ? `- Mittag: ${d.lunch.name}` : '',
      d.afternoon?.activity ? `- Nachmittag: ${d.afternoon.activity}` : '',
      d.dinner?.name ? `- Abendessen: ${d.dinner.name}` : '',
      d.evening?.activity ? `- Abend: ${d.evening.activity}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  })
  .join('\n\n')}

Tipps:
${plan.generalTips.map((t) => `- ${t}`).join('\n')}`;

    const userInput = `${days} Tage in ${destination} (${budget}, ${season}, Pace ${pace})`;
    await createHelperChat('travel', userInput, formattedPlan);

    return { result: JSON.stringify(plan) };
  } catch (error: any) {
    console.error('Travel generation error:', error);
    return { error: 'Fehler beim Generieren des Reiseplans. Bitte versuche es erneut.' };
  }
}
