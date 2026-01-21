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
  const senderName = formData.get('senderName') as string || '';
  const recipientName = formData.get('recipientName') as string || '';
  const recipientEmail = formData.get('recipientEmail') as string || '';
  const tone = formData.get('tone') as string;
  const formality = formData.get('formality') as string || 'Sie'; // Du oder Sie
  const language = formData.get('language') as string || 'Deutsch'; // Sprache
  const length = formData.get('length') as string || 'Mittel'; // Kurz, Mittel, Ausführlich

  if (!topic) return { error: 'Bitte gib ein Thema ein.' };

  // Sprach-Mapping für professionelle System-Prompts mit natürlichen, idiomatischen Formulierungen
  const languageInstructions: Record<string, string> = {
    'Deutsch': 'Die E-Mail muss auf Deutsch verfasst werden. Verwende korrekte deutsche Grammatik und Rechtschreibung. Verwende natürliche, idiomatische deutsche Formulierungen - KEINE wörtlichen Übersetzungen aus anderen Sprachen.',
    'Englisch': 'The email must be written in English. Use proper English grammar and spelling. Use professional business English with natural, idiomatic expressions. Do NOT use literal translations from other languages. Use native English phrases like "I hope this email finds you well" or "I am writing to you regarding..."',
    'Französisch': 'L\'e-mail doit être rédigé en français. Utilisez une grammaire et une orthographe françaises correctes. Utilisez un français professionnel et poli avec des expressions naturelles et idiomatiques. N\'utilisez PAS de traductions littérales. Utilisez des formules françaises natives comme "Je vous prie d\'agréer l\'expression de mes salutations distinguées" ou "Je me permets de vous contacter concernant..."',
    'Türkisch': 'E-posta Türkçe yazılmalıdır. Doğru Türkçe dilbilgisi ve yazım kullanın. Profesyonel ve nazik bir dil kullanın. ÖNEMLİ: Doğal, yerli Türkçe ifadeler kullanın - ASLA başka dillerden kelime kelime çeviri yapmayın. "Umarım bu e-posta sizi iyi bulur" gibi çeviri kokan ifadeler kullanmayın. Bunun yerine doğal Türkçe başlangıçlar kullanın: "Sayın [İsim]," veya "Merhaba [İsim]," gibi. Türkçe\'de e-postalarda genellikle doğrudan konuya geçilir veya kısa bir selamlama yapılır.',
    'Italienisch': 'L\'email deve essere scritta in italiano. Usa una grammatica e un\'ortografia italiane corrette. Usa un italiano professionale e cortese con espressioni naturali e idiomatiche. NON usare traduzioni letterali. Usa frasi italiane native come "La ringrazio per la Sua attenzione" o "Le scrivo in merito a..."',
    'Spanisch': 'El correo electrónico debe estar escrito en español. Usa una gramática y ortografía españolas correctas. Usa un español profesional y cortés con expresiones naturales e idiomáticas. NO uses traducciones literales. Usa frases españolas nativas como "Quedo a su disposición" o "Le escribo en relación con..."'
  };

  // System-Prompt je nach Länge anpassen
  let lengthInstruction = '';
  if (length === 'Kurz') {
    lengthInstruction = language === 'Deutsch' 
      ? 'Die E-Mail soll kurz und prägnant sein (max. 3-4 Sätze).'
      : 'The email should be short and concise (max. 3-4 sentences).';
  } else if (length === 'Ausführlich') {
    lengthInstruction = language === 'Deutsch'
      ? 'Die E-Mail soll ausführlich und detailliert sein.'
      : 'The email should be detailed and comprehensive.';
  } else {
    lengthInstruction = language === 'Deutsch'
      ? 'Die E-Mail soll eine normale Länge haben (5-7 Sätze).'
      : 'The email should have a normal length (5-7 sentences).';
  }

  // Anrede-Instruktion (nur für Deutsch relevant)
  let formalityInstruction = '';
  if (language === 'Deutsch') {
    formalityInstruction = formality === 'Du' 
      ? 'WICHTIG: Verwende die Du-Form (du, dein, dir, etc.). Sei freundlich aber respektvoll.'
      : 'WICHTIG: Verwende die Sie-Form (Sie, Ihr, Ihnen, etc.). Bleibe professionell und höflich.';
  }

  // Baue User-Prompt mit optionalen Feldern
  let userPrompt = `Ton: ${tone}, Sprache: ${language}, Inhalt: ${topic}`;
  
  if (language === 'Deutsch' && formality) {
    userPrompt = `${userPrompt}, Anrede: ${formality}`;
  }
  
  if (senderName) {
    userPrompt = `Absender: ${senderName}, ${userPrompt}`;
  }
  
  if (recipientName) {
    userPrompt = `${userPrompt}, Empfänger Name: ${recipientName}`;
  }
  
  // WICHTIG: recipientEmail wird NICHT im User-Prompt übergeben, 
  // da sie nur für den mailto: Link verwendet wird, nicht im generierten Text
  
  if (recipient) {
    userPrompt = `${userPrompt}, Empfänger Kontext: ${recipient}`;
  }

  // System-Prompt je nach Sprache anpassen
  let systemPrompt = '';
  
  if (language === 'Deutsch') {
    systemPrompt = `Du bist ein E-Mail Profi und Muttersprachler. ${lengthInstruction} ${formalityInstruction} ${languageInstructions[language]} Antworte nur mit dem Text. Verwende die angegebenen Namen für Anrede und Abschluss, falls vorhanden. WICHTIG: Füge KEINE E-Mail-Adressen in den Text ein - diese werden nur für den mailto: Link verwendet.`;
  } else if (language === 'Englisch') {
    systemPrompt = `You are an email professional and native English speaker. ${lengthInstruction} ${languageInstructions[language]} Reply only with the text. Use the provided names for greeting and closing, if available. IMPORTANT: Do NOT include email addresses in the text - they are only used for the mailto: link.`;
  } else if (language === 'Französisch') {
    systemPrompt = `Tu es un professionnel de l'email et locuteur natif français. ${lengthInstruction} ${languageInstructions[language]} Réponds uniquement avec le texte. Utilise les noms fournis pour la salutation et la fermeture, s'ils sont disponibles. IMPORTANT: N'inclus PAS d'adresses email dans le texte - elles ne sont utilisées que pour le lien mailto:.`;
  } else if (language === 'Türkisch') {
    systemPrompt = `Sen bir e-posta profesyonelisin ve ana dili Türkçe olan birisin. ${lengthInstruction} ${languageInstructions[language]} Sadece metinle cevap ver. Varsa verilen isimleri selamlama ve kapanış için kullan. ÖNEMLİ: Türkçe e-postalarda doğal, yerli ifadeler kullan. "Umarım bu e-posta sizi iyi bulur" gibi çeviri kokan ifadeler ASLA kullanma. Bunun yerine doğrudan "Sayın [İsim]," ile başla veya kısa bir selamlama yap. ÖNEMLİ: E-posta adreslerini metne EKLEME - bunlar sadece mailto: bağlantısı için kullanılır.`;
  } else if (language === 'Italienisch') {
    systemPrompt = `Sei un professionista delle email e madrelingua italiana. ${lengthInstruction} ${languageInstructions[language]} Rispondi solo con il testo. Usa i nomi forniti per il saluto e la chiusura, se disponibili. IMPORTANTE: NON includere indirizzi email nel testo - sono usati solo per il link mailto:.`;
  } else if (language === 'Spanisch') {
    systemPrompt = `Eres un profesional del correo electrónico y hablante nativo de español. ${lengthInstruction} ${languageInstructions[language]} Responde solo con el texto. Usa los nombres proporcionados para el saluto y el cierre, si están disponibles. IMPORTANTE: NO incluyas direcciones de correo electrónico en el texto - solo se usan para el enlace mailto:.`;
  } else {
    // Fallback
    systemPrompt = `You are an email professional. ${lengthInstruction} ${languageInstructions[language] || ''} Reply only with the text. Use the provided names for greeting and closing, if available. IMPORTANT: Do NOT include email addresses in the text.`;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
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
  const format = formData.get('format') as string || 'Stichpunkte'; // Stichpunkte, Fließtext, Action Items
  const length = formData.get('length') as string || 'Standard'; // Kernaussage, Standard, Detailliert

  if (!text) return { error: 'Kein Text.' };

  // System-Prompt je nach Format und Länge anpassen
  let formatInstruction = '';
  if (format === 'Stichpunkte') {
    formatInstruction = 'Fasse den Text zusammen und formatiere das Ergebnis als Bulletpoints (Markdown-Liste mit - oder *).';
  } else if (format === 'Fließtext') {
    formatInstruction = 'Fasse den Text zusammen und formatiere das Ergebnis als zusammenhängenden Fließtext (keine Bulletpoints, nur Absätze).';
  } else if (format === 'Action Items') {
    formatInstruction = 'Extrahiere NUR die Aufgaben, To-Dos und Action Items aus dem Text. Formatiere als Bulletpoints mit klaren Handlungsaufforderungen. Ignoriere alles andere (Hintergrund, Kontext, etc.).';
  } else {
    formatInstruction = 'Fasse den Text zusammen in Bulletpoints (Markdown).';
  }

  let lengthInstruction = '';
  if (length === 'Kernaussage') {
    lengthInstruction = 'Die Zusammenfassung soll sehr kurz sein (max. 3-5 Punkte oder 2-3 Sätze). Nur die allerwichtigsten Kernaussagen.';
  } else if (length === 'Detailliert') {
    lengthInstruction = 'Die Zusammenfassung soll ausführlich und detailliert sein. Wichtige Details und Nuancen beibehalten.';
  } else {
    // Standard
    lengthInstruction = 'Die Zusammenfassung soll eine normale Länge haben. Die wichtigsten Punkte zusammenfassen, aber prägnant bleiben.';
  }

  const systemPrompt = `Du bist ein Text-Analyse-Experte. ${formatInstruction} ${lengthInstruction} Antworte nur mit dem zusammengefassten Text, ohne zusätzliche Erklärungen.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
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
  const version = formData.get('version') as string || 'Excel (Deutsch)';
  const taskType = formData.get('taskType') as string || 'Formel erstellen';

  if (!problem) return { error: 'Bitte beschreibe dein Problem.' };

  // Version-spezifische Instruktionen
  let versionInstruction = '';
  if (version === 'Excel (Deutsch)') {
    versionInstruction = 'WICHTIG: Nutze IMMER deutsche Funktionsnamen (WENN, SVERWEIS, SUMMEWENN, ZÄHLENWENN, etc.) und SEMIKOLONS (;) als Trennzeichen. Beispiel: =SUMMEWENN(B2:B500;"Bezahlt";A2:A500)';
  } else if (version === 'Excel (Englisch)') {
    versionInstruction = 'WICHTIG: Nutze IMMER englische Funktionsnamen (IF, VLOOKUP, SUMIF, COUNTIF, etc.) und KOMMAS (,) als Trennzeichen. Beispiel: =SUMIF(B2:B500,"Paid",A2:A500)';
  } else if (version === 'Google Sheets') {
    versionInstruction = 'WICHTIG: Nutze englische Funktionsnamen (IF, VLOOKUP, SUMIF, etc.). Trennzeichen können je nach Region unterschiedlich sein, aber Standard ist KOMMAS (,). In Europa oft SEMIKOLONS (;). Beispiel: =SUMIF(B2:B500,"Paid",A2:A500) oder =SUMIF(B2:B500;"Bezahlt";A2:A500)';
  } else if (version === 'VBA / Makro') {
    versionInstruction = 'WICHTIG: Schreibe VBA-Code für Excel-Automatisierung. Nutze korrekte VBA-Syntax, Excel-Objektmodell und bewährte Praktiken. Code muss funktionsfähig und gut dokumentiert sein.';
  } else {
    versionInstruction = 'Nutze die Standard-Syntax für die gewählte Version.';
  }

  // Task-Type-spezifische Instruktionen
  let taskInstruction = '';
  if (taskType === 'Formel erstellen') {
    taskInstruction = 'Erstelle eine neue Formel basierend auf der Problembeschreibung.';
  } else if (taskType === 'Formel reparieren') {
    taskInstruction = 'Analysiere den Fehler in der bestehenden Formel und repariere sie. Erkläre, was falsch war.';
  } else if (taskType === 'Erklärung') {
    taskInstruction = 'Erkläre, wie die gegebene Formel funktioniert. Gehe Schritt für Schritt vor.';
  } else if (taskType === 'VBA Makro schreiben') {
    taskInstruction = 'Schreibe VBA-Code für die beschriebene Automatisierung. Code muss funktionsfähig sein.';
  } else {
    taskInstruction = 'Löse das beschriebene Problem.';
  }

  const systemPrompt = `Du bist ein Weltklasse Excel-Experte und MVP mit jahrelanger Erfahrung.

Regeln:
1. Achte PEINLICH GENAU auf die gewählte Version '${version}'.
2. ${versionInstruction}
3. ${taskInstruction}

Formatiere die Antwort wie folgt:
- ZUERST die reine Formel/den Code in einem Code-Block oder klar markiert
- DANN eine kurze, präzise Erklärung, wie man die Formel einbaut und was sie macht

Antworte NUR mit der Formel/Code und der Erklärung, keine zusätzlichen Einleitungen.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
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
    const senderName = formData.get('senderName') as string || '';
    const recipientName = formData.get('recipientName') as string || '';
    const tone = formData.get('tone') as string || 'Professionell';
    const formality = formData.get('formality') as string || 'Sie';
    const language = formData.get('language') as string || 'Deutsch';
    const topic = formData.get('topic') as string || '';
    
    let userInput = `Ton: ${tone}, Sprache: ${language}, Inhalt: ${topic}`;
    if (language === 'Deutsch' && formality) userInput = `${userInput}, Anrede: ${formality}`;
    if (senderName) userInput = `Absender: ${senderName}, ${userInput}`;
    if (recipientName) userInput = `${userInput}, Empfänger: ${recipientName}`;
    if (recipient) userInput = `${userInput}, Kontext: ${recipient}`;
    
    await createHelperChat('email', userInput, result.result);
  }
  
  return result;
}

