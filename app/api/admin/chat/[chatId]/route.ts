import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

// Admin-Endpoint: Chat Messages abrufen
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await auth();

  // Sicherheits-Check
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Prüfe Admin-Flag in DB
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { chatId } = await params;

  try {
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    console.error('[ADMIN] ❌ Fehler beim Abrufen der Messages:', error);
    return NextResponse.json(
      { success: false, error: 'Fehler beim Abrufen der Messages.' },
      { status: 500 }
    );
  }
}
