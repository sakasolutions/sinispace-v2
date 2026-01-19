/**
 * In-Memory Cache für revoked Sessions
 * Wird im Edge Runtime (Middleware) genutzt, um ohne Prisma zu prüfen, ob eine Session beendet wurde
 * 
 * WICHTIG: Dieser Cache ist pro Server-Instanz (nicht shared zwischen Instanzen)
 * Für Production mit mehreren Instanzen sollte Redis verwendet werden
 * 
 * ARCHITEKTUR:
 * - Bei JWT-Strategy nutzt NextAuth v5 KEINE sessionToken Cookies
 * - Wir speichern userId im Cache, wenn Sessions beendet werden
 * - Middleware prüft userId aus JWT-Token gegen Cache
 */

// Map: userId -> revoked timestamp (für "alle Sessions beenden" oder einzelne Session)
const revokedUsers = new Map<string, number>();

// Cleanup: Entferne alte Einträge (älter als 24h)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 Stunden

setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamp] of revokedUsers.entries()) {
    if (now - timestamp > CLEANUP_INTERVAL) {
      revokedUsers.delete(userId);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Markiere alle Sessions eines Users als revoked
 * Wird aufgerufen, wenn:
 * - Eine Session beendet wird (für diesen User)
 * - Alle anderen Sessions beendet werden
 */
export function revokeUserSessions(userId: string) {
  revokedUsers.set(userId, Date.now());
}

/**
 * Entferne User aus revoked Cache (z.B. nach neuem Login)
 */
export function clearRevokedUser(userId: string) {
  revokedUsers.delete(userId);
}

/**
 * Prüfe ob eine Session revoked wurde (Edge Runtime kompatibel)
 * 
 * WICHTIG: Bei JWT-Strategy haben wir keinen sessionToken aus Cookie
 * Wir prüfen nur die userId aus dem JWT-Token
 */
export function isSessionRevoked(userId: string | null | undefined): boolean {
  if (!userId) {
    return false;
  }
  
  // Prüfe ob User revoked wurde (Sessions beendet)
  if (revokedUsers.has(userId)) {
    const revokedAt = revokedUsers.get(userId);
    // Wenn revokedAt existiert und nicht älter als 24h ist
    if (revokedAt && Date.now() - revokedAt < CLEANUP_INTERVAL) {
      return true;
    }
  }
  
  return false;
}