// --- EXCEL MIT CHAT-SPEICHERUNG ---
export async function generateExcelWithChat(prevState: any, formData: FormData) {
  const result = await generateExcel(prevState, formData);
  
  // Wenn erfolgreich, Chat in DB speichern
  if (result?.result && !result.error) {
    const version = formData.get('version') as string || 'Excel (Deutsch)';
    const taskType = formData.get('taskType') as string || 'Formel erstellen';
    const problem = formData.get('problem') as string || '';
    
    const userInput = `Version: ${version}, Aufgabe: ${taskType}, Problem: ${problem.substring(0, 100)}${problem.length > 100 ? '...' : ''}`;
    
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
    const format = formData.get('format') as string || 'Stichpunkte';
    const length = formData.get('length') as string || 'Standard';
    const userInput = `Format: ${format}, Länge: ${length}, Text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;
    
    await createHelperChat('summarize', userInput, result.result);
  }
  
  return result;
}

// --- ÜBERSETZER ---
export async function generateTranslate(prevState: any, formData: FormData) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const text = formData.get('text') as string;
  const targetLanguage = formData.get('targetLanguage') as string || 'Englisch (US)';
  const mode = formData.get('mode') as string || 'Business & Professionell';

  if (!text) return { error: 'Bitte gib einen Text ein.' };

  // Kontext-Instruktion je nach Modus
  let contextInstruction = '';
  if (mode === 'Business & Professionell') {
    contextInstruction = 'Übersetze den Text professionell und geschäftlich angemessen. Verwende eine formelle, aber freundliche Sprache, wie sie in Business-Kommunikation üblich ist.';
  } else if (mode === 'Wie ein Muttersprachler') {
    contextInstruction = 'Übersetze den Text so, als wäre er von einem Muttersprachler geschrieben. Nutze typische Redewendungen, natürliche Phrasen und idiomatische Ausdrücke der Zielsprache. KEINE 1:1 Übersetzungen! Passe den Stil kulturell an.';
  } else if (mode === 'Umgangssprache & Locker') {
    contextInstruction = 'Übersetze den Text umgangssprachlich und locker. Nutze eine freundliche, informelle Sprache wie sie in Social Media oder bei Freunden verwendet wird.';
  } else if (mode === 'Präzise & Wörtlich') {
    contextInstruction = 'Übersetze den Text präzise und möglichst wörtlich, ideal für technische Dokumentationen oder rechtliche Texte. Behalte die exakte Bedeutung bei.';
  } else if (mode === 'Einfach & Erklärend') {
    contextInstruction = 'Übersetze den Text einfach und leicht verständlich. Nutze einfache Worte und kurze Sätze, ideal für Sprachschüler oder wenn der Text verständlich sein soll.';
  } else {
    contextInstruction = 'Übersetze den Text professionell und angemessen.';
  }

  const systemPrompt = `Du bist ein professioneller Dolmetscher und Übersetzer mit jahrelanger Erfahrung. Übersetze den folgenden Text in die Zielsprache: ${targetLanguage}. 

WICHTIG: Passe den Stil exakt an diesen Kontext an: ${mode}

${contextInstruction}

Antworte NUR mit der übersetzten Version des Textes, ohne zusätzliche Erklärungen oder Kommentare.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
    });
    return { result: response.choices[0].message.content };
  } catch (error) {
    return { error: 'KI Fehler.' };
  }
}

