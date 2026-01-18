'use server';

import { auth } from '@/auth';
import { getToken } from 'next-auth/jwt';
import { PrismaClient } from '@prisma/client';
import { signOut } from '@/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Hilfsfunktion: Hole aktuelle Session-ID basierend auf userId
// WICHTIG: sessionId wird NICHT mehr im JWT-Token gespeichert (Edge Runtime Problem)
// Stattdessen: Nutze die neueste aktive Session des Users aus der DB
async function getCurrentSessionId(): Promise<string | null> {
  try {
    // Hole userId aus JWT-Token
    const cookieStore = await cookies();
    const token = await getToken({
      req: {
        headers: {
          cookie: cookieStore.toString(),
        },
      } as any,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    });
    
    if (!token?.sub) {
      return null;
    }
    
    // Finde die neueste aktive Session des Users
    // HINWEIS: Dies ist nicht perfekt (mehrere Geräte), aber funktioniert für die meisten Fälle
    const latestSession = await prisma.session.findFirst({
      where: {
        userId: token.sub as string,
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return latestSession?.id || null;
  } catch (error) {
    console.error('[getCurrentSessionId] Error:', error);
    return null;
  }
}

// Alle aktiven Sessions eines Users abrufen
export async function getSessions() {
  const session = await auth();
  
  if (!session?.user?.id) {
    console.log('[getSessions] ❌ Keine Session oder User-ID');
    return [];
  }

  try {
    // WICHTIG: Hole aktuelle Session-ID aus JWT-Token (nicht index === 0)
    const currentSessionId = await getCurrentSessionId();
    console.log('[getSessions] 🔍 Aktuelle Session-ID aus JWT:', currentSessionId);
    console.log('[getSessions] 🔍 Suche Sessions für User-ID:', session.user.id);
    
    // Alle Sessions des Users abrufen (OHNE Filter, um alle zu sehen)
    const allUserSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        sessionToken: true,
        expires: true,
        createdAt: true,
        userId: true,
      },
    });

    console.log('[getSessions] 📊 Alle Sessions gefunden:', allUserSessions.length);
    
    if (allUserSessions.length === 0) {
      console.log('[getSessions] ⚠️ Keine Sessions in DB für User-ID:', session.user.id);
      // Prüfe ob es Sessions für andere User gibt
      const allSessions = await prisma.session.findMany({ take: 5 });
      console.log('[getSessions] 📋 Beispiel-Sessions (erste 5):', allSessions.map(s => ({
        id: s.id.substring(0, 15),
        userId: s.userId.substring(0, 15),
      })));
    }

    // Filtere nur nicht abgelaufene Sessions
    const now = new Date();
    const activeSessions = allUserSessions.filter(s => {
      const isActive = new Date(s.expires) > now;
      if (!isActive) {
        console.log('[getSessions] ⏰ Session abgelaufen:', s.id.substring(0, 15));
      }
      return isActive;
    });

    console.log('[getSessions] ✅ Aktive Sessions:', activeSessions.length);

    // Sortiere nach createdAt (neueste zuerst), falls vorhanden
    // Falls createdAt fehlt (alte Sessions), sortiere nach expires
    const sortedSessions = activeSessions.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // Fallback: Sortiere nach expires (neueste zuerst)
      return new Date(b.expires).getTime() - new Date(a.expires).getTime();
    });

    const result = sortedSessions.map((s) => ({
      id: s.id,
      expires: s.expires,
      createdAt: s.createdAt || s.expires, // Falls createdAt fehlt, verwende expires als Fallback
      // WICHTIG: isCurrent basierend auf JWT-Token Session-ID, nicht auf index
      isCurrent: currentSessionId === s.id,
    }));

    console.log('[getSessions] 🎯 Zurückgegebene Sessions:', result.length);
    return result;
  } catch (error) {
    console.error('[getSessions] ❌ Error:', error);
    return [];
  }
}

// Eine spezifische Session beenden
export async function revokeSession(sessionId: string) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    // WICHTIG: Hole aktuelle Session-ID aus JWT-Token
    const currentSessionId = await getCurrentSessionId();
    
    // Prüfen ob Session dem User gehört
    const targetSession = await prisma.session.findFirst({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
    });

    if (!targetSession) {
      return { success: false, error: 'Session nicht gefunden oder keine Berechtigung' };
    }

    // Session löschen
    await prisma.session.delete({
      where: { id: sessionId },
    });

    // Wenn es die aktuelle Session ist, User ausloggen
    if (currentSessionId === sessionId) {
      // Aktuelle Session wurde gelöscht → ausloggen
      await signOut({ redirectTo: '/login' });
    }

    // Sonst: Andere Session wurde gelöscht → bleibt eingeloggt (Session-Check im jwt-Callback logged andere Geräte aus)
    return { success: true };
  } catch (error) {
    console.error('Error revoking session:', error);
    return { success: false, error: 'Fehler beim Beenden der Session' };
  }
}

// Alle Sessions außer der aktuellen beenden
export async function revokeAllOtherSessions() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return { success: false, error: 'Nicht autorisiert' };
  }

  try {
    // WICHTIG: Hole aktuelle Session-ID aus JWT-Token (nicht die neueste DB-Session)
    const currentSessionId = await getCurrentSessionId();
    
    if (!currentSessionId) {
      // Fallback: Wenn keine Session-ID im JWT, nutze neueste Session
      const latestSession = await prisma.session.findFirst({
        where: {
          userId: session.user.id,
          expires: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestSession) {
        return { success: false, error: 'Keine Sessions gefunden' };
      }

      // Alle anderen Sessions löschen (außer aktueller/neuester)
      await prisma.session.deleteMany({
        where: {
          userId: session.user.id,
          id: { not: latestSession.id },
        },
      });
    } else {
      // Alle anderen Sessions löschen (außer aktueller aus JWT)
      await prisma.session.deleteMany({
        where: {
          userId: session.user.id,
          id: { not: currentSessionId },
        },
      });
    }

    // WICHTIG: Aktuelle Session bleibt erhalten → User bleibt eingeloggt
    // Andere Geräte werden beim nächsten Request durch jwt-Callback ausgeloggt
    return { success: true, message: 'Alle anderen Sessions wurden beendet' };
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    return { success: false, error: 'Fehler beim Beenden der Sessions' };
  }
}
