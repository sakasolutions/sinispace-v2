'use server';

import { createChatCompletion } from '@/lib/openai-wrapper';
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
  const mealType = (formData.get('mealType') as string) || 'Hauptgericht';
  const servings = parseInt(formData.get('servings') as string) || 2;
  const filters = formData.getAll('filters') as string[];
  const shoppingMode = (formData.get('shoppingMode') as string) || 'strict';

  if (!ingredients || ingredients.trim().length === 0) {
    return { error: 'Bitte gib vorhandene Zutaten ein.' };
  }

  if (servings < 1 || servings > 20) {
    return { error: 'Die Anzahl der Personen muss zwischen 1 und 20 liegen.' };
  }

  // Baue Filter-String für den Prompt
  let filterText = '';
  if (filters.length > 0) {
    filterText = `\n\nBerücksichtige diese Filter: ${filters.join(', ')}`;
  }

  // Spezielle Instruktionen für Drinks/Shakes
  let categoryInstruction = '';
  if (mealType === 'Drink / Shake') {
    categoryInstruction = `\n\nWICHTIG für Drinks/Shakes:
- Die Zubereitungszeit sollte kurz sein (meist 5-10 Minuten)
- Die Schwierigkeit sollte "Einfach" sein
- Die Schritte sollten einfach und schnell umsetzbar sein`;
  }

  const systemPrompt = `Du bist ein 5-Sterne-Koch. Erstelle ein kreatives, leckeres Rezept für die Kategorie: '${mealType}'. Nutze primär diese Zutaten: {ingredients}. Berücksichtige diese Filter: {filters}.

Modus: ${shoppingMode}
WICHTIG:
- Wenn Modus "strict": Nutze NUR die genannten Zutaten + Standard-Basics (Öl, Salz, Pfeffer, Wasser). Erfinde keine neuen Hauptzutaten dazu.
- Wenn Modus "shopping": Nutze die Zutaten als Basis. Füge fehlende Zutaten (Gemüse, Kräuter, Beilagen) hinzu, um das Gericht perfekt zu machen.

Antworte NUR mit validem JSON in diesem Format:
{
  "recipeName": "Name des Gerichts",
  "description": "Kurze Beschreibung",
  "fullIngredients": ["Menge Zutat 1", "Menge Zutat 2"],
  "missingIngredients": ["Nur das was eingekauft werden muss"],
  "instructions": ["Schritt 1", "Schritt 2"],
  "time": "z.B. 20 Min",
  "difficulty": "Einfach/Mittel/Schwer",
  "calories": "z.B. 450 kcal",
  "protein": "z.B. 25g",
  "tip": "Ein kurzer Profi-Tipp dazu"
}

WICHTIG:
- Antworte NUR mit einem gültigen JSON-Objekt (kein Markdown, kein Text davor oder danach)
- Alle Werte müssen Strings sein (auch Zahlen in Anführungszeichen)
- "fullIngredients", "missingIngredients" und "instructions" sind Arrays von Strings
- Die Nährwerte sollten realistisch sein (Kalorien pro Portion, Protein in Gramm)
- Das Rezept MUSS zur Kategorie '${mealType}' passen (z.B. bei "Soße / Dip" keine Hauptgerichte erstellen)
- Erstelle das Rezept exakt für ${servings} ${servings === 1 ? 'Person' : 'Personen'}. Berechne alle Mengenangaben (Gramm, Stückzahl, etc.) passend für diese Anzahl. Wenn für 2 Personen normalerweise "4 Eier" verwendet werden, dann sind es für ${servings} Personen entsprechend mehr/f weniger.
- Wenn Zutaten keinen Sinn ergeben, erstelle trotzdem ein kreatives, machbares Rezept${categoryInstruction}`;

  const userPrompt = `Kategorie: ${mealType}\nAnzahl Personen: ${servings}\nZutaten im Kühlschrank: ${ingredients}\nModus: ${shoppingMode}${filterText}

Erstelle ein perfektes Rezept für die Kategorie '${mealType}' für genau ${servings} ${servings === 1 ? 'Person' : 'Personen'} basierend auf diesen Zutaten.`;

  try {
    const response = await createChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }, // Zwingend JSON
      temperature: 0.8, // Etwas kreativer für Rezepte
    }, 'recipe', 'Gourmet-Planer');

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
    if (!recipe.recipeName || !recipe.fullIngredients || !recipe.instructions) {
      return { error: 'Ungültiges Rezept-Format. Bitte versuche es erneut.' };
    }

    // Formatiere Rezept für Chat (schön lesbar, nicht als JSON)
    const formattedRecipe = `# ${recipe.recipeName}

**⏱ Zeit:** ${recipe.time} | **Schwierigkeit:** ${recipe.difficulty} | **🔥 Kalorien:** ${recipe.calories} | **💪 Protein:** ${recipe.protein}

## Zutaten

${recipe.fullIngredients.map((ing: string) => `- ${ing}`).join('\n')}

## Zubereitung

${recipe.instructions.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n\n')}

💡 **Profi-Tipp:** ${recipe.tip}`;

    // Speichere in Chat (optional, für spätere Bearbeitung)
    const userInput = `Kategorie: ${mealType}, Personen: ${servings}, Zutaten: ${ingredients.substring(0, 100)}${ingredients.length > 100 ? '...' : ''}${filters.length > 0 ? `, Filter: ${filters.join(', ')}` : ''}`;
    await createHelperChat('recipe', userInput, formattedRecipe);

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