// --- ÜBERSETZER MIT CHAT-SPEICHERUNG ---
export async function generateTranslateWithChat(prevState: any, formData: FormData) {
  const result = await generateTranslate(prevState, formData);
  
  // Wenn erfolgreich, Chat in DB speichern
  if (result?.result && !result.error) {
    const text = formData.get('text') as string || '';
    const targetLanguage = formData.get('targetLanguage') as string || 'Englisch (US)';
    const mode = formData.get('mode') as string || 'Business & Professionell';
    const userInput = `Ziel-Sprache: ${targetLanguage}, Modus: ${mode}, Text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;
    
    await createHelperChat('translate', userInput, result.result);
  }
  
  return result;
}

// --- TEXT AUFPOLIERER ---
export async function generatePolish(prevState: any, formData: FormData) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const text = formData.get('text') as string;
  const mode = formData.get('mode') as string || 'Professionell & Business';

  if (!text) return { error: 'Bitte gib einen Text ein.' };

  // System-Prompt je nach Modus
  let modeInstruction = '';
  if (mode === 'Grammatik & Rechtschreibung') {
    modeInstruction = 'Korrigiere NUR Grammatik- und Rechtschreibfehler. Ändere den Stil NICHT. Behalte den ursprünglichen Tonfall, die Satzstruktur und den Wortschatz bei. Nur Fehler beheben, sonst nichts ändern.';
  } else if (mode === 'Professionell & Business') {
    modeInstruction = 'Optimiere den Text für den professionellen Business-Kontext. Nutze eine sachliche, klare und respektvolle Sprache. Ideal für E-Mails, Präsentationen und Geschäftskommunikation.';
  } else if (mode === 'Eloquent & Gehoben') {
    modeInstruction = 'Verfeinere den Text zu einem eloquenten Meisterwerk. Nutze gehobenes Vokabular, elegante Satzstrukturen und stilvolle Formulierungen. Ideal für wichtige Dokumente, Reden oder anspruchsvolle Texte.';
  } else if (mode === 'Direkt & Knackig') {
    modeInstruction = 'Mache den Text direkt und knackig. Entferne Füllwörter, Redundanzen und unnötige Ausschmückungen. Nutze kurze, prägnante Sätze. Ideal für Marketing, Social Media oder prägnante Botschaften.';
  } else if (mode === 'Einfacher & Verständlicher') {
    modeInstruction = 'Vereinfache den Text, damit er leicht verständlich ist. Löse komplizierte Sätze auf, nutze einfache Worte und kurze Sätze. Ideal für breites Publikum oder wenn Klarheit Priorität hat.';
  } else {
    modeInstruction = 'Optimiere den Text professionell und angemessen.';
  }

  const systemPrompt = `Du bist ein professioneller Chef-Lektor mit jahrelanger Erfahrung. Deine Aufgabe ist es, den Text des Users basierend auf dem Modus '${mode}' zu optimieren.

${modeInstruction}

Antworte NUR mit dem verbesserten Text. Keine Erklärungen, keine Kommentare, nur der aufpolierte Text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
    });
    return { result: response.choices[0].message.content };
  } catch (error) {
    return { error: 'KI Fehler.' };
  }
}

