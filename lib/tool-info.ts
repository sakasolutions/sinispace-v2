/**
 * Tool-Informationen für "Was ist das?"-Modals
 */

export type ToolInfo = {
  title: string;
  description: string;
  useCases: string[];
  examples: string[];
  tips: string[];
};

export const toolInfoMap: Record<string, ToolInfo> = {
  // BUSINESS & FINANZEN
  invoice: {
    title: 'Angebot & Rechnung',
    description: 'Erstelle professionelle Rechnungen und Angebote in Sekunden. Das Tool generiert vollständige Dokumente mit allen wichtigen Details, die du dann als PDF exportieren kannst.',
    useCases: [
      'Rechnungen für Kunden erstellen',
      'Angebote für Projekte verfassen',
      'Schnelle Quittungen generieren',
      'Rechnungsvorlagen erstellen'
    ],
    examples: [
      'Rechnung für Webdesign-Projekt, 5.000€, 30 Tage Zahlungsziel',
      'Angebot für Social Media Management, monatlich 800€',
      'Rechnung für Beratungsleistung, 120€/Stunde, 10 Stunden'
    ],
    tips: [
      'Gib alle wichtigen Details an: Betrag, Leistung, Zahlungsziel',
      'Die Rechnung wird automatisch mit deinen Daten formatiert',
      'Du kannst das Ergebnis direkt kopieren oder als PDF speichern'
    ]
  },
  legal: {
    title: 'Rechtstexte & Formales',
    description: 'Erstelle sichere, rechtlich fundierte Texte für Verträge, Kündigungen, AGBs und andere formale Dokumente. Das Tool hilft dir dabei, professionelle und rechtssichere Formulierungen zu finden.',
    useCases: [
      'Kündigungsschreiben verfassen',
      'Vertragsklauseln formulieren',
      'AGBs erstellen',
      'Rechtliche Anfragen formulieren',
      'Mahnungen schreiben'
    ],
    examples: [
      'Kündigung Mietvertrag, fristgerecht, 3 Monate Kündigungsfrist',
      'AGB für Online-Shop, Widerrufsrecht, Datenschutz',
      'Vertragsklausel für Dienstleistungsvertrag'
    ],
    tips: [
      'Gib so viele Details wie möglich an, damit der Text präzise wird',
      'Prüfe wichtige rechtliche Texte immer mit einem Anwalt',
      'Das Tool hilft bei der Formulierung, ersetzt aber keine Rechtsberatung'
    ]
  },
  excel: {
    title: 'Excel-Coach',
    description: 'Dein persönlicher Excel-Experte! Erstelle Formeln, lass dir bestehende Formeln erklären, generiere VBA-Makros oder rette chaotische Daten. Funktioniert mit Excel (DE/EN) und Google Sheets.',
    useCases: [
      'Komplexe Formeln erstellen (z.B. SVERWEIS, WENN-Verschachtelungen)',
      'Bestehende Formeln verstehen lernen',
      'VBA-Makros für Automatisierung generieren',
      'Daten aufräumen (Duplikate entfernen, trennen, formatieren)'
    ],
    examples: [
      'Summiere Spalte A, aber nur wenn in Spalte B "Bezahlt" steht',
      'Erkläre mir diese Formel: =WENN(A2>100;A2*0.1;A2*0.05)',
      'Erstelle ein Makro, das alle leeren Zeilen löscht',
      'Trenne Vor- und Nachnamen aus Spalte A in zwei Spalten'
    ],
    tips: [
      'Wähle die richtige Software (Excel DE/EN oder Sheets) - das ist wichtig für die Syntax!',
      'Beschreibe dein Problem so detailliert wie möglich',
      'Bei Formeln: Gib auch Spaltenbereiche an (z.B. A2:A500)'
    ]
  },

  // KOMMUNIKATION
  email: {
    title: 'Email-Profi',
    description: 'Erstelle perfekte E-Mails für jeden Anlass. Ob Bewerbung, Beschwerde, Anfrage oder Follow-up - das Tool generiert professionelle, stilvolle E-Mails in verschiedenen Sprachen und Tonarten.',
    useCases: [
      'Bewerbungs-E-Mails schreiben',
      'Beschwerden professionell formulieren',
      'Geschäftliche Anfragen verfassen',
      'Follow-up E-Mails nach Meetings',
      'Kündigungen per E-Mail versenden'
    ],
    examples: [
      'Bewerbung als Marketing Manager, freundlich, Deutsch, Sie-Form',
      'Beschwerde über fehlerhafte Lieferung, bestimmt, Englisch',
      'Anfrage für Projektzusammenarbeit, professionell, Französisch'
    ],
    tips: [
      'Wähle den passenden Tonfall - er bestimmt die Wirkung deiner E-Mail',
      'Die Sprache wird natürlich und idiomatisch verwendet (keine wörtlichen Übersetzungen)',
      'Du kannst optional Absender- und Empfänger-Daten angeben'
    ]
  },
  'tough-msg': {
    title: 'Chat-Coach',
    description: 'Finde die perfekte Antwort für schwierige Situationen in WhatsApp, Dating-Apps oder Social Media. Das Tool hilft dir dabei, den richtigen Ton zu treffen - ob locker, professionell oder einfühlsam.',
    useCases: [
      'Schwierige WhatsApp-Nachrichten beantworten',
      'Dating-App Nachrichten optimieren',
      'Social Media Kommentare professionell beantworten',
      'Konflikte in Chats deeskalieren'
    ],
    examples: [
      'Wie antworte ich auf "Warum hast du nicht geantwortet?" - locker, freundlich',
      'Dating-App: Wie schreibe ich nach dem ersten Date?',
      'WhatsApp: Wie sage ich höflich, dass ich keine Zeit habe?'
    ],
    tips: [
      'Beschreibe die Situation so genau wie möglich',
      'Gib an, welchen Ton du treffen möchtest',
      'Das Tool hilft dir, authentisch und gleichzeitig taktvoll zu kommunizieren'
    ]
  },
  translate: {
    title: 'Sprachbrücke',
    description: 'Übersetze nicht nur Wörter, sondern die Bedeutung. Das Tool versteht Kontext und liefert natürliche, idiomatische Übersetzungen - keine wörtlichen Übersetzungen, sondern echte Sprachkompetenz.',
    useCases: [
      'Texte natürlich zwischen Sprachen übersetzen',
      'E-Mails in andere Sprachen übertragen',
      'Dokumente kontext-sensitiv übersetzen',
      'Kulturelle Nuancen verstehen'
    ],
    examples: [
      'Übersetze diesen deutschen Text ins Englische: "Ich hoffe, es geht dir gut"',
      'Übersetze diese E-Mail ins Französische mit professionellem Ton',
      'Übersetze diesen spanischen Text ins Deutsche, behalte den lockeren Ton'
    ],
    tips: [
      'Gib den Kontext an (z.B. "professionell", "locker", "formell")',
      'Das Tool verwendet natürliche Formulierungen der Zielsprache',
      'Bei wichtigen Texten: Lass einen Muttersprachler prüfen'
    ]
  },

  // TEXT & OPTIMIERUNG
  polish: {
    title: 'Wortschliff',
    description: 'Verwandle deine Notizen, Rohtexte oder Brainstorming-Ideen in geschliffene, professionelle Texte. Das Tool verbessert Stil, Grammatik und Lesbarkeit, während deine Kernaussage erhalten bleibt.',
    useCases: [
      'Notizen in professionelle Texte verwandeln',
      'Rohtexte polieren und verbessern',
      'Stil und Grammatik optimieren',
      'Texte für verschiedene Zielgruppen anpassen'
    ],
    examples: [
      'Polier diesen Rohtext: "Das Meeting war gut, wir haben viel besprochen"',
      'Verbessere diesen Text für eine Präsentation',
      'Mache diesen Text professioneller, behalte aber den lockeren Ton'
    ],
    tips: [
      'Gib an, welchen Stil du möchtest (professionell, locker, wissenschaftlich)',
      'Das Tool behält deine Kernaussage bei, verbessert aber Formulierung und Struktur',
      'Du kannst auch nur einzelne Absätze polieren lassen'
    ]
  },
  summarize: {
    title: 'Klartext',
    description: 'Fasse lange Dokumente, Artikel oder Texte prägnant zusammen. Das Tool extrahiert die wichtigsten Punkte und spart dir wertvolle Lesezeit, ohne wichtige Informationen zu verlieren.',
    useCases: [
      'Lange Artikel zusammenfassen',
      'Meeting-Notizen komprimieren',
      'Dokumente auf das Wesentliche reduzieren',
      'Lange E-Mails auf den Punkt bringen'
    ],
    examples: [
      'Fasse diesen 10-seitigen Artikel über KI zusammen',
      'Komprimiere diese Meeting-Notizen auf die wichtigsten Punkte',
      'Reduziere diesen langen Bericht auf 3 Hauptpunkte'
    ],
    tips: [
      'Du kannst angeben, wie lang die Zusammenfassung sein soll',
      'Das Tool behält die wichtigsten Informationen und Fakten',
      'Perfekt für schnelle Übersichten über komplexe Themen'
    ]
  },

  // LIFESTYLE
  recipe: {
    title: 'Gourmet-Planer',
    description: 'Was koche ich heute? Gib deine vorhandenen Zutaten an und das Tool schlägt dir passende, leckere Rezepte vor. Perfekt für spontanes Kochen ohne Einkaufen!',
    useCases: [
      'Rezepte basierend auf vorhandenen Zutaten finden',
      'Spontane Kochideen bekommen',
      'Resteverwertung kreativ gestalten',
      'Neue Rezepte mit bekannten Zutaten entdecken'
    ],
    examples: [
      'Ich habe: Huhn, Tomaten, Zwiebeln, Nudeln - was kann ich kochen?',
      'Rezept mit: Lachs, Spinat, Knoblauch, Zitrone',
      'Was koche ich mit den Resten: Kartoffeln, Eier, Käse, Brot?'
    ],
    tips: [
      'Liste alle vorhandenen Zutaten auf',
      'Du kannst auch Präferenzen angeben (vegetarisch, scharf, etc.)',
      'Das Tool schlägt auch Variationen und Alternativen vor'
    ]
  },
  travel: {
    title: 'Travel-Agent',
    description: 'Erstelle komplette Reise-Routen inkl. Tagesplan, Hidden Gems und lokalen Food-Tipps. Ideal für Kurztrips oder intensive Städtetrips.',
    useCases: [
      'Wochenendtrip mit klarer Tagesstruktur planen',
      'Reise nach Budget und Vibe ausrichten',
      'Schnelle, logische Routen ohne Hin-und-Her',
      'Lokale Highlights + Geheimtipps finden'
    ],
    examples: [
      '3 Tage in Lissabon, Budget: Mittel, Vibe: Foodie & Kultur',
      '5 Tage in Barcelona, Budget: Low Budget, Vibe: Party',
      '2 Tage in Wien, Budget: Luxus, Vibe: Kultur & Entspannung'
    ],
    tips: [
      'Halte die Tagezahl niedrig für maximale Präzision',
      'Mehrere Vibes kombinieren erzeugt abwechslungsreiche Tage',
      'Budget beeinflusst Restaurant- und Aktivitätswahl'
    ]
  },
  'shopping-list': {
    title: 'SiniSpace Einkaufslisten',
    description: 'Smart Einkaufslisten mit KI: Mehrere Listen (Supermarkt, Drogerie, …), Einzel-Item oder Liste einfügen (z.B. aus WhatsApp). KI korrigiert Tippfehler, schätzt Preise (DE), ordnet Kategorien zu. Aggregation: z.B. „Tomaten“ + „Tomaten“ = eine Zeile mit addierter Menge.',
    useCases: [
      'Mehrere Listen für verschiedene Einkäufe (Supermarkt, Drogerie, etc.)',
      'Liste aus WhatsApp einfügen – jedes Item wird einzeln analysiert',
      'Geschätztes Budget live (Summe ca. XX €)',
      'Kategorien wie Obst & Gemüse, Kühlregal, Fleisch mit Icons'
    ],
    examples: [
      'Einzel-Item: „2 kg Tomaten“ oder „Milch“',
      'Liste einfügen: Zeilen oder Komma-getrennt wie aus WhatsApp',
      'Liste "Geburtstag" mit Geschenk, Torte, Deko'
    ],
    tips: [
      'Paste Magic: Liste einfügen → Zeilen/Kommas werden erkannt',
      'Erledigte Items rutschen in „Erledigt“',
      'Premium für KI-Features (Korrektur, Preis, Kategorien)'
    ]
  }
};
