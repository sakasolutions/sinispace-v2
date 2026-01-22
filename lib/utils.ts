/**
 * Kombiniert Klassen zu einem String. Ignoriert undefined/false.
 */
export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
