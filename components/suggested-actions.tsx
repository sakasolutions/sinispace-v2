'use client';

interface SuggestedActionsProps {
  content: string;
  onActionClick: (prompt: string) => void;
}

type ActionChip = {
  label: string;
  prompt?: string; // Wenn undefined, ist es eine spezielle Aktion (z.B. mailto)
  action?: 'mailto';
};

/**
 * SuggestedActions - Smart Action Chips unter der letzten KI-Antwort
 * 
 * Analysiert den Content und bietet kontextbezogene Aktionen an:
 * - E-Mail: Kürzen, Förmlicher, Translate, Mail-App öffnen
 * - Code: Debuggen, Erklären, Optimieren
 * - Default: Danke, Weiter ausführen, Zusammenfassen
 */
export function SuggestedActions({ content, onActionClick }: SuggestedActionsProps) {
  // Kontext-Erkennung basierend auf Keywords
  const detectContext = (text: string): 'email' | 'code' | 'default' => {
    const lowerText = text.toLowerCase();
    
    // E-Mail Erkennung
    if (
      lowerText.includes('betreff:') ||
      lowerText.includes('sehr geehrte') ||
      lowerText.includes('liebe') ||
      lowerText.includes('lieber') ||
      lowerText.includes('mit freundlichen grüßen') ||
      lowerText.includes('beste grüße') ||
      lowerText.includes('viele grüße')
    ) {
      return 'email';
    }
    
    // Code Erkennung (Code-Blöcke mit ```)
    if (text.includes('```')) {
      return 'code';
    }
    
    return 'default';
  };

  const context = detectContext(content);

  // Chips basierend auf Kontext
  const getChips = (): ActionChip[] => {
    switch (context) {
      case 'email':
        return [
          { label: '✂️ Kürzen', prompt: 'Bitte kürze den obigen Text, behalte aber die Kernaussage bei.' },
          { label: '👔 Förmlicher', prompt: 'Bitte mache den obigen Text förmlicher und professioneller.' },
          { label: '🇬🇧 Translate to English', prompt: 'Bitte übersetze den obigen Text ins Englische.' },
          { label: '📧 In Mail-App öffnen', action: 'mailto' },
        ];
      case 'code':
        return [
          { label: '🐞 Debuggen', prompt: 'Bitte analysiere den obigen Code auf mögliche Fehler und gib Verbesserungsvorschläge.' },
          { label: '📖 Erklären', prompt: 'Bitte erkläre den obigen Code Schritt für Schritt.' },
          { label: '⚡ Optimieren', prompt: 'Bitte optimiere den obigen Code hinsichtlich Performance und Best Practices.' },
        ];
      default:
        return [
          { label: '🙏 Danke', prompt: 'Vielen Dank für deine Hilfe!' },
          { label: '➡️ Weiter ausführen', prompt: 'Bitte führe das Thema weiter aus und gehe noch mehr ins Detail.' },
          { label: '📝 Zusammenfassen', prompt: 'Bitte fasse die obigen Informationen kurz zusammen.' },
        ];
    }
  };

  const chips = getChips();

  const handleClick = (chip: ActionChip) => {
    if (chip.action === 'mailto') {
      // Spezielle Aktion: Mail-App öffnen
      const subjectMatch = content.match(/betreff:\s*(.+)/i);
      const subject = subjectMatch ? subjectMatch[1].trim() : '';
      
      // Versuche E-Mail-Text zu extrahieren (alles nach "Betreff:" oder ab Anfang)
      let body = content;
      if (subjectMatch) {
        // Entferne "Betreff:" und Subject aus Body
        body = content.replace(/betreff:\s*.+/i, '').trim();
      }
      
      // URL Encoding für mailto
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject || '')}&body=${encodeURIComponent(body)}`;
      window.location.href = mailtoUrl;
      return;
    }

    // Normale Aktion: Prompt senden
    if (chip.prompt) {
      onActionClick(chip.prompt);
    }
  };

  if (chips.length === 0) return null;

  return (
    <div className="mt-3 overflow-x-auto">
      <div className="flex gap-2 pb-2 scrollbar-hide">
        {chips.map((chip, index) => (
          <button
            key={index}
            onClick={() => handleClick(chip)}
            className="shrink-0 px-3 py-1.5 rounded-full border border-white/10 bg-zinc-900/50 text-xs text-zinc-300 hover:bg-zinc-800 hover:border-white/20 transition-all whitespace-nowrap"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
