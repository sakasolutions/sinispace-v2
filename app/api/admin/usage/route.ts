import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getGlobalUsage } from '@/lib/usage-tracking';

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

  try {
    const data = await getGlobalUsage(days);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[USAGE-ANALYTICS] Fehler:', error);
    return NextResponse.json(
      { 
        total: { tokens: 0, promptTokens: 0, completionTokens: 0, requests: 0, cost: 0 },
        userStats: [],
        toolStats: [],
        costStats: { total: 0, average: 0 },
      },
      { status: 200 } // Return empty data instead of error
    );
  }
}
