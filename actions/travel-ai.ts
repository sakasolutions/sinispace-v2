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

export async function generateTravelPlan(prevState: any, formData: FormData) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const destination = (formData.get('destination') as string) || 'Dein Zielort';
  const days = Math.min(7, Math.max(1, Number(formData.get('days') || 3)));
  const budget = (formData.get('budget') as string) || 'Mittel';
  const vibe = (formData.getAll('vibe') as string[]) || [];
  const companions = (formData.get('companions') as string) || 'Solo';

  const vibeText = vibe.length > 0 ? vibe.join(', ') : 'Ausgewogen';

  const systemPrompt = `Du bist ein lokaler Reiseführer. Erstelle einen Tag-für-Tag Reiseplan.
Berücksichtige logische Wege (kein Hin-und-Her in der Stadt).

INPUT: ${days} Tage in ${destination}, Budget: ${budget}, Vibe: ${vibeText}, Reisende: ${companions}.

OUTPUT JSON STRUKTUR:
{
  "title": "Romantisches Wochenende in Rom",
  "summary": "Ein Mix aus klassischer Kultur und versteckten Food-Spots.",
  "itinerary": [
    {
      "day": 1,
      "focus": "Das antike Rom",
      "morning": "Kolosseum (Ticket vorbuchen!)",
      "afternoon": "Forum Romanum & Picknick",
      "evening": "Abendessen im Viertel Monti (Trattoria X)",
      "hiddenGem": "Ein geheimer Aussichtspunkt..."
    }
  ],
  "packingTip": "Bequeme Schuhe sind Pflicht wegen Kopfsteinpflaster!",
  "localDish": "Probier unbedingt Carbonara."
}`;

  const userPrompt = `Ziel: ${destination}
Tage: ${days}
Budget: ${budget}
Vibe: ${vibeText}
Reisende: ${companions}

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

    if (!plan.title || !plan.itinerary || !plan.packingTip) {
      return { error: 'Ungültiges Format. Bitte versuche es erneut.' };
    }

    const formattedPlan = `# ${plan.title}

${plan.summary}

${plan.itinerary
  .map(
    (d) =>
      `Tag ${d.day}: ${d.focus}\n- Morgen: ${d.morning}\n- Nachmittag: ${d.afternoon}\n- Abend: ${d.evening}\n- Hidden Gem: ${d.hiddenGem}`
  )
  .join('\n\n')}

Packing-Tipp: ${plan.packingTip}
Local Dish: ${plan.localDish}`;

    const userInput = `${days} Tage in ${destination} (${budget}, ${vibeText})`;
    await createHelperChat('travel', userInput, formattedPlan);

    return { result: JSON.stringify(plan) };
  } catch (error: any) {
    console.error('Travel generation error:', error);
    return { error: 'Fehler beim Generieren des Reiseplans. Bitte versuche es erneut.' };
  }
}
