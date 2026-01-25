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

// --- RECHTSTEXTE & FORMALES ---
export async function generateLegal(prevState: any, formData: FormData) {
  // 1. Premium-Check
  const isAllowed = await isUserPremium();
  if (!isAllowed) return { result: UPSELL_MESSAGE };

  const mode = formData.get('mode') as string;
  const details = formData.get('details') as string;
  const workspaceId = formData.get('workspaceId') as string || undefined;

  if (!mode || mode.trim() === '') return { error: 'Bitte wähle einen Modus aus.' };
  if (!details || details.trim().length === 0) {
    return { error: 'Bitte fülle alle erforderlichen Felder aus.' };
  }

  // System-Prompt je nach Modus
  let modeInstruction = '';
  let userPrompt = '';

  if (mode === 'cancellation') {
    modeInstruction = `Erstelle eine rechtssichere Kündigung.
- Tonfall: Streng sachlich, höflich, juristisch präzise.
- Fordere eine Bestätigung des Kündigungstermins.
- Zitiere relevante Paragrafen (z.B. BGB § 314 bei Dauerschuldverhältnissen), wenn es den Standpunkt stärkt.
- Formatierung: Nutze Markdown für Fettdruck wichtiger Fristen und Termine.
- Struktur: Betreff, Anrede, Kündigungserklärung mit Termin, Bestätigungsaufforderung, Grußformel.`;
    
    const partner = formData.get('partner') as string || '';
    const customerNumber = formData.get('customerNumber') as string || '';
    const desiredDate = formData.get('desiredDate') as string || '';
    
    userPrompt = `Kündigung erstellen:
Vertragspartner: ${partner}
${customerNumber ? `Kundennummer: ${customerNumber}` : ''}
${desiredDate ? `Gewünschtes Kündigungsdatum: ${desiredDate}` : ''}
Zusätzliche Details: ${details}`;

  } else if (mode === 'reminder') {
    modeInstruction = `Erstelle eine rechtssichere Mahnung.
- Tonfall: Streng sachlich, höflich, juristisch präzise.
- Setze eine klare Zahlungsfrist (z.B. 14 Tage).
- Drohe rechtliche Schritte an (z.B. "Wir behalten uns vor, rechtliche Schritte einzuleiten").
- Zitiere relevante Paragrafen (z.B. BGB § 286 Verzug), wenn es den Standpunkt stärkt.
- Formatierung: Nutze Markdown für Fettdruck wichtiger Fristen und Beträge.
- Struktur: Betreff, Anrede, Rechnungsdetails, Zahlungsaufforderung mit Frist, Rechtsfolgen, Grußformel.`;
    
    const debtorName = formData.get('debtorName') as string || '';
    const invoiceNumber = formData.get('invoiceNumber') as string || '';
    const amount = formData.get('amount') as string || '';
    const dueSince = formData.get('dueSince') as string || '';
    
    userPrompt = `Mahnung erstellen:
Schuldner: ${debtorName}
Rechnungsnummer: ${invoiceNumber}
Offener Betrag: ${amount}
Fällig seit: ${dueSince}
Zusätzliche Details: ${details}`;

  } else if (mode === 'contract') {
    modeInstruction = `Erstelle eine saubere Vertragsstruktur.
- Tonfall: Streng sachlich, höflich, juristisch präzise.
- Struktur: Parteien, Leistung, Vergütung, Laufzeit, Kündigung, Schlussbestimmungen.
- Zitiere relevante Paragrafen (z.B. BGB § 611 bei Dienstverträgen), wenn es den Standpunkt stärkt.
- Formatierung: Nutze Markdown für Überschriften und wichtige Abschnitte.
- WICHTIG: Erstelle KEINEN kompletten Vertrag, sondern eine strukturierte Vorlage mit Platzhaltern.`;
    
    userPrompt = `Vertragsvorlage erstellen:
Was soll geregelt werden: ${details}`;

  } else if (mode === 'dispute') {
    modeInstruction = `Erstelle eine rechtssichere Beschwerde/Einspruch/Mangelrüge.
- Tonfall: Streng sachlich, höflich, juristisch präzise.
- Berufe dich auf Gewährleistungsrechte (z.B. BGB § 437, § 439).
- Setze eine angemessene Frist für die Mängelbeseitigung oder Ersatzlieferung.
- Zitiere relevante Paragrafen, wenn es den Standpunkt stärkt.
- Formatierung: Nutze Markdown für Fettdruck wichtiger Fristen und Rechtsansprüche.
- Struktur: Betreff, Anrede, Sachverhalt, Rechtsgrundlage, Forderung, Frist, Grußformel.`;
    
    userPrompt = `Beschwerde/Einspruch erstellen:
Was ist passiert: ${details}`;
  }

  const systemPrompt = `Du bist ein erfahrener deutscher Jurist. Erstelle basierend auf der Auswahl ein rechtssicheres, formelles Schreiben.

${modeInstruction}

WICHTIG:
- Tonfall: Streng sachlich, höflich, juristisch präzise.
- Zitiere relevante Paragrafen (BGB), wenn es den Standpunkt stärkt.
- Formatierung: Nutze Markdown für Fettdruck wichtiger Fristen.
- Antworte NUR mit dem formulierten Text, ohne zusätzliche Erklärungen.
- Füge am Ende einen Platzhalter ein: '[Bitte prüfen Sie diesen Entwurf auf Ihre spezifische Situation]'`;

  try {
    const response = await createChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Niedriger für präzise juristische Texte
    }, 'legal', 'Rechtstexte & Formales');

    const result = response.choices[0].message.content;
    if (!result) {
      return { error: 'Keine Antwort von der KI erhalten.' };
    }

    // Speichere in Chat
    const modeLabels: Record<string, string> = {
      cancellation: 'Kündigung',
      reminder: 'Mahnung',
      contract: 'Vertrag',
      dispute: 'Beschwerde/Einspruch',
    };
    const userInput = `Modus: ${modeLabels[mode] || mode}, Details: ${details.substring(0, 100)}${details.length > 100 ? '...' : ''}`;
    await createHelperChat('legal', userInput, result);

    // Result in Workspace speichern
    await saveResult(
      'legal',
      'Rechtstexte & Formales',
      result,
      workspaceId,
      `${modeLabels[mode] || mode}`,
      JSON.stringify({ mode, detailsLength: details.length })
    );

    return { result };
  } catch (error: any) {
    console.error('Legal generation error:', error);
    return { error: 'Fehler beim Generieren des Rechtstexts. Bitte versuche es erneut.' };
  }
}
