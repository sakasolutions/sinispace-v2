'use server';

import { createChatCompletion } from '@/lib/openai-wrapper';
import { isUserPremium } from '@/lib/subscription';
import { createHelperChat } from '@/actions/chat-actions';

// --- HILFS-NACHRICHT FÜR FREE USER ---
const UPSELL_MESSAGE = `### 🔒 Premium Feature

Diese Funktion steht nur **Pro-Usern** zur Verfügung.
Upgrade deinen Account, um unbegrenzten Zugriff auf alle KI-Tools zu erhalten.

[👉 **Hier klicken zum Freischalten**](/settings)`;

type ChatOption = {
  tone: string;
  text: string;
};

type ChatCoachResponse = {
  options: ChatOption[];
};

// --- CHAT-COACH ---
export async function generateChatCoach(prevState: any, formData: FormData) {
  // 1. Premium-Check
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const situation = formData.get('situation') as string;
  const recipient = formData.get('recipient') as string;

  if (!situation || situation.trim().length === 0) {
    return { error: 'Bitte beschreibe die Situation.' };
  }

  if (!recipient || recipient.trim().length === 0) {
    return { error: 'Bitte gib an, an wen die Nachricht geht.' };
  }

  const systemPrompt = `Du bist ein Experte für soziale Dynamik und Kommunikation in Messengern (WhatsApp, Tinder, Instagram).

Der User beschreibt eine Situation. Generiere darauf 3 verschiedene Antwort-Optionen:

1. **'Diplomatisch 🤝'**: Höflich, entschärfend, verständnisvoll. Ideal für sensible Situationen, Konflikte oder wenn du professionell bleiben willst.

2. **'Locker 😎'**: Kurz, umgangssprachlich, 'cool', passende Emojis. Ideal für Freunde, Dating, lockere Situationen. Sei authentisch und nicht zu steif.

3. **'Klartext 🔥'**: Direkt, selbstbewusst, grenzsetzend (oder schlagfertig/flirty, je nach Kontext). Ideal wenn du klar kommunizieren willst oder selbstbewusst auftreten möchtest.

WICHTIG:
- Antworte NUR mit einem gültigen JSON-Objekt (kein Markdown, kein Text davor oder danach)
- Die Nachrichten sollen kurz sein (1-3 Sätze, maximal 100 Wörter pro Option)
- Nutze passende Emojis bei "Locker" und "Klartext" (aber sparsam, authentisch)
- Die Nachrichten müssen zur Situation passen und realistisch sein
- Antworte im JSON-Format:
{
  "options": [
    { "tone": "Diplomatisch 🤝", "text": "..." },
    { "tone": "Locker 😎", "text": "..." },
    { "tone": "Klartext 🔥", "text": "..." }
  ]
}`;

  const userPrompt = `Situation: ${situation}
Empfänger: ${recipient}

Generiere 3 verschiedene Antwort-Optionen für diese Situation.`;

  try {
    const response = await createChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }, // Zwingend JSON
      temperature: 0.9, // Kreativer für verschiedene Varianten
    }, 'tough-msg', 'Chat-Coach');

    const content = response.choices[0].message.content;
    if (!content) {
      return { error: 'Keine Antwort von der KI erhalten.' };
    }

    // Parse JSON
    let result: ChatCoachResponse;
    try {
      result = JSON.parse(content) as ChatCoachResponse;
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      return { error: 'Fehler beim Verarbeiten der Antwort. Bitte versuche es erneut.' };
    }

    // Validiere die Struktur
    if (!result.options || !Array.isArray(result.options) || result.options.length !== 3) {
      return { error: 'Ungültiges Format. Bitte versuche es erneut.' };
    }

    // Formatiere für Chat (alle 3 Optionen schön dargestellt)
    const formattedChat = result.options.map((opt, i) => 
      `## ${opt.tone}\n\n${opt.text}`
    ).join('\n\n---\n\n');

    // Speichere in Chat (optional, für spätere Bearbeitung)
    const userInput = `An: ${recipient}, Situation: ${situation.substring(0, 100)}${situation.length > 100 ? '...' : ''}`;
    await createHelperChat('chat-coach', userInput, formattedChat);

    // Gib das Ergebnis als JSON-String zurück (Frontend parsed es)
    return { result: JSON.stringify(result) };
  } catch (error: any) {
    console.error('Chat Coach generation error:', error);
    return { error: 'Fehler beim Generieren der Antworten. Bitte versuche es erneut.' };
  }
}
