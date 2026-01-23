import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

// Admin-Endpoint: Chat Messages abrufen
export async function GET(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;

  // Sicherheits-Check
  if (!session?.user?.email || session.user.email !== adminEmail) {
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
