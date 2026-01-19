import { auth } from '@/auth';
import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

/**
 * API-Route zum Prüfen, ob die aktuelle Session noch gültig ist.
 * Wird vom Client regelmäßig aufgerufen, um Auto-Logout zu implementieren.
 */
export async function GET() {
  try {
    const session = await auth();
    
    // Wenn keine Session oder keine userId → Session ungültig
    if (!session?.user?.id) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }
    
    const userId = session.user.id;
    
    // Prüfe ob noch eine aktive Session in der DB existiert
    const activeSession = await prisma.session.findFirst({
      where: {
        userId: userId,
        expires: { gt: new Date() },
      },
    });
    
    // Wenn keine aktive Session existiert → Session wurde auf anderem Gerät gelöscht
    if (!activeSession) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }
    
    // Session ist gültig
    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error) {
    console.error('Error checking session:', error);
    // Bei Fehlern: Session als ungültig behandeln (Sicherheitsprinzip)
    return NextResponse.json({ valid: false }, { status: 200 });
  } finally {
    await prisma.$disconnect();
  }
}
