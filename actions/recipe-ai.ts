'use server';

import { createChatCompletion } from '@/lib/openai-wrapper';
import { isUserPremium } from '@/lib/subscription';
import { createHelperChat } from '@/actions/chat-actions';
import { saveResult } from '@/actions/workspace-actions';
import { fetchUnsplashImageForRecipe, enhanceUnsplashSearchQuery } from '@/lib/unsplash-recipe-image';

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

  const magicPrompt = (formData.get('magicPrompt') as string)?.trim() ?? '';
  const ingredients = (formData.get('ingredients') as string)?.trim() ?? '';
  const mealTypeRaw = (formData.get('mealType') as string) || 'Hauptgericht';
  const mealType = magicPrompt ? 'Wunschgericht' : mealTypeRaw;
  const servings = magicPrompt ? (parseInt(formData.get('servings') as string) || 2) : (parseInt(formData.get('servings') as string) || 2);
  const filters = magicPrompt ? [] : (formData.getAll('filters') as string[]);
  const shoppingMode = (formData.get('shoppingMode') as string) || 'strict';
  const workspaceId = formData.get('workspaceId') as string || undefined;

  const isInspiration = magicPrompt ? false : ingredients.length === 0;

  if (servings < 1 || servings > 20) {
    return { error: 'Die Anzahl der Personen muss zwischen 1 und 20 liegen.' };
  }

  let filterText = '';
  if (filters.length > 0) {
    filterText = `\n\nBerücksichtige diese Filter: ${filters.join(', ')}`;
  }

  let categoryInstruction = '';
  if (mealType === 'Drink / Shake') {
    categoryInstruction = `\n\nWICHTIG für Drinks/Shakes:
- Die Zubereitungszeit sollte kurz sein (meist 5-10 Minuten)
- Die Schwierigkeit sollte "Einfach" sein
- Die Schritte sollten einfach und schnell umsetzbar sein`;
  }

  const jsonFormat = `{
  "recipeName": "Kreativer Name des Gerichts",
  "stats": { 
    "time": "20 Min", 
    "calories": 450, 
    "protein": 35, 
    "carbs": 40, 
    "fat": 15, 
    "difficulty": "Einfach/Mittel/Schwer" 
  },
  "ingredients": [ "Menge Einheit Name (NUR Zutaten, die der User bereits hat oder absolute Basics)" ],
  "shoppingList": [ "Menge Einheit Name (NUR fehlende Zutaten, die der User noch einkaufen muss)" ],
  "instructions": ["Schritt 1", "Schritt 2"],
  "chefTip": "Situativer Profi-Tipp",
  "categoryIcon": "pasta",
  "imageSearchQuery": "Chicken Curry"
}`;

  const imageSearchRule = `
- imageSearchQuery (String): Kurzer, präziser ENGLISCHER Suchbegriff für Unsplash (Food-Fotografie).
  Übersetze deutsche Gerichtsnamen ins Englische (z. B. "Gefüllte Paprika mit Quinoa" → "Stuffed bell peppers quinoa").
  ABSOLUTE REGELN FÜR DIE BILDSUCHE:
  1. Nur Englisch. Keine deutschen Wörter im String.
  2. Fokus auf die ART des Gerichts (stuffed peppers, pasta bowl, curry, sandwich), nicht auf isolierte Zutaten.
  3. Bei "Hähnchen Döner" o. Ä. nutze z. B. "Doner kebab", "shawarma plate" – nicht nur "chicken".
  4. 3–6 Wörter: Gericht + Kontext (z. B. "Stuffed bell peppers food" oder "Creamy pasta bowl"). KEINE Suffixe wie "food photography" anhängen – die fügt das Backend automatisch hinzu.
`;

  const categoryIconRules = `
- categoryIcon (String, genau einer der folgenden Werte): Wähle das EINZIGE Icon, das das Gericht am besten repräsentiert.
  Erlaubte Werte: "pasta" (Nudeln, Lasagne, Teigwaren), "pizza" (Pizza, Flammkuchen), "burger" (Burger, Sandwiches, Wraps), "soup" (Suppen, Eintöpfe, Curry, Bowls), "salad" (Salate, kalte Bowls), "vegetable" (gefülltes Gemüse, Aufläufe ohne Fleisch), "meat" (Fleisch-Hauptgerichte), "chicken" (Geflügel), "fish" (Fisch, Meeresfrüchte), "egg" (Omelett, Rührei – NUR wenn Ei die Hauptkomponente ist!), "dessert" (Süßes), "breakfast" (Porridge, Müsli).
  Regel: Wähle das eine repräsentativste Icon. Beispiele: Bei "Eierpasta" wähle "pasta", NICHT "egg". Bei "Hähnchensalat" wähle "salad". Bei "Gefüllte Paprika" wähle "vegetable".
`;

  const ingredientsRules = `
- Zutaten-Array (ingredients): Jeder Eintrag ist EIN String im Format "Menge Einheit? Name".
- STRICT UNIT HANDLING: Do NOT extract units from adjectives like "große", "kleine", "halbe". If the item is countable (e.g. Eier, Zwiebeln, Äpfel, Tomaten), the entry must have NO unit – only number and full name including the adjective.
  Falsch: "1 g roße Zwiebel" oder Menge 1, Einheit g, Name "roße Zwiebel".
  Richtig: "1 große Zwiebel" (Stückzahl ohne Einheit, Adjektiv im Namen).
- UNIT CONSISTENCY: Use only these standard abbreviations: g, kg, ml, l, EL, TL, Prise. Never write "Gramm" or "Milliliter" in full. For weight/volume use a space between number and unit, e.g. "150 g", "2 EL".
`;

  let systemPrompt: string;
  let userPrompt: string;

  if (magicPrompt) {
    systemPrompt = `Du bist ein 5-Sterne-Koch. Der User hat einen freien Wunsch geäußert (Magic Input).
Erstelle exakt dafür ein passendes, kreatives Rezept. Das Gericht soll den Wunsch treffend umsetzen.

Du berechnest exakt für ${servings} ${servings === 1 ? 'Person' : 'Personen'}. Präzise Mengenangaben.

INTELLIGENZ- & FILTER-REGELN:
- Makros & Kalorien: Die Werte in "stats" müssen mathematisch realistisch sein.
- SmartCart-Trennung (ABSOLUT STRIKT):
  Regel 1: "ingredients" (Vorhanden) darf AUSSCHLIESSLICH absolute Gewürz-Basics enthalten (Salz, Pfeffer, Öl, Wasser).
  Regel 2: "shoppingList" (Fehlt noch) MUSS ALLE echten Zutaten für dieses Gericht enthalten (Fleisch, Gemüse, Kohlenhydrate, Milchprodukte etc.).
  Regel 3: KEINE DOPPELUNGEN! Eine Zutat darf NIEMALS in "ingredients" und "shoppingList" gleichzeitig vorkommen.
- Situativer Chef-Tipp ("chefTip"): Ein brillanter kulinarischer Kniff zu diesem Gericht.

Antworte NUR mit validem JSON: ${jsonFormat}
${imageSearchRule}
${categoryIconRules}
${ingredientsRules}`;
    userPrompt = `Wunsch des Users: "${magicPrompt}". Erstelle exakt dafür ein passendes, kreatives Rezept. Trenne die Zutaten strikt in 'ingredients' (nur absolute Basics wie Salz, Öl) und 'shoppingList' (alle echten Zutaten für dieses Gericht).`;
  } else if (isInspiration) {
    systemPrompt = `Du bist ein 5-Sterne-Koch. Der User will eine ÜBERRASCHUNG: Er hat keine Zutaten angegeben (Inspirations-Modus).
Erstelle ein kreatives, leckeres Rezept für die Kategorie: '${mealType}'.${filterText ? ` Berücksichtige: ${filters.join(', ')}.` : ''}
Wähle selbst passende, gut erhältliche Zutaten. Das Gericht soll überraschen und begeistern.

Du berechnest exakt für ${servings} ${servings === 1 ? 'Person' : 'Personen'}. Präzise Mengenangaben.

INTELLIGENZ- & FILTER-REGELN:
- Makros & Kalorien: Die Werte in "stats" müssen mathematisch realistisch sein. Wenn der Filter "High Protein" aktiv ist, zwinge das Rezept auf >30g Protein pro Portion. Bei "Unter 600 kcal" oder "Low Carb" passe die Zutaten strikt an diese Grenzen an.
- SmartCart-Trennung (ABSOLUT STRIKT):
  Regel 1: "ingredients" (Vorhanden) darf AUSSCHLIESSLICH Zutaten enthalten, die der User explizit im Prompt nennt, PLUS absolute Gewürz-Basics (Salz, Pfeffer, Öl, Wasser). Wenn der User KEINE Zutaten nennt (Inspirations-Modus), dürfen hier NUR diese Basics stehen!
  Regel 2: "shoppingList" (Fehlt noch) MUSS zwingend ALLE Hauptzutaten (Fleisch, Gemüse, Kohlenhydrate, Milchprodukte etc.) enthalten, die der User NICHT genannt hat. Im Inspirations-Modus landen also fast alle Zutaten hier!
  Regel 3: KEINE DOPPELUNGEN! Eine Zutat darf NIEMALS in "ingredients" und gleichzeitig in "shoppingList" auftauchen. Prüfe das JSON vor der Ausgabe genau!
- Situativer Chef-Tipp ("chefTip"): Passe den Tipp an die Filter an. Bei "Date Night": Empfiehl eine Weinbegleitung oder edles Anrichten. Bei "Familienfreundlich": Tipp zum Verstecken von Gemüse. Bei "Schnell": Tipp, wie man noch mehr Zeit spart. Sonst: Ein brillanter kulinarischer Kniff.

Antworte NUR mit validem JSON: ${jsonFormat}
${imageSearchRule}
${categoryIconRules}
${ingredientsRules}
- "shoppingList" kann leer sein [] (alles wird als Zutatenliste betrachtet).
- Rezept MUSS zur Kategorie '${mealType}' passen.${categoryInstruction}`;
    userPrompt = `Inspirations-Modus: Überrasch mich!\nKategorie: ${mealType}\nPersonen: ${servings}${filterText}\n\nErstelle ein überraschendes, kreatives Rezept.`;
  } else {
    systemPrompt = `Du bist ein 5-Sterne-Koch. Erstelle ein kreatives, leckeres Rezept für die Kategorie: '${mealType}'. Nutze primär diese Zutaten: ${ingredients}.${filterText ? ` Berücksichtige: ${filters.join(', ')}.` : ''}

Modus: ${shoppingMode}
- "strict": Nutze NUR die genannten Zutaten + Standard-Basics (Öl, Salz, Pfeffer, Wasser). Keine neuen Hauptzutaten.
- "shopping": Nutze die Zutaten als Basis. Füge fehlende Zutaten (Gemüse, Kräuter, Beilagen) hinzu.

Rezept exakt für ${servings} ${servings === 1 ? 'Person' : 'Personen'}. Präzise Mengenangaben.

INTELLIGENZ- & FILTER-REGELN:
- Makros & Kalorien: Die Werte in "stats" müssen mathematisch realistisch sein. Wenn der Filter "High Protein" aktiv ist, zwinge das Rezept auf >30g Protein pro Portion. Bei "Unter 600 kcal" oder "Low Carb" passe die Zutaten strikt an diese Grenzen an.
- SmartCart-Trennung (ABSOLUT STRIKT):
  Regel 1: "ingredients" (Vorhanden) darf AUSSCHLIESSLICH Zutaten enthalten, die der User explizit im Prompt nennt, PLUS absolute Gewürz-Basics (Salz, Pfeffer, Öl, Wasser). Wenn der User KEINE Zutaten nennt (Inspirations-Modus), dürfen hier NUR diese Basics stehen!
  Regel 2: "shoppingList" (Fehlt noch) MUSS zwingend ALLE Hauptzutaten (Fleisch, Gemüse, Kohlenhydrate, Milchprodukte etc.) enthalten, die der User NICHT genannt hat. Im Inspirations-Modus landen also fast alle Zutaten hier!
  Regel 3: KEINE DOPPELUNGEN! Eine Zutat darf NIEMALS in "ingredients" und gleichzeitig in "shoppingList" auftauchen. Prüfe das JSON vor der Ausgabe genau!
- Situativer Chef-Tipp ("chefTip"): Passe den Tipp an die Filter an. Bei "Date Night": Empfiehl eine Weinbegleitung oder edles Anrichten. Bei "Familienfreundlich": Tipp zum Verstecken von Gemüse. Bei "Schnell": Tipp, wie man noch mehr Zeit spart. Sonst: Ein brillanter kulinarischer Kniff.

Antworte NUR mit validem JSON: ${jsonFormat}
${imageSearchRule}
${categoryIconRules}
${ingredientsRules}
- Rezept MUSS zur Kategorie '${mealType}' passen. Bei unsinnigen Zutaten trotzdem kreatives, machbares Rezept.${categoryInstruction}`;
    userPrompt = `Kategorie: ${mealType}\nPersonen: ${servings}\nZutaten: ${ingredients}\nModus: ${shoppingMode}${filterText}\n\nErstelle ein perfektes Rezept basierend auf diesen Zutaten.`;
  }

  try {
    const response = await createChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }, // Zwingend JSON
      temperature: 0.8, // Etwas kreativer für Rezepte
    }, 'recipe', 'CookIQ');

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
    if (!recipe.recipeName || !recipe.ingredients || !recipe.instructions) {
      return { error: 'Ungültiges Rezept-Format. Bitte versuche es erneut.' };
    }

    // Unsplash: Foto laden (optional; Query wird mit Food-Fotografie-Suffix verstärkt)
    const searchQuery = (recipe.imageSearchQuery || recipe.recipeName || '').toString().trim();
    console.log(
      '🔍 AI Search Term:',
      recipe.imageSearchQuery ?? '(fallback)',
      '→ enhanced:',
      searchQuery ? enhanceUnsplashSearchQuery(searchQuery) : '(leer)'
    );
    const { imageUrl, imageCredit } = await fetchUnsplashImageForRecipe(searchQuery);
    recipe.imageUrl = imageUrl;
    recipe.imageCredit = imageCredit;

    // Formatiere Rezept für Chat (schön lesbar, nicht als JSON)
    const formattedRecipe = `# ${recipe.recipeName}

**⏱ Zeit:** ${recipe.stats?.time || ''} | **Schwierigkeit:** ${recipe.stats?.difficulty || ''} | **🔥 Kalorien:** ${typeof recipe.stats?.calories === 'number' ? `${recipe.stats.calories} kcal` : (recipe.stats?.calories || '')}${recipe.stats?.protein != null ? ` | **Protein:** ${recipe.stats.protein}g` : ''}${recipe.stats?.carbs != null ? ` | **Kohlenhydrate:** ${recipe.stats.carbs}g` : ''}${recipe.stats?.fat != null ? ` | **Fett:** ${recipe.stats.fat}g` : ''}

## Zutaten

${recipe.ingredients.map((ing: string) => `- ${ing}`).join('\n')}

## Zubereitung

${recipe.instructions.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n\n')}

💡 **Profi-Tipp:** ${recipe.chefTip || ''}`;

    const userInput = magicPrompt
      ? `Wunschgericht: ${magicPrompt}`
      : isInspiration
        ? `Inspiration · ${mealType}, ${servings} Pers.${filters.length > 0 ? ` · ${filters.join(', ')}` : ''}`
        : `Kategorie: ${mealType}, Personen: ${servings}, Zutaten: ${ingredients.substring(0, 100)}${ingredients.length > 100 ? '...' : ''}${filters.length > 0 ? `, Filter: ${filters.join(', ')}` : ''}`;
    await createHelperChat('recipe', userInput, formattedRecipe);

    // Result in Workspace speichern
    const saved = await saveResult(
      'recipe',
      'CookIQ',
      JSON.stringify(recipe),
      workspaceId,
      recipe.recipeName,
      JSON.stringify({ mealType, servings, shoppingMode, filters })
    );

    // Rezept + ID für sofortigen Redirect (ohne Erfolgs-Modal)
    const resultId = saved?.result?.id ?? null;
    return { result: JSON.stringify(recipe), resultId };
  } catch (error: any) {
    console.error('Recipe generation error:', error);
    
    // Spezifische Fehlerbehandlung
    if (error.message?.includes('ingredients') || error.message?.includes('Zutaten')) {
      return { error: 'Die Zutaten ergeben kein sinnvolles Rezept. Versuche es mit anderen Zutaten.' };
    }
    
    return { error: 'Fehler beim Generieren des Rezepts. Bitte versuche es erneut.' };
  }
}
