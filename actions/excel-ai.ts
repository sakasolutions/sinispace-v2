'use server';

import { openai } from '@/lib/openai';
import { isUserPremium } from '@/lib/subscription';
import { createHelperChat } from '@/actions/chat-actions';

// --- HILFS-NACHRICHT FÜR FREE USER ---
const UPSELL_MESSAGE = `### 🔒 Premium Feature

Diese Funktion steht nur **Pro-Usern** zur Verfügung.
Upgrade deinen Account, um unbegrenzten Zugriff auf alle KI-Tools zu erhalten.

[👉 **Hier klicken zum Freischalten**](/settings)`;

// --- EXCEL-COACH ---
export async function generateExcel(prevState: any, formData: FormData) {
  // 1. Premium-Check
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const mode = formData.get('mode') as string;
  const software = formData.get('software') as string;
  const query = formData.get('query') as string;

  if (!mode || mode.trim() === '') return { error: 'Bitte wähle einen Modus aus.' };
  if (!software || software.trim() === '') return { error: 'Bitte wähle eine Software aus.' };
  if (!query || query.trim().length === 0) {
    return { error: 'Bitte gib deine Anfrage ein.' };
  }

  // Software-spezifische Syntax-Anweisungen
  let softwareInstruction = '';
  if (software === 'excel-de') {
    softwareInstruction = `WICHTIG: Du arbeitest mit Excel (Deutsch).
- Nutze IMMER deutsche Funktionsnamen: WENN, SVERWEIS, SUMMEWENN, ZÄHLENWENN, WENNS, INDEX, VERGLEICH, etc.
- Trennzeichen ist IMMER Semikolon (;), NICHT Komma.
- Beispiel korrekte Syntax: =SUMMEWENN(B2:B500;"Bezahlt";A2:A500)
- Beispiel falsch: =SUMIF(B2:B500,"Paid",A2:A500) ❌`;
  } else if (software === 'excel-en') {
    softwareInstruction = `WICHTIG: Du arbeitest mit Excel (English/International).
- Nutze IMMER englische Funktionsnamen: IF, VLOOKUP, SUMIF, COUNTIF, IFS, INDEX, MATCH, etc.
- Trennzeichen ist IMMER Komma (,), NICHT Semikolon.
- Beispiel korrekte Syntax: =SUMIF(B2:B500,"Paid",A2:A500)
- Beispiel falsch: =SUMMEWENN(B2:B500;"Bezahlt";A2:A500) ❌`;
  } else if (software === 'sheets') {
    softwareInstruction = `WICHTIG: Du arbeitest mit Google Sheets.
- Nutze englische Funktionsnamen (IF, VLOOKUP, SUMIF, etc.) - Google Sheets verwendet meist internationale Syntax.
- Trennzeichen kann je nach Region variieren: In Europa oft Semikolon (;), international Komma (,).
- Wenn möglich, nutze Komma (,) als Standard.
- Beispiel: =SUMIF(B2:B500,"Paid",A2:A500) oder =SUMIF(B2:B500;"Bezahlt";A2:A500)`;
  }

  // Modus-spezifische Anweisungen
  let modeInstruction = '';
  let userPrompt = '';

  if (mode === 'generator') {
    modeInstruction = `Der Benutzer möchte eine Formel generiert bekommen.
- Analysiere die Problembeschreibung genau.
- Erstelle die passende Formel mit korrekter Syntax für ${software}.
- Erkläre kurz (2-3 Sätze), wie man die Formel anwendet.
- Format: Zuerst die Formel in einem Code-Block, dann die kurze Erklärung.`;
    userPrompt = `Erstelle eine Formel für folgendes Problem:\n${query}`;
  } else if (mode === 'explainer') {
    modeInstruction = `Der Benutzer möchte eine bestehende Formel erklärt bekommen.
- Analysiere die Formel Schritt für Schritt.
- Erkläre jede Funktion und jeden Parameter.
- Zeige, was die Formel macht und wie sie funktioniert.
- Format: Strukturierte Erklärung mit Beispielen.`;
    userPrompt = `Erkläre mir diese Formel:\n${query}`;
  } else if (mode === 'script') {
    modeInstruction = `Der Benutzer möchte ein Makro/Script für Automatisierung.
- Für Excel: Schreibe VBA-Code.
- Für Google Sheets: Schreibe Google Apps Script (JavaScript).
- Code muss funktionsfähig, gut dokumentiert und praxistauglich sein.
- Format: Vollständiger Code in Code-Block, dann kurze Anleitung zur Anwendung.`;
    userPrompt = `Erstelle ein Script/Makro für:\n${query}`;
  } else if (mode === 'data') {
    modeInstruction = `Der Benutzer hat ein Datenproblem (Duplikate, Trennung, Bereinigung, etc.).
- Analysiere das Problem.
- Erstelle eine Lösung mit Formeln oder Scripts.
- Erkläre Schritt für Schritt, wie man das Problem löst.
- Format: Lösung in Code-Block, dann Anleitung.`;
    userPrompt = `Löse folgendes Datenproblem:\n${query}`;
  }

  const systemPrompt = `Du bist ein Weltklasse-Experte für Tabellenkalkulation mit jahrelanger Erfahrung.

${softwareInstruction}

${modeInstruction}

WICHTIG:
- Output Format: Nutze Markdown Code-Blöcke (\`\`\`) für die Lösung.
- Erkläre kurz (2-4 Sätze), wie man es anwendet.
- Sei präzise und praxisorientiert.
- Antworte NUR mit der Lösung und kurzer Erklärung, keine zusätzlichen Einleitungen.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Niedriger für präzise technische Lösungen
    });

    const result = response.choices[0].message.content;
    if (!result) {
      return { error: 'Keine Antwort von der KI erhalten.' };
    }

    // Speichere in Chat
    const modeLabels: Record<string, string> = {
      generator: 'Formel Generator',
      explainer: 'Formel Erklärer',
      script: 'Makro & Script',
      data: 'Daten-Retter',
    };
    const softwareLabels: Record<string, string> = {
      'excel-de': 'Excel (Deutsch)',
      'excel-en': 'Excel (Englisch)',
      'sheets': 'Google Sheets',
    };
    const userInput = `Modus: ${modeLabels[mode] || mode}, Software: ${softwareLabels[software] || software}, Anfrage: ${query.substring(0, 100)}${query.length > 100 ? '...' : ''}`;
    await createHelperChat('excel', userInput, result);

    return { result };
  } catch (error: any) {
    console.error('Excel generation error:', error);
    return { error: 'Fehler beim Generieren der Lösung. Bitte versuche es erneut.' };
  }
}
