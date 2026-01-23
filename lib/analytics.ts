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
    const [activities, features, totalUsers, activeUsers, usersWithLastLogin] = await Promise.all([
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

      // Users mit Last Login (für Statistiken)
      prisma.user.findMany({
        select: {
          id: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }).catch(() => []),
    ]);

    // Berechne Login-Statistiken
    const usersWithLogins = (usersWithLastLogin || []).filter((u: any) => u.lastLoginAt);
    const recentLogins = (usersWithLastLogin || []).filter((u: any) => 
      u.lastLoginAt && new Date(u.lastLoginAt) >= startDate
    ).length;

    return {
      activities: activities || [],
      features: features || [],
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers?.length || 0,
      usersWithLogins: usersWithLogins.length,
      recentLogins,
    };
  } catch (error) {
    console.error('[ANALYTICS] Fehler beim Abrufen der Daten:', error);
    return {
      activities: [],
      features: [],
      totalUsers: 0,
      activeUsers: 0,
      usersWithLogins: 0,
      recentLogins: 0,
    };
  }
}

/**
 * Holt userbezogene Analytics-Daten
 */
export async function getUserAnalytics(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Hole alle User mit ihren Statistiken
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        lastLoginAt: true,
        subscriptionEnd: true,
      },
    }).catch(() => []);

    // Hole Aktivitäten und Feature-Nutzung
    const [activities, featureUsages, chats, documents] = await Promise.all([
      prisma.userActivity.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          userId: true,
          action: true,
          page: true,
          feature: true,
          createdAt: true,
        },
      }).catch(() => []),

      prisma.featureUsage.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          userId: true,
          feature: true,
          success: true,
          createdAt: true,
        },
      }).catch(() => []),

      prisma.chat.findMany({
        select: {
          userId: true,
          createdAt: true,
        },
      }).catch(() => []),

      prisma.document.findMany({
        select: {
          userId: true,
          createdAt: true,
        },
      }).catch(() => []),
    ]);

    // Berechne Statistiken pro User
    const userStats = users.map((user) => {
      const userActivities = (activities || []).filter((a: any) => a.userId === user.id);
      const userFeatures = (featureUsages || []).filter((f: any) => f.userId === user.id);
      const userChats = (chats || []).filter((c: any) => c.userId === user.id);
      const userDocuments = (documents || []).filter((d: any) => d.userId === user.id);

      // Feature-Nutzung gruppieren
      const featureCounts: Record<string, number> = {};
      userFeatures.forEach((f: any) => {
        featureCounts[f.feature] = (featureCounts[f.feature] || 0) + 1;
      });

      // Erfolgsrate
      const successfulFeatures = userFeatures.filter((f: any) => f.success).length;
      const successRate = userFeatures.length > 0 
        ? ((successfulFeatures / userFeatures.length) * 100).toFixed(1) 
        : '0';

      // Letzte Aktivität
      const allActivities = [
        ...userActivities.map((a: any) => a.createdAt),
        ...userFeatures.map((f: any) => f.createdAt),
        ...userChats.map((c: any) => c.createdAt),
        ...userDocuments.map((d: any) => d.createdAt),
      ];
      const lastActivity = allActivities.length > 0
        ? new Date(Math.max(...allActivities.map((d: any) => new Date(d).getTime())))
        : null;

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
          isPremium: user.subscriptionEnd ? new Date(user.subscriptionEnd) > new Date() : false,
        },
        stats: {
          totalActivities: userActivities.length,
          totalFeatures: userFeatures.length,
          totalChats: userChats.length,
          totalDocuments: userDocuments.length,
          successRate: parseFloat(successRate),
          topFeatures: Object.entries(featureCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([feature, count]) => ({ feature, count })),
          lastActivity,
        },
      };
    });

    // Sortiere nach Aktivität (letzte Aktivität zuerst)
    userStats.sort((a, b) => {
      if (!a.stats.lastActivity && !b.stats.lastActivity) return 0;
      if (!a.stats.lastActivity) return 1;
      if (!b.stats.lastActivity) return -1;
      return b.stats.lastActivity.getTime() - a.stats.lastActivity.getTime();
    });

    return userStats;
  } catch (error) {
    console.error('[ANALYTICS] Fehler beim Abrufen der User-Analytics:', error);
    return [];
  }
}
