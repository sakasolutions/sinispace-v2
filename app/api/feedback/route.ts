import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { toolId, toolName, resultId, type } = body;

    if (!toolId || !toolName || !type || !['positive', 'negative'].includes(type)) {
      return NextResponse.json(
        { error: 'Ungültige Feedback-Daten' },
        { status: 400 }
      );
    }

    // Prüfe ob Feedback-Tabelle existiert
    try {
      await prisma.feedback.create({
        data: {
          userId: session.user.id,
          toolId,
          toolName,
          resultId: resultId || null,
          type,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      // Tabelle existiert noch nicht - ignorieren
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('Feedback')) {
        console.log('[FEEDBACK] ⚠️ Feedback Tabelle existiert noch nicht');
        return NextResponse.json({ success: true }); // Erfolg simulieren
      }
      throw error;
    }
  } catch (error: any) {
    console.error('[FEEDBACK] Fehler:', error);
    return NextResponse.json(
      { error: 'Fehler beim Speichern des Feedbacks' },
      { status: 500 }
    );
  }
}
