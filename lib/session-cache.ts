/**
 * In-Memory Cache für revoked Sessions
 * Wird im Edge Runtime (Middleware) genutzt, um ohne Prisma zu prüfen, ob eine Session beendet wurde
 * 
 * WICHTIG: Dieser Cache ist pro Server-Instanz (nicht shared zwischen Instanzen)
 * Für Production mit mehreren Instanzen sollte Redis verwendet werden
 */

// Map: sessionToken -> revoked timestamp
const revokedSessions = new Map<string, number>();

// Map: userId -> revoked timestamp (für "alle Sessions beenden")
const revokedUsers = new Map<string, number>();

// Cleanup: Entferne alte Einträge (älter als 24h)
const CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 Stunden

setInterval(() => {
  const now = Date.now();
  for (const [token, timestamp] of revokedSessions.entries()) {
    if (now - timestamp > CLEANUP_INTERVAL) {
      revokedSessions.delete(token);
    }
  }
  for (const [userId, timestamp] of revokedUsers.entries()) {
    if (now - timestamp > CLEANUP_INTERVAL) {
      revokedUsers.delete(userId);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Markiere eine Session als revoked (beendet)
 */
export function revokeSessionToken(sessionToken: string) {
  revokedSessions.set(sessionToken, Date.now());
}

/**
 * Markiere alle Sessions eines Users als revoked
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
 */
export function isSessionRevoked(sessionToken: string | null | undefined, userId: string | null | undefined): boolean {
  if (!sessionToken && !userId) {
    return false;
  }
  
  // Prüfe ob Session-Token revoked wurde
  if (sessionToken && revokedSessions.has(sessionToken)) {
    return true;
  }
  
  // Prüfe ob User revoked wurde (alle Sessions beendet)
  if (userId && revokedUsers.has(userId)) {
    const revokedAt = revokedUsers.get(userId);
    // Wenn revokedAt existiert und nicht älter als 24h ist
    if (revokedAt && Date.now() - revokedAt < CLEANUP_INTERVAL) {
      return true;
    }
  }
  
  return false;
}

/**
 * Hole sessionToken aus Cookie-String (für Middleware)
 */
export function getSessionTokenFromCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  
  // Suche nach authjs.session-token oder next-auth.session-token
  const patterns = [
    /authjs\.session-token=([^;]+)/,
    /__Secure-authjs\.session-token=([^;]+)/,
    /next-auth\.session-token=([^;]+)/,
    /__Secure-next-auth\.session-token=([^;]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = cookieHeader.match(pattern);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  }
  
  return null;
}
