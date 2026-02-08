'use server';

import { createChatCompletion } from '@/lib/openai-wrapper';
import { isUserPremium } from '@/lib/subscription';
import { createHelperChat } from '@/actions/chat-actions';
import { saveResult } from '@/actions/workspace-actions';

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

  const ingredients = (formData.get('ingredients') as string)?.trim() ?? '';
  const mealType = (formData.get('mealType') as string) || 'Hauptgericht';
  const servings = parseInt(formData.get('servings') as string) || 2;
  const filters = formData.getAll('filters') as string[];
  const shoppingMode = (formData.get('shoppingMode') as string) || 'strict';
  const workspaceId = formData.get('workspaceId') as string || undefined;

  const isInspiration = ingredients.length === 0;

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
  "recipeName": "Name des Gerichts",
  "stats": { "time": "z.B. 20 Min", "calories": "z.B. 450 kcal", "difficulty": "Einfach/Mittel/Schwer" },
  "ingredients": [ "2 große Tomaten", "150 g Feta-Käse" ],
  "shoppingList": [ "1 Packung Feta (ca. 150g)" ],
  "instructions": ["Schritt 1", "Schritt 2"],
  "chefTip": "Ein kurzer Profi-Tipp dazu",
  "categoryIcon": "pasta",
  "imageSearchQuery": "Chicken Curry"
}`;

  const imageSearchRule = `
- imageSearchQuery (String): Ein einfacher, generischer ENGLISCHER Suchbegriff für das Gericht, um ein hochwertiges Foto auf Unsplash zu finden. Kurz halten (2–3 Wörter). Beispiel: Statt "Spicy Low Carb Chicken Curry with Tofu" nur "Chicken Curry" oder "Tofu Curry".
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

  if (isInspiration) {
    systemPrompt = `Du bist ein 5-Sterne-Koch. Der User will eine ÜBERRASCHUNG: Er hat keine Zutaten angegeben (Inspirations-Modus).
Erstelle ein kreatives, leckeres Rezept für die Kategorie: '${mealType}'.${filterText ? ` Berücksichtige: ${filters.join(', ')}.` : ''}
Wähle selbst passende, gut erhältliche Zutaten. Das Gericht soll überraschen und begeistern.

Du berechnest exakt für ${servings} ${servings === 1 ? 'Person' : 'Personen'}. Präzise Mengenangaben.
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
    if (!recipe.recipeName || !recipe.ingredients || !recipe.instructions) {
      return { error: 'Ungültiges Rezept-Format. Bitte versuche es erneut.' };
    }

    // Unsplash: Foto laden (optional, Flow darf nicht abstürzen)
    const searchQuery = (recipe.imageSearchQuery || recipe.recipeName || '').toString().trim();
    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;
    console.log('🔍 AI Search Term:', recipe.imageSearchQuery ?? '(fallback)', '→ final query:', searchQuery || '(leer)');
    console.log('🔑 Unsplash Key present:', !!unsplashKey);
    if (unsplashKey && searchQuery) {
      try {
        const q = encodeURIComponent(searchQuery);
        const res = await fetch(
          `https://api.unsplash.com/search/photos?query=${q}&per_page=1&orientation=landscape&client_id=${unsplashKey}`,
          { cache: 'no-store' }
        );
        console.log('📡 Unsplash Status:', res.status, res.statusText);
        if (res.ok) {
          const data = await res.json();
          const first = data?.results?.[0];
          if (first?.urls?.regular) {
            recipe.imageUrl = first.urls.regular;
            recipe.imageCredit = first.user?.name ?? null;
          } else {
            recipe.imageUrl = null;
            recipe.imageCredit = null;
          }
        } else {
          recipe.imageUrl = null;
          recipe.imageCredit = null;
        }
      } catch (err) {
        console.error('❌ Unsplash Fetch Error:', err);
        recipe.imageUrl = null;
        recipe.imageCredit = null;
      }
    } else {
      recipe.imageUrl = null;
      recipe.imageCredit = null;
    }

    // Formatiere Rezept für Chat (schön lesbar, nicht als JSON)
    const formattedRecipe = `# ${recipe.recipeName}

**⏱ Zeit:** ${recipe.stats?.time || ''} | **Schwierigkeit:** ${recipe.stats?.difficulty || ''} | **🔥 Kalorien:** ${recipe.stats?.calories || ''}

## Zutaten

${recipe.ingredients.map((ing: string) => `- ${ing}`).join('\n')}

## Zubereitung

${recipe.instructions.map((step: string, i: number) => `${i + 1}. ${step}`).join('\n\n')}

💡 **Profi-Tipp:** ${recipe.chefTip || ''}`;

    const userInput = isInspiration
      ? `Inspiration · ${mealType}, ${servings} Pers.${filters.length > 0 ? ` · ${filters.join(', ')}` : ''}`
      : `Kategorie: ${mealType}, Personen: ${servings}, Zutaten: ${ingredients.substring(0, 100)}${ingredients.length > 100 ? '...' : ''}${filters.length > 0 ? `, Filter: ${filters.join(', ')}` : ''}`;
    await createHelperChat('recipe', userInput, formattedRecipe);

    // Result in Workspace speichern
    const saved = await saveResult(
      'recipe',
      'Gourmet-Planer',
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
