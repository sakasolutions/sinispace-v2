/**
 * Analytics & Tracking Utilities
 * Automatisches Tracking von User-Aktivitäten und Feature-Nutzung
 */

import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

/**
 * Trackt eine User-Aktivität (Seitenaufruf, Feature-Nutzung, etc.)
 */
export async function trackActivity(
  userId: string,
  action: 'page_view' | 'feature_used' | 'tool_opened' | 'tool_completed' | 'conversion',
  data?: {
    page?: string;
    feature?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    try {
      const headersList = await headers();
      ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || null;
      userAgent = headersList.get('user-agent') || null;
    } catch {
      // Headers nicht verfügbar (z.B. in Server Actions)
    }

    // Prüfe ob Tabelle existiert
    try {
      await prisma.userActivity.create({
        data: {
          userId,
          action,
          page: data?.page || null,
          feature: data?.feature || null,
          metadata: data?.metadata ? JSON.stringify(data.metadata) : null,
          ipAddress,
          userAgent,
        },
      });
    } catch (error: any) {
      // Tabelle existiert noch nicht - ignorieren
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('UserActivity')) {
        console.log('[ANALYTICS] ⚠️ UserActivity Tabelle existiert noch nicht');
        return;
      }
      throw error;
    }
  } catch (error) {
    // Analytics sollten nicht die App crashen
    console.error('[ANALYTICS] Fehler beim Tracking:', error);
  }
}

/**
 * Trackt Feature-Nutzung (Tools, etc.)
 */
export async function trackFeatureUsage(
  userId: string,
  feature: string,
  data?: {
    category?: string;
    duration?: number; // in Sekunden
    success?: boolean;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  try {
    // Prüfe ob Tabelle existiert
    try {
      await prisma.featureUsage.create({
        data: {
          userId,
          feature,
          category: data?.category || null,
          duration: data?.duration || null,
          success: data?.success !== undefined ? data.success : true,
          metadata: data?.metadata ? JSON.stringify(data.metadata) : null,
        },
      });
    } catch (error: any) {
      // Tabelle existiert noch nicht - ignorieren
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('FeatureUsage')) {
        console.log('[ANALYTICS] ⚠️ FeatureUsage Tabelle existiert noch nicht');
        return;
      }
      throw error;
    }
  } catch (error) {
    // Analytics sollten nicht die App crashen
    console.error('[ANALYTICS] Fehler beim Feature-Tracking:', error);
  }
}

/**
 * Holt Analytics-Daten für das Admin-Dashboard
 */
export async function getAnalyticsData(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Prüfe ob Tabellen existieren
    const [activities, features, totalUsers, activeUsers] = await Promise.all([
      // User-Aktivitäten
      prisma.userActivity.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          action: true,
          page: true,
          feature: true,
          createdAt: true,
        },
      }).catch(() => []),

      // Feature-Nutzung
      prisma.featureUsage.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          feature: true,
          category: true,
          success: true,
          createdAt: true,
        },
      }).catch(() => []),

      // Total Users
      prisma.user.count().catch(() => 0),

      // Active Users (letzte 7 Tage)
      prisma.userActivity.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { userId: true },
        distinct: ['userId'],
      }).catch(() => []),
    ]);

    return {
      activities: activities || [],
      features: features || [],
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers?.length || 0,
    };
  } catch (error) {
    console.error('[ANALYTICS] Fehler beim Abrufen der Daten:', error);
    return {
      activities: [],
      features: [],
      totalUsers: 0,
      activeUsers: 0,
    };
  }
}
