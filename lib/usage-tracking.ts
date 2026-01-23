/**
 * Usage-Tracking für AI-Token-Verbrauch
 * Trackt Token-Usage pro User, Tool und Zeitraum
 */

import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export type UsageLimit = {
  daily?: number; // Max Tokens pro Tag
  weekly?: number; // Max Tokens pro Woche
  perTool?: Record<string, number>; // Max Tokens pro Tool pro Tag
};

export type TokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

/**
 * Berechnet geschätzte Kosten basierend auf Modell und Tokens
 * Preise pro 1M Tokens (Stand: Jan 2024)
 */
export function calculateCost(model: string, usage: TokenUsage): number {
  const prices: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-4': { input: 30.00, output: 60.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  };

  const price = prices[model] || prices['gpt-4o-mini'];
  const inputCost = (usage.promptTokens / 1_000_000) * price.input;
  const outputCost = (usage.completionTokens / 1_000_000) * price.output;
  
  return inputCost + outputCost;
}

/**
 * Trackt Token-Usage für einen User
 */
export async function trackUsage(
  userId: string,
  toolId: string,
  toolName: string,
  model: string,
  usage: TokenUsage,
  cost?: number
): Promise<void> {
  try {
    // Prüfe ob Tabelle existiert
    try {
      const calculatedCost = cost || calculateCost(model, usage);
      
      await prisma.tokenUsage.create({
        data: {
          userId,
          toolId,
          toolName,
          model,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          estimatedCost: calculatedCost,
        },
      });
    } catch (error: any) {
      // Tabelle existiert noch nicht - ignorieren
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('TokenUsage')) {
        console.log('[USAGE] ⚠️ TokenUsage Tabelle existiert noch nicht');
        return;
      }
      throw error;
    }
  } catch (error) {
    // Usage-Tracking sollte nicht die App crashen
    console.error('[USAGE] Fehler beim Tracking:', error);
  }
}

/**
 * Prüft ob User sein Limit erreicht hat
 */
export async function checkUsageLimit(
  userId: string,
  toolId: string,
  limits: UsageLimit
): Promise<{ allowed: boolean; reason?: string; currentUsage?: number; limit?: number }> {
  try {
    // Prüfe ob Tabelle existiert
    try {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));

      // Hole heutige Usage
      const todayUsage = await prisma.tokenUsage.aggregate({
        where: {
          userId,
          createdAt: { gte: todayStart },
        },
        _sum: {
          totalTokens: true,
        },
      });

      const todayTokens = todayUsage._sum.totalTokens || 0;

      // Prüfe Daily Limit
      if (limits.daily && todayTokens >= limits.daily) {
        return {
          allowed: false,
          reason: `Tageslimit erreicht (${limits.daily.toLocaleString()} Tokens)`,
          currentUsage: todayTokens,
          limit: limits.daily,
        };
      }

      // Prüfe Tool-spezifisches Limit
      if (limits.perTool && limits.perTool[toolId]) {
        const toolUsage = await prisma.tokenUsage.aggregate({
          where: {
            userId,
            toolId,
            createdAt: { gte: todayStart },
          },
          _sum: {
            totalTokens: true,
          },
        });

        const toolTokens = toolUsage._sum.totalTokens || 0;
        if (toolTokens >= limits.perTool[toolId]) {
          return {
            allowed: false,
            reason: `Tageslimit für ${toolId} erreicht (${limits.perTool[toolId].toLocaleString()} Tokens)`,
            currentUsage: toolTokens,
            limit: limits.perTool[toolId],
          };
        }
      }

      // Prüfe Weekly Limit
      if (limits.weekly) {
        const weekUsage = await prisma.tokenUsage.aggregate({
          where: {
            userId,
            createdAt: { gte: weekStart },
          },
          _sum: {
            totalTokens: true,
          },
        });

        const weekTokens = weekUsage._sum.totalTokens || 0;
        if (weekTokens >= limits.weekly) {
          return {
            allowed: false,
            reason: `Wochenlimit erreicht (${limits.weekly.toLocaleString()} Tokens)`,
            currentUsage: weekTokens,
            limit: limits.weekly,
          };
        }
      }

      return { allowed: true };
    } catch (error: any) {
      // Tabelle existiert noch nicht - erlaube alles
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('TokenUsage')) {
        console.log('[USAGE] ⚠️ TokenUsage Tabelle existiert noch nicht, Limits deaktiviert');
        return { allowed: true };
      }
      throw error;
    }
  } catch (error) {
    console.error('[USAGE] Fehler beim Prüfen der Limits:', error);
    // Bei Fehler erlauben (Fail-Open)
    return { allowed: true };
  }
}

/**
 * Holt Usage-Statistiken für einen User
 */
