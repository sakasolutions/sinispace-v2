import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardClient from './dashboard-client';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Hole letzte Aktivität des Users
  let lastActivity = null;
  try {
    lastActivity = await prisma.userActivity.findFirst({
      where: {
        userId: session.user.id,
        action: {
          in: ['tool_opened', 'tool_completed', 'feature_used'],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });
  } catch (error: any) {
    // Tabelle existiert noch nicht - ignorieren
    if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('UserActivity')) {
      console.log('[DASHBOARD] ⚠️ UserActivity Tabelle existiert noch nicht');
    } else {
      console.error('[DASHBOARD] Fehler beim Laden der letzten Aktivität:', error);
    }
  }

  return <DashboardClient lastActivity={lastActivity} />;
}
