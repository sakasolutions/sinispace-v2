'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

/**
 * Track tool usage when user clicks on a tool card
 */
export async function trackToolUsage(toolId: string, toolName: string) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated' };
    }

    // Track in FeatureUsage table
    await prisma.featureUsage.create({
      data: {
        userId: session.user.id,
        feature: toolId,
        category: 'tool_click',
        success: true,
        metadata: JSON.stringify({ toolName, timestamp: new Date().toISOString() }),
      },
    });

    // Also track in UserActivity for analytics
    await prisma.userActivity.create({
      data: {
        userId: session.user.id,
        action: 'tool_opened',
        feature: toolId,
        page: `/tools/${toolId}`,
        metadata: JSON.stringify({ toolName }),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error tracking tool usage:', error);
    return { success: false, error: 'Failed to track usage' };
  }
}

/**
 * Get tool usage statistics for current user
 * Returns usage counts for last 7 days and last 30 days
 */
export async function getToolUsageStats() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return { success: false, error: 'Not authenticated', stats: {} };
    }

    const userId = session.user.id;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // PERFORMANCE: Eine optimierte Query statt zwei separate groupBy
    // Hole alle relevanten Daten in einem Query
    const allUsage = await prisma.featureUsage.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
        category: 'tool_click',
      },
      select: {
        feature: true,
        createdAt: true,
      },
    });

    // Aggregiere im Memory (viel schneller als zwei DB-Queries)
    const recentUsageMap = new Map<string, number>();
    const monthlyUsageMap = new Map<string, number>();

    allUsage.forEach((item) => {
      const feature = item.feature;
      monthlyUsageMap.set(feature, (monthlyUsageMap.get(feature) || 0) + 1);
      if (item.createdAt >= sevenDaysAgo) {
        recentUsageMap.set(feature, (recentUsageMap.get(feature) || 0) + 1);
      }
    });

    // Convert to map for easy lookup
    const stats: Record<string, { count7d: number; count30d: number; isTrending: boolean }> = {};
    
    // Kombiniere beide Maps
    const allFeatures = new Set([...recentUsageMap.keys(), ...monthlyUsageMap.keys()]);
    
    allFeatures.forEach((feature) => {
      stats[feature] = {
        count7d: recentUsageMap.get(feature) || 0,
        count30d: monthlyUsageMap.get(feature) || 0,
        isTrending: false,
      };
    });

    // Calculate trending: if 7-day usage is > 50% of 30-day average, it's trending
    Object.keys(stats).forEach((toolId) => {
      const stat = stats[toolId];
      const avg30d = stat.count30d / 4; // Average per week
      stat.isTrending = stat.count7d > avg30d * 0.5 && stat.count7d > 2;
    });

    return { success: true, stats };
  } catch (error) {
    console.error('Error fetching tool usage stats:', error);
    return { success: false, error: 'Failed to fetch stats', stats: {} };
  }
}
