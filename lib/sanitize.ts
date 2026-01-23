/**
 * Sicherheits-Utilities für Input-Sanitization
 */

/**
 * Sanitized einen Dateinamen - entfernt gefährliche Zeichen
 * Erlaubt: Buchstaben, Zahlen, Leerzeichen, Bindestrich, Unterstrich, Punkt
 */
export function sanitizeFileName(fileName: string): string {
  // Entferne Pfad-Traversal-Versuche
  let sanitized = fileName.replace(/\.\./g, ''); // ../ entfernen
  sanitized = sanitized.replace(/[\/\\]/g, ''); // Slashes entfernen
  
  // Erlaube nur sichere Zeichen: a-z, A-Z, 0-9, Leerzeichen, -, _, ., und Umlaute
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_.äöüÄÖÜß]/g, '');
  
  // Entferne führende/abschließende Punkte und Leerzeichen
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '').trim();
  
  // Maximal 255 Zeichen (Dateisystem-Limit)
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    const name = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = name.substring(0, 255 - ext.length) + ext;
  }
  
  // Fallback: Wenn leer, generiere sicheren Namen
  if (!sanitized || sanitized.length === 0) {
    sanitized = `file_${Date.now()}`;
  }
  
  return sanitized;
}

/**
 * Sanitized Text-Input - entfernt HTML-Tags und gefährliche Zeichen
 * Erlaubt: Alle Zeichen außer HTML-Tags
 */
export function sanitizeText(input: string, maxLength?: number): string {
  if (!input) return '';
  
  let sanitized = input.trim();
  
  // Entferne HTML-Tags (einfache Variante)
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Entferne gefährliche JavaScript-Event-Handler
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  // Max-Länge prüfen
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Sanitized E-Mail-Adresse - entfernt gefährliche Zeichen
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  // Trim und lowercase
  let sanitized = email.trim().toLowerCase();
  
  // Entferne gefährliche Zeichen (E-Mail sollte nur bestimmte Zeichen enthalten)
  sanitized = sanitized.replace(/[^a-zA-Z0-9@._+-]/g, '');
  
  return sanitized;
}

/**
 * Sanitized Chat-Titel oder User-Name
 */
export function sanitizeName(name: string, maxLength: number = 100): string {
  if (!name) return '';
  
  let sanitized = name.trim();
  
  // Entferne HTML-Tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Entferne gefährliche Zeichen, aber erlaube Umlaute und normale Sonderzeichen
  sanitized = sanitized.replace(/[<>\"'&]/g, '');
  
  // Max-Länge
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}
