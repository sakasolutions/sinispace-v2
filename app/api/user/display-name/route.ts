import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ displayName: '' }, { status: 200 });
    }

    // User-Daten aus DB holen (Name und Email)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
      },
    });

    // Name oder Email für Anzeige
    const displayName = user?.name || user?.email || session?.user?.email || '';

    return NextResponse.json({ displayName });
  } catch (error) {
    console.error('[API] Fehler beim Abrufen des Display-Namens:', error);
    return NextResponse.json({ displayName: '' }, { status: 200 });
  }
}
