'use server';

import { openai } from '@/lib/openai';
import { isUserPremium } from '@/lib/subscription';
import { createHelperChat } from '@/actions/chat-actions';

// --- HILFS-NACHRICHT FÜR FREE USER ---
const UPSELL_MESSAGE = `### 🔒 Premium Feature

Diese Funktion steht nur **Pro-Usern** zur Verfügung.
Upgrade deinen Account, um unbegrenzten Zugriff auf alle KI-Tools zu erhalten.

[👉 **Hier klicken zum Freischalten**](/settings)`;

// --- REZEPT-GENERATOR ---
export async function generateRecipe(prevState: any, formData: FormData) {
  // 1. Premium-Check
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const ingredients = formData.get('ingredients') as string;
  const preferences = formData.getAll('preferences') as string[];

  if (!ingredients || ingredients.trim().length === 0) {
    return { error: 'Bitte gib vorhandene Zutaten ein.' };
  }

  // Baue Preference-String für den Prompt
  let preferenceText = '';
  if (preferences.length > 0) {
    preferenceText = `\n\nBesondere Wünsche: ${preferences.join(', ')}`;
  }

  const systemPrompt = `Du bist ein 5-Sterne-Koch spezialisiert auf kreative Resteverwertung und gesunde Küche. Erstelle basierend auf den Zutaten EIN perfektes Rezept. Sei kreativ, aber realistisch.

WICHTIG: 
- Antworte NUR mit einem gültigen JSON-Objekt (kein Markdown, kein Text davor oder danach)
- Die JSON-Struktur muss exakt so sein:
{
  "title": "Rezept-Titel",
  "time": "XX Min",
  "difficulty": "Einfach" oder "Mittel" oder "Schwer",
  "calories": "XXX kcal",
  "protein": "XXg",
  "description": "Ein kurzer Teaser-Text (2 Sätze), warum das Gericht lecker ist.",
  "ingredients": ["Menge Zutat 1", "Menge Zutat 2", ...],
  "steps": ["Schritt 1...", "Schritt 2...", ...]
}

- Alle Werte müssen Strings sein (auch Zahlen in Anführungszeichen)
- "ingredients" und "steps" sind Arrays von Strings
- Die Nährwerte sollten realistisch sein (Kalorien pro Portion, Protein in Gramm)
- Wenn Zutaten keinen Sinn ergeben, erstelle trotzdem ein kreatives, machbares Rezept`;

  const userPrompt = `Zutaten im Kühlschrank: ${ingredients}${preferenceText}

Erstelle ein perfektes Rezept basierend auf diesen Zutaten.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }, // Zwingend JSON
      temperature: 0.8, // Etwas kreativer für Rezepte
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return { error: 'Keine Antwort von der KI erhalten.' };
    }

    // Parse JSON
    let recipe;
    try {
      recipe = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return { error: 'Fehler beim Verarbeiten der Antwort. Bitte versuche es erneut.' };
    }

    // Validiere die Struktur
    if (!recipe.title || !recipe.ingredients || !recipe.steps) {
      return { error: 'Ungültiges Rezept-Format. Bitte versuche es erneut.' };
    }

    // Speichere in Chat (optional, für spätere Bearbeitung)
    const userInput = `Zutaten: ${ingredients.substring(0, 100)}${ingredients.length > 100 ? '...' : ''}${preferences.length > 0 ? `, Präferenzen: ${preferences.join(', ')}` : ''}`;
    await createHelperChat('recipe', userInput, JSON.stringify(recipe, null, 2));

    // Gib das Rezept als JSON-String zurück (Frontend parsed es)
    return { result: JSON.stringify(recipe) };
  } catch (error: any) {
    console.error('Recipe generation error:', error);
    
    // Spezifische Fehlerbehandlung
    if (error.message?.includes('ingredients') || error.message?.includes('Zutaten')) {
      return { error: 'Die Zutaten ergeben kein sinnvolles Rezept. Versuche es mit anderen Zutaten.' };
    }
    
    return { error: 'Fehler beim Generieren des Rezepts. Bitte versuche es erneut.' };
  }
}