// --- TEXT AUFPOLIERER MIT CHAT-SPEICHERUNG ---
export async function generatePolishWithChat(prevState: any, formData: FormData) {
  const result = await generatePolish(prevState, formData);
  
  // Wenn erfolgreich, Chat in DB speichern
  if (result?.result && !result.error) {
    const text = formData.get('text') as string || '';
    const mode = formData.get('mode') as string || 'Professionell & Business';
    const userInput = `Modus: ${mode}, Text: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;
    
    await createHelperChat('polish', userInput, result.result);
  }
  
  return result;
}

// --- SCHWIERIGE NACHRICHTEN ---
export async function generateToughMessage(prevState: any, formData: FormData) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const recipient = formData.get('recipient') as string;
  const message = formData.get('message') as string;
  const strategy = formData.get('strategy') as string || 'Empathisch & Weich';

  if (!recipient) return { error: 'Bitte gib an, an wen die Nachricht geht.' };
  if (!message) return { error: 'Bitte beschreibe die schlechte Nachricht.' };

  // System-Prompt je nach Strategie
  let strategyInstruction = '';
  if (strategy === 'Empathisch & Weich') {
    strategyInstruction = 'Nutze die "Sandwich-Methode": Beginne mit etwas Positivem oder Verständnis, dann die schlechte Nachricht, schließe mit konstruktiven Lösungsvorschlägen oder Hoffnung ab. Zeige Empathie und Verständnis für die Situation des Empfängers.';
  } else if (strategy === 'Sachlich & Neutral') {
    strategyInstruction = 'Formuliere die Nachricht sachlich und faktenbasiert, ohne Emotionen. Bleibe professionell, klar und direkt. Vermeide Schuldzuweisungen oder emotionale Sprache. Konzentriere dich auf die Fakten und notwendige Informationen.';
  } else if (strategy === 'Entschuldigend & Demütig') {
    strategyInstruction = 'Übernimm Verantwortung für den Fehler oder die Situation. Sei aufrichtig entschuldigend, zeige Reue und biete konkrete Lösungen oder Wiedergutmachungen an. Vermeide Ausreden oder Rechtfertigungen.';
  } else if (strategy === 'Bestimmt & Rechtssicher') {
    strategyInstruction = 'Formuliere die Nachricht präzise, rechtssicher und bestimmt. Setze klare Grenzen und Erwartungen. Verwende eine professionelle, aber feste Sprache. Ideal für Mahnungen, Kündigungen oder formelle Korrespondenz. Vermeide emotionale Angriffsfläche.';
  } else if (strategy === 'Konstruktiv & Fördernd') {
    strategyInstruction = 'Formuliere konstruktive Kritik, die motivieren soll. Benenne Probleme klar, aber biete gleichzeitig Lösungen und Entwicklungsperspektiven. Ermutige zur Verbesserung und zeige Vertrauen in die Fähigkeiten des Empfängers.';
  } else {
    strategyInstruction = 'Formuliere die Nachricht professionell und angemessen.';
  }

  const systemPrompt = `Du bist ein Experte für Krisenkommunikation und Deeskalation. Deine Aufgabe ist es, eine Nachricht an '${recipient}' über '${message}' zu formulieren.

Nutze die Strategie '${strategy}'.

${strategyInstruction}

WICHTIG: Formuliere die Nachricht so, dass sie professionell, respektvoll und angemessen ist. Antworte NUR mit dem formulierten Text, ohne zusätzliche Erklärungen oder Kommentare.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Empfänger: ${recipient}\n\nThema: ${message}` }
      ],
    });
    return { result: response.choices[0].message.content };
  } catch (error) {
    return { error: 'KI Fehler.' };
  }
}

// --- SCHWIERIGE NACHRICHTEN MIT CHAT-SPEICHERUNG ---
export async function generateToughMessageWithChat(prevState: any, formData: FormData) {
  const result = await generateToughMessage(prevState, formData);
  
  // Wenn erfolgreich, Chat in DB speichern
  if (result?.result && !result.error) {
    const recipient = formData.get('recipient') as string || '';
    const message = formData.get('message') as string || '';
    const strategy = formData.get('strategy') as string || 'Empathisch & Weich';
    const userInput = `An: ${recipient}, Strategie: ${strategy}, Thema: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`;
    
    await createHelperChat('tough-msg', userInput, result.result);
  }
  
  return result;
}

// --- RECHTSTEXTE & FORMALES ---
export async function generateLegal(prevState: any, formData: FormData) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const mode = formData.get('mode') as string || 'Klausel formulieren';
  const content = formData.get('content') as string;

  if (!content) return { error: 'Bitte gib Stichpunkte oder Inhalt ein.' };

  // System-Prompt je nach Modus
  let modeInstruction = '';
  if (mode === 'Klausel formulieren') {
    modeInstruction = 'Der User möchte eine spezifische Klausel formuliert haben (z.B. Datenschutz, Geheimhaltung, Widerrufsrecht). Schreibe die Klausel präzise, formell und nutze gängige Standards. Die Klausel soll rechtssicher und professionell sein.';
  } else if (mode === 'Juristendeutsch erklären') {
    modeInstruction = 'Der User möchte einen komplizierten juristischen Text in einfaches, verständliches Deutsch übersetzt haben. Übersetze den Text präzise, aber verwende einfache Worte und kurze Sätze. Erkläre komplizierte Begriffe.';
  } else if (mode === 'Formales Schreiben') {
    modeInstruction = 'Der User möchte ein formales Schreiben (z.B. Kündigung, Widerspruch, Mahnung). Formuliere es professionell, sachlich und rechtssicher. Nutze die übliche Formulierungen für solche Schreiben.';
  } else if (mode === 'DSGVO Antwort') {
    modeInstruction = 'Der User möchte eine DSGVO-konforme Antwort formulieren (z.B. auf eine Auskunftsanfrage). Halte dich an die DSGVO-Vorgaben, formuliere präzise und professionell. Gib alle notwendigen Informationen an, die gemäß DSGVO erforderlich sind.';
  } else {
    modeInstruction = 'Formuliere einen rechtssicheren, professionellen Text basierend auf den Angaben des Users.';
  }

  // WICHTIG: Prüfen ob User ganze Verträge anfordert
  const contentLower = content.toLowerCase();
  const wholeContractKeywords = ['kompletten vertrag', 'gesamten vertrag', 'vollständigen vertrag', 'ganzen vertrag', 'vertrag erstellen', 'vertrag schreiben', 'vertrag formulieren'];
  const requestsWholeContract = wholeContractKeywords.some(keyword => contentLower.includes(keyword));

  if (requestsWholeContract) {
    return { 
      error: 'Ich erstelle aus rechtlichen Gründen keine kompletten Verträge. Ich kann dir aber gerne dabei helfen, einzelne Klauseln zu formulieren. Bitte beschreibe, welche spezifische Klausel du benötigst.' 
    };
  }

  const systemPrompt = `Du bist ein juristischer Formulierungs-Assistent. Deine Aufgabe ist es, basierend auf dem Modus '${mode}' und den Angaben des Users einen rechtssicheren Entwurf zu erstellen.

Regeln:
1. Wenn der User eine 'Klausel' will: Schreibe sie präzise, formell und nutze gängige Standards.
2. Wenn der User 'Erklären' will: Übersetze den Text in einfaches, verständliches Deutsch. KEINE Platzhalter hinzufügen.
3. Wenn der User 'Formales Schreiben' oder 'DSGVO Antwort' will: Formuliere es professionell und rechtssicher.
4. Füge am Ende JEDES generierten Textes (außer bei 'Juristendeutsch erklären') einen Platzhalter ein: '[Bitte prüfen Sie diesen Entwurf auf Ihre spezifische Situation]'

${modeInstruction}

WICHTIG: 
- Nutze präzise, formelle Sprache
- Halte dich an gängige juristische Standards
- Antworte NUR mit dem formulierten Text, ohne zusätzliche Erklärungen (außer bei Erklärungen, wo der übersetzte Text ausreicht)
- Bei allen Modi außer "Erklären": Füge am Ende den Platzhalter hinzu`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: content }
      ],
    });
    return { result: response.choices[0].message.content };
  } catch (error) {
    return { error: 'KI Fehler.' };
  }
}

// --- RECHTSTEXTE & FORMALES MIT CHAT-SPEICHERUNG ---
export async function generateLegalWithChat(prevState: any, formData: FormData) {
  const result = await generateLegal(prevState, formData);
  
  // Wenn erfolgreich, Chat in DB speichern
  if (result?.result && !result.error) {
    const mode = formData.get('mode') as string || 'Klausel formulieren';
    const content = formData.get('content') as string || '';
    const userInput = `Modus: ${mode}, Inhalt: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`;
    
    await createHelperChat('legal', userInput, result.result);
  }
  
  return result;
}

// --- JOB-BESCHREIBUNG ---
export async function generateJobDescription(prevState: any, formData: FormData) {
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const jobTitle = formData.get('jobTitle') as string;
  const culture = formData.get('culture') as string || 'Modernes Startup';
  const employmentType = formData.get('employmentType') as string || 'Vollzeit';
  const points = formData.get('points') as string;

  if (!jobTitle) return { error: 'Bitte gib einen Job-Titel ein.' };
  if (!points) return { error: 'Bitte gib Stichpunkte zu Aufgaben & Anforderungen ein.' };

  // Kultur-spezifische Instruktionen
  let cultureInstruction = '';
  if (culture === 'Modernes Startup') {
    cultureInstruction = 'Nutze eine moderne, energetische Sprache mit Duz-Kultur. Lockere, motivierende Formulierungen wie "Du rockst das" oder "Bei uns zählt dein Input". Sei dynamisch und zukunftsorientiert.';
  } else if (culture === 'Etablierter Konzern') {
    cultureInstruction = 'Nutze eine professionelle, formelle Sprache mit Sie-Kultur. Strukturiert, leistungsbezogen und etabliert. Betone Stabilität, Karrierechancen und etablierte Prozesse.';
  } else if (culture === 'Traditioneller Mittelstand') {
    cultureInstruction = 'Nutze eine familäre, bodenständige Sprache. Betone Sicherheit, Beständigkeit und Teamgeist. Professionell, aber persönlich. Langfristige Perspektiven und Werte.';
  } else if (culture === 'Kreativ & Exzentrisch') {
    cultureInstruction = 'Nutze eine außergewöhnliche, kreative Sprache mit Humor. Zeige Persönlichkeit und Kreativität. Mut zu unkonventionellen Formulierungen, während du professionell bleibst.';
  } else {
    cultureInstruction = 'Nutze eine professionelle, angemessene Sprache.';
  }

  const systemPrompt = `Du bist ein erfahrener HR-Recruiter und Copywriter mit jahrelanger Erfahrung in der Erstellung von anziehenden Stellenanzeigen.

Deine Aufgabe: Schreibe eine professionelle Stellenanzeige für '${jobTitle}'.
Anstellungsart: ${employmentType}
Stil: ${culture}

WICHTIGE REGELN:
1. **Gender-neutrale Sprache**: Verwende IMMER gender-neutrale Formulierungen und füge "(m/w/d)" hinzu, um Diskriminierung zu vermeiden und AGG-Konformität sicherzustellen.

2. **Struktur**: Nutze IMMER diese exakte Struktur (Markdown):
   - **Einleitung** (Catchy Hook - fange den Leser ein)
   - **Deine Mission** (Aufgaben - aus den Stichpunkten extrahiert)
   - **Das bringst du mit** (Profil & Anforderungen)
   - **Darum wir** (Benefits & Firmen-Vorteile)
   - **Call to Action** (Bewirb dich jetzt - motivierender Abschluss)

3. **Attraktive Formulierungen**: Verwandle die Stichpunkte in anziehende Sätze:
   - Statt "Obstkorb" -> "Tägliche Vitamin-Booster für deine Energie"
   - Statt "Homeoffice" -> "Flexibles Arbeiten von wo du willst"
   - Statt "50k Gehalt" -> "Ein faires Gehalt, das deine Leistung widerspiegelt (ab 50.000€)"

4. **Bullet Points**: Nutze Bullet Points für bessere Lesbarkeit in den Abschnitten "Deine Mission" und "Das bringst du mit".

5. **${cultureInstruction}**

Antworte NUR mit der fertigen Stellenanzeige im Markdown-Format, keine zusätzlichen Kommentare.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Job-Titel: ${jobTitle}\n\nAnstellungsart: ${employmentType}\n\nStichpunkte:\n${points}` }
      ],
    });
    return { result: response.choices[0].message.content };
  } catch (error) {
    return { error: 'KI Fehler.' };
  }
}

// --- JOB-BESCHREIBUNG MIT CHAT-SPEICHERUNG ---
export async function generateJobDescriptionWithChat(prevState: any, formData: FormData) {
  const result = await generateJobDescription(prevState, formData);
  
  // Wenn erfolgreich, Chat in DB speichern
  if (result?.result && !result.error) {
    const jobTitle = formData.get('jobTitle') as string || '';
    const culture = formData.get('culture') as string || 'Modernes Startup';
    const employmentType = formData.get('employmentType') as string || 'Vollzeit';
    const points = formData.get('points') as string || '';
    const userInput = `Titel: ${jobTitle}, Kultur: ${culture}, Art: ${employmentType}, Punkte: ${points.substring(0, 100)}${points.length > 100 ? '...' : ''}`;
    
    await createHelperChat('job-desc', userInput, result.result);
  }
  
  return result;
}

// --- CHAT ---
// --- INVOICE / OFFER TEXT POLISH ---
export async function polishInvoiceText(rawText: string, type: 'invoice' | 'offer'): Promise<string> {
  const isAllowed = await isUserPremium();
  if (!isAllowed) {
    throw new Error('Premium Feature');
  }

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Nicht authentifiziert');
  }

  const documentType = type === 'invoice' ? 'Rechnung' : 'Angebot';
  
  const systemPrompt = `Du bist ein professioneller Texter für ${documentType}en im B2B-Bereich. 
Deine Aufgabe: Formuliere kurze, präzise Leistungsbeschreibungen für Positionen in ${documentType}en.
WICHTIG:
- Maximal 1-2 Zeilen pro Beschreibung
- Professionell, aber verständlich
- Keine Marketing-Floskeln, nur Fakten
- Verwende Fachbegriffe, wenn angemessen
- Beispiel: "Wand streichen" → "Untergrundvorbereitung und Dispersionsanstrich Q3"`;

  const userPrompt = `Formuliere diese Leistungsbeschreibung professionell für eine ${documentType}:\n\n"${rawText}"`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const polishedText = completion.choices[0]?.message?.content?.trim() || rawText;
    return polishedText;
  } catch (error) {
    console.error('[polishInvoiceText] Fehler:', error);
    throw new Error('Fehler beim Veredeln des Textes');
  }
}

// --- INVOICE INTRO/OUTRO GENERATION ---
export async function generateInvoiceTexts(
  clientName: string,
  type: 'invoice' | 'offer',
  items: Array<{ description: string; quantity: number; priceOne: number }>
): Promise<{ intro: string; outro: string }> {
  const isAllowed = await isUserPremium();
  if (!isAllowed) {
    throw new Error('Premium Feature');
  }

  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Nicht authentifiziert');
  }

  const documentType = type === 'invoice' ? 'Rechnung' : 'Angebot';
  const itemsSummary = items.map(item => `${item.description} (${item.quantity}x)`).join(', ');
  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.priceOne, 0);

  const systemPrompt = `Du bist ein professioneller Texter für ${documentType}en im B2B-Bereich.
Erstelle:
1. Einen kurzen Einleitungstext (2-3 Sätze) für die ${documentType}
2. Einen kurzen Schlusssatz (1-2 Sätze) für die ${documentType}

WICHTIG:
- Professionell, aber freundlich
- Keine Marketing-Floskeln
- Kurz und prägnant
- Format: JSON mit "intro" und "outro"`;

  const userPrompt = `${documentType} für: ${clientName}
Leistungen: ${itemsSummary}
Gesamtbetrag: ${totalAmount.toFixed(2)} EUR

Erstelle Einleitung und Schluss für diese ${documentType}.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(response);
    
    return {
      intro: parsed.intro || (type === 'invoice' ? 'Vielen Dank für Ihren Auftrag.' : 'Vielen Dank für Ihre Anfrage.'),
      outro: parsed.outro || (type === 'invoice' ? 'Bitte überweisen Sie den Betrag innerhalb von 14 Tagen.' : 'Wir freuen uns auf Ihre Rückmeldung.'),
    };
  } catch (error) {
    console.error('[generateInvoiceTexts] Fehler:', error);
    return {
      intro: type === 'invoice' ? 'Vielen Dank für Ihren Auftrag.' : 'Vielen Dank für Ihre Anfrage.',
      outro: type === 'invoice' ? 'Bitte überweisen Sie den Betrag innerhalb von 14 Tagen.' : 'Wir freuen uns auf Ihre Rückmeldung.',
    };
  }
}

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

        // Für Vision API: Bilder aus DB holen (Base64 wurde beim Upload gespeichert)
        // WICHTIG: Bilder haben möglicherweise null openaiFileId, daher suchen wir über MIME-Type
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        
        // Für Vision API: Suche Bilder über MIME-Type und Base64 (Bilder haben null openaiFileId)
        // Wir nutzen die fileMimeTypes um zu wissen, welche Bilder wir suchen müssen
        const imageMimeTypes = fileMimeTypes?.filter(mime => mime?.startsWith('image/')) || [];
        
        // @ts-ignore - Prisma Client wird nach Migration aktualisiert
        const documents = await prisma.document.findMany({
          where: {
            mimeType: { in: imageMimeTypes },
            base64Data: { not: null }
          },
          select: {
            openaiFileId: true,
            mimeType: true,
            base64Data: true,
          },
          orderBy: { createdAt: 'desc' },
          take: imageMimeTypes.length, // Nimm die neuesten Bilder
        });

        console.log('📊 Dokumente aus DB:', documents.length, 'von', fileIds.length, 'File-IDs');
        console.log('📊 Base64 vorhanden:', documents.filter((d: any) => d.base64Data).length);

        // Wenn Base64 fehlt, verwende Fallback zu Assistants API
        if (documents.length === 0) {
          console.error('❌ Keine Dokumente in DB gefunden.');
          throw new Error('Dokumente nicht gefunden.');
        }

        // Prüfe ob Base64 vorhanden ist
        const hasBase64 = documents.some((doc: any) => doc.base64Data);
        if (!hasBase64) {
          console.warn('⚠️ Keine Base64-Daten in DB gefunden. Das Bild wurde möglicherweise vor dem Update hochgeladen.');
          // Fallback: Versuche trotzdem Vision API oder zeige Fehler
          // Assistants API unterstützt PNG nicht, daher müssen wir Base64 haben
          throw new Error('Base64-Daten fehlen. Bitte lade das Bild erneut hoch.');
        }

        const imageContent = documents
          .filter((doc: any) => doc.base64Data) // Nur wenn Base64 vorhanden
          .map((doc: any) => ({
            type: 'image_url' as const,
            image_url: {
              url: `data:${doc.mimeType};base64,${doc.base64Data}`
            }
          }));

        if (imageContent.length === 0) {
          throw new Error('Keine gültigen Bilddaten gefunden.');
        }

        console.log('🖼️ Sende', imageContent.length, 'Bild(er) an Vision API');

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

        console.log('✅ Vision API erfolgreich');
        return { result: response.choices[0].message.content };
      } catch (visionError: any) {
        console.error('❌ Vision API error:', visionError);
        console.error('❌ Vision API error message:', visionError.message);
        
        // Wenn Base64 fehlt, Fallback zu Assistants API (wird unten behandelt)
        if (visionError.message === 'FALLBACK_TO_ASSISTANTS_API') {
          console.log('🔄 Fallback zu Assistants API (kein Base64 vorhanden)');
          // Lass es in den normalen Flow fallen (Assistants API wird unten aufgerufen)
        } else {
          // Andere Fehler: Fallback zu normaler Chat-API
          console.warn('⚠️ Vision API Fehler, versuche Assistants API...');
        }
      }
    }
    
    // Wenn File-IDs vorhanden sind (andere Dateien oder gemischt), nutze Assistants API mit File Search
    // WICHTIG: Vector Store unterstützt nur Dokumente (PDF, DOCX, etc.), KEINE Bilder!
    if (fileIds && fileIds.length > 0) {
      console.log('📎 Verarbeite Chat mit', fileIds.length, 'Datei(en)');
      
      // Trenne Bilder von Dokumenten
      // WICHTIG: Filtere null-Werte (Bilder haben null openaiFileId, Dokumente müssen File-ID haben)
      const imageFileIds: (string | null)[] = [];
      const documentFileIds: string[] = [];
      
      fileIds.forEach((fileId, index) => {
        const mimeType = fileMimeTypes?.[index];
        if (mimeType?.startsWith('image/')) {
          // Bilder können null openaiFileId haben - das ist ok
          imageFileIds.push(fileId);
        } else {
          // Dokumente müssen openaiFileId haben
          if (fileId) {
            documentFileIds.push(fileId);
          }
        }
      });
      
      console.log('📊 Dateien aufgeteilt:', {
        bilder: imageFileIds.length,
        dokumente: documentFileIds.length
      });
      
      // Wenn es nur Bilder gibt, sollte das bereits oben abgefangen worden sein
      // Aber falls nicht, überspringe Vector Store komplett
      if (imageFileIds.length > 0 && documentFileIds.length === 0) {
        console.log('⚠️ Nur Bilder gefunden, sollte bereits über Vision API verarbeitet werden');
        // Überspringe Vector Store komplett - sollte bereits oben behandelt worden sein
        // Falls nicht, wird es unten im Fallback behandelt
      }
      
      // Wenn es nur Dokumente gibt oder gemischt, nutze Vector Store für Dokumente
      if (documentFileIds.length > 0) {
        // Variablen außerhalb deklarieren für Cleanup im catch-Block
        let vectorStore: any = null;
        let assistant: any = null;
        
        try {
          // WICHTIG: Erstelle zuerst einen Vector Store und füge NUR Dokumente hinzu (keine Bilder!)
          console.log('📦 Erstelle Vector Store für', documentFileIds.length, 'Dokument(e)...');
          // @ts-ignore - Vector Stores API ist verfügbar, aber Typen sind noch nicht aktualisiert
          vectorStore = await openai.beta.vectorStores.create({
            name: `Chat Vector Store ${Date.now()}`,
          });
          
          console.log('✅ Vector Store erstellt:', vectorStore.id);
          
          // Füge NUR Dokumente zum Vector Store hinzu (keine Bilder!)
          console.log('📎 Füge', documentFileIds.length, 'Dokument(e) zum Vector Store hinzu...');
          // @ts-ignore - Vector Stores API ist verfügbar, aber Typen sind noch nicht aktualisiert
          const fileBatch = await openai.beta.vectorStores.fileBatches.create(vectorStore.id, {
            file_ids: documentFileIds, // NUR Dokumente, keine Bilder!
          });
        
        console.log('✅ File Batch erstellt:', fileBatch.id);
        
          // Warte bis der File Batch verarbeitet wurde (Status: completed)
          let batchStatus = fileBatch.status;
          let batchAttempts = 0;
          const MAX_BATCH_WAIT = 120; // Max 2 Minuten warten
          
          while (batchStatus !== 'completed' && batchStatus !== 'failed' && batchAttempts < MAX_BATCH_WAIT) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
              // @ts-ignore - Vector Stores API ist verfügbar, aber Typen sind noch nicht aktualisiert
              const updatedBatch = await openai.beta.vectorStores.fileBatches.retrieve(
                vectorStore.id,
                fileBatch.id
              );
              batchStatus = updatedBatch.status;
            } catch (batchError: any) {
              console.error('❌ Fehler beim Abrufen des File Batch Status:', batchError);
              // Wenn der Batch nicht abgerufen werden kann, prüfe ob er vielleicht doch fertig ist
              if (batchAttempts > 10) {
                console.warn('⚠️ File Batch Status kann nicht abgerufen werden, versuche fortzufahren...');
                break; // Versuche fortzufahren
              }
            }
            batchAttempts++;
            if (batchAttempts % 10 === 0) {
              console.log('⏳ Warte auf File Batch Verarbeitung... Status:', batchStatus, 'Versuch:', batchAttempts);
            }
          }
          
          if (batchStatus === 'failed') {
            console.error('❌ File Batch fehlgeschlagen');
            throw new Error('Dateien konnten nicht zum Vector Store hinzugefügt werden.');
          }
          
          if (batchStatus !== 'completed' && batchAttempts >= MAX_BATCH_WAIT) {
            console.warn('⚠️ File Batch Timeout nach', MAX_BATCH_WAIT, 'Sekunden');
            throw new Error('File Batch Verarbeitung dauerte zu lange. Bitte versuche es erneut.');
          }
          
          console.log('✅ File Batch abgeschlossen nach', batchAttempts, 'Sekunden');
          
          // Erstelle Assistant mit File Search und Vector Store
          assistant = await openai.beta.assistants.create({
          name: 'Sinispace Chat',
          model: 'gpt-4o',
          instructions: 'Du bist Sinispace, ein warmer, empathischer und hochintelligenter KI-Begleiter. Nutze Markdown, Tabellen und Emojis. Sei hilfreich. Du kannst Bilder sehen und analysieren, sowie Dokumente lesen. Nutze die hochgeladenen Dateien als Kontext für deine Antwort.',
          tools: [{ type: 'file_search' }],
          tool_resources: {
            file_search: {
              vector_store_ids: [vectorStore.id], // Vector Store mit den Dateien
            },
          },
        });

          console.log('✅ Assistant erstellt:', assistant.id);

          // Erstelle Thread mit Messages (Dokumente sind bereits im Vector Store, keine Attachments nötig)
          // Wenn es auch Bilder gibt, müssen wir diese separat hinzufügen
          const threadMessages = messages.map((msg, idx) => {
            const messageContent: any = {
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
            };
            
            // Wenn es die letzte User-Nachricht ist UND es Bilder gibt, füge diese als Attachments hinzu
            // (Dokumente sind bereits im Vector Store)
            if (msg.role === 'user' && idx === messages.length - 1 && imageFileIds.length > 0) {
              // Bilder können als Attachments hinzugefügt werden (für Vision API im Assistant)
              // Aber eigentlich sollten Bilder über Vision API verarbeitet werden, nicht hier
              // Für jetzt: Nur Dokumente im Vector Store, Bilder ignorieren wir hier (sollten bereits oben verarbeitet werden)
              console.log('⚠️ Gemischte Dateien: Dokumente im Vector Store, Bilder sollten separat verarbeitet werden');
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
              
              // Cleanup: Assistant und Vector Store löschen
              try {
                await openai.beta.assistants.delete(assistant.id);
                console.log('✅ Assistant gelöscht');
              } catch (cleanupError) {
                console.warn('⚠️ Fehler beim Löschen des Assistants:', cleanupError);
              }
              
              try {
                // @ts-ignore - Vector Stores API ist verfügbar, aber Typen sind noch nicht aktualisiert
                await openai.beta.vectorStores.del(vectorStore.id);
                console.log('✅ Vector Store gelöscht');
              } catch (cleanupError) {
                console.warn('⚠️ Fehler beim Löschen des Vector Stores:', cleanupError);
              }
              
              return { result };
            }
          }

          // Cleanup: Assistant und Vector Store löschen
          try {
            await openai.beta.assistants.delete(assistant.id);
            console.log('✅ Assistant gelöscht');
          } catch (cleanupError) {
            console.warn('⚠️ Fehler beim Löschen des Assistants:', cleanupError);
          }
          
          try {
            // @ts-ignore - Vector Stores API ist verfügbar, aber Typen sind noch nicht aktualisiert
            await openai.beta.vectorStores.del(vectorStore.id);
            console.log('✅ Vector Store gelöscht');
          } catch (cleanupError) {
            console.warn('⚠️ Fehler beim Löschen des Vector Stores:', cleanupError);
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
          
          // Cleanup im Fehlerfall: Vector Store und Assistant löschen (falls erstellt)
          try {
            if (vectorStore?.id) {
              // @ts-ignore - Vector Stores API ist verfügbar, aber Typen sind noch nicht aktualisiert
              await openai.beta.vectorStores.del(vectorStore.id);
              console.log('✅ Vector Store im Fehlerfall gelöscht');
            }
            if (assistant?.id) {
              await openai.beta.assistants.delete(assistant.id);
              console.log('✅ Assistant im Fehlerfall gelöscht');
            }
          } catch (cleanupError) {
            console.warn('⚠️ Fehler beim Cleanup:', cleanupError);
          }
          
          // Fallback zu normaler Chat-API
          // (wird unten weitergeführt)
        }
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