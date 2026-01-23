import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL;
  let isAdmin = false;

  // Prüfe zuerst E-Mail (schneller Fallback)
  if (session.user.email === adminEmail) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (user && 'isAdmin' in user && (user as any).isAdmin === true) {
        isAdmin = true;
      } else {
        isAdmin = true; // E-Mail stimmt, erlaube Zugriff
      }
    } catch (dbError: any) {
      if (session.user.email === adminEmail) {
        isAdmin = true;
      }
    }
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Hole Tage-Parameter
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30', 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Prüfe ob Feedback-Tabelle existiert
    const feedbacks = await prisma.feedback.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }).catch(() => []);

    // Berechne Statistiken
    const total = feedbacks.length;
    const positive = feedbacks.filter(f => f.type === 'positive').length;
    const negative = feedbacks.filter(f => f.type === 'negative').length;
    const satisfactionRate = total > 0 ? ((positive / total) * 100).toFixed(1) : '0';

    // Gruppiere nach Tool
    const toolStats: Record<string, { total: number; positive: number; negative: number }> = {};
    feedbacks.forEach(f => {
      if (!toolStats[f.toolId]) {
        toolStats[f.toolId] = { total: 0, positive: 0, negative: 0 };
      }
      toolStats[f.toolId].total++;
      if (f.type === 'positive') {
        toolStats[f.toolId].positive++;
      } else {
        toolStats[f.toolId].negative++;
      }
    });

    return NextResponse.json({
      feedbacks: feedbacks || [],
      stats: {
        total,
        positive,
        negative,
        satisfactionRate: parseFloat(satisfactionRate),
      },
      toolStats: Object.entries(toolStats).map(([toolId, stats]) => ({
        toolId,
        toolName: feedbacks.find(f => f.toolId === toolId)?.toolName || toolId,
        ...stats,
        satisfactionRate: stats.total > 0 ? ((stats.positive / stats.total) * 100).toFixed(1) : '0',
      })),
    });
  } catch (error: any) {
    console.error('[FEEDBACK-ANALYTICS] Fehler:', error);
    return NextResponse.json(
      { 
        feedbacks: [],
        stats: { total: 0, positive: 0, negative: 0, satisfactionRate: 0 },
        toolStats: [],
      },
      { status: 200 } // Return empty data instead of error
    );
  }
}
