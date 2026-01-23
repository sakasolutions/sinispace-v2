/**
 * Rate Limiting Utilities
 */

import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

/**
 * Prüft Rate Limit für Login/Register
 * @param email E-Mail-Adresse
 * @param maxAttempts Maximale Versuche
 * @param windowMinutes Zeitfenster in Minuten
 * @returns true wenn erlaubt, false wenn blockiert
 */
export async function checkRateLimit(
  email: string,
  maxAttempts: number = 5,
  windowMinutes: number = 15
): Promise<{ allowed: boolean; remainingAttempts: number; resetAt: Date }> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - windowMinutes);

  // IP-Adresse aus Headers holen (falls verfügbar)
  let ipAddress: string | null = null;
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    ipAddress = forwardedFor?.split(',')[0] || realIp || null;
  } catch {
    // Headers nicht verfügbar (z.B. in Server Actions)
    ipAddress = null;
  }

  // Zähle fehlgeschlagene Versuche in Zeitfenster
  let failedAttempts = 0;
  try {
    failedAttempts = await prisma.loginAttempt.count({
      where: {
        email,
        success: false,
        createdAt: {
          gte: windowStart,
        },
      },
    });
  } catch (error: any) {
    // Tabelle existiert noch nicht - Rate Limiting deaktiviert
    if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('LoginAttempt')) {
      console.log('[RATE_LIMIT] ⚠️ LoginAttempt Tabelle existiert noch nicht, Rate Limiting deaktiviert');
      return {
        allowed: true,
        remainingAttempts: maxAttempts,
        resetAt: new Date(Date.now() + windowMinutes * 60000),
      };
    }
    throw error;
  }

  // Zähle auch IP-basierte Versuche (zusätzlicher Schutz)
  let ipAttempts = 0;
  if (ipAddress) {
    try {
      ipAttempts = await prisma.loginAttempt.count({
        where: {
          ipAddress,
          success: false,
          createdAt: {
            gte: windowStart,
          },
        },
      });
    } catch (error: any) {
      // Ignoriere Fehler bei IP-Check
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        ipAttempts = 0;
      }
    }
  }

  // Blockiere wenn zu viele Versuche (Email ODER IP)
  const totalAttempts = Math.max(failedAttempts, ipAttempts);
  const allowed = totalAttempts < maxAttempts;
  const remainingAttempts = Math.max(0, maxAttempts - totalAttempts);

  // Reset-Zeitpunkt berechnen
  const resetAt = new Date();
  resetAt.setMinutes(resetAt.getMinutes() + windowMinutes);

  return {
    allowed,
    remainingAttempts,
    resetAt,
  };
}

/**
 * Speichert einen Login-Versuch
 */
export async function recordLoginAttempt(
  email: string,
  success: boolean
): Promise<void> {
  let ipAddress: string | null = null;
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    ipAddress = forwardedFor?.split(',')[0] || realIp || null;
  } catch {
    // Headers nicht verfügbar
  }

  try {
    await prisma.loginAttempt.create({
      data: {
        email,
        ipAddress,
        success,
      },
    });

    // Alte Einträge löschen (älter als 1 Stunde) - Cleanup
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    try {
      await prisma.loginAttempt.deleteMany({
        where: {
          createdAt: {
            lt: oneHourAgo,
          },
        },
      });
    } catch (cleanupError) {
      // Cleanup-Fehler ignorieren
    }
  } catch (error: any) {
    // Rate Limiting sollte nicht die App crashen
    // Wenn Tabelle nicht existiert, einfach ignorieren
    if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('LoginAttempt')) {
      console.log('[RATE_LIMIT] ⚠️ LoginAttempt Tabelle existiert noch nicht, Versuch nicht geloggt');
      return;
    }
    console.error('[RATE_LIMIT] Fehler beim Speichern:', error);
  }
}
