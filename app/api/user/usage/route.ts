import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getUserUsage, getUserUsageCalendarMonth } from '@/lib/usage-tracking';

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  if (searchParams.get('period') === 'month') {
    try {
      const { monthTokens } = await getUserUsageCalendarMonth(session.user.id);
      return NextResponse.json({ monthTokens });
    } catch (error: any) {
      console.error('[USAGE] Fehler (month):', error);
      return NextResponse.json(
        { error: 'Fehler beim Abrufen der Usage-Daten' },
        { status: 500 }
      );
    }
  }

  const days = parseInt(searchParams.get('days') || '30', 10);

  try {
    const usage = await getUserUsage(session.user.id, days);
    return NextResponse.json(usage);
  } catch (error: any) {
    console.error('[USAGE] Fehler beim Abrufen der Usage-Daten:', error);
    return NextResponse.json(
      { error: 'Fehler beim Abrufen der Usage-Daten' },
      { status: 500 }
    );
  }
}
