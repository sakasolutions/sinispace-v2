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
  fileIds?: string[], // Optional: OpenAI File IDs für hochgeladene Dokumente
  fileMimeTypes?: string[] // Optional: MIME Types der Dateien (für Unterscheidung Bilder/Dokumente)
) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) {
    // Im Chat ist es besonders cool: Die KI antwortet mit der Upsell-Nachricht
    return { result: UPSELL_MESSAGE };
  }

  try {
    // Prüfe ob es Bilder gibt
    const hasImages = fileMimeTypes?.some(mime => mime?.startsWith('image/')) || false;
    const hasNonImages = fileMimeTypes?.some(mime => !mime?.startsWith('image/')) || false;
    
    // Wenn es nur Bilder gibt, nutze Vision API
    if (fileIds && fileIds.length > 0 && hasImages && !hasNonImages) {
      console.log('🖼️ Verarbeite Chat mit', fileIds.length, 'Bild(ern) - nutze Vision API');
      
      try {
        // Hole die letzten User-Nachricht
        const lastUserMessage = messages.filter(m => m.role === 'user').pop();
        if (!lastUserMessage) {
          return { error: 'Keine User-Nachricht gefunden.' };
        }

        // Für Vision API: Bilder als File Content übergeben
        const imageContent = await Promise.all(
          fileIds.map(async (fileId, index) => {
            const fileContent = await openai.files.content(fileId);
            const buffer = await fileContent.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const mimeType = fileMimeTypes?.[index] || 'image/png';
            
            return {
              type: 'image_url' as const,
              image_url: {
                url: `data:${mimeType};base64,${base64}`
              }
            };
          })
        );

        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { 
              role: 'system', 
              content: 'Du bist Sinispace, ein warmer, empathischer und hochintelligenter KI-Begleiter. Nutze Markdown, Tabellen und Emojis. Sei hilfreich. Du kannst Bilder sehen und analysieren.' 
            },
            ...messages.slice(0, -1), // Alle Nachrichten außer der letzten
            {
              role: 'user',
              content: [
                { type: 'text', text: lastUserMessage.content },
                ...imageContent
              ]
            }
          ] as any,
        });

        return { result: response.choices[0].message.content };
      } catch (visionError: any) {
        console.error('❌ Vision API error:', visionError);
        // Fallback zu normaler Chat-API
      }
    }
    
    // Wenn File-IDs vorhanden sind (andere Dateien oder gemischt), nutze Assistants API mit File Search
    if (fileIds && fileIds.length > 0) {
      console.log('📎 Verarbeite Chat mit', fileIds.length, 'Datei(en)');
      try {
        // Erstelle Assistant mit File Search
        const assistant = await openai.beta.assistants.create({
          name: 'Sinispace Chat',
          model: 'gpt-4o',
          instructions: 'Du bist Sinispace, ein warmer, empathischer und hochintelligenter KI-Begleiter. Nutze Markdown, Tabellen und Emojis. Sei hilfreich. Du kannst Bilder sehen und analysieren, sowie Dokumente lesen. Nutze die hochgeladenen Dateien als Kontext für deine Antwort.',
          tools: [{ type: 'file_search' }],
          tool_resources: {
            file_search: {
              vector_store_ids: [], // Wird automatisch erstellt wenn Files hinzugefügt werden
            },
          },
        });

        console.log('✅ Assistant erstellt:', assistant.id);

        // Erstelle Thread mit Messages und File Attachments
        const threadMessages = messages.map((msg, idx) => {
          const messageContent: any = {
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          };
          
          // Füge File IDs zur letzten User-Message hinzu
          if (msg.role === 'user' && idx === messages.length - 1) {
            messageContent.attachments = fileIds.map(fileId => ({
              file_id: fileId,
              tools: [{ type: 'file_search' }],
            }));
            console.log('📎 Dateien angehängt:', fileIds);
          }
          
          return messageContent;
        });

        const thread = await openai.beta.threads.create({
          messages: threadMessages,
        });

        console.log('✅ Thread erstellt:', thread.id);

        // Starte Run
        const run = await openai.beta.threads.runs.create(thread.id, {
          assistant_id: assistant.id,
        });

        // Prüfe ob run.id existiert
        if (!run.id) {
          console.error('❌ Run hat keine ID:', run);
          throw new Error('Run wurde erstellt, aber hat keine ID');
        }

        console.log('✅ Run gestartet:', run.id, 'Status:', run.status);

        // Warte kurz bevor wir den ersten retrieve machen (manchmal braucht es einen Moment)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Warte auf Completion
        // Korrekte Syntax: retrieve(runId, { thread_id: threadId })
        console.log('🔍 Rufe retrieve auf mit run.id:', run.id, 'thread.id:', thread.id);
        let runStatus;
        try {
          runStatus = await openai.beta.threads.runs.retrieve(run.id, {
            thread_id: thread.id,
          });
        } catch (retrieveError: any) {
          console.error('❌ Fehler beim ersten retrieve:', retrieveError);
          console.error('run.id:', run.id, 'thread.id:', thread.id);
          throw retrieveError;
        }
        
        let attempts = 0;
        while ((runStatus.status === 'in_progress' || runStatus.status === 'queued' || runStatus.status === 'requires_action') && attempts < 120) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            runStatus = await openai.beta.threads.runs.retrieve(run.id, {
              thread_id: thread.id,
            });
          } catch (retrieveError: any) {
            console.error('❌ Fehler beim retrieve (Versuch', attempts + 1, '):', retrieveError);
            // Versuche weiter, außer es ist ein kritischer Fehler
            if (attempts > 5) {
              throw retrieveError;
            }
          }
          attempts++;
          if (attempts % 5 === 0) {
            console.log('⏳ Warte auf Completion... Status:', runStatus?.status, 'Versuch:', attempts);
          }
        }

        console.log('📊 Run Status:', runStatus.status, 'nach', attempts, 'Sekunden');

        if (runStatus.status === 'completed') {
          const threadMessages = await openai.beta.threads.messages.list(thread.id);
          const assistantMessage = threadMessages.data.find(m => m.role === 'assistant');
          if (assistantMessage && assistantMessage.content[0].type === 'text') {
            const result = assistantMessage.content[0].text.value;
            console.log('✅ Antwort erhalten:', result.substring(0, 100) + '...');
            
            // Cleanup: Assistant löschen
            try {
              await openai.beta.assistants.delete(assistant.id);
            } catch (cleanupError) {
              // Ignoriere Cleanup-Fehler
            }
            return { result };
          }
        }

        // Cleanup
        try {
          await openai.beta.assistants.delete(assistant.id);
        } catch (cleanupError) {
          // Ignoriere Cleanup-Fehler
        }

        if (runStatus.status === 'failed') {
          const errorMsg = runStatus.last_error?.message || 'Fehler beim Verarbeiten der Dateien.';
          console.error('❌ Run fehlgeschlagen:', errorMsg);
          return { error: errorMsg };
        }

        // Wenn Status nicht completed, aber auch nicht failed
        console.warn('⚠️ Run Status unerwartet:', runStatus.status);
        // Fallback zu normaler Chat-API
        // (wird unten weitergeführt)
      } catch (assistantError: any) {
        console.error('❌ Assistants API error:', assistantError);
        console.error('Stack:', assistantError.stack);
        // Fallback zu normaler Chat-API
        // (wird unten weitergeführt)
      }
    }

    // Normale Chat-API (ohne Dateien oder als Fallback wenn Assistants API fehlschlägt)
    if (fileIds && fileIds.length > 0) {
      // Füge Hinweis hinzu, dass Dateien vorhanden sind
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.role === 'user') {
        const hintText = `\n\n[Hinweis: ${fileIds.length} Datei(en) wurden zu diesem Chat hochgeladen, konnten aber nicht automatisch analysiert werden. Bitte beschreibe, was du mit den Dateien machen möchtest.]`;
        messages = [...messages.slice(0, -1), { ...lastMessage, content: lastMessage.content + hintText }];
      }
    }

    // Normale Chat-API ohne Dateien (oder als Fallback)
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