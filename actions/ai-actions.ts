'use server';

import { openai } from '@/lib/openai';
import { auth } from '@/auth';
import { isUserPremium } from '@/lib/subscription';
import { createHelperChat } from '@/actions/chat-actions';

// --- HILFS-NACHRICHT FÜR FREE USER ---
// Das hier sieht der User statt einer Fehlermeldung
const UPSELL_MESSAGE = `### 🔒 Premium Feature

Diese Funktion steht nur **Pro-Usern** zur Verfügung.
Upgrade deinen Account, um unbegrenzten Zugriff auf alle KI-Tools zu erhalten.

[👉 **Hier klicken zum Freischalten**](/settings)`;

// --- E-MAIL ---
export async function generateEmail(prevState: any, formData: FormData) {
  // 1. Check
  const isAllowed = await isUserPremium();
  // TRICK: Wir geben es als "result" zurück, damit es schön angezeigt wird (inkl. Link)
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const topic = formData.get('topic') as string;
  const recipient = formData.get('recipient') as string;
  const tone = formData.get('tone') as string;

  if (!topic) return { error: 'Bitte gib ein Thema ein.' };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Du bist ein E-Mail Profi. Antworte nur mit dem Text.' },
        { role: 'user', content: `Empfänger: ${recipient}, Ton: ${tone}, Inhalt: ${topic}` }
      ],
    });
    return { result: response.choices[0].message.content };
  } catch (error) {
    return { error: 'KI Fehler.' };
  }
}

// --- ZUSAMMENFASSUNG ---
export async function generateSummary(prevState: any, formData: FormData) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const text = formData.get('text') as string;
  if (!text) return { error: 'Kein Text.' };

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'Fasse zusammen in Bulletpoints (Markdown).' },
        { role: 'user', content: text }
      ],
    });
    return { result: response.choices[0].message.content };
  } catch (error) {
    return { error: 'KI Fehler.' };
  }
}

// --- EXCEL ---
export async function generateExcel(prevState: any, formData: FormData) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const problem = formData.get('problem') as string;
  const platform = formData.get('platform') as string;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: `Excel Experte für ${platform}. Nur Formel + kurze Erklärung.` },
        { role: 'user', content: problem }
      ],
    });
    return { result: response.choices[0].message.content };
  } catch (error) {
    return { error: 'KI Fehler.' };
  }
}

// --- E-MAIL MIT CHAT-SPEICHERUNG ---
export async function generateEmailWithChat(prevState: any, formData: FormData) {
  const result = await generateEmail(prevState, formData);
  
  // Wenn erfolgreich, Chat in DB speichern
  if (result?.result && !result.error) {
    const recipient = formData.get('recipient') as string || 'Unbekannt';
    const tone = formData.get('tone') as string || 'Professionell';
    const topic = formData.get('topic') as string || '';
    
    const userInput = `Empfänger: ${recipient}, Ton: ${tone}, Inhalt: ${topic}`;
    
    await createHelperChat('email', userInput, result.result);
  }
  
  return result;
}

// --- EXCEL MIT CHAT-SPEICHERUNG ---
export async function generateExcelWithChat(prevState: any, formData: FormData) {
  const result = await generateExcel(prevState, formData);
  
  // Wenn erfolgreich, Chat in DB speichern
  if (result?.result && !result.error) {
    const platform = formData.get('platform') as string || 'Microsoft Excel';
    const problem = formData.get('problem') as string || '';
    
    const userInput = `Programm: ${platform}, Problem: ${problem}`;
    
    await createHelperChat('excel', userInput, result.result);
  }
  
  return result;
}

// --- SUMMARY MIT CHAT-SPEICHERUNG ---
export async function generateSummaryWithChat(prevState: any, formData: FormData) {
  const result = await generateSummary(prevState, formData);
  
  // Wenn erfolgreich, Chat in DB speichern
  if (result?.result && !result.error) {
    const text = formData.get('text') as string || '';
    const userInput = text.slice(0, 500); // Erste 500 Zeichen als Input
    
    await createHelperChat('summarize', userInput, result.result);
  }
  
  return result;
}

// --- CHAT ---
export async function chatWithAI(
  messages: { role: string; content: string }[], 
  fileIds?: string[] // Optional: OpenAI File IDs für hochgeladene Dokumente
) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) {
    // Im Chat ist es besonders cool: Die KI antwortet mit der Upsell-Nachricht
    return { result: UPSELL_MESSAGE };
  }

  try {
    // Wenn File-IDs vorhanden sind, nutze Assistants API mit File Search
    if (fileIds && fileIds.length > 0) {
      // Erstelle Vector Store mit den hochgeladenen Dateien
      const vectorStore = await openai.beta.vectorStores.create({
        name: `Chat-${Date.now()}`,
        file_ids: fileIds,
      });

      // Warte bis Vector Store bereit ist
      let vectorStoreStatus = await openai.beta.vectorStores.retrieve(vectorStore.id);
      let attempts = 0;
      while (vectorStoreStatus.status === 'in_progress' && attempts < 30) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        vectorStoreStatus = await openai.beta.vectorStores.retrieve(vectorStore.id);
        attempts++;
      }

      // Erstelle Assistant mit File Search
      const assistant = await openai.beta.assistants.create({
        name: 'Sinispace Chat',
        model: 'gpt-4o',
        instructions: 'Du bist Sinispace, ein warmer, empathischer und hochintelligenter KI-Begleiter. Nutze Markdown, Tabellen und Emojis. Sei hilfreich. Du kannst Bilder sehen und analysieren, sowie Dokumente lesen.',
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStore.id],
          },
        },
      });

      // Erstelle Thread mit Messages
      const thread = await openai.beta.threads.create({
        messages: messages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      });

      // Starte Run
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
      });

      // Warte auf Completion
      let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts = 0;
      while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < 60) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        attempts++;
      }

      if (runStatus.status === 'completed') {
        const threadMessages = await openai.beta.threads.messages.list(thread.id);
        const assistantMessage = threadMessages.data.find(m => m.role === 'assistant');
        if (assistantMessage && assistantMessage.content[0].type === 'text') {
          return { result: assistantMessage.content[0].text.value };
        }
      }

      // Cleanup: Assistant und Vector Store löschen (optional, kann auch persistent bleiben)
      try {
        await openai.beta.assistants.del(assistant.id);
        await openai.beta.vectorStores.del(vectorStore.id);
      } catch (cleanupError) {
        // Ignoriere Cleanup-Fehler
      }

      if (runStatus.status === 'failed') {
        return { error: runStatus.last_error?.message || 'Fehler beim Verarbeiten der Dateien.' };
      }
    }

    // Normale Chat-API ohne Dateien
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { 
          role: 'system', 
          content: 'Du bist Sinispace, ein warmer, empathischer und hochintelligenter KI-Begleiter. Nutze Markdown, Tabellen und Emojis. Sei hilfreich.' 
        },
        ...messages
      ] as any,
    });
    return { result: response.choices[0].message.content };
  } catch (error: any) {
    console.error('Chat error:', error);
    return { error: error.message || 'Verbindungsproblem.' };
  }
}