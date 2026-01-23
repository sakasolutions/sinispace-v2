import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getAnalyticsData } from '@/lib/analytics';

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
    const data = await getAnalyticsData(days);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[ANALYTICS] Fehler:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Analytics-Daten.' },
      { status: 500 }
    );
  }
}
