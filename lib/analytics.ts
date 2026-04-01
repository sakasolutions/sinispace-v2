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
    // BI Defaults
    const CHAMPION_ACTIONS_7D = 25; // >X Aktionen in den letzten 7 Tagen
    const now = new Date();
    const start7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const start14d = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      // Legacy-Daten (werden weiterhin zurückgegeben, damit bestehende UI nicht hart bricht)
      activities,
      features,
      totalUsers,

      // BI: Actions pro User (7 Tage)
      activityByUser7d,

      // BI: distinct aktive User (7 Tage & prev 7 Tage)
      activeUsers7d,
      activeUsersPrev7d,

      // BI: Recipe Generations (Result)
      recipeResults7d,

      // BI: Shopping List Updates (UserShoppingLists)
      shoppingListUpdates7d,

      // BI: Avg Feature Latency (duration)
      featureLatencyAgg7d,
    ] = await Promise.all([
      prisma.userActivity.findMany({
        where: { createdAt: { gte: startDate } },
        select: { action: true, page: true, feature: true, createdAt: true },
      }).catch(() => []),

      prisma.featureUsage.findMany({
        where: { createdAt: { gte: startDate } },
        select: { feature: true, category: true, success: true, createdAt: true, duration: true },
      }).catch(() => []),

      prisma.user.count().catch(() => 0),

      prisma.userActivity
        .groupBy({
          by: ['userId'],
          where: { createdAt: { gte: start7d } },
          _count: { _all: true },
        })
        .catch(() => []),

      prisma.userActivity
        .findMany({
          where: { createdAt: { gte: start7d } },
          select: { userId: true },
          distinct: ['userId'],
        })
        .catch(() => []),

      prisma.userActivity
        .findMany({
          where: { createdAt: { gte: start14d, lt: start7d } },
          select: { userId: true },
          distinct: ['userId'],
        })
        .catch(() => []),

      prisma.result
        .findMany({
          where: { toolId: 'recipe', createdAt: { gte: start7d } },
          select: { userId: true, createdAt: true },
        })
        .catch(() => []),

      prisma.userShoppingLists
        .findMany({
          where: { updatedAt: { gte: start7d } },
          select: { userId: true, updatedAt: true },
        })
        .catch(() => []),

      prisma.featureUsage
        .aggregate({
          where: { createdAt: { gte: start7d }, duration: { not: null } },
          _avg: { duration: true },
        })
        .catch(() => ({ _avg: { duration: null } })),
    ]);

    // Champions
    const champions = (activityByUser7d || []).filter((x: any) => (x?._count?._all || 0) > CHAMPION_ACTIONS_7D);
    const championsCount = champions.length;

    // Retention / Wiederkehrende User: aktiv in 7d und in prev 7d
    const set7 = new Set((activeUsers7d || []).map((u: any) => u.userId));
    const setPrev = new Set((activeUsersPrev7d || []).map((u: any) => u.userId));
    let returningUsers7d = 0;
    set7.forEach((id) => {
      if (setPrev.has(id)) returningUsers7d += 1;
    });

    // Funnel – als Users (nicht Events), um echte Journey zu zeigen
    const loginUsers7d = (activeUsers7d || []).length; // Proxy: aktive User via UserActivity (derzeit page_views)
    const recipeUsers7d = new Set((recipeResults7d || []).map((r: any) => r.userId)).size;
    const shoppingListUsers7d = new Set((shoppingListUpdates7d || []).map((s: any) => s.userId)).size;

    // Aha-Moment: Recipe → innerhalb 24h ShoppingList-Update (Proxy)
    const updatesByUser: Map<string, number[]> = new Map();
    (shoppingListUpdates7d || []).forEach((u: any) => {
      const t = new Date(u.updatedAt).getTime();
      const arr = updatesByUser.get(u.userId) || [];
      arr.push(t);
      updatesByUser.set(u.userId, arr);
    });
    updatesByUser.forEach((arr, key) => {
      arr.sort((a, b) => a - b);
      updatesByUser.set(key, arr);
    });

    const usersWithRecipe = new Set<string>();
    const ahaUsers = new Set<string>();
    (recipeResults7d || []).forEach((r: any) => {
      usersWithRecipe.add(r.userId);
      const created = new Date(r.createdAt).getTime();
      const windowEnd = created + 24 * 60 * 60 * 1000;
      const upd = updatesByUser.get(r.userId);
      if (!upd || upd.length === 0) return;
      // finde irgendein update im Zeitfenster (linear ist ok für 7d Datenmengen)
      for (const t of upd) {
        if (t < created) continue;
        if (t <= windowEnd) {
          ahaUsers.add(r.userId);
          break;
        }
        if (t > windowEnd) break;
      }
    });
    const ahaRate = usersWithRecipe.size > 0 ? (ahaUsers.size / usersWithRecipe.size) * 100 : 0;

    // Avg Feature Latency (Sekunden)
    const avgFeatureLatencySec = featureLatencyAgg7d?._avg?.duration ? Number(featureLatencyAgg7d._avg.duration) : null;

    // Power-User Leaderboard (nach Aktionen 7d)
    const leaderboardBase = (activityByUser7d || [])
      .map((x: any) => ({ userId: x.userId, actions: x._count?._all || 0 }))
      .sort((a: any, b: any) => b.actions - a.actions)
      .slice(0, 25);

    const leaderboardUserIds = leaderboardBase.map((x: any) => x.userId);
    const users = await prisma.user
      .findMany({
        where: { id: { in: leaderboardUserIds } },
        select: { id: true, email: true, lastLoginAt: true },
      })
      .catch(() => []);
    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const leaderboard = leaderboardBase.map((row: any, idx: number) => {
      const u = userMap.get(row.userId);
      return {
        rank: idx + 1,
        userId: row.userId,
        email: u?.email || null,
        actions7d: row.actions,
        lastLoginAt: u?.lastLoginAt || null,
      };
    });

    return {
      // Legacy (beibehalten)
      activities: activities || [],
      features: (features || []).map((f: any) => ({
        feature: f.feature,
        category: f.category ?? null,
        success: Boolean(f.success),
        createdAt: f.createdAt,
      })),
      totalUsers: totalUsers || 0,
      activeUsers: (activeUsers7d || []).length,
      usersWithLogins: 0,
      recentLogins: 0,

      // BI
      bi: {
        config: {
          championActions7dThreshold: CHAMPION_ACTIONS_7D,
        },
        northStar: {
          activeChampions: championsCount,
          ahaMomentRate: ahaRate,
          avgFeatureLatencySec,
          returningUsers7d,
        },
        funnel: {
          steps: [
            { id: 'logins', label: 'Logins', users: loginUsers7d },
            { id: 'recipe_generated', label: 'Rezept generiert', users: recipeUsers7d },
            { id: 'shopping_list_set', label: 'Auf Einkaufsliste gesetzt', users: shoppingListUsers7d },
          ],
        },
        leaderboard,
      },
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
      bi: {
        config: { championActions7dThreshold: 25 },
        northStar: { activeChampions: 0, ahaMomentRate: 0, avgFeatureLatencySec: null, returningUsers7d: 0 },
        funnel: { steps: [] },
        leaderboard: [],
      },
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
