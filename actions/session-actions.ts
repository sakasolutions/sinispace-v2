'use server';

import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { signOut } from '@/auth';
import { cookies } from 'next/headers';

const prisma = new PrismaClient();

// Alle aktiven Sessions eines Users abrufen
export async function getSessions() {
  const session = await auth();
  
  if (!session?.user?.id) {
    console.log('[getSessions] ❌ Keine Session oder User-ID');
    return [];
  }

  try {
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

    const result = sortedSessions.map((s, index) => ({
      id: s.id,
      expires: s.expires,
      createdAt: s.createdAt || s.expires, // Falls createdAt fehlt, verwende expires als Fallback
      isCurrent: index === 0, // Die neueste Session ist die aktuelle
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

    // Wenn es die aktuelle Session sein könnte, User ausloggen
    // (Mit JWT können wir nicht genau bestimmen, also loggen wir aus, wenn es die neueste Session ist)
    const allSessions = await prisma.session.findMany({
      where: {
        userId: session.user.id,
        expires: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (allSessions.length === 0 || allSessions[0].id === sessionId) {
      // Keine Sessions mehr oder es war die neueste → ausloggen
      await signOut({ redirectTo: '/login' });
    }

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
    // Finde die neueste Session (wahrscheinlich die aktuelle)
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

    // Alle anderen Sessions löschen
    await prisma.session.deleteMany({
      where: {
        userId: session.user.id,
        id: { not: latestSession.id },
      },
    });

    return { success: true, message: 'Alle anderen Sessions wurden beendet' };
  } catch (error) {
    console.error('Error revoking all sessions:', error);
    return { success: false, error: 'Fehler beim Beenden der Sessions' };
  }
}