export async function getUserUsage(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const [totalUsage, todayUsage, weekUsage, toolUsage, costStats] = await Promise.all([
      // Total Usage (Zeitraum)
      prisma.tokenUsage.aggregate({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        _sum: {
          totalTokens: true,
          promptTokens: true,
          completionTokens: true,
          estimatedCost: true,
        },
        _count: true,
      }).catch(() => ({
        _sum: { totalTokens: 0, promptTokens: 0, completionTokens: 0, estimatedCost: 0 },
        _count: 0,
      })),

      // Heute
      prisma.tokenUsage.aggregate({
        where: {
          userId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        _sum: {
          totalTokens: true,
          estimatedCost: true,
        },
        _count: true,
      }).catch(() => ({
        _sum: { totalTokens: 0, estimatedCost: 0 },
        _count: 0,
      })),

      // Diese Woche
      prisma.tokenUsage.aggregate({
        where: {
          userId,
          createdAt: { gte: new Date(new Date().setDate(new Date().getDate() - new Date().getDay())) },
        },
        _sum: {
          totalTokens: true,
          estimatedCost: true,
        },
        _count: true,
      }).catch(() => ({
        _sum: { totalTokens: 0, estimatedCost: 0 },
        _count: 0,
      })),

      // Nach Tool gruppiert
      prisma.tokenUsage.groupBy({
        by: ['toolId', 'toolName'],
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        _sum: {
          totalTokens: true,
          estimatedCost: true,
        },
        _count: true,
      }).catch(() => []),

      // Kosten-Statistiken
      prisma.tokenUsage.aggregate({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        _sum: {
          estimatedCost: true,
        },
        _avg: {
          estimatedCost: true,
        },
      }).catch(() => ({
        _sum: { estimatedCost: 0 },
        _avg: { estimatedCost: 0 },
      })),
    ]);

    return {
      total: {
        tokens: totalUsage._sum.totalTokens || 0,
        promptTokens: totalUsage._sum.promptTokens || 0,
        completionTokens: totalUsage._sum.completionTokens || 0,
        requests: totalUsage._count || 0,
        cost: totalUsage._sum.estimatedCost || 0,
      },
      today: {
        tokens: todayUsage._sum.totalTokens || 0,
        requests: todayUsage._count || 0,
        cost: todayUsage._sum.estimatedCost || 0,
      },
      week: {
        tokens: weekUsage._sum.totalTokens || 0,
        requests: weekUsage._count || 0,
        cost: weekUsage._sum.estimatedCost || 0,
      },
      byTool: (toolUsage || []).map(t => ({
        toolId: t.toolId,
        toolName: t.toolName,
        tokens: t._sum.totalTokens || 0,
        requests: t._count || 0,
        cost: t._sum.estimatedCost || 0,
      })),
      costStats: {
        total: costStats._sum.estimatedCost || 0,
        average: costStats._avg.estimatedCost || 0,
      },
    };
  } catch (error) {
    console.error('[USAGE] Fehler beim Abrufen der Usage-Daten:', error);
    return {
      total: { tokens: 0, promptTokens: 0, completionTokens: 0, requests: 0, cost: 0 },
      today: { tokens: 0, requests: 0, cost: 0 },
      week: { tokens: 0, requests: 0, cost: 0 },
      byTool: [],
      costStats: { total: 0, average: 0 },
    };
  }
}

/**
 * Holt globale Usage-Statistiken für Admin-Panel
 */
export async function getGlobalUsage(days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const [totalUsage, userStats, toolStats, costStats] = await Promise.all([
      // Total Usage
      prisma.tokenUsage.aggregate({
        where: { createdAt: { gte: startDate } },
        _sum: {
          totalTokens: true,
          promptTokens: true,
          completionTokens: true,
          estimatedCost: true,
        },
        _count: true,
      }).catch(() => ({
        _sum: { totalTokens: 0, promptTokens: 0, completionTokens: 0, estimatedCost: 0 },
        _count: 0,
      })),

      // Nach User gruppiert
      prisma.tokenUsage.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startDate } },
        _sum: {
          totalTokens: true,
          estimatedCost: true,
        },
        _count: true,
      }).catch(() => []),

      // Nach Tool gruppiert
      prisma.tokenUsage.groupBy({
        by: ['toolId', 'toolName'],
        where: { createdAt: { gte: startDate } },
        _sum: {
          totalTokens: true,
          estimatedCost: true,
        },
        _count: true,
      }).catch(() => []),

      // Kosten-Statistiken
      prisma.tokenUsage.aggregate({
        where: { createdAt: { gte: startDate } },
        _sum: { estimatedCost: true },
        _avg: { estimatedCost: true },
      }).catch(() => ({
        _sum: { estimatedCost: 0 },
        _avg: { estimatedCost: 0 },
      })),
    ]);

    return {
      total: {
        tokens: totalUsage._sum.totalTokens || 0,
        promptTokens: totalUsage._sum.promptTokens || 0,
        completionTokens: totalUsage._sum.completionTokens || 0,
        requests: totalUsage._count || 0,
        cost: totalUsage._sum.estimatedCost || 0,
      },
      userStats: (userStats || []).map(u => ({
        userId: u.userId,
        tokens: u._sum.totalTokens || 0,
        requests: u._count || 0,
        cost: u._sum.estimatedCost || 0,
      })),
      toolStats: (toolStats || []).map(t => ({
        toolId: t.toolId,
        toolName: t.toolName,
        tokens: t._sum.totalTokens || 0,
        requests: t._count || 0,
        cost: t._sum.estimatedCost || 0,
      })),
      costStats: {
        total: costStats._sum.estimatedCost || 0,
        average: costStats._avg.estimatedCost || 0,
      },
    };
  } catch (error) {
    console.error('[USAGE] Fehler beim Abrufen der globalen Usage-Daten:', error);
    return {
      total: { tokens: 0, promptTokens: 0, completionTokens: 0, requests: 0, cost: 0 },
      userStats: [],
      toolStats: [],
      costStats: { total: 0, average: 0 },
    };
  }
}
