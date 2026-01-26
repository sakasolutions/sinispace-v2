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

    // Get usage counts for last 7 days
    const recentUsage = await prisma.featureUsage.groupBy({
      by: ['feature'],
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
        category: 'tool_click',
      },
      _count: {
        id: true,
      },
    });

    // Get usage counts for last 30 days (for trending calculation)
    const monthlyUsage = await prisma.featureUsage.groupBy({
      by: ['feature'],
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
        category: 'tool_click',
      },
      _count: {
        id: true,
      },
    });

    // Convert to map for easy lookup
    const stats: Record<string, { count7d: number; count30d: number; isTrending: boolean }> = {};
    
    recentUsage.forEach((item) => {
      stats[item.feature] = {
        count7d: item._count.id,
        count30d: 0,
        isTrending: false,
      };
    });

    monthlyUsage.forEach((item) => {
      if (!stats[item.feature]) {
        stats[item.feature] = {
          count7d: 0,
          count30d: item._count.id,
          isTrending: false,
        };
      } else {
        stats[item.feature].count30d = item._count.id;
      }
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
